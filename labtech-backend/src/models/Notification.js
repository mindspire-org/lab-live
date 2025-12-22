const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    audience: { type: String, enum: ['patient', 'admin'], required: true },
    type: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    icon: { type: String, default: 'notifications' },
    iconColor: { type: String, default: '#3B82F6' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
