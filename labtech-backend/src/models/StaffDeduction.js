const mongoose = require('mongoose');

const staffDeductionSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: String, required: true, trim: true }, // YYYY-MM-DD
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

staffDeductionSchema.index({ staffId: 1, date: 1 });

module.exports = mongoose.model('StaffDeduction', staffDeductionSchema);
