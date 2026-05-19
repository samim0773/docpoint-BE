const mongoose = require('mongoose');

const userPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration_days: { type: Number, required: true, min: 1 },
    grace_days: { type: Number, default: 7, min: 0 },
    booking_cap: { type: Number, default: null },
    is_active: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

userPlanSchema.index({ is_active: 1 });

module.exports = mongoose.model('UserPlan', userPlanSchema);
