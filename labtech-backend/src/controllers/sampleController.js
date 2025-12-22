const Sample = require('../models/Sample');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const FinanceRecord = require('../models/FinanceRecord');
const Patient = require('../models/Patient');

function generateSampleNumber(year, seq) {
  const num = String(seq).padStart(3, '0');
  return `LAB-${year}-${num}`;
}

// POST /api/labtech/samples
async function createSample(req, res) {
  try {
    const body = req.body || {};

    const testsIds = Array.isArray(body.tests) ? body.tests : [];
    const tests = [];

    if (testsIds.length) {
      const testDocs = await Test.find({ _id: { $in: testsIds } }).lean();
      const testMap = new Map(testDocs.map((t) => [String(t._id), t]));
      for (const id of testsIds) {
        const key = String(id);
        const doc = testMap.get(key);
        if (doc) {
          tests.push({ test: doc._id, name: doc.name, price: doc.price || 0 });
        }
      }
    }

    const consumables = Array.isArray(body.consumables)
      ? body.consumables.map((c) => ({
          item: c.item,
          quantity: Number(c.quantity) || 1,
        }))
      : [];

    const now = new Date();
    const year = now.getFullYear();
    const prefix = `LAB-${year}-`;

    const lastSample = await Sample.findOne({ sampleNumber: { $regex: `^${prefix}` } })
      .sort({ sampleNumber: -1 })
      .lean();

    let nextSeq = 1;
    if (lastSample && typeof lastSample.sampleNumber === 'string') {
      const tail = lastSample.sampleNumber.slice(-3);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    const sampleNumber = generateSampleNumber(year, nextSeq);

    // Ensure legacy unique index on patientId is removed so one patient can have many samples
    try {
      // This will succeed once and then throw IndexNotFound (code 27) which we safely ignore
      await Sample.collection.dropIndex('patientId_1');
    } catch (idxErr) {
      if (!(idxErr && (idxErr.code === 27 || idxErr.codeName === 'IndexNotFound'))) {
        // Log other index errors but do not block sample creation
        console.error('Failed to drop legacy patientId index on samples collection', idxErr);
      }
    }

    const rawStatus = typeof body.status === 'string' ? body.status.toLowerCase() : '';
    let status = 'collected';
    if (rawStatus.includes('collect')) status = 'collected';
    else if (rawStatus.includes('process')) status = 'processing';
    else if (rawStatus.includes('complet')) status = 'completed';
    else if (rawStatus.includes('cancel')) status = 'cancelled';

    // Find or create a Patient for this intake
    let patientDoc = null;
    const query = [];
    if (body.cnic) {
      query.push({ cnic: body.cnic });
    }
    if (body.phone) {
      query.push({ phone: body.phone });
    }

    if (query.length) {
      patientDoc = await Patient.findOne({ $or: query }).lean();
    }

    if (!patientDoc) {
      let patientId = '';
      try {
        const next = await Counter.findOneAndUpdate(
          { _id: 'patientId' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        ).lean();
        const n = next && typeof next.seq === 'number' ? next.seq : 1;
        patientId = `LP${String(n).padStart(2, '0')}`;
      } catch (e) {
        patientId = 'LP01';
      }

      patientDoc = await Patient.create({
        patientId,
        name: body.patientName,
        cnic: body.cnic,
        phone: body.phone,
        age: body.age,
        gender: body.gender,
        address: body.address,
        guardianRelation: body.guardianRelation,
        guardianName: body.guardianName,
      });
    }

    const collectedSamples = (() => {
      try {
        if (Array.isArray(body.collectedSamples)) {
          return body.collectedSamples
            .map((v) => String(v || '').trim())
            .filter((v) => !!v);
        }
        const raw = String(body.collectedSample || '').trim();
        if (!raw) return [];
        return raw
          .split(',')
          .map((v) => v.trim())
          .filter((v) => !!v);
      } catch {
        return [];
      }
    })();

    const collectedSampleText = collectedSamples.length
      ? collectedSamples.join(', ')
      : (typeof body.collectedSample === 'string' ? body.collectedSample : '');

    const sample = await Sample.create({
      sampleNumber,
      patient: patientDoc._id,
      patientId: patientDoc.patientId,
      patientName: body.patientName,
      phone: body.phone,
      age: body.age,
      gender: body.gender,
      address: body.address,
      guardianRelation: body.guardianRelation,
      guardianName: body.guardianName,
      cnic: body.cnic,
      sampleCollectedBy: body.sampleCollectedBy,
      collectedSample: collectedSampleText,
      collectedSamples,
      referringDoctor: body.referringDoctor,
      tests,
      consumables,
      totalAmount: Number(body.totalAmount) || 0,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : '',
      paymentStatus: typeof body.paymentStatus === 'string' ? body.paymentStatus : 'Paid',
      paidAmount:
        body.paidAmount !== undefined
          ? Number(body.paidAmount) || 0
          : Number(body.totalAmount) || 0,
      priority: body.priority || 'normal',
      status,
    });

    // Accumulator used later to allocate income:
    // Test Revenue = paidTotal - consumablesProfit
    let consumablesProfit = 0;
    const soldLines = [];

    // Consumables selling happens at Sample Intake time.
    // - Decrement inventory stock
    // - Record Lab Income transaction based on profit (sale - cost)
    if (Array.isArray(consumables) && consumables.length) {
      const itemIds = consumables.map((c) => String(c.item || '')).filter(Boolean);
      const invalidIds = itemIds.filter((id) => !mongoose.isValidObjectId(id));
      if (invalidIds.length) {
        try {
          await Sample.deleteOne({ _id: sample._id });
        } catch {}
        return res.status(400).json({ message: 'Invalid consumable item id' });
      }
      const invRows = itemIds.length
        ? await InventoryItem.find({ _id: { $in: itemIds } }).select({
            _id: 1,
            name: 1,
            currentStock: 1,
            costPerUnit: 1,
            itemsPerPack: 1,
            salePricePerPack: 1,
            salePricePerUnit: 1,
            unit: 1,
          }).lean()
        : [];
      const invMap = new Map(invRows.map((r) => [String(r._id), r]));

      const successfulDecrements = [];

      try {
        for (const c of consumables) {
          const id = String(c.item || '');
          const qty = Number(c.quantity) || 0;
          if (!id || qty <= 0) continue;

          const inv = invMap.get(id);
          if (!inv) {
            throw new Error('Inventory item not found');
          }

          // Price resolution: prefer per-unit, else derive per-unit from pack price.
          let unitPrice = Number(inv.salePricePerUnit);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            const packPrice = Number(inv.salePricePerPack);
            const itemsPerPack = Number(inv.itemsPerPack);
            if (Number.isFinite(packPrice) && packPrice > 0 && Number.isFinite(itemsPerPack) && itemsPerPack > 0) {
              unitPrice = packPrice / itemsPerPack;
            } else {
              unitPrice = 0;
            }
          }

          // Conditional decrement to avoid negative stock
          const updated = await InventoryItem.findOneAndUpdate(
            { _id: id, currentStock: { $gte: qty } },
            { $inc: { currentStock: -qty } },
            { new: true }
          ).lean();

          if (!updated) {
            throw new Error('Insufficient stock');
          }

          successfulDecrements.push({ id, qty });

          const unitCost = Number(inv.costPerUnit) || 0;
          const unitProfit = unitPrice > 0 ? unitPrice - unitCost : 0;
          const lineProfit = unitProfit > 0 ? unitProfit * qty : 0;
          consumablesProfit += lineProfit;
          soldLines.push({
            name: String(inv.name || ''),
            quantity: qty,
            unit: String(inv.unit || ''),
            unitPrice,
            unitCost,
          });
        }

        // Record finance income only when the sample is paid (or legacy missing paymentStatus)
        const payStatus = String(sample.paymentStatus || '').trim();
        const isPaid = !payStatus || payStatus === 'Paid';
        if (isPaid && consumablesProfit > 0) {
          const recordedBy = String(req?.user?.name || req?.user?.email || req?.user?.id || 'admin');
          const soldText = soldLines
            .map((l) => `${l.name} x${l.quantity}${l.unit ? ` ${l.unit}` : ''}`)
            .join(', ');

          await FinanceRecord.create({
            date: new Date(),
            amount: consumablesProfit,
            category: 'Consumables Profit',
            description: `Consumables profit for Sample ${sample.sampleNumber} (${String(sample.patientName || '')}). ${soldText}`,
            department: 'Lab',
            type: 'Income',
            recordedBy,
            reference: sample.sampleNumber,
          });
        }
      } catch (e) {
        // Rollback inventory decrements and the created sample
        try {
          for (const r of successfulDecrements) {
            await InventoryItem.updateOne({ _id: r.id }, { $inc: { currentStock: Number(r.qty) || 0 } });
          }
        } catch (rollbackErr) {
          console.error('Failed to rollback inventory decrement', rollbackErr);
        }
        try {
          await Sample.deleteOne({ _id: sample._id });
        } catch (rollbackErr) {
          console.error('Failed to rollback sample creation', rollbackErr);
        }
        const msg = String(e?.message || '').includes('stock') ? String(e.message) : 'Failed to process consumables';
        return res.status(400).json({ message: msg });
      }
    }

    // Record test revenue as a separate income entry.
    // Accounting rule:
    // - Total income for the sample should equal paidTotal
    // - Consumables contribute only PROFIT as separate income
    // - Test Revenue is the remainder: paidTotal - consumablesProfit
    // Only record when the sample is paid (or legacy missing paymentStatus).
    try {
      const payStatus = String(sample.paymentStatus || '').trim();
      const isPaid = !payStatus || payStatus === 'Paid';
      const paidTotal = Number(sample.paidAmount) > 0 ? Number(sample.paidAmount) : Number(sample.totalAmount) || 0;
      const remainder = paidTotal - (typeof consumablesProfit === 'number' ? consumablesProfit : 0);
      const testRevenue = Number.isFinite(remainder) && remainder > 0 ? remainder : 0;

      if (isPaid && testRevenue > 0) {
        const recordedBy = String(req?.user?.name || req?.user?.email || req?.user?.id || 'admin');
        await FinanceRecord.create({
          date: new Date(),
          amount: testRevenue,
          category: 'Test Revenue',
          description: `Test revenue for Sample ${sample.sampleNumber} (${String(sample.patientName || '')})`,
          department: 'Lab',
          type: 'Income',
          recordedBy,
          reference: sample.sampleNumber,
        });
      }
    } catch (e) {
      console.error('Failed to record test revenue finance entry', e);
      // best-effort: sample creation should still succeed
    }

    return res.status(201).json(sample);
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.sampleNumber) {
      console.error('Duplicate sampleNumber when creating sample:', err.keyValue);
      return res.status(409).json({ message: 'A sample with this sampleNumber already exists. Please retry.' });
    }
    console.error('Error creating sample:', err);
    return res.status(500).json({ message: 'Failed to create sample' });
  }
}

