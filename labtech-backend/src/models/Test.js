const mongoose = require('mongoose');

const ParameterSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, required: true },
    unit: { type: String, default: '' },
    // Optional string ranges as entered in the UI (Male/Female/Pediatric)
    normalRangeMale: { type: String, default: '' },
    normalRangeFemale: { type: String, default: '' },
    normalRangePediatric: { type: String, default: '' },
    normalRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    criticalRange: {
      min: { type: Number },
      max: { type: Number },
    },
  },
  { _id: false }
);

const TestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    sampleType: {
      type: String,
      enum: ['blood', 'urine', 'other'],
      default: 'blood',
    },
    fastingRequired: { type: Boolean, default: false },
    parameters: { type: [ParameterSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Test', TestSchema);
