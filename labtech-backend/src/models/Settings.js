const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    lab: {
      labName: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      license: { type: String, default: '' },
      currency: { type: String, default: '' },
      timezone: { type: String, default: '' },
      defaultLanguage: { type: String, default: '' },
      directorName: { type: String, default: '' },
      accreditationBody: { type: String, default: '' },
      consultants: [
        {
          name: { type: String, default: '' },
          qualifications: { type: String, default: '' },
          category: { type: String, default: '' },
        },
      ],
      logoUrl: { type: String, default: '' },
    },
    pricing: {
      defaultCurrency: { type: String, default: 'PKR' },
      taxRate: { type: Number, default: 0 },
      bulkDiscountRate: { type: Number, default: 0 },
      urgentTestUpliftRate: { type: Number, default: 0 },
      homeSamplingChargesRate: { type: Number, default: 0 },
      homeSamplingChargesUrgentRate: { type: Number, default: 0 },
    },
    notifications: {
      emailNotifications: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      criticalAlerts: { type: Boolean, default: false },
      reportReady: { type: Boolean, default: false },
      appointmentReminders: { type: Boolean, default: false },
      systemMaintenance: { type: Boolean, default: false },
    },
    backup: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: '02:00' },
    },
    // Stores the current report designer template used for report generation
    reportTemplate: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