// GET /api/labtech/samples
async function getSamples(_req, res) {
  try {
    const samples = await Sample.find().sort({ createdAt: -1 }).lean();
    return res.json(samples);
  } catch (err) {
    console.error('Error fetching samples:', err);
    return res.status(500).json({ message: 'Failed to fetch samples' });
  }
}

async function updateSampleStatus(req, res) {
  try {
    const { id } = req.params || {};
    const body = req.body || {};

    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }

    const hasStatus = typeof body.status === 'string' || typeof body.sampleStatus === 'string';
    const raw = typeof body.status === 'string' ? body.status : body.sampleStatus;
    const rawLower = typeof raw === 'string' ? raw.toLowerCase() : '';
    let status = null;
    if (hasStatus) {
      status = 'collected';
      if (rawLower.includes('collect')) status = 'collected';
      else if (rawLower.includes('process')) status = 'processing';
      else if (rawLower.includes('complet')) status = 'completed';
      else if (rawLower.includes('cancel')) status = 'cancelled';
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { sampleNumber: id };

    const update = {};
    if (status) {
      update.status = status;
    }
    if (typeof body.barcode === 'string') {
      update.barcode = body.barcode;
    }
    if (typeof body.processingBy === 'string') {
      update.processingBy = body.processingBy;
    }
    if (body.expectedCompletionAt) {
      const dt = new Date(body.expectedCompletionAt);
      if (!isNaN(dt.getTime())) {
        update.expectedCompletionAt = dt;
      }
    }
    if (Array.isArray(body.results)) {
      update.results = body.results;
    }
    if (typeof body.interpretation === 'string') {
      update.interpretation = body.interpretation;
    }
    // Persist per-test interpretations when provided
    if (Array.isArray(body.interpretations)) {
      update.interpretations = body.interpretations;
    } else if (Array.isArray(body.testInterpretations)) {
      update.interpretations = body.testInterpretations;
    }
    if (status === 'completed') {
      update.completedAt = new Date();
    }

    const updated = await Sample.findOneAndUpdate(
      query,
      update,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    if (Array.isArray(body.results) && body.results.length) {
      try {
        const editExisting = !!body.editExisting;
        const trQuery = { sample: updated._id };
        const existing = await TestResult.findOne(trQuery).sort({ createdAt: -1 });
        const payload = {
          sample: updated._id,
          sampleNumber: updated.sampleNumber,
          patientName: updated.patientName,
          phone: updated.phone,
          age: updated.age,
          gender: updated.gender,
          address: updated.address,
          cnic: updated.cnic,
          tests: (updated.tests || []).map((t) => ({ name: t.name, test: t.test })),
          results: body.results,
          interpretation: update.interpretation || updated.interpretation || '',
          interpretations: update.interpretations || updated.interpretations || [],
          status,
        };
        if (editExisting || existing) {
          if (existing) {
            await TestResult.updateOne({ _id: existing._id }, payload);
          } else {
            await TestResult.create(payload);
          }
        } else {
          await TestResult.create(payload);
        }
      } catch (err) {
        console.error('Failed to upsert TestResult entry', err);
      }
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating sample status:', err);
    return res.status(500).json({ message: 'Failed to update sample status' });
  }
}

// GET /api/labtech/samples/:id - fetch single sample by Mongo _id or sampleNumber
async function getSampleById(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { sampleNumber: id };

    const sample = await Sample.findOne(query).lean();
    if (!sample) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    return res.json(sample);
  } catch (err) {
    console.error('Error fetching sample by id:', err);
    return res.status(500).json({ message: 'Failed to fetch sample' });
  }
}

// GET /api/labtech/samples/:id/test-result - latest test_result by sample _id or sampleNumber
async function getLatestTestResult(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    // Try direct lookup on TestResult
    let tr = await TestResult.findOne(isObjectId ? { sample: id } : { sampleNumber: id })
      .sort({ createdAt: -1 })
      .lean();
    if (!tr && isObjectId) {
      // Attempt via sampleNumber if sample exists
      const sample = await Sample.findOne({ _id: id }).lean();
      if (sample && sample.sampleNumber) {
        tr = await TestResult.findOne({ sampleNumber: sample.sampleNumber })
          .sort({ createdAt: -1 })
          .lean();
      }
    }
    if (!tr) return res.status(404).json({ message: 'No test result found for this sample' });
    return res.json(tr);
  } catch (err) {
    console.error('Error fetching latest test result:', err);
    return res.status(500).json({ message: 'Failed to fetch test result' });
  }
}

// DELETE /api/labtech/samples/:id - delete sample by Mongo _id or sampleNumber
async function deleteSample(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing sample id' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { sampleNumber: id };

    const sample = await Sample.findOne(query).lean();
    if (!sample) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    // cleanup related test results (if any)
    try {
      const sampleId = String(sample._id);
      const sampleNumber = String(sample.sampleNumber || '');
      await TestResult.deleteMany({
        $or: [
          { sample: sampleId },
          ...(sampleNumber ? [{ sampleNumber }] : []),
        ],
      });
    } catch (cleanupErr) {
      console.error('Failed to cleanup TestResult for deleted sample:', cleanupErr);
      // don't block deletion
    }

    await Sample.deleteOne({ _id: sample._id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting sample:', err);
    return res.status(500).json({ message: 'Failed to delete sample' });
  }
}

module.exports = {
  createSample,
  getSamples,
  updateSampleStatus,
  getSampleById,
  getLatestTestResult,
  deleteSample,
};
