const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    staffCode: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    salary: { type: Number, default: 0, min: 0 },
    joinDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

staffSchema.index({ name: 1 });

module.exports = mongoose.model('Staff', staffSchema);
