const mongoose = require('mongoose');
const Student = require('../models/studentSchema');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

async function run() {
  const nameArg = process.argv[2] || '';
  const rollArg = process.argv[3] || '';
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const query = {};
    if (nameArg) query.name = new RegExp(nameArg, 'i');
    if (rollArg) query.rollNum = Number(rollArg);
    const docs = await Student.find(query).limit(20).lean();
    if (!docs || docs.length === 0) {
      console.log('No students found for', nameArg, rollArg);
    } else {
      docs.forEach(d => {
        console.log('---');
        console.log('id:', d._id);
        console.log('name:', d.name);
        console.log('admissionNo:', d.admissionNo);
        console.log('rollNum:', d.rollNum);
        console.log('class:', d.sclassName);
        console.log('school:', d.school);
        console.log('parentEmail:', d.parentEmail);
      });
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    mongoose.disconnect();
  }
}

run();