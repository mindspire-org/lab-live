const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const Attendance = require('../models/Attendance');
const StaffSetting = require('../models/StaffSetting');
const StaffDeduction = require('../models/StaffDeduction');

const router = express.Router();

const ATTENDANCE_KEY = 'attendance';

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

function toTimeKey(val) {
  if (!val) return '';
  const s = String(val).trim();
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return '';
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '';
  if (hh < 0 || hh > 23) return '';
  if (mm < 0 || mm > 59) return '';
  return s;
}

function nowTimeHHMM() {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hhmmToMinutes(val) {
  const s = toTimeKey(val);
  if (!s) return null;
  const [hh, mm] = s.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

async function getAttendanceSettingsSafe() {
  const defaults = {
    paidAbsentDays: 0,
    absentDeduction: 0,
    officialDaysOff: [],
    lateReliefMinutes: 0,
    lateDeduction: 0,
    earlyOutDeduction: 0,
    clockInTime: '09:00',
    clockOutTime: '18:00',
  };
  try {
    const doc = await StaffSetting.findOne({ key: ATTENDANCE_KEY }).lean();
    return { ...defaults, ...(doc?.value || {}) };
  } catch {
    return defaults;
  }
}

function weekdayFromDateKey(dateKey) {
  // dateKey: YYYY-MM-DD
  if (!dateKey || typeof dateKey !== 'string') return null;
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  // Use local date to align with business calendar
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getDay(); // 0=Sun..6=Sat
}

// GET server time: /server-time
router.get('/server-time', verifyToken, async (_req, res) => {
  try {
    const now = new Date();
    const date = toDateKey(now);
    const time = nowTimeHHMM();
    return res.json({ iso: now.toISOString(), date, time });
  } catch (err) {
    console.error('Error getting server time', err);
    return res.status(500).json({ message: 'Failed to fetch server time' });
  }
});

// GET daily attendance: /attendance?date=YYYY-MM-DD
router.get('/attendance', verifyToken, async (req, res) => {
  try {
    const date = toDateKey(req.query?.date || new Date());
    const rows = await Attendance.find({ date }).populate('staffId', 'name position').sort({ createdAt: -1 }).lean();

    const out = rows.map((r) => ({
      _id: r._id,
      staffId: r.staffId?._id ? String(r.staffId._id) : String(r.staffId),
      staffName: r.staffId?.name,
      staffPosition: r.staffId?.position,
      date: r.date,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      checkInTime: r.checkIn,
      checkOutTime: r.checkOut,
      notes: r.notes,
    }));

    return res.json(out);
  } catch (err) {
    console.error('Error fetching daily attendance', err);
    return res.status(500).json({ message: 'Failed to fetch daily attendance' });
  }
});

// POST manual add attendance: /attendance
router.post('/attendance', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const staffId = body.staffId;
    if (!staffId || !mongoose.isValidObjectId(staffId)) return res.status(400).json({ message: 'Invalid staffId' });

    const date = toDateKey(body.date || new Date());
    // Load settings early so we can normalize status + avoid deductions on official off days
    const settings = await getAttendanceSettingsSafe();
    const officialDaysOff = Array.isArray(settings.officialDaysOff) ? settings.officialDaysOff : [];
    const weekday = weekdayFromDateKey(date);
    const isOfficialOff = weekday != null && officialDaysOff.includes(weekday);

    const rawStatus = body.status || 'present';
    const rawStatusLower = String(rawStatus || '').toLowerCase();
    const status = isOfficialOff && rawStatusLower === 'absent' ? 'official_off' : rawStatus;
    const checkIn = body.checkIn ? toTimeKey(body.checkIn) : '';
    const checkOut = body.checkOut ? toTimeKey(body.checkOut) : '';
    if (body.checkIn && !checkIn) return res.status(400).json({ message: 'Invalid checkIn time. Expected HH:MM (24-hour).' });
    if (body.checkOut && !checkOut) return res.status(400).json({ message: 'Invalid checkOut time. Expected HH:MM (24-hour).' });

    const row = await Attendance.findOneAndUpdate(
      { staffId, date },
      {
        $set: {
          staffId,
          date,
          status,
          checkIn,
          checkOut,
          notes: typeof body.notes === 'string' ? body.notes : '',
        },
      },
      { new: true, upsert: true }
    ).lean();

    // Apply absent deduction after "paidAbsentDays" allowance is exceeded.
    // Idempotent: upsert a single deduction for that date+reason.
    const paidAbsentDays = Math.max(0, Number(settings.paidAbsentDays || 0) || 0);
    const absentDeduction = Math.max(0, Number(settings.absentDeduction || 0) || 0);
    const absentReason = 'Absent deduction';
    const statusLower = String(status || '').toLowerCase();
    const monthKey = String(date || '').slice(0, 7);

    if (isOfficialOff) {
      // Never deduct on official off days
      await StaffDeduction.deleteOne({ staffId, date, reason: absentReason });
    } else if (statusLower === 'absent' && absentDeduction > 0 && /^\d{4}-\d{2}$/.test(monthKey)) {
      const start = `${monthKey}-01`;
      const monthAbsentRows = await Attendance.find({
        staffId,
        date: { $gte: start, $lt: `${monthKey}-32` },
        status: { $regex: /^absent$/i },
      })
        .select({ date: 1 })
        .lean();

      // Official off days should not consume paid-absent allowance and should never trigger deduction.
      const monthAbsentsExcludingOfficialOff = (monthAbsentRows || []).filter((r) => {
        const wk = weekdayFromDateKey(toDateKey(r.date));
        return !(wk != null && officialDaysOff.includes(wk));
      }).length;

      if (monthAbsentsExcludingOfficialOff > paidAbsentDays) {
        await StaffDeduction.findOneAndUpdate(
          { staffId, date, reason: absentReason },
          { $set: { staffId, date, reason: absentReason, amount: absentDeduction } },
          { upsert: true, new: true }
        ).lean();
      } else {
        // still within allowance -> ensure no absent deduction exists for that day
        await StaffDeduction.deleteOne({ staffId, date, reason: absentReason });
      }
    } else {
      // if status changed away from absent -> remove that day's absent deduction
      await StaffDeduction.deleteOne({ staffId, date, reason: absentReason });
    }

    return res.status(201).json({
      _id: row._id,
      staffId: String(row.staffId),
      date: row.date,
      status: row.status,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      checkInTime: row.checkIn,
      checkOutTime: row.checkOut,
      notes: row.notes,
    });
  } catch (err) {
    console.error('Error adding attendance', err);
    return res.status(400).json({ message: 'Failed to add attendance' });
  }
});

