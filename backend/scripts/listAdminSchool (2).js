
const { connectToMongo } = require('../utils/db');
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema');
const School = require('../models/schoolSchema');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await connectToMongo(MONGO_URI);
    const admin = await Admin.findOne();
    const school = await School.findOne();
    console.log('ADMIN:', admin ? `${admin._id} - ${admin.name} - ${admin.role}` : 'none');
    console.log('SCHOOL:', school ? `${school._id} - ${school.name || school.schoolName || 'unnamed'}` : 'none');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
