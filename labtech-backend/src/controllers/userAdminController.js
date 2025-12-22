const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const UserManagement = require('../models/UserManagement');
const Role = require('../models/Role');

async function findExistingByEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized) return null;
  const um = await UserManagement.findOne({ email: normalized }).lean();
  if (um) return { source: 'user_management', user: um };
  const u = await User.findOne({ email: normalized }).lean();
  if (u) return { source: 'users', user: u };
  return null;
}

// USERS (user_management collection)
async function listUsers(_req, res) {
  try {
    const docs = await UserManagement.find({}).sort({ createdAt: -1 }).lean();
    return res.json(docs);
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ message: 'Failed to list users' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, role, password, status } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await findExistingByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await UserManagement.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      role: role || 'Lab Technician',
      passwordHash,
      status: status || 'Active',
    });

    return res.status(201).json(user.toObject());
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ message: 'Failed to create user' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params || {};
    const { name, email, role, password, status } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const update = {};
    if (typeof name === 'string') update.name = name;
    if (typeof email === 'string') {
      const normalized = String(email).toLowerCase().trim();
      const existing = await findExistingByEmail(normalized);
      if (existing && String(existing.user?._id) !== String(id)) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      update.email = normalized;
    }
    if (typeof role === 'string') update.role = role;
    if (typeof status === 'string') update.status = status;
    if (typeof password === 'string' && password.length) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await UserManagement.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ message: 'Failed to update user' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const user = await UserManagement.findByIdAndDelete(id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
}

async function updateUserPermissions(req, res) {
  try {
    const { id } = req.params || {};
    const { permissions } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });
    if (!Array.isArray(permissions)) return res.status(400).json({ message: 'permissions must be an array' });

    const user = await UserManagement.findByIdAndUpdate(id, { permissions }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('updateUserPermissions error:', err);
    return res.status(500).json({ message: 'Failed to update permissions' });
  }
}

// ROLES
async function listRoles(_req, res) {
  try {
    const docs = await Role.find({}).sort({ name: 1 }).lean();
    return res.json(docs);
  } catch (err) {
    console.error('listRoles error:', err);
    return res.status(500).json({ message: 'Failed to list roles' });
  }
}

async function createRole(req, res) {
  try {
    const { name, permissions } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });
    const existing = await Role.findOne({ name: String(name).trim() });
    if (existing) return res.status(409).json({ message: 'Role already exists' });

    const role = await Role.create({
      name: String(name).trim(),
      permissions: Array.isArray(permissions) ? permissions : [],
    });
    return res.status(201).json(role.toObject());
  } catch (err) {
    console.error('createRole error:', err);
    return res.status(500).json({ message: 'Failed to create role' });
  }
}

async function updateRole(req, res) {
  try {
    const { id } = req.params || {};
    const { name, permissions } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const update = {};
    if (typeof name === 'string') update.name = name;
    if (Array.isArray(permissions)) update.permissions = permissions;

    // Support legacy roles where _id was stored as a string (non-ObjectId)
    const isObjectId = mongoose.Types.ObjectId.isValid(String(id));
    if (isObjectId) {
      const role = await Role.findByIdAndUpdate(id, update, { new: true }).lean();
      if (!role) return res.status(404).json({ message: 'Role not found' });
      return res.json(role);
    }

    const result = await Role.collection.findOneAndUpdate(
      { _id: String(id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    const updated = result && result.value ? result.value : null;
    if (!updated) return res.status(404).json({ message: 'Role not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateRole error:', err);
    return res.status(500).json({ message: 'Failed to update role' });
  }
}

async function deleteRole(req, res) {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });

    // Support legacy roles where _id was stored as a string (non-ObjectId)
    const isObjectId = mongoose.Types.ObjectId.isValid(String(id));
    if (isObjectId) {
      const role = await Role.findByIdAndDelete(id).lean();
      if (!role) return res.status(404).json({ message: 'Role not found' });
      return res.json({ success: true });
    }

    const delRes = await Role.collection.deleteOne({ _id: String(id) });
    if (!delRes || delRes.deletedCount !== 1) {
      return res.status(404).json({ message: 'Role not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteRole error:', err);
    return res.status(500).json({ message: 'Failed to delete role' });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
};
