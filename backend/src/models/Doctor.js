const mongoose = require('mongoose');

const clinicAddressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true, match: [/^\d{6}$/, 'Invalid pincode'] },
  },
  { _id: false }
);

const doctorOtpSchema = new mongoose.Schema(
  {
    code: { type: String },
    expires_at: { type: Date },
    attempts: { type: Number, default: 0 },
    last_sent_at: { type: Date },
  },
  { _id: false }
);

const doctorSubscriptionSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: ['basic', 'premium'], default: 'basic' },
    is_active: { type: Boolean, default: false },
    expires_at: { type: Date },
    razorpay_subscription_id: { type: String },
    activated_at: { type: Date },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    name: { type: String, trim: true, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    specialization: { type: String, trim: true },
    qualification: [{ type: String, trim: true }],
    experience_years: { type: Number, min: 0 },
    registration_number: { type: String, trim: true },
    clinic_name: { type: String, trim: true },
    clinic_address: { type: clinicAddressSchema },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    consultation_fee: { type: Number, min: 0 },
    avg_consult_minutes: { type: Number, default: 10, min: 1 },
    profile_photo: { type: String },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        public_id: { type: String },
      },
    ],
    bio: { type: String, maxlength: 1000 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      total_reviews: { type: Number, default: 0, min: 0 },
    },
    otp: { type: doctorOtpSchema, default: () => ({}) },
    subscription: { type: doctorSubscriptionSchema, default: () => ({}) },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejection_reason: { type: String },
    refresh_token: { type: String, select: false },
    is_blocked: { type: Boolean, default: false },
    is_profile_complete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

doctorSchema.index({ location: '2dsphere' });
doctorSchema.index({ approval_status: 1, is_blocked: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ 'clinic_address.city': 1 });
doctorSchema.index({ 'rating.average': -1 });

module.exports = mongoose.model('Doctor', doctorSchema);
