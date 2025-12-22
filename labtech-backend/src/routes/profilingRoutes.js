const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const ProfilingRecord = require('../models/ProfilingRecord');
const Sample = require('../models/Sample');
const Patient = require('../models/Patient');

const router = express.Router();

function toSafeDateString(d) {
  try {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

async function enrichWithVisits(records) {
  const out = [];
  for (const r of records) {
    const phone = String(r.phone || '').trim();
    const cnic = String(r.cnic || '').trim();

    const sampleFilter = {
      $or: [
        ...(phone ? [{ phone }] : []),
        ...(cnic ? [{ cnic }] : []),
      ],
    };

    const samples = (phone || cnic)
      ? await Sample.find(sampleFilter, { createdAt: 1, collectedSample: 1 })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const numberOfVisits = samples.length;
    const lastVisitDate = samples[0]?.createdAt ? toSafeDateString(samples[0].createdAt) : null;

    const sampleTypes = Array.from(
      new Set(
        samples
          .map((s) => String(s?.collectedSample || '').trim())
          .filter(Boolean)
      )
    );

    out.push({
      _id: r._id,
      name: r.name,
      cnic: r.cnic,
      phone: r.phone,
      profilingNotes: r.profilingNotes || '',
      numberOfVisits,
      lastVisitDate,
      sampleTypes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }
  return out;
}

async function getPatientsFromSamples() {
  // Build the left-side list from Sample intake data.
  // Prefer CNIC for identity; fall back to phone if CNIC is missing.
  const rows = await Sample.aggregate([
    {
      $match: {
        $or: [
          { cnic: { $exists: true, $ne: null, $ne: '' } },
          { phone: { $exists: true, $ne: null, $ne: '' } },
        ],
      },
    },
    {
      $addFields: {
        _cnic: { $ifNull: ['$cnic', ''] },
        _phone: { $ifNull: ['$phone', ''] },
        _name: { $ifNull: ['$patientName', ''] },
        _sampleType: { $ifNull: ['$collectedSample', ''] },
      },
    },
    {
      $group: {
        _id: {
          key: {
            $cond: [
              { $ne: ['$_cnic', ''] },
              { $concat: ['cnic:', '$_cnic'] },
              { $concat: ['phone:', '$_phone'] },
            ],
          },
          cnic: '$_cnic',
          phone: '$_phone',
        },
        name: { $first: '$_name' },
        lastVisitDate: { $max: '$createdAt' },
        numberOfVisits: { $sum: 1 },
        sampleTypes: { $addToSet: '$_sampleType' },
      },
    },
    { $sort: { lastVisitDate: -1 } },
  ]);

  return rows.map((r) => ({
    key: String(r?._id?.key || ''),
    name: String(r?.name || '').trim(),
    cnic: String(r?._id?.cnic || '').trim(),
    phone: String(r?._id?.phone || '').trim(),
    numberOfVisits: Number(r?.numberOfVisits || 0),
    lastVisitDate: toSafeDateString(r?.lastVisitDate),
    sampleTypes: Array.isArray(r?.sampleTypes)
      ? r.sampleTypes.map((s) => String(s || '').trim()).filter(Boolean)
      : [],
  }));
}

// List
router.get('/', verifyToken, async (_req, res) => {
  try {
    const patients = await getPatientsFromSamples();

    // Merge any existing profiling notes by CNIC.
    const cnics = patients.map((p) => p.cnic).filter(Boolean);
    const existing = cnics.length
      ? await ProfilingRecord.find({ cnic: { $in: cnics } }).lean()
      : [];
    const byCnic = new Map(existing.map((r) => [String(r.cnic || '').trim(), r]));

    // Also merge by phone for patients without CNIC (or when CNIC doesn't match).
    const phones = patients.map((p) => p.phone).filter(Boolean);
    const existingByPhone = phones.length
      ? await ProfilingRecord.find({ phone: { $in: phones } }).lean()
      : [];
    const byPhone = new Map(existingByPhone.map((r) => [String(r.phone || '').trim(), r]));

    // Merge Patient master data (patientId, age, gender, address) using cnic/phone
    const patientCnics = patients.map((p) => p.cnic).filter(Boolean);
    const patientPhones = patients.map((p) => p.phone).filter(Boolean);

    const patientRows = (patientCnics.length || patientPhones.length)
      ? await Patient.find({
          $or: [
            ...(patientCnics.length ? [{ cnic: { $in: patientCnics } }] : []),
            ...(patientPhones.length ? [{ phone: { $in: patientPhones } }] : []),
          ],
        }).lean()
      : [];

    const patientByCnic = new Map(patientRows.map((r) => [String(r.cnic || '').trim(), r]));
    const patientByPhone = new Map(patientRows.map((r) => [String(r.phone || '').trim(), r]));

    const items = patients.map((p) => {
      const match = (p.cnic ? byCnic.get(p.cnic) : null) || (p.phone ? byPhone.get(p.phone) : null);
      const patient = (p.cnic ? patientByCnic.get(p.cnic) : null) || (p.phone ? patientByPhone.get(p.phone) : null);
      const syntheticId = p.cnic
        ? `CNIC:${p.cnic}`
        : p.phone
          ? `PHONE:${p.phone}`
          : `SAMPLE:${p.key}`;
      return {
        _id: match?._id ? String(match._id) : syntheticId,
        patientId: patient?.patientId || null,
        name: p.name,
        cnic: p.cnic,
        phone: p.phone,
        age: patient?.age || null,
        gender: patient?.gender || null,
        address: patient?.address || '',
        profilingNotes: String(match?.profilingNotes || ''),
        numberOfVisits: p.numberOfVisits,
        lastVisitDate: p.lastVisitDate,
        sampleTypes: p.sampleTypes,
        createdAt: match?.createdAt,
        updatedAt: match?.updatedAt,
      };
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching profiling records', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profiling' });
  }
});

// Create
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const cnic = String(body.cnic || '').trim();
    const phone = String(body.phone || '').trim();
    const profilingNotes = body.profilingNotes != null ? String(body.profilingNotes) : '';

    if (!name || !cnic || !phone) {
      return res.status(400).json({ success: false, message: 'Name, CNIC and phone are required.' });
    }

    const created = await ProfilingRecord.create({ name, cnic, phone, profilingNotes });
    const items = await enrichWithVisits([created.toObject()]);
    return res.status(201).json({ success: true, item: items[0] });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Profile already exists for this CNIC.' });
    }
    console.error('Error creating profiling record', err);
    return res.status(400).json({ success: false, message: 'Failed to create profiling' });
  }
});

