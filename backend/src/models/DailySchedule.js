const mongoose = require('mongoose');

const dailyScheduleSchema = new mongoose.Schema(
  {
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    date: { type: Date, required: true },
    is_available: { type: Boolean, default: true },
    is_holiday: { type: Boolean, default: false },
    holiday_reason: { type: String, trim: true },
    max_patients: { type: Number, required: true, min: 1 },
    booked_count: { type: Number, default: 0, min: 0 },
    current_token: { type: Number, default: 0 },
    queue_status: {
      type: String,
      enum: ['not_started', 'active', 'paused', 'completed'],
      default: 'not_started',
    },
    pause_reason: { type: String, trim: true },
    slots: [
      {
        start_time: { type: String },
        end_time: { type: String },
        _id: false,
      },
    ],
    avg_consult_minutes: { type: Number, default: 10 },
  },
  { timestamps: true }
);

dailyScheduleSchema.index({ doctor_id: 1, date: 1 }, { unique: true });
dailyScheduleSchema.index({ date: 1, is_available: 1 });

module.exports = mongoose.model('DailySchedule', dailyScheduleSchema);
