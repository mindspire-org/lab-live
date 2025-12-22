const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryCategory', required: true },

    currentStock: { type: Number, default: 0 },
    minThreshold: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 0 },

    unit: { type: String, default: 'unit', trim: true },
    costPerUnit: { type: Number, default: 0 },

    supplier: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },

    expiryDate: { type: Date },
    lastRestocked: { type: Date },

    // Pack-based optional fields (used by frontend)
    packs: { type: Number, default: 0 },
    itemsPerPack: { type: Number, default: 0 },
    buyPricePerPack: { type: Number, default: 0 },
    salePricePerPack: { type: Number },
    salePricePerUnit: { type: Number },
    invoiceNumber: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
