const User = require('../models/User');
const UserManagement = require('../models/UserManagement');

// GET /api/profile/me - return current user's profile
async function getMyProfile(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let user = await UserManagement.findById(userId).lean();
    if (!user) {
      user = await User.findById(userId).lean();
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      profile: {
        fullName: user.name || '',
        role: user.role || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        age: user.age || null,
        profileImage: user.profileImageUrl || null,
      },
    });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PUT /api/profile/me - update current user's profile
async function updateMyProfile(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { fullName, email, phone, gender, age, profileImage } = req.body || {};

    const update = {};
    if (typeof fullName === 'string') update.name = fullName;
    if (typeof email === 'string') update.email = email;
    if (typeof phone === 'string') update.phone = phone;
    if (typeof gender === 'string') update.gender = gender;
    if (typeof age === 'number') update.age = age;
    if (typeof profileImage === 'string') update.profileImageUrl = profileImage;

    const isInUserManagement = await UserManagement.exists({ _id: userId });
    const user = isInUserManagement
      ? await UserManagement.findByIdAndUpdate(userId, update, { new: true }).lean()
      : await User.findByIdAndUpdate(userId, update, { new: true }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      profile: {
        fullName: user.name || '',
        role: user.role || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        age: user.age || null,
        profileImage: user.profileImageUrl || null,
      },
    });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/profile/push-token - save Expo push token for current user
async function saveMyPushToken(req, res) {
  try {
    const userId = req.user ? req.user.sub : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { expoPushToken } = req.body || {};

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ success: false, message: 'expoPushToken is required' });
    }

    const isInUserManagement = await UserManagement.exists({ _id: userId });
    const user = isInUserManagement
      ? await UserManagement.findByIdAndUpdate(userId, { expoPushToken }, { new: true }).lean()
      : await User.findByIdAndUpdate(userId, { expoPushToken }, { new: true }).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('saveMyPushToken error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  saveMyPushToken,
};
