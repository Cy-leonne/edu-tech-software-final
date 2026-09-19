
const mongoose = require('mongoose');

const Student = require('./models/studentSchema.js');
const Teacher = require('./models/teacherSchema.js');
const Admin = require('./models/adminSchema.js');
const School = require('./models/schoolSchema.js');
const Sclass = require('./models/sclassSchema.js');
const Subject = require('./models/subjectSchema.js');
const Notice = require('./models/noticeSchema.js');
const Complain = require('./models/complainSchema.js');

const cleanup = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/schoolManagementSystem');
        console.log('Connected to MongoDB');

        // Delete all documents
        await Student.deleteMany({});
        console.log('✅ Students deleted');

        await Teacher.deleteMany({});
        console.log('✅ Teachers deleted');

        await Admin.deleteMany({});
        console.log('✅ Admins deleted');

        await School.deleteMany({});
        console.log('✅ Schools deleted');

        await Sclass.deleteMany({});
        console.log('✅ Classes deleted');

        await Subject.deleteMany({});
        console.log('✅ Subjects deleted');

        await Notice.deleteMany({});
        console.log('✅ Notices deleted');

        await Complain.deleteMany({});
        console.log('✅ Complains deleted');

        console.log('\n🎉 Database cleaned successfully! You can now register fresh.');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning database:', error);
        process.exit(1);
    }
};

cleanup();
