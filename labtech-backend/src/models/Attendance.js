const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: String, required: true, trim: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ['present', 'absent', 'leave', 'late', 'half_day', 'official_off'],
      default: 'present',
    },
    checkIn: { type: String, default: '', trim: true },
    checkOut: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
