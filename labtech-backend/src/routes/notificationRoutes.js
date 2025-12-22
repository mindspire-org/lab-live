const express = require('express');
const router = express.Router();

const {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  createNotification,
} = require('../controllers/notificationController');

const { verifyToken } = require('../middleware/authMiddleware');

// Authenticated user gets own notifications
router.get('/mine', verifyToken, getMyNotifications);

// Authenticated user marks all own notifications as read
router.patch('/mine/read-all', verifyToken, markAllMyNotificationsRead);

// Authenticated user marks a single own notification as read
router.patch('/mine/:id/read', verifyToken, markMyNotificationRead);

// Create a notification for a target user (admin or system usage)
router.post('/', verifyToken, createNotification);

module.exports = router;
