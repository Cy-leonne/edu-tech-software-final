
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Admin = require('../models/adminSchema.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

async function run() {
  const [,, emailArg, passwordArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error('Usage: node resetAdminPassword.js <email> <newPassword>');
    process.exit(1);
  }

  const email = emailArg.trim();
  const password = passwordArg;

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    let admin = await Admin.findOne({ email });
    const hash = await bcrypt.hash(password, 10);

    if (admin) {
      admin.password = hash;
      // ensure SuperAdmin role and approved
      admin.role = 'SuperAdmin';
      admin.roles = Array.from(new Set([...(admin.roles||[]), 'SuperAdmin', 'Admin']));
      admin.approved = true;
      await admin.save();
      console.log(`Updated password for existing admin: ${email}`);
    } else {
      // create a new SuperAdmin
      const newAdmin = new Admin({
        name: email.split('@')[0] || 'Super Admin',
        email,
        password: hash,
        role: 'SuperAdmin',
        approved: true,
        roles: ['SuperAdmin','Admin'],
        permissions: {
          manageTeachers: true,
          manageStudents: true,
          manageClasses: true,
          assignSubjects: true,
          manageAttendance: true,
          manageExaminations: true,
          manageFees: true,
          generateReports: true,
          sendAnnouncements: true,
          manageTimetables: true,
          createAccounts: true,
          updateSchoolProfile: true,
          resetPasswords: true,
          sendBulkSMS: true,
          sendBulkEmail: true,
        }
      });
      await newAdmin.save();
      console.log(`Created new SuperAdmin: ${email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed to reset/create admin:', err);
    process.exit(2);
  }
}

run();