// POST check-in: /attendance/check-in
router.post('/attendance/check-in', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const staffId = body.staffId;
    if (!staffId || !mongoose.isValidObjectId(staffId)) return res.status(400).json({ message: 'Invalid staffId' });

    // Always rely on server time (avoid incorrect client device clocks)
    const now = new Date();
    const date = toDateKey(now);
    const time = nowTimeHHMM();

    const settings = await getAttendanceSettingsSafe();
    const officialInMinutes = hhmmToMinutes(settings.clockInTime);
    const actualInMinutes = hhmmToMinutes(time);
    const grace = Number(settings.lateReliefMinutes || 0) || 0;

    let computedStatus = 'present';
    if (officialInMinutes != null && actualInMinutes != null) {
      const lateMinutes = Math.max(0, actualInMinutes - officialInMinutes);
      if (lateMinutes > grace) computedStatus = 'late';
    }

    const existing = await Attendance.findOne({ staffId, date }).lean();
    const shouldKeepStatus = existing && (String(existing.status || '').toLowerCase() === 'leave');
    const nextStatus = shouldKeepStatus ? existing.status : computedStatus;

    const row = await Attendance.findOneAndUpdate(
      { staffId, date },
      {
        $set: {
          staffId,
          date,
          checkIn: time,
          status: nextStatus,
        },
        $setOnInsert: {
          checkOut: '',
          notes: '',
        },
      },
      { new: true, upsert: true }
    ).lean();

    // If late beyond grace and deduction is configured, create a single deduction row (idempotent)
    const lateDeduction = Number(settings.lateDeduction || 0) || 0;
    if (!shouldKeepStatus && computedStatus === 'late' && lateDeduction > 0) {
      const reason = 'Late deduction';
      await StaffDeduction.findOneAndUpdate(
        { staffId, date, reason },
        { $set: { staffId, date, reason, amount: lateDeduction } },
        { upsert: true, new: true }
      ).lean();
    }

    return res.json({
      _id: row._id,
      staffId: String(row.staffId),
      date: row.date,
      status: row.status,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      checkInTime: row.checkIn,
      checkOutTime: row.checkOut,
      notes: row.notes,
    });
  } catch (err) {
    console.error('Error clocking in', err);
    return res.status(400).json({ message: 'Failed to clock in' });
  }
});

// POST check-out: /attendance/check-out
router.post('/attendance/check-out', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const staffId = body.staffId;
    if (!staffId || !mongoose.isValidObjectId(staffId)) return res.status(400).json({ message: 'Invalid staffId' });

    // Always rely on server time (avoid incorrect client device clocks)
    const now = new Date();
    const date = toDateKey(now);
    const time = nowTimeHHMM();

    const row = await Attendance.findOneAndUpdate(
      { staffId, date },
      {
        $set: {
          staffId,
          date,
          checkOut: time,
        },
        $setOnInsert: {
          status: 'present',
          checkIn: '',
          notes: '',
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      _id: row._id,
      staffId: String(row.staffId),
      date: row.date,
      status: row.status,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      checkInTime: row.checkIn,
      checkOutTime: row.checkOut,
      notes: row.notes,
    });
  } catch (err) {
    console.error('Error clocking out', err);
    return res.status(400).json({ message: 'Failed to clock out' });
  }
});

// GET monthly attendance: /attendance/monthly?staffId=...&month=YYYY-MM
router.get('/attendance/monthly', verifyToken, async (req, res) => {
  try {
    const staffId = req.query?.staffId;
    const month = String(req.query?.month || '').trim();
    if (!staffId || !mongoose.isValidObjectId(staffId)) return res.status(400).json({ message: 'Invalid staffId' });
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be YYYY-MM' });

    const start = `${month}-01`;
    const rows = await Attendance.find({ staffId, date: { $gte: start, $lt: `${month}-32` } })
      .sort({ date: 1 })
      .lean();

    const out = rows.map((r) => ({
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

    return res.json(out);
  } catch (err) {
    console.error('Error fetching monthly attendance', err);
    return res.status(500).json({ message: 'Failed to fetch monthly attendance' });
  }
});

module.exports = router;
