const mongoose = require('mongoose');
const Admin = require('./models/adminSchema.js');
const Student = require('./models/studentSchema.js');
const uri = 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const admin = await Admin.findOne().lean();
    const student = await Student.findOne().lean();
    console.log('admin', admin ? { _id: admin._id.toString(), role: admin.role, schoolName: admin.schoolName, school: admin.school || null, schoolId: admin.schoolId || null } : null);
    console.log('student', student ? { _id: student._id.toString(), school: student.school ? student.school.toString() : null } : null);
    if (admin) {
      const count = await Student.countDocuments({ school: admin._id });
      console.log('studentsWithAdminSchool', count);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
})();