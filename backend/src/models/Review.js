const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
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
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    is_hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ doctor_id: 1, is_hidden: 1, createdAt: -1 });
reviewSchema.index({ user_id: 1 });

reviewSchema.statics.recalculateDoctorRating = async function (doctorId) {
  const result = await this.aggregate([
    { $match: { doctor_id: doctorId, is_hidden: false } },
    {
      $group: {
        _id: '$doctor_id',
        average: { $avg: '$rating' },
        total: { $sum: 1 },
      },
    },
  ]);

  const Doctor = mongoose.model('Doctor');
  if (result.length > 0) {
    await Doctor.findByIdAndUpdate(doctorId, {
      'rating.average': Math.round(result[0].average * 10) / 10,
      'rating.total_reviews': result[0].total,
    });
  } else {
    await Doctor.findByIdAndUpdate(doctorId, {
      'rating.average': 0,
      'rating.total_reviews': 0,
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);
