const mongoose = require('mongoose');
const dotenv = require('dotenv');
const School = require('../models/schoolSchema.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const schools = await School.find({}, 'schoolName email').lean();
    console.log('School count:', schools.length);
    schools.forEach((s) => console.log(`- ${s.schoolName} | ${s.email}`));
    process.exit(0);
  } catch (err) {
    console.error('Error listing schools:', err);
    process.exit(1);
  }
})();