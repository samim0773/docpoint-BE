const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    code: { type: String },
    expires_at: { type: Date },
    attempts: { type: Number, default: 0 },
    last_sent_at: { type: Date },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPlan' },
    is_active: { type: Boolean, default: false },
    expires_at: { type: Date },
    grace_until: { type: Date },
    activated_at: { type: Date },
    bookings_used: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    name: { type: String, trim: true, maxlength: 100 },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    photo: { type: String },
    is_profile_complete: { type: Boolean, default: false },
    otp: { type: otpSchema, default: () => ({}) },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    refresh_token: { type: String, select: false },
    is_blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ mobile: 1 });
userSchema.index({ 'subscription.expires_at': 1 });

userSchema.methods.hasActiveSubscription = function () {
  const sub = this.subscription;
  if (!sub) return false;
  if (sub.is_active && sub.expires_at > new Date()) return true;
  if (sub.grace_until && sub.grace_until > new Date()) return true;
  return false;
};

userSchema.methods.isInGracePeriod = function () {
  const sub = this.subscription;
  if (!sub) return false;
  return !sub.is_active && sub.grace_until && sub.grace_until > new Date();
};

module.exports = mongoose.model('User', userSchema);
