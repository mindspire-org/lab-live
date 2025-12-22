const express = require('express');
const router = express.Router();

const { getMyProfile, updateMyProfile, saveMyPushToken } = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');

// Current logged-in user's profile
router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateMyProfile);
router.post('/push-token', verifyToken, saveMyPushToken);

module.exports = router;
