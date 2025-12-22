const mongoose = require('mongoose');

const SupplierPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '', trim: true },
    method: { type: String, default: 'Cash', trim: true },
    invoiceNumber: { type: String, default: '', trim: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: { type: String, default: '', trim: true },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SupplierPurchaseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: { type: String, default: '', trim: true },
    invoiceNumber: { type: String, default: '', trim: true },
    quantityUnits: { type: Number, default: 0 },
    packs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    products: { type: [String], default: [] },
    contractStartDate: { type: String, default: '' }, // YYYY-MM-DD
    contractEndDate: { type: String, default: '' }, // YYYY-MM-DD
    status: { type: String, enum: ['Active', 'Expiring', 'Inactive', 'Cancelled'], default: 'Active' },

    totalPurchase: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    payments: { type: [SupplierPaymentSchema], default: [] },
    purchases: { type: [SupplierPurchaseSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', SupplierSchema);
