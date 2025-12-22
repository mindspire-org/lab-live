const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const FinanceRecord = require('../models/FinanceRecord');

const router = express.Router();

function parseDate(val) {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /ipd/finance?type=Income|Expense
router.get('/', verifyToken, async (req, res) => {
  try {
    const type = req.query?.type ? String(req.query.type) : '';
    const q = { department: 'IPD' };
    if (type) q.type = type;

    const rows = await FinanceRecord.find(q).sort({ date: -1, createdAt: -1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching IPD finance', err);
    return res.status(500).json({ message: 'Failed to fetch IPD finance' });
  }
});

// POST /ipd/finance
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const date = parseDate(body.date) || new Date();
    const amount = Number(body.amount) || 0;
    if (!amount || amount < 0) return res.status(400).json({ message: 'Invalid amount' });

    const record = await FinanceRecord.create({
      date,
      amount,
      category: String(body.category || 'General'),
      description: String(body.description || ''),
      department: 'IPD',
      type: String(body.type || 'Expense'),
      recordedBy: String(req.user?.name || req.user?.email || req.user?.id || 'admin'),
      patientId: body.patientId ? String(body.patientId) : undefined,
      admissionId: body.admissionId ? String(body.admissionId) : undefined,
      reference: body.reference ? String(body.reference) : undefined,
    });

    return res.status(201).json(record.toObject());
  } catch (err) {
    console.error('Error creating IPD finance record', err);
    return res.status(400).json({ message: 'Failed to create record' });
  }
});

// DELETE /ipd/finance/:id
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    await FinanceRecord.deleteOne({ _id: id, department: 'IPD' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting IPD finance record', err);
    return res.status(400).json({ message: 'Failed to delete record' });
  }
});

module.exports = router;
