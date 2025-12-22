const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema(
  {
    sampleNumber: { type: String, required: true, unique: true, trim: true },
    barcode: { type: String, trim: true, default: '' },
    patientId: { type: String, trim: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    age: { type: String, trim: true },
    gender: { type: String, trim: true },
    address: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    cnic: { type: String, trim: true },

    sampleCollectedBy: { type: String, default: '', trim: true },
    processingBy: { type: String, default: '', trim: true },
    expectedCompletionAt: { type: Date },
    collectedSample: { type: String, default: '', trim: true },
    collectedSamples: [{ type: String, trim: true }],
    referringDoctor: { type: String, default: '', trim: true },

    tests: [
      {
        test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        name: { type: String, required: true, trim: true },
        price: { type: Number, default: 0 },
      },
    ],

    consumables: [
      {
        item: { type: String, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],

    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: '', trim: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Not paid'],
      default: 'Paid',
      trim: true,
    },
    paidAmount: { type: Number, default: 0 },
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    status: {
      type: String,
      enum: ['collected', 'processing', 'completed', 'cancelled', 'received', 'in process'],
      default: 'collected',
    },

    results: [
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
    ],

    // Overall interpretation for backward compatibility
    interpretation: { type: String, default: '' },
    // Optional per-test interpretations (one entry per ordered test)
    interpretations: [
      {
        testKey: { type: String, default: '' },
        testName: { type: String, default: '' },
        text: { type: String, default: '' },
      },
    ],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sample', sampleSchema);
