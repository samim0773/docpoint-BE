const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, min: 0, max: 150 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    relation: {
      type: String,
      enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'],
      default: 'self',
    },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
      default: null,
    },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

patientSchema.index({ user_id: 1, is_deleted: 1 });

module.exports = mongoose.model('Patient', patientSchema);
