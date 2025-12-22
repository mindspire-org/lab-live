const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // counter name e.g., 'patientId'
    seq: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    collection: 'counters',
  }
);

module.exports = mongoose.model('Counter', CounterSchema);
