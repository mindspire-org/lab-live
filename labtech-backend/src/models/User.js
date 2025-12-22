const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['patient', 'admin'], default: 'patient' },
    name: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    age: { type: Number },
    phone: { type: String, trim: true },
    profileImageUrl: { type: String, trim: true },
    expoPushToken: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
