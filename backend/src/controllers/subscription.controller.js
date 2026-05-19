const mongoose = require('mongoose');
const UserPlan = require('../models/UserPlan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require('../services/razorpay');
const logger = require('../config/logger');

// ─── Shared activation helper (used by confirm + webhook) ────────
const _activateSubscription = async (session, userId, planId, paymentDoc) => {
  const plan = await UserPlan.findById(planId).session(session);
  if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

  const user = await User.findById(userId).session(session);
  if (!user) throw new AppError('User not found', 404);

  const now = new Date();

  // Loyalty: extend from existing expiry if still active (not yet expired)
  const existingExpiry = user.subscription?.expires_at;
  const base = existingExpiry && existingExpiry > now ? new Date(existingExpiry) : now;

  const expiresAt = new Date(base.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
  const graceUntil = new Date(expiresAt.getTime() + plan.grace_days * 24 * 60 * 60 * 1000);

  user.subscription = {
    plan_id: plan._id,
    is_active: true,
    expires_at: expiresAt,
    grace_until: graceUntil,
    activated_at: now,
    bookings_used: 0,
  };
  await user.save({ session });

  paymentDoc.status = 'captured';
  await paymentDoc.save({ session });

  return { plan, expiresAt, graceUntil };
};

// ─── GET /subscription/plans ─────────────────────────────────────
const getPlans = asyncHandler(async (req, res) => {
  const plans = await UserPlan.find({ is_active: true }).select('-__v').sort({ price: 1 });
  return ApiResponse.success(res, 'Plans fetched', plans);
});

// ─── POST /subscription/order ────────────────────────────────────
const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const { plan_id } = req.body;
  const user = req.user;

  const plan = await UserPlan.findById(plan_id);
  if (!plan || !plan.is_active) throw new AppError('Plan not found or no longer available', 404);

  // Block if subscription is fully active with more than 7 days left (prevent abuse)
  const sub = user.subscription;
  if (sub?.is_active && sub.expires_at) {
    const daysLeft = (new Date(sub.expires_at) - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 7) {
      throw new AppError(
        `Your subscription is active for ${Math.ceil(daysLeft)} more days. Renew closer to expiry.`,
        400
      );
    }
  }

  const receipt = `sub_${user._id.toString().slice(-6)}_${Date.now()}`;
  const order = await createOrder(plan.price, 'INR', receipt, {
    user_id: user._id.toString(),
    plan_id: plan._id.toString(),
    type: 'subscription',
  });

  // Record payment intent
  const payment = await Payment.create({
    user_id: user._id,
    type: 'subscription',
    amount: plan.price,
    currency: 'INR',
    razorpay_order_id: order.id,
    status: 'created',
    reference_id: plan._id,
    reference_type: 'subscription',
    notes: `Plan: ${plan.name}`,
  });

  return ApiResponse.success(res, 'Order created', {
    order_id: order.id,
    amount: plan.price,
    currency: 'INR',
    key_id: process.env.RAZORPAY_KEY_ID,
    payment_id: payment._id,
    plan: {
      id: plan._id,
      name: plan.name,
      duration_days: plan.duration_days,
    },
  });
});

// ─── POST /subscription/confirm ──────────────────────────────────
const confirmSubscription = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify Razorpay HMAC signature
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError('Payment verification failed. Invalid signature.', 400);
  }

  const payment = await Payment.findOne({ razorpay_order_id });
  if (!payment) throw new AppError('Payment record not found', 404);
  if (payment.user_id.toString() !== req.user._id.toString()) {
    throw new AppError('Forbidden', 403);
  }
  if (payment.status === 'captured') {
    // Idempotent — already processed
    return ApiResponse.success(res, 'Subscription already active', {
      subscription: req.user.subscription,
    });
  }

  payment.razorpay_payment_id = razorpay_payment_id;
  payment.razorpay_signature = razorpay_signature;

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await _activateSubscription(session, req.user._id, payment.reference_id, payment);
    });
  } finally {
    await session.endSession();
  }

  const updatedUser = await User.findById(req.user._id);

  logger.info(`Subscription activated: user=${req.user._id} plan=${payment.reference_id} expires=${result.expiresAt}`);

  return ApiResponse.success(res, 'Subscription activated successfully', {
    subscription: {
      is_active: true,
      plan_name: result.plan.name,
      expires_at: result.expiresAt,
      grace_until: result.graceUntil,
    },
  });
});

// ─── GET /subscription/status ────────────────────────────────────
const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const sub = user.subscription;

  const isActive = user.hasActiveSubscription();
  const inGrace = user.isInGracePeriod();

  let plan = null;
  if (sub?.plan_id) {
    plan = await UserPlan.findById(sub.plan_id).select('name price duration_days');
  }

  return ApiResponse.success(res, 'Subscription status fetched', {
    is_active: isActive,
    is_in_grace: inGrace,
    expires_at: sub?.expires_at || null,
    grace_until: sub?.grace_until || null,
    activated_at: sub?.activated_at || null,
    plan: plan
      ? { id: plan._id, name: plan.name, price: plan.price, duration_days: plan.duration_days }
      : null,
  });
});

// ─── POST /webhooks/razorpay ─────────────────────────────────────
// Mounted BEFORE global body parser — req.body is a raw Buffer here
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) throw new AppError('Missing webhook signature', 400);

  const rawBody = req.body; // Buffer (express.raw applied in server.js)
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook: invalid signature');
    throw new AppError('Invalid webhook signature', 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError('Invalid webhook payload', 400);
  }

  const eventType = event.event;
  logger.info(`Razorpay webhook received: ${eventType}`);

  if (eventType === 'payment.captured') {
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) return res.json({ success: true });

    const { order_id, id: razorpay_payment_id } = paymentEntity;

    const payment = await Payment.findOne({ razorpay_order_id: order_id });
    if (!payment) {
      logger.warn(`Webhook: no payment record for order ${order_id}`);
      return res.json({ success: true }); // ack to Razorpay
    }

    if (payment.status === 'captured') {
      return res.json({ success: true }); // idempotent
    }

    payment.razorpay_payment_id = razorpay_payment_id;

    if (payment.type === 'subscription') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await _activateSubscription(session, payment.user_id, payment.reference_id, payment);
        });
      } finally {
        await session.endSession();
      }
      logger.info(`Webhook: subscription activated via webhook for user=${payment.user_id}`);
    }
    // appointment payments handled in Step 9
  }

  if (eventType === 'payment.failed') {
    const paymentEntity = event.payload?.payment?.entity;
    if (paymentEntity?.order_id) {
      await Payment.findOneAndUpdate(
        { razorpay_order_id: paymentEntity.order_id, status: 'created' },
        { status: 'failed' }
      );
      logger.info(`Webhook: payment failed for order ${paymentEntity.order_id}`);
    }
  }

  return res.json({ success: true });
});

module.exports = {
  getPlans,
  createSubscriptionOrder,
  confirmSubscription,
  getSubscriptionStatus,
  handleRazorpayWebhook,
};
