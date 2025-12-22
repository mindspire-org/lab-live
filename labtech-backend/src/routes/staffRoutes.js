const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const StaffLeave = require('../models/StaffLeave');
const StaffDeduction = require('../models/StaffDeduction');
const StaffSalary = require('../models/StaffSalary');
const FinanceRecord = require('../models/FinanceRecord');

const router = express.Router();

function toDateKey(val) {
  if (!val) return '';
  const s = String(val);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const pad = (n) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function getNextStaffCode() {
  const latest = await Staff.findOne({ staffCode: { $regex: /^LS\d+$/ } })
    .sort({ createdAt: -1 })
    .select({ staffCode: 1, createdAt: 1 })
    .lean();

  const fallbackCount = await Staff.countDocuments({});
  const base = latest?.staffCode ? parseInt(String(latest.staffCode).replace(/^LS/i, ''), 10) : fallbackCount;
  const nextNum = Number.isFinite(base) ? base + 1 : fallbackCount + 1;
  return `LS${nextNum}`;
}

// List staff (includes today's attendance record in `attendance` array for UI convenience)
router.get('/', verifyToken, async (_req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    const today = toDateKey(new Date());
    const ids = staff.map((s) => s._id);
    const todayRows = await Attendance.find({ staffId: { $in: ids }, date: today }).lean();
    const byStaff = new Map(todayRows.map((r) => [String(r.staffId), r]));

    const out = staff.map((s) => {
      const row = byStaff.get(String(s._id));
      const attendance = row
        ? [
            {
              _id: row._id,
              staffId: String(row.staffId),
              date: row.date,
              status: row.status,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              checkInTime: row.checkIn,
              checkOutTime: row.checkOut,
              notes: row.notes,
            },
          ]
        : [];
      return { ...s, attendance };
    });

    return res.json(out);
  } catch (err) {
    console.error('Error listing staff', err);
    return res.status(500).json({ message: 'Failed to fetch staff' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const staff = await Staff.findById(id).lean();
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    // Return last 31 days attendance for profile/report convenience
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 31);
    const pad = (n) => (n < 10 ? `0${n}` : String(n));
    const startKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;

    const rows = await Attendance.find({ staffId: id, date: { $gte: startKey } }).sort({ date: -1 }).lean();
    const attendance = rows.map((r) => ({
      _id: r._id,
      staffId: String(r.staffId),
      date: r.date,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      checkInTime: r.checkIn,
      checkOutTime: r.checkOut,
      notes: r.notes,
    }));

    return res.json({ ...staff, attendance });
  } catch (err) {
    console.error('Error fetching staff by id', err);
    return res.status(500).json({ message: 'Failed to fetch staff' });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const position = String(body.position || '').trim();
    if (!name || !position) return res.status(400).json({ message: 'name and position are required' });

    // Create with sequential staffCode (LS1, LS2, ...) with a small retry on duplicates.
    let staff = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const staffCode = await getNextStaffCode();
      try {
        staff = await Staff.create({
          staffCode,
          name,
          position,
          phone: String(body.phone || ''),
          email: String(body.email || ''),
          address: String(body.address || ''),
          salary: body.salary != null ? Number(body.salary) : 0,
          joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
          status: body.status || 'active',
        });
        break;
      } catch (e) {
        // Duplicate key on staffCode -> retry
        if (e && (e.code === 11000 || String(e.message || '').includes('E11000'))) continue;
        throw e;
      }
    }
    if (!staff) return res.status(500).json({ message: 'Failed to generate staff ID' });

    return res.status(201).json(staff.toObject());
  } catch (err) {
    console.error('Error creating staff', err);
    return res.status(400).json({ message: 'Failed to create staff' });
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const body = req.body || {};

    const update = {};
    if (typeof body.name === 'string') update.name = body.name;
    if (typeof body.position === 'string') update.position = body.position;
    if (typeof body.phone === 'string') update.phone = body.phone;
    if (typeof body.email === 'string') update.email = body.email;
    if (typeof body.address === 'string') update.address = body.address;
    if (body.salary != null) update.salary = Number(body.salary);
    if (body.joinDate != null) update.joinDate = body.joinDate ? new Date(body.joinDate) : null;
    if (typeof body.status === 'string') update.status = body.status;

    const staff = await Staff.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    return res.json(staff);
  } catch (err) {
    console.error('Error updating staff', err);
    return res.status(400).json({ message: 'Failed to update staff' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });

    const staff = await Staff.findByIdAndDelete(id).lean();
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    await Attendance.deleteMany({ staffId: id });
    await StaffLeave.deleteMany({ staffId: id });
    await StaffDeduction.deleteMany({ staffId: id });
    await StaffSalary.deleteMany({ staffId: id });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting staff', err);
    return res.status(500).json({ message: 'Failed to delete staff' });
  }
});

// Leaves
router.get('/:id/leaves', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const rows = await StaffLeave.find({ staffId: id }).sort({ date: -1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error listing staff leaves', err);
    return res.status(500).json({ message: 'Failed to fetch leaves' });
  }
});

