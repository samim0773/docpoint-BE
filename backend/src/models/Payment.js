const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'appointment', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    razorpay_order_id: { type: String, index: true },
    razorpay_payment_id: { type: String, index: true },
    razorpay_signature: { type: String },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    refund_id: { type: String },
    refunded_amount: { type: Number },
    refunded_at: { type: Date },
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    reference_type: {
      type: String,
      enum: ['appointment', 'subscription'],
    },
    notes: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ user_id: 1, createdAt: -1 });
paymentSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
