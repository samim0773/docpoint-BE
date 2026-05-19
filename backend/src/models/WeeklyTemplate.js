const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
  },
  { _id: false }
);

const dayScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    is_working: { type: Boolean, default: false },
    slots: [slotSchema],
    max_patients: { type: Number, default: 20, min: 1 },
  },
  { _id: false }
);

const weeklyTemplateSchema = new mongoose.Schema(
  {
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
    },
    schedule: [dayScheduleSchema],
    avg_consult_minutes: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true }
);

weeklyTemplateSchema.index({ doctor_id: 1 });

module.exports = mongoose.model('WeeklyTemplate', weeklyTemplateSchema);
