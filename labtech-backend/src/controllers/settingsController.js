const Settings = require('../models/Settings');

// GET /api/settings - get single global settings document
async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings', err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
}

// PUT /api/settings - update global settings document
async function updateSettings(req, res) {
  try {
    const payload = req.body || {};

    // Remove deprecated lab fields (legacy clients may still send them)
    if (payload && payload.lab && typeof payload.lab === 'object') {
      delete payload.lab.consultantPathologist;
      delete payload.lab.consultantQualification;
    }

    const settings = await Settings.findOneAndUpdate({}, payload, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(settings);
  } catch (err) {
    console.error('Error updating settings', err);
    res.status(400).json({ message: 'Failed to update settings' });
  }
}

// PUT /api/settings/report-template - update only the reportTemplate field
async function updateReportTemplate(req, res) {
  try {
    const template = req.body?.reportTemplate ?? null;

    const settings = await Settings.findOneAndUpdate(
      {},
      { reportTemplate: template },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json({ reportTemplate: settings.reportTemplate });
  } catch (err) {
    console.error('Error updating report template', err);
    res.status(400).json({ message: 'Failed to update report template' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  updateReportTemplate,
};
