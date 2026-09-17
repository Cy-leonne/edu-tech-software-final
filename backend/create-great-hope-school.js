const mongoose = require('mongoose');
const School = require('./models/schoolSchema');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const adminId = '6a608ce9ffe3b05a8ed7803b';
    const schoolName = 'great hope accademy';

    const existing = await School.findOne({ schoolName: { $regex: schoolName, $options: 'i' } });
    if (existing) {
      console.log(JSON.stringify({ existing: existing.toObject() }, null, 2));
      await mongoose.disconnect();
      return;
    }

    const school = new School({
      schoolName,
      email: 'info@greathopeacademy.com',
      phone: '0712345678',
      address: { street: 'Main Street', city: 'Nairobi', state: 'Nairobi', country: 'Kenya' },
      schoolAdmin: adminId,
      status: 'Active',
      features: {
        assignmentsEnabled: true,
        attendanceEnabled: true,
        feesEnabled: true,
        examsEnabled: true,
        complaintsEnabled: true,
        remindersEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
      },
      createdBy: adminId,
    });

    await school.save();
    console.log(JSON.stringify({ saved: school.toObject() }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();