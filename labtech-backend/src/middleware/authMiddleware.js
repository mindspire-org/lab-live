const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const role = req.user && req.user.role ? String(req.user.role).trim().toLowerCase() : '';
  const allowed = new Set([
    'admin',
    'lab supervisor',
    'lab-supervisor',
    'supervisor',
  ]);
  if (!role || !allowed.has(role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

function requirePatient(req, res, next) {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Patient access required' });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin,
  requirePatient,
};
