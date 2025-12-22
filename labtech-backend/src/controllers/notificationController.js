const Notification = require('../models/Notification');

// GET /api/notifications/mine - notifications for the authenticated user
async function getMyNotifications(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('Get my notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/notifications/mine/read-all - mark all as read for current user
async function markAllMyNotificationsRead(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    return res.json({ success: true });
  } catch (err) {
    console.error('Mark all my notifications read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/notifications/mine/:id/read - mark a single notification as read
async function markMyNotificationRead(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, notification });
  } catch (err) {
    console.error('Mark my notification read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/notifications - create a notification for a target user
// This will be used by server-side flows in the future; for now, the
// mobile app will call it when specific events happen.
async function createNotification(req, res) {
  try {
    const { userId, audience, type, title, message, icon, iconColor, appointmentId } = req.body;

    if (!userId || !audience || !title || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const notification = await Notification.create({
      user: userId,
      audience,
      type,
      title,
      message,
      icon,
      iconColor,
      appointment: appointmentId || undefined,
    });

    return res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  createNotification,
};
