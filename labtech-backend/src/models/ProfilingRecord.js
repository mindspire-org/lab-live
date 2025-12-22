const mongoose = require('mongoose');

const profilingRecordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cnic: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    profilingNotes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

profilingRecordSchema.index({ cnic: 1 }, { unique: true, sparse: true });
profilingRecordSchema.index({ phone: 1 });

module.exports = mongoose.model('ProfilingRecord', profilingRecordSchema);
