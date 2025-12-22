const express = require('express');
const router = express.Router();

const { getSettings, updateSettings, updateReportTemplate } = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public GET for now (labweb may not send auth yet). If you want to restrict later,
// you can add verifyToken/requireAdmin here as well.
router.get('/', getSettings);

// Admin-only update of settings
router.put('/', verifyToken, requireAdmin, updateSettings);

// Update of report template used by Report Designer (no auth for now, similar to GET)
router.put('/report-template', updateReportTemplate);

module.exports = router;
