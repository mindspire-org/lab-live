const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const FinanceRecord = require('../models/FinanceRecord');
const Appointment = require('../models/Appointment');
const Sample = require('../models/Sample');

const router = express.Router();

// GET /finance/health - debug helper
router.get('/health', verifyToken, async (_req, res) => {
  try {
    const state = mongoose.connection?.readyState;
    const dbName = mongoose.connection?.name;
    const host = mongoose.connection?.host;
    const financeCount = await FinanceRecord.countDocuments({});
    return res.json({ ok: true, mongo: { state, dbName, host }, financeCount });
  } catch (err) {
    console.error('Error in finance health', err);
    return res.status(500).json({ ok: false, message: 'Finance health failed', error: err?.message || String(err) });
  }
});

function parseDate(val) {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /finance/ledger?department=Lab&type=Income|Expense&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/ledger', verifyToken, async (req, res) => {
  try {
    const { department, type, from, to } = req.query || {};

    const q = {};
    if (department) {
      const d = String(department);
      const allowedDepartments = new Set(['IPD', 'OPD', 'Pharmacy', 'Lab']);
      if (allowedDepartments.has(d)) q.department = d;
    }
    if (type) {
      const t = String(type);
      const allowedTypes = new Set(['Income', 'Expense']);
      if (allowedTypes.has(t)) q.type = t;
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      q.date = {};
      if (fromDate) q.date.$gte = fromDate;
      if (toDate) {
        // include whole day
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        q.date.$lte = end;
      }
    }

    const rows = await FinanceRecord.find(q).sort({ date: -1, createdAt: -1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching finance ledger', err);
    return res.status(500).json({
      message: 'Failed to fetch ledger',
      error: err?.message || String(err),
    });
  }
});

// POST /finance/ledger
router.post('/ledger', verifyToken, requireAdmin, async (req, res) => {
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
      department: String(body.department || 'Lab'),
      type: String(body.type || 'Expense'),
      recordedBy: String(req.user?.name || req.user?.email || req.user?.id || 'admin'),
      patientId: body.patientId ? String(body.patientId) : undefined,
      admissionId: body.admissionId ? String(body.admissionId) : undefined,
      reference: body.reference ? String(body.reference) : undefined,
    });

    return res.status(201).json(record.toObject());
  } catch (err) {
    console.error('Error creating finance record', err);
    return res.status(400).json({ message: 'Failed to create record' });
  }
});

// DELETE /finance/ledger/:id
router.delete('/ledger/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    await FinanceRecord.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting finance record', err);
    return res.status(400).json({ message: 'Failed to delete record' });
  }
});

// GET /finance/summary?department=Lab
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const department = String(req.query?.department || '');
    const match = {};
    if (department) match.department = department;

    const fromDate = parseDate(req.query?.from);
    const toDate = parseDate(req.query?.to);

    const totals = await FinanceRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalIncome = totals.find((t) => t._id === 'Income')?.total || 0;
    const totalExpense = totals.find((t) => t._id === 'Expense')?.total || 0;
    const netBalance = totalIncome - totalExpense;

    // monthly net (current month)
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTotals = await FinanceRecord.aggregate([
      { $match: { ...match, date: { $gte: startMonth } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);
    const mIncome = monthTotals.find((t) => t._id === 'Income')?.total || 0;
    const mExpense = monthTotals.find((t) => t._id === 'Expense')?.total || 0;
    const monthlyNet = mIncome - mExpense;

    // Test revenue: paid appointments + paid samples
    // - Appointments: paymentStatus === 'Paid' and not cancelled
    // - Samples: paymentStatus === 'Paid'
    // Optional date range filter: from/to (YYYY-MM-DD) applies to Appointment.date (string) and Sample.createdAt/date.
    const apptQuery = {
      paymentStatus: 'Paid',
      status: { $ne: 'Cancelled' },
    };
    if (fromDate || toDate) {
      const fromKey = fromDate ? fromDate.toISOString().slice(0, 10) : null;
      const toKey = toDate ? toDate.toISOString().slice(0, 10) : null;
      if (fromKey || toKey) {
        apptQuery.date = {};
        if (fromKey) apptQuery.date.$gte = fromKey;
        if (toKey) apptQuery.date.$lte = toKey;
      }
    }

    const apptAgg = await Appointment.aggregate([
      { $match: apptQuery },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$testFee', 0] } } } },
    ]);
    const appointmentRevenue = apptAgg?.[0]?.total || 0;

    // Backward compatibility: older Sample docs may not have paymentStatus; treat those as Paid.
    const sampleQuery = { $or: [{ paymentStatus: 'Paid' }, { paymentStatus: { $exists: false } }] };
    if (fromDate || toDate) {
      sampleQuery.createdAt = {};
      if (fromDate) sampleQuery.createdAt.$gte = fromDate;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        sampleQuery.createdAt.$lte = end;
      }
    }
    const sampleAgg = await Sample.aggregate([
      { $match: sampleQuery },
      { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$paidAmount', 0] }, '$paidAmount', { $ifNull: ['$totalAmount', 0] }] } } } },
    ]);
    const sampleRevenue = sampleAgg?.[0]?.total || 0;

    const testRevenue = appointmentRevenue + sampleRevenue;

    return res.json({ totalIncome, totalExpense, netBalance, monthlyNet, testRevenue, appointmentRevenue, sampleRevenue });
  } catch (err) {
    console.error('Error computing finance summary', err);
    return res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

module.exports = router;
