const { body } = require('express-validator');

const createOrderRules = [
  body('plan_id')
    .trim()
    .notEmpty().withMessage('Plan ID is required')
    .isMongoId().withMessage('Invalid plan ID'),
];

const confirmPaymentRules = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('Razorpay order ID is required'),

  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('Razorpay payment ID is required'),

  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('Razorpay signature is required'),
];

module.exports = { createOrderRules, confirmPaymentRules };
