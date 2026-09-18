
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Admin = require('../models/adminSchema.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = 'jkoilel@gmail.com';
    const password = '12345';
    const schoolName = 'SuperAdmin School';

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(`SuperAdmin account already exists for ${email}.`);
      console.log(`Role: ${existingAdmin.role}, Approved: ${existingAdmin.approved}`);
      if (existingAdmin.role !== 'SuperAdmin' || !existingAdmin.approved) {
        const hash = await bcrypt.hash(password, 10);
        existingAdmin.password = hash;
        existingAdmin.role = 'SuperAdmin';
        existingAdmin.roles = ['SuperAdmin', 'Admin'];
        existingAdmin.approved = true;
        await existingAdmin.save();
        console.log('Updated existing account to SuperAdmin with the new password.');
      }
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      name: 'Super Admin',
      email,
      password: hashedPassword,
      role: 'SuperAdmin',
      approved: true,
      roles: ['SuperAdmin', 'Admin'],
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
      },
      schoolName,
    });

    const result = await admin.save();
    console.log('Created SuperAdmin successfully:', result.email);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create SuperAdmin:', error);
    process.exit(1);
  }
})();
