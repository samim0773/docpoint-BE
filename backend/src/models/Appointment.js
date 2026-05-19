const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailySchedule',
      required: true,
    },
    date: { type: Date, required: true },
    token_number: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'in_consultation', 'done', 'no_show', 'cancelled'],
      default: 'pending_payment',
    },
    appointment_fee: { type: Number, required: true, min: 0 },
    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    eta_minutes: { type: Number },
    cancellation_reason: { type: String, trim: true },
    cancelled_at: { type: Date },
    review_submitted: { type: Boolean, default: false },
    prescription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  },
  { timestamps: true }
);

appointmentSchema.index({ schedule_id: 1, token_number: 1 }, { unique: true });
appointmentSchema.index({ user_id: 1, date: -1 });
appointmentSchema.index({ doctor_id: 1, date: -1 });
appointmentSchema.index({ patient_id: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
