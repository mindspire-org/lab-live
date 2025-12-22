const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const Supplier = require('../models/Supplier');
const FinanceRecord = require('../models/FinanceRecord');

const router = express.Router();

router.get('/', verifyToken, async (_req, res) => {
  try {
    const rows = await Supplier.find().sort({ createdAt: -1 }).lean();
    const enriched = rows.map((s) => {
      const totalPurchase = Number(s.totalPurchase || 0);
      const paidAmount = Number(s.paidAmount || 0);
      const remaining = Math.max(0, totalPurchase - paidAmount);
      const balanceStatus = remaining <= 0 ? 'Cleared' : 'Pending';
      return { ...s, totalPurchase, paidAmount, remaining, balanceStatus };
    });
    return res.json(enriched);
  } catch (err) {
    console.error('Error fetching suppliers', err);
    return res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};

    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Supplier name is required' });

    const totalPurchase = body.totalPurchase != null ? Number(body.totalPurchase) : 0;
    if (!Number.isFinite(totalPurchase) || totalPurchase < 0) {
      return res.status(400).json({ message: 'Total purchase must be a valid number (>= 0)' });
    }

    const created = await Supplier.create({
      name,
      contactPerson: String(body.contactPerson || ''),
      email: String(body.email || ''),
      phone: String(body.phone || ''),
      address: String(body.address || ''),
      products: Array.isArray(body.products)
        ? body.products.map((p) => String(p).trim()).filter(Boolean)
        : String(body.products || '')
            .split(/[\n,]/)
            .map((p) => p.trim())
            .filter(Boolean),
      contractStartDate: String(body.contractStartDate || ''),
      contractEndDate: String(body.contractEndDate || ''),
      status: body.status || 'Active',
      totalPurchase,
      paidAmount: 0,
    });

    const createdObj = created.toObject();
    const paidAmount = Number(createdObj.paidAmount || 0);
    const remaining = Math.max(0, totalPurchase - paidAmount);
    const balanceStatus = remaining <= 0 ? 'Cleared' : 'Pending';
    return res.status(201).json({ ...createdObj, totalPurchase, paidAmount, remaining, balanceStatus });
  } catch (err) {
    console.error('Error creating supplier', err);
    return res.status(400).json({ message: 'Failed to create supplier' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const row = await Supplier.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Supplier not found' });
    const totalPurchase = Number(row.totalPurchase || 0);
    const paidAmount = Number(row.paidAmount || 0);
    const remaining = Math.max(0, totalPurchase - paidAmount);
    const balanceStatus = remaining <= 0 ? 'Cleared' : 'Pending';
    return res.json({ ...row, totalPurchase, paidAmount, remaining, balanceStatus });
  } catch (err) {
    console.error('Error fetching supplier', err);
    return res.status(400).json({ message: 'Failed to fetch supplier' });
  }
});

router.post('/:id/payments', verifyToken, requireAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const amount = Number(req.body?.amount);
    const note = req.body?.note != null ? String(req.body.note) : '';
    const method = req.body?.method != null ? String(req.body.method) : 'Cash';
    const invoiceNumber = req.body?.invoiceNumber != null ? String(req.body.invoiceNumber).trim() : '';
    const itemId = req.body?.itemId != null ? String(req.body.itemId).trim() : '';
    const itemName = req.body?.itemName != null ? String(req.body.itemName).trim() : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    const totalPurchase = Number(supplier.totalPurchase || 0);
    const paidAmount = Number(supplier.paidAmount || 0);
    const remaining = Math.max(0, totalPurchase - paidAmount);
    if (amount > remaining) {
      return res.status(400).json({ message: `Payment exceeds remaining balance (${remaining})` });
    }

    if (invoiceNumber) {
      const purchases = Array.isArray(supplier.purchases) ? supplier.purchases : [];
      const payments = Array.isArray(supplier.payments) ? supplier.payments : [];

      const invoiceTotal = purchases
        .filter((p) => String(p?.invoiceNumber || '').trim() === invoiceNumber)
        .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);

      const invoicePaid = payments
        .filter((p) => String(p?.invoiceNumber || '').trim() === invoiceNumber)
        .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);

      const invoiceRemaining = Math.max(0, invoiceTotal - invoicePaid);
      if (invoiceTotal <= 0) {
        return res.status(400).json({ message: 'Selected invoice has no purchases recorded.' });
      }
      if (amount > invoiceRemaining) {
        return res.status(400).json({ message: `Payment exceeds invoice remaining balance (${invoiceRemaining})` });
      }
    }

    supplier.paidAmount = paidAmount + amount;
    supplier.payments = Array.isArray(supplier.payments) ? supplier.payments : [];
    supplier.payments.push({ amount, note, method, invoiceNumber, itemId: itemId || undefined, itemName, paidAt: new Date() });
    await supplier.save();

    try {
      const recordedBy = String(req?.user?.name || req?.user?.email || req?.user?.id || 'admin');
      const ref = invoiceNumber || `SUP-${String(supplier._id)}`;
      const invLabel = invoiceNumber ? `Invoice ${invoiceNumber}` : 'No invoice';
      const itemLabel = itemName ? `Item: ${itemName}` : '';
      const noteLabel = note ? `Note: ${note}` : '';
      const parts = [invLabel, itemLabel, noteLabel].filter(Boolean).join('. ');
      await FinanceRecord.create({
        date: new Date(),
        amount,
        category: 'Supplies',
        description: `Supplier Payment - ${String(supplier.name || '')}. ${parts}`,
        department: 'Lab',
        type: 'Expense',
        recordedBy,
        reference: ref,
      });
    } catch (e) {
      console.error('Failed to record supplier payment to finance ledger', e);
      // best-effort
    }

    const updated = supplier.toObject();
    const updatedTotal = Number(updated.totalPurchase || 0);
    const updatedPaid = Number(updated.paidAmount || 0);
    const updatedRemaining = Math.max(0, updatedTotal - updatedPaid);
    const balanceStatus = updatedRemaining <= 0 ? 'Cleared' : 'Pending';
    return res.json({ ...updated, totalPurchase: updatedTotal, paidAmount: updatedPaid, remaining: updatedRemaining, balanceStatus });
  } catch (err) {
    console.error('Error recording supplier payment', err);
    return res.status(400).json({ message: 'Failed to record payment' });
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};

    if (body.totalPurchase != null) {
      const tp = Number(body.totalPurchase);
      if (!Number.isFinite(tp) || tp < 0) {
        return res.status(400).json({ message: 'Total purchase must be a valid number (>= 0)' });
      }
      const current = await Supplier.findById(req.params.id).lean();
      if (!current) return res.status(404).json({ message: 'Supplier not found' });
      const paidAmount = Number(current.paidAmount || 0);
      if (tp < paidAmount) {
        return res.status(400).json({ message: `Total purchase cannot be less than already paid amount (${paidAmount})` });
      }
    }

    const update = {
      name: body.name != null ? String(body.name).trim() : undefined,
      contactPerson: body.contactPerson != null ? String(body.contactPerson) : undefined,
      email: body.email != null ? String(body.email) : undefined,
      phone: body.phone != null ? String(body.phone) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      products: body.products != null
        ? (Array.isArray(body.products)
            ? body.products.map((p) => String(p).trim()).filter(Boolean)
            : String(body.products || '')
                .split(/[\n,]/)
                .map((p) => p.trim())
                .filter(Boolean))
        : undefined,
      contractStartDate: body.contractStartDate != null ? String(body.contractStartDate || '') : undefined,
      contractEndDate: body.contractEndDate != null ? String(body.contractEndDate || '') : undefined,
      status: body.status != null ? String(body.status) : undefined,
      totalPurchase: body.totalPurchase != null ? Number(body.totalPurchase) : undefined,
    };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const updated = await Supplier.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Supplier not found' });
    const totalPurchase = Number(updated.totalPurchase || 0);
    const paidAmount = Number(updated.paidAmount || 0);
    const remaining = Math.max(0, totalPurchase - paidAmount);
    const balanceStatus = remaining <= 0 ? 'Cleared' : 'Pending';
    return res.json({ ...updated, totalPurchase, paidAmount, remaining, balanceStatus });
  } catch (err) {
    console.error('Error updating supplier', err);
    return res.status(400).json({ message: 'Failed to update supplier' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Supplier.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: 'Supplier not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting supplier', err);
    return res.status(400).json({ message: 'Failed to delete supplier' });
  }
});

module.exports = router;
