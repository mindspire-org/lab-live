const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    department: {
      type: String,
      enum: ['IPD', 'OPD', 'Pharmacy', 'Lab'],
      required: true,
      default: 'Lab',
    },
    type: { type: String, enum: ['Income', 'Expense'], required: true },
    recordedBy: { type: String, trim: true, default: '' },
    patientId: { type: String, trim: true },
    admissionId: { type: String, trim: true },
    reference: { type: String, trim: true },
  },
  { timestamps: true }
);

financeRecordSchema.index({ date: -1 });
financeRecordSchema.index({ department: 1, type: 1, date: -1 });

module.exports = mongoose.model('FinanceRecord', financeRecordSchema);
