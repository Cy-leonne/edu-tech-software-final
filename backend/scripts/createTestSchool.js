
const { connectToMongo } = require('../utils/db');
const School = require('../models/schoolSchema');
const Admin = require('../models/adminSchema');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await connectToMongo(MONGO_URI);
    const admin = await Admin.findOne({ role: 'SuperAdmin' });
    if (!admin) {
      console.error('No SuperAdmin found.');
      process.exit(1);
    }

    let school = await School.findOne({ email: 'testschool@example.com' });
    if (!school) {
      school = new School({
        schoolName: 'Test School',
        email: 'testschool@example.com',
        phone: '+254700000000',
        address: { city: 'Nairobi' },
        schoolAdmin: admin._id,
        status: 'Active',
        createdBy: admin._id,
      });
      await school.save();
      console.log('Created school:', school._id);
    } else {
      console.log('Existing school:', school._id);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
