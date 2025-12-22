const express = require('express');
const Test = require('../models/Test');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/tests - list all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().sort({ name: 1 });
    res.json(tests);
  } catch (err) {
    console.error('Error fetching tests', err);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
});

// POST /api/tests - create test (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const test = new Test({
      name: body.name,
      category: body.category,
      description: body.description || body.notes || '',
      price: body.price || 0,
      sampleType: body.sampleType || 'blood',
      fastingRequired: !!body.fastingRequired,
      parameters: Array.isArray(body.parameters) ? body.parameters : [],
    });
    const saved = await test.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating test', err);
    res.status(400).json({ message: 'Failed to create test' });
  }
});

// PUT /api/tests/:id - update test (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      name: body.name,
      category: body.category,
      description: body.description || body.notes || '',
      price: body.price,
      sampleType: body.sampleType,
      fastingRequired: !!body.fastingRequired,
    };
    if (Array.isArray(body.parameters)) {
      update.parameters = body.parameters;
    }

    const updated = await Test.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating test', err);
    res.status(400).json({ message: 'Failed to update test' });
  }
});

// DELETE /api/tests/:id - delete test (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Test.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting test', err);
    res.status(400).json({ message: 'Failed to delete test' });
  }
});

module.exports = router;
