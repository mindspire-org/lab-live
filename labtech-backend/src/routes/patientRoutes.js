const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const Patient = require('../models/Patient');

const router = express.Router();

// GET /api/lab/patients/lookup?cnic=...&phone=...
router.get('/lookup', verifyToken, async (req, res) => {
  try {
    const { cnic, phone } = req.query || {};
    const cnicStr = typeof cnic === 'string' ? cnic.trim() : '';
    const phoneStr = typeof phone === 'string' ? phone.trim() : '';

    if (!cnicStr && !phoneStr) {
      return res.status(400).json({ success: false, message: 'cnic or phone is required' });
    }

    const query = cnicStr
      ? { cnic: cnicStr }
      : { phone: phoneStr };

    const patient = await Patient.findOne(query).lean();
    if (!patient) {
      return res.json({ success: true, patient: null });
    }

    return res.json({ success: true, patient: {
      patientId: patient.patientId || null,
      name: patient.name || '',
      cnic: patient.cnic || '',
      phone: patient.phone || '',
      age: patient.age || '',
      gender: patient.gender || '',
      address: patient.address || '',
      guardianRelation: patient.guardianRelation || '',
      guardianName: patient.guardianName || '',
    }});
  } catch (err) {
    console.error('Error in patient lookup', err);
    return res.status(500).json({ success: false, message: 'Failed to lookup patient' });
  }
});

module.exports = router;
