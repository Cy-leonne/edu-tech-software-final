
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const School = require('../models/schoolSchema.js');
const Employee = require('../models/employeeSchema.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';
const SCHOOL_NAME = process.env.STAFF_SCHOOL_NAME || 'Default School';
const STAFF_FIRST_NAME = process.env.STAFF_FIRST_NAME || 'Jane';
const STAFF_LAST_NAME = process.env.STAFF_LAST_NAME || 'Doe';
const STAFF_EMAIL = process.env.STAFF_EMAIL || 'staff.one@example.com';
const STAFF_PHONE = process.env.STAFF_PHONE || '+254700000000';
const STAFF_DEPARTMENT = process.env.STAFF_DEPARTMENT || 'HR';
const STAFF_POSITION = process.env.STAFF_POSITION || 'HR Officer';
const STAFF_EMPLOYMENT_TYPE = process.env.STAFF_EMPLOYMENT_TYPE || 'Full-time';
const STAFF_DATE_OF_JOINING = process.env.STAFF_DATE_OF_JOINING || new Date().toISOString().split('T')[0];

const sampleEmployee = {
  firstName: STAFF_FIRST_NAME,
  lastName: STAFF_LAST_NAME,
  email: STAFF_EMAIL,
  phone: STAFF_PHONE,
  department: STAFF_DEPARTMENT,
  position: STAFF_POSITION,
  employmentType: STAFF_EMPLOYMENT_TYPE,
  dateOfJoining: STAFF_DATE_OF_JOINING,
};

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const school = await School.findOne({ schoolName: SCHOOL_NAME });
  if (!school) {
    console.error(`No school found with name '${SCHOOL_NAME}'.`);
    console.error('Please create the school first or set STAFF_SCHOOL_NAME to an existing school name.');
    process.exit(1);
  }

  const existing = await Employee.findOne({ email: sampleEmployee.email, school: school._id });
  if (existing) {
    console.log('Employee already exists:');
    console.log(`- ID: ${existing._id}`);
    console.log(`- Email: ${existing.email}`);
    console.log(`- Employee ID: ${existing.employeeId}`);
    process.exit(0);
  }

  const count = await Employee.countDocuments({ school: school._id });
  const employeeId = `EMP${String(count + 1).padStart(5, '0')}`;

  const employee = new Employee({
    ...sampleEmployee,
    employeeId,
    school: school._id,
    status: 'Active',
  });

  await employee.save();

  console.log('Created employee successfully:');
  console.log(`- ID: ${employee._id}`);
  console.log(`- Email: ${employee.email}`);
  console.log(`- Employee ID: ${employee.employeeId}`);
  console.log(`- School: ${school.schoolName} (${school._id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error creating employee:', err);
  process.exit(1);
});
