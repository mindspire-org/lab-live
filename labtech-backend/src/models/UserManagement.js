const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    view: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const userManagementSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'patient' },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    lastLogin: { type: Date },
    gender: { type: String, trim: true },
    age: { type: Number },
    phone: { type: String, trim: true },
    profileImageUrl: { type: String, trim: true },
    expoPushToken: { type: String, trim: true },
    permissions: { type: [permissionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserManagement', userManagementSchema, 'user_management');
