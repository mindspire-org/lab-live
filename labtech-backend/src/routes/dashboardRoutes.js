const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const Sample = require('../models/Sample');

const router = express.Router();

// GET /api/lab/dashboard/kpis
// Returns high-level lab KPIs derived from the Sample collection
router.get('/kpis', verifyToken, async (_req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayMatch = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    const rawToday = await Sample.find(todayMatch).lean();

    const normalizeStatus = (s) => {
      const v = String(s || '').toLowerCase();
      if (v.includes('complet')) return 'completed';
      if (v.includes('process')) return 'processing';
      return 'collected';
    };

    const samplesToday = rawToday.map((s) => ({
      ...s,
      _normStatus: normalizeStatus(s.status),
    }));

    const pending = samplesToday.filter((s) => s._normStatus === 'collected').length;
    const inProgress = samplesToday.filter((s) => s._normStatus === 'processing').length;
    const completedToday = samplesToday.filter((s) => s._normStatus === 'completed').length;

    const urgent = samplesToday.filter((s) => {
      const pr = String(s.priority || '').toLowerCase();
      const urgentByPriority = pr === 'urgent' || pr === 'high';
      const urgentByCritical = Array.isArray(s.results) && s.results.some((r) => r && r.isCritical);
      return urgentByPriority || urgentByCritical;
    }).length;

    return res.json({ pending, inProgress, completedToday, urgent });
  } catch (err) {
    console.error('Error computing dashboard KPIs:', err);
    return res.status(500).json({ message: 'Failed to compute dashboard KPIs' });
  }
});

module.exports = router;
