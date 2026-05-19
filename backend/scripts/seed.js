require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../src/config/db');
const UserPlan = require('../src/models/UserPlan');

const ADMIN_COLLECTION = 'admins';

const seedUserPlans = async () => {
  const existing = await UserPlan.findOne({ name: 'Standard' });
  if (existing) {
    console.log('UserPlan already seeded — skipping.');
    return;
  }

  await UserPlan.create({
    name: 'Standard',
    price: 30,
    duration_days: 90,
    grace_days: 7,
    booking_cap: null,
    is_active: true,
    description: '₹30 for 90 days — unlimited bookings',
  });
  console.log('✓ UserPlan seeded: Standard (₹30 / 90 days)');
};

const seedAdmin = async () => {
  const db = mongoose.connection.db;
  const admins = db.collection(ADMIN_COLLECTION);

  const existing = await admins.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already seeded — skipping.');
    return;
  }

  const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@DocPoint#2025', 12);
  await admins.insertOne({
    email: process.env.ADMIN_EMAIL || 'admin@docpoint.in',
    password: hashed,
    name: 'Super Admin',
    createdAt: new Date(),
  });
  console.log('✓ Admin account seeded:', process.env.ADMIN_EMAIL);
};

const run = async () => {
  try {
    await connectDB();
    await seedUserPlans();
    await seedAdmin();
    console.log('\n✅ Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

run();
