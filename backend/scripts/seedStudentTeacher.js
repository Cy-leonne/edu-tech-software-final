
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Admin = require('../models/adminSchema.js');
const Sclass = require('../models/sclassSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

const ensureSuperAdminSchool = async () => {
  const adminEmail = 'admin@nita.co.ke';
  const schoolName = 'NITA School';
  const password = '12345';

  let admin = await Admin.findOne({ email: adminEmail });
  if (!admin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    admin = new Admin({
      name: 'NITA Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      roles: ['Admin'],
      approved: true,
      schoolName,
    });
    await admin.save();
    console.log(`Created admin ${adminEmail}`);
  } else {
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      admin.password = await bcrypt.hash(password, 10);
      await admin.save();
      console.log(`Updated admin password for ${adminEmail}`);
    }
    if (!admin.schoolName || admin.schoolName !== schoolName) {
      admin.schoolName = schoolName;
      await admin.save();
      console.log(`Updated schoolName for ${adminEmail}`);
    }
  }

  return admin;
};

const ensureClassAndSubject = async (schoolId) => {
  let sclass = await Sclass.findOne({ sclassName: '1', school: schoolId });
  if (!sclass) {
    sclass = new Sclass({ sclassName: '1', school: schoolId });
    await sclass.save();
    console.log('Created class 1');
  }

  let subject = await Subject.findOne({ subName: 'Maths', sclassName: sclass._id, school: schoolId });
  if (!subject) {
    subject = new Subject({ subName: 'Maths', subCode: 'MATHS-001', sessions: 0, sclassName: sclass._id, school: schoolId });
    await subject.save();
    console.log('Created subject Maths for class 1');
  }

  return { sclass, subject };
};

const ensureTeacher = async (schoolId, sclassId, subjectId) => {
  const email = 'jkoilel@nita.co.ke';
  const password = '12345';
  const name = 'james koille';
  const role = 'Teacher';

  let teacher = await Teacher.findOne({ email, school: schoolId });
  if (!teacher) {
    const hashedPass = await bcrypt.hash(password, 10);
    teacher = new Teacher({
      name,
      email,
      password: hashedPass,
      role,
      school: schoolId,
      teachSubject: subjectId,
      teachSclass: sclassId,
    });
    await teacher.save();
    console.log(`Created teacher ${email}`);
  } else {
    let updated = false;
    const passwordMatch = await bcrypt.compare(password, teacher.password);
    if (!passwordMatch) {
      teacher.password = await bcrypt.hash(password, 10);
      updated = true;
      console.log(`Updated password for teacher ${email}`);
    }
    if (!teacher.teachSubject || teacher.teachSubject.toString() !== subjectId.toString()) {
      teacher.teachSubject = subjectId;
      updated = true;
      console.log(`Assigned Maths subject to teacher ${email}`);
    }
    if (!teacher.teachSclass || teacher.teachSclass.toString() !== sclassId.toString()) {
      teacher.teachSclass = sclassId;
      updated = true;
      console.log(`Assigned class 1 to teacher ${email}`);
    }
    if (!teacher.school || teacher.school.toString() !== schoolId.toString()) {
      teacher.school = schoolId;
      updated = true;
    }
    if (updated) {
      await teacher.save();
      console.log(`Updated teacher ${email}`);
    }
  }

  return teacher;
};

const ensureStudent = async (schoolId, sclassId) => {
  const admissionNo = '001';
  const rollNum = 1;
  const password = '12345';
  const name = 'james koilel';

  let student = await Student.findOne({ $or: [{ admissionNo }, { school: schoolId, sclassName: sclassId, rollNum }] });
  if (!student) {
    const hashedPass = await bcrypt.hash(password, 10);
    student = new Student({
      name,
      admissionNo,
      rollNum,
      password: hashedPass,
      sclassName: sclassId,
      school: schoolId,
      role: 'Student',
    });
    await student.save();
    console.log(`Created student ${name} admissionNo=${admissionNo}`);
  } else {
    let updated = false;
    if (student.name !== name) {
      student.name = name;
      updated = true;
    }
    if (student.admissionNo !== admissionNo) {
      student.admissionNo = admissionNo;
      updated = true;
    }
    if (student.rollNum !== rollNum) {
      student.rollNum = rollNum;
      updated = true;
    }
    if (student.sclassName.toString() !== sclassId.toString()) {
      student.sclassName = sclassId;
      updated = true;
    }
    if (student.school.toString() !== schoolId.toString()) {
      student.school = schoolId;
      updated = true;
    }
    const passwordMatch = await bcrypt.compare(password, student.password);
    if (!passwordMatch) {
      student.password = await bcrypt.hash(password, 10);
      updated = true;
      console.log('Updated student password');
    }
    if (updated) {
      await student.save();
      console.log(`Updated student ${name}`);
    }
  }

  return student;
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const admin = await ensureSuperAdminSchool();
    const { sclass, subject } = await ensureClassAndSubject(admin._id);
    const teacher = await ensureTeacher(admin._id, sclass._id, subject._id);
    const student = await ensureStudent(admin._id, sclass._id);

    console.log('Seed complete.');
    console.log(`Admin id: ${admin._id}`);
    console.log(`Teacher id: ${teacher._id}`);
    console.log(`Student id: ${student._id}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

run();
