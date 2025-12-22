const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    cnic: { type: String, trim: true },
    phone: { type: String, trim: true },
    age: { type: String, trim: true },
    gender: { type: String, trim: true },
    address: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianName: { type: String, trim: true },
  },
  { timestamps: true }
);

patientSchema.index({ cnic: 1 }, { unique: true, sparse: true });
patientSchema.index({ phone: 1 });

module.exports = mongoose.model('Patient', patientSchema);
