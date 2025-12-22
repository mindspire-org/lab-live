const mongoose = require('mongoose');

const staffLeaveSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: String, required: true, trim: true }, // YYYY-MM-DD
    days: { type: Number, default: 1, min: 0 },
    type: { type: String, default: '', trim: true },
    reason: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

staffLeaveSchema.index({ staffId: 1, date: 1 });

module.exports = mongoose.model('StaffLeave', staffLeaveSchema);
