require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MONGO_URI } = require('../src/config/env');
const User = require('../src/models/User');

// Change these if you want different admin credentials
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Admin#123@';
const ADMIN_NAME = 'Admin';

async function createAdmin() {
  try {
    const mongoUri = MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not set in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    console.log(`Creating/updating admin user: ${ADMIN_EMAIL}`);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const adminUser = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL.toLowerCase() },
      {
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin',
        name: ADMIN_NAME,
      },
      { new: true, upsert: true }
    );

    console.log('Admin user is ready:');
    console.log({
      id: adminUser._id.toString(),
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    });

    console.log('\nUse these credentials to log in as admin from the app:');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
