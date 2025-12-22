const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const InventoryCategory = require('../models/InventoryCategory');
const InventoryItem = require('../models/InventoryItem');
const Supplier = require('../models/Supplier');

const router = express.Router();

async function findOrCreateSupplierByName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const existing = await Supplier.findOne({ name: new RegExp(`^${trimmed}$`, 'i') });
  if (existing) return existing;
  const created = await Supplier.create({ name: trimmed, status: 'Active', totalPurchase: 0, paidAmount: 0 });
  return created;
}

async function recordSupplierPurchase({ supplierName, amount, item, quantityUnits = 0, packs = 0 }) {
  if (!supplierName) return;
  const purchaseAmount = Number(amount);
  if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) return;

  const supplier = await findOrCreateSupplierByName(supplierName);
  if (!supplier) return;

  supplier.totalPurchase = Number(supplier.totalPurchase || 0) + purchaseAmount;
  supplier.purchases = Array.isArray(supplier.purchases) ? supplier.purchases : [];
  supplier.purchases.push({
    amount: purchaseAmount,
    itemId: item?._id,
    itemName: String(item?.name || ''),
    invoiceNumber: String(item?.invoiceNumber || ''),
    quantityUnits: Number(quantityUnits) || 0,
    packs: Number(packs) || 0,
    createdAt: new Date(),
  });
  await supplier.save();
}