router.post('/:id/leaves', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const body = req.body || {};
    const date = toDateKey(body.date || new Date());
    const days = body.days != null ? Number(body.days) : 1;
    const created = await StaffLeave.create({
      staffId: id,
      date,
      days: Number.isFinite(days) ? days : 1,
      type: String(body.type || ''),
      reason: String(body.reason || ''),
    });
    return res.status(201).json(created.toObject());
  } catch (err) {
    console.error('Error creating staff leave', err);
    return res.status(400).json({ message: 'Failed to create leave' });
  }
});

router.delete('/:id/leaves/:leaveId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id, leaveId } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    if (!leaveId || !mongoose.isValidObjectId(leaveId)) return res.status(400).json({ message: 'Invalid leave id' });
    const deleted = await StaffLeave.findOneAndDelete({ _id: leaveId, staffId: id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Leave not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting leave', err);
    return res.status(500).json({ message: 'Failed to delete leave' });
  }
});

// Deductions
router.get('/:id/deductions', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const rows = await StaffDeduction.find({ staffId: id }).sort({ date: -1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error listing staff deductions', err);
    return res.status(500).json({ message: 'Failed to fetch deductions' });
  }
});

router.post('/:id/deductions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'amount must be a valid number (>=0)' });
    const date = toDateKey(body.date || new Date());
    const created = await StaffDeduction.create({
      staffId: id,
      date,
      amount,
      reason: String(body.reason || ''),
    });
    return res.status(201).json(created.toObject());
  } catch (err) {
    console.error('Error creating staff deduction', err);
    return res.status(400).json({ message: 'Failed to create deduction' });
  }
});

router.delete('/:id/deductions/:deductionId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id, deductionId } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    if (!deductionId || !mongoose.isValidObjectId(deductionId)) return res.status(400).json({ message: 'Invalid deduction id' });
    const deleted = await StaffDeduction.findOneAndDelete({ _id: deductionId, staffId: id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Deduction not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting deduction', err);
    return res.status(500).json({ message: 'Failed to delete deduction' });
  }
});

// Salaries
router.get('/:id/salaries', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const rows = await StaffSalary.find({ staffId: id }).sort({ month: -1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Error listing staff salaries', err);
    return res.status(500).json({ message: 'Failed to fetch salaries' });
  }
});

router.post('/:id/salaries', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    const body = req.body || {};
    const month = String(body.month || '').trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be YYYY-MM' });
    const amount = Number(body.amount);
    const bonus = body.bonus != null ? Number(body.bonus) : 0;
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'amount must be a valid number (>=0)' });
    if (!Number.isFinite(bonus) || bonus < 0) return res.status(400).json({ message: 'bonus must be a valid number (>=0)' });

    const created = await StaffSalary.findOneAndUpdate(
      { staffId: id, month },
      {
        $set: {
          staffId: id,
          month,
          amount,
          bonus,
          status: body.status || 'pending',
        },
      },
      { new: true, upsert: true }
    ).lean();

    // Best-effort: reflect salaries as Finance expense so they appear in Expenses/Ledger/Finance.
    // Idempotent via reference key to avoid duplicates on upsert.
    try {
      const staff = await Staff.findById(id).select({ name: 1, staffCode: 1 }).lean();
      const staffLabel = staff?.staffCode ? `${staff.staffCode} - ${staff.name || ''}` : String(staff?.name || '');
      const recordedBy = String(req?.user?.name || req?.user?.email || req?.user?.id || 'admin');
      const total = (Number(amount) || 0) + (Number(bonus) || 0);
      const ref = `SALARY:${id}:${month}`;
      const monthDate = new Date(`${month}-01T00:00:00.000Z`);

      await FinanceRecord.findOneAndUpdate(
        { reference: ref, department: 'Lab', type: 'Expense', category: 'Salaries' },
        {
          $set: {
            date: Number.isNaN(monthDate.getTime()) ? new Date() : monthDate,
            amount: total,
            category: 'Salaries',
            description: `Salary for ${staffLabel || 'staff'} (${month})`,
            department: 'Lab',
            type: 'Expense',
            recordedBy,
            reference: ref,
          },
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('Failed to record salary Finance expense', e);
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error('Error creating staff salary', err);
    return res.status(400).json({ message: 'Failed to create salary record' });
  }
});

router.put('/:id/salaries/:salaryId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id, salaryId } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    if (!salaryId || !mongoose.isValidObjectId(salaryId)) return res.status(400).json({ message: 'Invalid salary id' });
    const body = req.body || {};

    const update = {};
    if (body.amount != null) update.amount = Number(body.amount);
    if (body.bonus != null) update.bonus = Number(body.bonus);
    if (typeof body.status === 'string') update.status = body.status;

    const updated = await StaffSalary.findOneAndUpdate({ _id: salaryId, staffId: id }, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Salary record not found' });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating staff salary', err);
    return res.status(500).json({ message: 'Failed to update salary record' });
  }
});

router.delete('/:id/salaries/:salaryId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id, salaryId } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid staff id' });
    if (!salaryId || !mongoose.isValidObjectId(salaryId)) return res.status(400).json({ message: 'Invalid salary id' });
    const deleted = await StaffSalary.findOneAndDelete({ _id: salaryId, staffId: id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Salary record not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting salary', err);
    return res.status(500).json({ message: 'Failed to delete salary record' });
  }
});

module.exports = router;
