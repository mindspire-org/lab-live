const mongoose = require('mongoose');

const ResultRowSchema = new mongoose.Schema(
  {
    parameterId: { type: String, default: '' },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    comment: { type: String, default: '' },
    isAbnormal: { type: Boolean, default: false },
    isCritical: { type: Boolean, default: false },
    label: { type: String, default: '' },
    unit: { type: String, default: '' },
    normalText: { type: String, default: '' },
  },
  { _id: false }
);

const TestResultSchema = new mongoose.Schema(
  {
    sample: { type: mongoose.Schema.Types.ObjectId, ref: 'Sample', required: true },
    sampleNumber: { type: String, required: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    age: { type: String, default: '', trim: true },
    gender: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    cnic: { type: String, default: '', trim: true },
    tests: [
      {
        name: { type: String, required: true, trim: true },
        test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
      },
    ],
    results: { type: [ResultRowSchema], default: [] },
    // Overall interpretation (backward compatibility)
    interpretation: { type: String, default: '' },
    // Per-test interpretations (one entry per ordered test)
    interpretations: [
      {
        testKey: { type: String, default: '' },
        testName: { type: String, default: '' },
        text: { type: String, default: '' },
      },
    ],
    status: { type: String, default: 'completed', trim: true },
  },
  {
    timestamps: true,
    collection: 'test_result',
  }
);

module.exports = mongoose.model('TestResult', TestResultSchema);