// Categories
router.get('/categories', verifyToken, async (_req, res) => {
  try {
    const rows = await InventoryCategory.find().sort({ name: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching inventory categories', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

router.post('/categories', verifyToken, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const existing = await InventoryCategory.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
    if (existing) return res.status(409).json({ message: 'Category already exists' });

    const created = await InventoryCategory.create({ name });
    return res.status(201).json(created);
  } catch (err) {
    console.error('Error creating inventory category', err);
    return res.status(400).json({ message: 'Failed to create category' });
  }
});

// Inventory items
router.get('/inventory', verifyToken, async (_req, res) => {
  try {
    const rows = await InventoryItem.find()
      .populate('category', '_id name')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching inventory items', err);
    return res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

router.get('/inventory/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await InventoryItem.findById(id).populate('category', '_id name').lean();
    if (!row) return res.status(404).json({ message: 'Item not found' });
    return res.json(row);
  } catch (err) {
    console.error('Error fetching inventory item', err);
    return res.status(400).json({ message: 'Failed to fetch item' });
  }
});

router.post('/inventory', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const category = body.category;

    if (!name) return res.status(400).json({ message: 'Item name is required' });
    if (!category) return res.status(400).json({ message: 'Category is required' });

    const doc = await InventoryItem.create({
      name,
      category,
      currentStock: Number(body.currentStock) || 0,
      minThreshold: Number(body.minThreshold) || 0,
      maxCapacity: Number(body.maxCapacity) || 0,
      unit: String(body.unit || 'unit'),
      costPerUnit: Number(body.costPerUnit) || 0,
      supplier: String(body.supplier || ''),
      location: String(body.location || ''),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      lastRestocked: new Date(),
      packs: Number(body.packs) || 0,
      itemsPerPack: Number(body.itemsPerPack) || 0,
      buyPricePerPack: Number(body.buyPricePerPack) || 0,
      salePricePerPack: body.salePricePerPack != null ? Number(body.salePricePerPack) : undefined,
      salePricePerUnit: body.salePricePerUnit != null ? Number(body.salePricePerUnit) : undefined,
      invoiceNumber: String(body.invoiceNumber || ''),
    });

    // Treat creation as a purchase event (increments supplier totalPurchase)
    const supplierName = String(body.supplier || '').trim();
    const packs = Number(body.packs) || 0;
    const itemsPerPack = Number(body.itemsPerPack) || 0;
    const buyPricePerPack = Number(body.buyPricePerPack) || 0;
    const costPerUnit = Number(body.costPerUnit) || 0;
    const currentStock = Number(body.currentStock) || 0;
    const purchaseAmount = buyPricePerPack > 0 && packs > 0
      ? buyPricePerPack * packs
      : costPerUnit > 0 && currentStock > 0
        ? costPerUnit * currentStock
        : buyPricePerPack > 0 && currentStock > 0
          // fallback: UI sometimes provides only buyPricePerPack but uses stock units (no packs)
          ? buyPricePerPack * currentStock
          : 0;
    const quantityUnits = itemsPerPack > 0 && packs > 0 ? itemsPerPack * packs : currentStock;
    await recordSupplierPurchase({ supplierName, amount: purchaseAmount, item: doc, quantityUnits, packs });

    const populated = await InventoryItem.findById(doc._id).populate('category', '_id name').lean();
    return res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating inventory item', err);
    return res.status(400).json({ message: 'Failed to create inventory item' });
  }
});

router.put('/inventory/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Fetch current item so we can detect stock/packs increases (purchase events)
    const before = await InventoryItem.findById(id).lean();
    if (!before) return res.status(404).json({ message: 'Item not found' });

    const update = {
      name: body.name != null ? String(body.name).trim() : undefined,
      category: body.category || undefined,
      currentStock: body.currentStock != null ? Number(body.currentStock) || 0 : undefined,
      minThreshold: body.minThreshold != null ? Number(body.minThreshold) || 0 : undefined,
      maxCapacity: body.maxCapacity != null ? Number(body.maxCapacity) || 0 : undefined,
      unit: body.unit != null ? String(body.unit || 'unit') : undefined,
      costPerUnit: body.costPerUnit != null ? Number(body.costPerUnit) || 0 : undefined,
      supplier: body.supplier != null ? String(body.supplier || '') : undefined,
      location: body.location != null ? String(body.location || '') : undefined,
      expiryDate: body.expiryDate != null ? (body.expiryDate ? new Date(body.expiryDate) : undefined) : undefined,
      packs: body.packs != null ? Number(body.packs) || 0 : undefined,
      itemsPerPack: body.itemsPerPack != null ? Number(body.itemsPerPack) || 0 : undefined,
      buyPricePerPack: body.buyPricePerPack != null ? Number(body.buyPricePerPack) || 0 : undefined,
      salePricePerPack: body.salePricePerPack != null ? Number(body.salePricePerPack) : undefined,
      salePricePerUnit: body.salePricePerUnit != null ? Number(body.salePricePerUnit) : undefined,
      invoiceNumber: body.invoiceNumber != null ? String(body.invoiceNumber || '') : undefined,
      lastRestocked: new Date(),
    };

    // Remove undefined keys so we don't overwrite fields unintentionally
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const updated = await InventoryItem.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('category', '_id name')
      .lean();

    if (!updated) return res.status(404).json({ message: 'Item not found' });

    // Treat stock or packs increase as a purchase event
    const supplierName = String(updated.supplier || '').trim();

    const beforePacks = Number(before.packs) || 0;
    const afterPacks = Number(updated.packs) || 0;
    const packsDelta = afterPacks - beforePacks;

    const beforeStock = Number(before.currentStock) || 0;
    const afterStock = Number(updated.currentStock) || 0;
    const stockDelta = afterStock - beforeStock;

    let purchaseAmount = 0;
    let quantityUnits = 0;
    let packs = 0;

    // Prefer pack-based purchase if packs were explicitly changed and increased
    const buyPricePerPack = Number(updated.buyPricePerPack) || 0;
    const itemsPerPack = Number(updated.itemsPerPack) || 0;
    if (packsDelta > 0 && buyPricePerPack > 0) {
      purchaseAmount = buyPricePerPack * packsDelta;
      packs = packsDelta;
      quantityUnits = itemsPerPack > 0 ? itemsPerPack * packsDelta : 0;
    } else {
      // Otherwise, fall back to unit-based stock increase
      const costPerUnit = Number(updated.costPerUnit) || 0;
      if (stockDelta > 0 && costPerUnit > 0) {
        purchaseAmount = costPerUnit * stockDelta;
        quantityUnits = stockDelta;
        packs = 0;
      } else if (stockDelta > 0 && buyPricePerPack > 0) {
        // fallback: treat buyPricePerPack as per-unit buy price when packs aren't used
        purchaseAmount = buyPricePerPack * stockDelta;
        quantityUnits = stockDelta;
        packs = 0;
      }
    }

    await recordSupplierPurchase({ supplierName, amount: purchaseAmount, item: updated, quantityUnits, packs });

    return res.json(updated);
  } catch (err) {
    console.error('Error updating inventory item', err);
    return res.status(400).json({ message: 'Failed to update inventory item' });
  }
});

router.delete('/inventory/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await InventoryItem.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Item not found' });

    try {
      const suppliers = await Supplier.find({ 'purchases.itemId': id });
      for (const supplier of suppliers) {
        const beforePurchases = Array.isArray(supplier.purchases) ? supplier.purchases : [];
        const keptPurchases = beforePurchases.filter((p) => String(p?.itemId || '') !== String(id));
        supplier.purchases = keptPurchases;
        const recalculatedTotal = keptPurchases.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
        const paidAmount = Number(supplier.paidAmount || 0);
        supplier.totalPurchase = Math.max(recalculatedTotal, paidAmount);
        await supplier.save();
      }
    } catch (e) {
      console.error('Failed to sync supplier purchases on inventory deletion', e);
      // best-effort
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory item', err);
    return res.status(400).json({ message: 'Failed to delete inventory item' });
  }
});

module.exports = router;