// Get one
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profiling id' });
    }
    const row = await ProfilingRecord.findById(id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Profile not found' });
    const items = await enrichWithVisits([row]);
    return res.json({ success: true, item: items[0] });
  } catch (err) {
    console.error('Error fetching profiling record', err);
    return res.status(400).json({ success: false, message: 'Failed to fetch profiling' });
  }
});

// Update
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Allow synthetic ids generated from the samples list.
    // Example: CNIC:35202-1234567-1
    if (String(id || '').startsWith('CNIC:')) {
      const cnic = String(id).slice('CNIC:'.length).trim();
      if (!cnic) return res.status(400).json({ success: false, message: 'CNIC is required' });

      const update = {
        name: body.name != null ? String(body.name).trim() : undefined,
        phone: body.phone != null ? String(body.phone).trim() : undefined,
        profilingNotes: body.profilingNotes != null ? String(body.profilingNotes) : undefined,
      };
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      const upserted = await ProfilingRecord.findOneAndUpdate(
        { cnic },
        { $set: update, $setOnInsert: { cnic } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();

      const items = await enrichWithVisits([upserted]);
      return res.json({ success: true, item: items[0] });
    }

    // Example: PHONE:03001234567
    if (String(id || '').startsWith('PHONE:')) {
      const phone = String(id).slice('PHONE:'.length).trim();
      if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

      const update = {
        name: body.name != null ? String(body.name).trim() : undefined,
        cnic: body.cnic != null ? String(body.cnic).trim() : undefined,
        profilingNotes: body.profilingNotes != null ? String(body.profilingNotes) : undefined,
      };
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      const upserted = await ProfilingRecord.findOneAndUpdate(
        { phone },
        { $set: update, $setOnInsert: { phone } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();

      const items = await enrichWithVisits([upserted]);
      return res.json({ success: true, item: items[0] });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profiling id' });
    }

    const update = {
      name: body.name != null ? String(body.name).trim() : undefined,
      cnic: body.cnic != null ? String(body.cnic).trim() : undefined,
      phone: body.phone != null ? String(body.phone).trim() : undefined,
      profilingNotes: body.profilingNotes != null ? String(body.profilingNotes) : undefined,
    };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const updated = await ProfilingRecord.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Profile not found' });

    const items = await enrichWithVisits([updated]);
    return res.json({ success: true, item: items[0] });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Profile already exists for this CNIC.' });
    }
    console.error('Error updating profiling record', err);
    return res.status(400).json({ success: false, message: 'Failed to update profiling' });
  }
});

// Delete
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profiling id' });
    }
    const deleted = await ProfilingRecord.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting profiling record', err);
    return res.status(400).json({ success: false, message: 'Failed to delete profiling' });
  }
});

module.exports = router;
