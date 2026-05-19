const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    duration: { type: String, trim: true },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    bp: { type: String, trim: true },
    pulse: { type: Number },
    temperature: { type: Number },
    weight: { type: Number },
    spo2: { type: Number },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: Date, default: Date.now },
    chief_complaint: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    vitals: { type: vitalsSchema },
    medicines: [medicineSchema],
    follow_up_date: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patient_id: 1, createdAt: -1 });
prescriptionSchema.index({ doctor_id: 1, createdAt: -1 });
prescriptionSchema.index({ appointment_id: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
