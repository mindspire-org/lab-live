const express = require('express');
const router = express.Router();

const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/userAdminController');

const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Users
router.get('/users', listUsers);
router.post('/users', verifyToken, requireAdmin, createUser);
router.put('/users/:id', verifyToken, requireAdmin, updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, deleteUser);
router.put('/users/:id/permissions', verifyToken, requireAdmin, updateUserPermissions);

// Roles
router.get('/roles', listRoles);
router.post('/roles', verifyToken, requireAdmin, createRole);
router.put('/roles/:id', verifyToken, requireAdmin, updateRole);
router.delete('/roles/:id', verifyToken, requireAdmin, deleteRole);

module.exports = router;
