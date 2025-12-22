const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const StaffSetting = require('../models/StaffSetting');

const router = express.Router();

const ATTENDANCE_KEY = 'attendance';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function daysToNames(days) {
  const arr = Array.isArray(days) ? days : [];
  return arr
    .map((n) => WEEKDAY_NAMES[Number(n)])
    .filter((x) => typeof x === 'string' && x.length > 0);
}

router.get('/attendance', verifyToken, async (_req, res) => {
  try {
    const doc = await StaffSetting.findOne({ key: ATTENDANCE_KEY }).lean();
    // Default shape expected by frontend
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

    const v = doc?.value || {};
    const sanitizeDays = (val) => {
      const arr = Array.isArray(val) ? val : [];
      const out = arr
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
      return Array.from(new Set(out));
    };
    // Return only current supported fields (hides legacy keys still stored in DB)
    const officialDaysOff = sanitizeDays(v.officialDaysOff);
    const out = {
      paidAbsentDays: Math.max(0, Number(v.paidAbsentDays || 0) || 0),
      absentDeduction: Math.max(0, Number(v.absentDeduction || 0) || 0),
      officialDaysOff,
      officialDaysOffNames: daysToNames(officialDaysOff),
      lateReliefMinutes: Math.max(0, Number(v.lateReliefMinutes || 0) || 0),
      lateDeduction: Math.max(0, Number(v.lateDeduction || 0) || 0),
      earlyOutDeduction: Math.max(0, Number(v.earlyOutDeduction || 0) || 0),
      clockInTime: typeof v.clockInTime === 'string' ? v.clockInTime : defaults.clockInTime,
      clockOutTime: typeof v.clockOutTime === 'string' ? v.clockOutTime : defaults.clockOutTime,
    };

    return res.json(out);
  } catch (err) {
    console.error('Error getting attendance settings', err);
    return res.status(500).json({ message: 'Failed to fetch attendance settings' });
  }
});

router.put('/attendance', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const sanitizeDays = (val) => {
      const arr = Array.isArray(val) ? val : [];
      const out = arr
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
      return Array.from(new Set(out));
    };
    // Persist only current supported fields (drops legacy keys like leaveDeduction)
    const officialDaysOff = sanitizeDays(body.officialDaysOff);
    const value = {
      paidAbsentDays: Math.max(0, Number(body.paidAbsentDays || 0) || 0),
      absentDeduction: Math.max(0, Number(body.absentDeduction || 0) || 0),
      officialDaysOff,
      officialDaysOffNames: daysToNames(officialDaysOff),
      lateReliefMinutes: Math.max(0, Number(body.lateReliefMinutes || 0) || 0),
      lateDeduction: Math.max(0, Number(body.lateDeduction || 0) || 0),
      earlyOutDeduction: Math.max(0, Number(body.earlyOutDeduction || 0) || 0),
      clockInTime: typeof body.clockInTime === 'string' ? body.clockInTime : '09:00',
      clockOutTime: typeof body.clockOutTime === 'string' ? body.clockOutTime : '18:00',
    };
    const doc = await StaffSetting.findOneAndUpdate(
      { key: ATTENDANCE_KEY },
      { $set: { key: ATTENDANCE_KEY, value } },
      { new: true, upsert: true }
    ).lean();

    return res.json(doc.value);
  } catch (err) {
    console.error('Error saving attendance settings', err);
    return res.status(400).json({ message: 'Failed to save attendance settings' });
  }
});

module.exports = router;
