const mongoose = require('mongoose');

const staffSalarySchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    month: { type: String, required: true, trim: true }, // YYYY-MM
    amount: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

staffSalarySchema.index({ staffId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('StaffSalary', staffSalarySchema);
