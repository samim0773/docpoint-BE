const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../config/logger');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Create a Razorpay order.
 * @param {number} amount - in rupees (converted to paise internally)
 */
const createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100), // rupees → paise
      currency,
      receipt: String(receipt).slice(0, 40), // Razorpay max 40 chars
      notes,
      payment_capture: 1,
    });
    return order;
  } catch (err) {
    logger.error('Razorpay createOrder failed:', err.message);
    throw new Error('Payment gateway error. Try again.');
  }
};

/**
 * Verify Razorpay payment signature (from client-side callback).
 * body = razorpay_order_id + "|" + razorpay_payment_id
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

/**
 * Verify Razorpay webhook signature.
 * @param {Buffer|string} rawBody - raw request body (must NOT be JSON-parsed)
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

/**
 * Initiate a refund on a captured payment.
 * @param {number} amount - in rupees
 */
const initiateRefund = async (paymentId, amount, notes = {}) => {
  try {
    const rzp = getRazorpay();
    const refund = await rzp.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes,
    });
    return refund;
  } catch (err) {
    logger.error(`Razorpay refund failed [${paymentId}]:`, err.message);
    throw new Error('Refund initiation failed. Contact support.');
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  initiateRefund,
};
