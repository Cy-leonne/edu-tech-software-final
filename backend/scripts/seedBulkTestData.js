const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

const Admin = require('../models/adminSchema.js');
const School = require('../models/schoolSchema.js');
const Sclass = require('../models/sclassSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');
const Parent = require('../models/parentSchema.js');
const Message = require('../models/messageSchema.js');
const { sendEmail } = require('../services/emailService.js');
const { sendSMS } = require('../services/smsService.js');

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';
const TOTAL_SCHOOLS = 10;
const STUDENTS_PER_SCHOOL = 10;
const CLASSES_PER_SCHOOL = 3;
const PASSWORD = '12345';
const TOTAL_FEES = 50000;

const schoolNames = Array.from({ length: TOTAL_SCHOOLS }, (_, idx) => `Test School ${idx + 1}`);
const schoolEmails = Array.from({ length: TOTAL_SCHOOLS }, (_, idx) => `school${idx + 1}@test.school`);
const classNames = ['Grade 1', 'Grade 2', 'Grade 3'];
const subjectNames = ['Mathematics', 'English', 'Science', 'History', 'Swahili', 'Geography', 'Physics', 'Biology'];
const teacherFirstNames = ['Grace', 'James', 'Peter', 'Jane', 'Michael', 'Faith', 'Mercy', 'David', 'Ann', 'Tom'];
const teacherLastNames = ['Kamau', 'Njoroge', 'Wanjiru', 'Odhiambo', 'Mutua', 'Mwangi', 'Achieng', 'Karanja', 'Ndegwa', 'Ouma'];
const studentFirstNames = ['Amina', 'Brian', 'Catherine', 'Daniel', 'Esther', 'Frank', 'Gloria', 'Hassan', 'Irene', 'Joseph'];
const studentLastNames = ['Otieno', 'Muriuki', 'Wambui', 'Njuguna', 'Mwangi', 'Kariuki', 'Mutiso', 'Kimani', 'Wanyoike', 'Olando'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const hashPassword = async (password) => bcrypt.hash(password, 10);

const generatePhone = (schoolIndex, id) => {
  const base = 700000000 + schoolIndex * 10000 + id;
  return `+254${base}`;
};

const createAdminForSchool = async (schoolIndex, schoolName, schoolEmail) => {
  const adminEmail = `admin${schoolIndex + 1}@test.school`;
  const existingAdmin = await Admin.findOne({ email: adminEmail });

  if (existingAdmin) {
    existingAdmin.name = `${schoolName} Admin`;
    existingAdmin.role = 'Admin';
    existingAdmin.approved = true;
    existingAdmin.schoolName = schoolName;
    existingAdmin.roles = ['Admin'];
    existingAdmin.password = await hashPassword(PASSWORD);
    await existingAdmin.save();
    return existingAdmin;
  }

  const admin = new Admin({
    name: `${schoolName} Admin`,
    email: adminEmail,
    password: await hashPassword(PASSWORD),
    role: 'Admin',
    approved: true,
    approvedAt: new Date(),
    roles: ['Admin'],
    schoolName,
  });

  await admin.save();
  return admin;
};

const createSchoolRecord = async (admin, schoolName, schoolEmail, schoolPhone) => {
  const existingSchool = await School.findOne({ schoolName });
  const schoolData = {
    schoolName,
    email: schoolEmail,
    phone: schoolPhone,
    address: {
      street: `${schoolIndexAddressMap[schoolName] || '123 Main Street'}`,
      city: 'Nairobi',
      state: 'Nairobi County',
      zipCode: '00100',
      country: 'Kenya',
    },
    schoolAdmin: admin._id,
    status: 'Active',
    subscriptionStatus: 'Active',
    createdBy: admin._id,
    lastActivityDate: new Date(),
    paymentSettings: {
      paybillCode: 'SCHOOL-PAYBILL-001',
      currency: 'KES',
    },
    features: {
      assignmentsEnabled: true,
      attendanceEnabled: true,
      feesEnabled: true,
      examsEnabled: true,
      complaintsEnabled: true,
      remindersEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
    }
  };

  if (existingSchool) {
    Object.assign(existingSchool, schoolData);
    await existingSchool.save();
    return existingSchool;
  }

  const school = new School(schoolData);
  await school.save();
  return school;
};

const createClasses = async (school) => {
  const createdClasses = [];
  for (let idx = 0; idx < CLASSES_PER_SCHOOL; idx += 1) {
    const sclassName = `${classNames[idx]} - ${school.schoolName}`;
    const existingClass = await Sclass.findOne({ sclassName, school: school.schoolAdmin });
    if (existingClass) {
      createdClasses.push(existingClass);
      continue;
    }

    const newClass = new Sclass({
      sclassName,
      school: school.schoolAdmin,
    });
    await newClass.save();
    createdClasses.push(newClass);
  }
  return createdClasses;
};

const createTeachersAndSubjects = async (school, classes) => {
  const createdTeachers = [];
  const createdSubjects = [];

  for (let idx = 0; idx < classes.length; idx += 1) {
    const classItem = classes[idx];
    const teacherName = `${randomItem(teacherFirstNames)} ${randomItem(teacherLastNames)}`;
    const teacherEmail = `teacher${school._id.toString().slice(-4)}-${idx + 1}@test.school`;
    let teacher = await Teacher.findOne({ email: teacherEmail, school: school.schoolAdmin });

    if (!teacher) {
      teacher = new Teacher({
        name: teacherName,
        email: teacherEmail,
        password: await hashPassword(PASSWORD),
        role: 'Teacher',
        school: school.schoolAdmin,
        teachSclass: classItem._id,
      });
      await teacher.save();
    }

    const subjectName = subjectNames[idx % subjectNames.length];
    const subjectCode = `SCH${school._id.toString().slice(-4)}-${idx + 1}-${subjectName.replace(/\s+/g, '').toUpperCase()}`;
    let subject = await Subject.findOne({ subCode: subjectCode, sclassName: classItem._id, school: school.schoolAdmin });
    if (!subject) {
      subject = new Subject({
        subName: subjectName,
        subCode: subjectCode,
        sessions: 10,
        sclassName: classItem._id,
        school: school.schoolAdmin,
        teacher: teacher._id,
      });
      await subject.save();
    } else {
      subject.teacher = teacher._id;
      await subject.save();
    }

    createdTeachers.push(teacher);
    createdSubjects.push(subject);
  }

  return { createdTeachers, createdSubjects };
};

const createStudentAndParent = async (school, classItem, subjectList, studentIndex) => {
  const studentName = `${randomItem(studentFirstNames)} ${randomItem(studentLastNames)}`;
  const admissionNo = `SCH-${school._id.toString().slice(-4)}-${String(studentIndex).padStart(2, '0')}`;
  const email = `student${school._id.toString().slice(-4)}-${studentIndex}@test.school`;
  const parentPhone = generatePhone(parseInt(school._id.toString().slice(-4), 16) % 90, studentIndex);
  const parentEmail = `parent${school._id.toString().slice(-4)}-${studentIndex}@test.school`;

  let student = await Student.findOne({ admissionNo, school: school.schoolAdmin });
  const amountPaid = Math.floor(Math.random() * 20000) + 20000;
  const balance = TOTAL_FEES - amountPaid;
  const paymentStatus = balance <= 0 ? 'Completed' : 'Pending';

  if (!student) {
    student = new Student({
      name: studentName,
      admissionNo,
      email,
      rollNum: studentIndex,
      password: await hashPassword(PASSWORD),
      sclassName: classItem._id,
      school: school.schoolAdmin,
      role: 'Student',
      parentName: `Parent of ${studentName}`,
      parentPhone,
      parentEmail,
      totalFees: TOTAL_FEES,
      amountPaid,
      balance,
      paymentStatus,
      guardianName: `Guardian of ${studentName}`,
      guardianPhone: parentPhone,
      paymentHistory: [
        {
          amount: amountPaid,
          paymentMethod: 'Paybill',
          paybill: school.paymentSettings?.paybillCode || 'SCHOOL-PAYBILL-001',
          accountNumber: '',
          date: new Date(),
          receiptNumber: `RCPT-${school._id.toString().slice(-4)}-${studentIndex}`,
          status: paymentStatus,
          transactionId: `TX-${Date.now()}-${studentIndex}`,
          balanceAfter: balance,
          verifiedBy: school.schoolAdmin.toString(),
          verifiedDate: new Date(),
          provider: 'Paybill',
          reference: `REF-${studentIndex}-${Date.now()}`,
        }
      ],
      attendance: Array.from({ length: 10 }, (_, attendanceIdx) => ({
        date: new Date(Date.now() - attendanceIdx * 24 * 60 * 60 * 1000),
        status: Math.random() > 0.15 ? 'Present' : 'Absent',
        subName: randomItem(subjectList)._id,
      }))
    });
  } else {
    student.name = studentName;
    student.email = email;
    student.rollNum = studentIndex;
    student.sclassName = classItem._id;
    student.school = school.schoolAdmin;
    student.password = await hashPassword(PASSWORD);
    student.parentName = `Parent of ${studentName}`;
    student.parentPhone = parentPhone;
    student.parentEmail = parentEmail;
    student.totalFees = TOTAL_FEES;
    student.amountPaid = amountPaid;
    student.balance = balance;
    student.paymentStatus = paymentStatus;
    student.guardianName = `Guardian of ${studentName}`;
    student.guardianPhone = parentPhone;
    student.paymentHistory = [
      {
        amount: amountPaid,
        paymentMethod: 'Paybill',
        paybill: school.paymentSettings?.paybillCode || 'SCHOOL-PAYBILL-001',
        accountNumber: '',
        date: new Date(),
        receiptNumber: `RCPT-${school._id.toString().slice(-4)}-${studentIndex}`,
        status: paymentStatus,
        transactionId: `TX-${Date.now()}-${studentIndex}`,
        balanceAfter: balance,
        verifiedBy: school.schoolAdmin.toString(),
        verifiedDate: new Date(),
        provider: 'Paybill',
        reference: `REF-${studentIndex}-${Date.now()}`,
      }
    ];
    student.attendance = Array.from({ length: 10 }, (_, attendanceIdx) => ({
      date: new Date(Date.now() - attendanceIdx * 24 * 60 * 60 * 1000),
      status: Math.random() > 0.15 ? 'Present' : 'Absent',
      subName: randomItem(subjectList)._id,
    }));
  }

  await student.save();

  let parent = await Parent.findOne({ email: parentEmail, school: school.schoolAdmin });
  if (!parent) {
    parent = new Parent({
      name: student.parentName,
      email: parentEmail,
      password: await hashPassword(PASSWORD),
      phone: parentPhone,
      studentId: student._id,
      school: school.schoolAdmin,
      role: 'Parent',
    });
  } else {
    parent.name = student.parentName;
    parent.password = await hashPassword(PASSWORD);
    parent.phone = parentPhone;
    parent.studentId = student._id;
    parent.school = school.schoolAdmin;
  }
  await parent.save();

  return { student, parent };
};

const createParentMessage = async (school, admin, parent, student) => {
  const messageSubject = 'Attendance and Fees Update';
  const messageBody = `Dear ${parent.name},\n\n${student.name} has ${student.balance <= 0 ? 'fully paid their fees' : `a balance of KES ${student.balance}.`}\nAttendance update: ${student.attendance.filter((item) => item.status === 'Present').length}/10 present.\n\nPlease contact the school if you have questions.`;

  const message = new Message({
    sender: admin._id,
    senderRole: admin.role,
    recipientType: 'Parent',
    recipient: parent._id,
    recipientEmail: parent.email,
    recipientPhone: parent.phone,
    school: school.schoolAdmin,
    messageSubject,
    messageBody,
    messageType: 'Both',
    priority: 'Normal',
    template: 'FeeReminder',
    status: 'Sent',
    sentAt: new Date(),
    deliveryStatus: {
      email: 'Not Sent',
      sms: 'Not Sent',
    }
  });

  const emailResult = await sendEmail(parent.email, messageSubject, messageBody.replace(/\n/g, '<br/>'));
  if (emailResult.success) {
    message.deliveryStatus.email = 'Sent';
    message.deliveryStatus.emailSentAt = new Date();
  } else {
    message.deliveryStatus.email = 'Failed';
    message.deliveryStatus.emailErrorMessage = emailResult.error || 'Email failed';
  }

  const smsResult = await sendSMS(parent.phone, messageBody);
  if (smsResult.success) {
    message.deliveryStatus.sms = 'Sent';
    message.deliveryStatus.smsSentAt = new Date();
  } else {
    message.deliveryStatus.sms = 'Failed';
    message.deliveryStatus.smsErrorMessage = smsResult.error || 'SMS failed';
  }

  await message.save();
  return message;
};

const schoolIndexAddressMap = {
  'Test School 1': '1 Education Road',
  'Test School 2': '2 Scholars Avenue',
  'Test School 3': '3 Knowledge Street',
  'Test School 4': '4 Learning Blvd',
  'Test School 5': '5 Wisdom Way',
  'Test School 6': '6 Study Lane',
  'Test School 7': '7 Academic Drive',
  'Test School 8': '8 Campus Court',
  'Test School 9': '9 Library Road',
  'Test School 10': '10 Teacher Terrace',
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for bulk seeding.');

    const summary = {
      schools: 0,
      admins: 0,
      classes: 0,
      teachers: 0,
      students: 0,
      parents: 0,
      messages: 0,
    };

    for (let schoolIndex = 0; schoolIndex < TOTAL_SCHOOLS; schoolIndex += 1) {
      const schoolName = schoolNames[schoolIndex];
      const schoolEmail = schoolEmails[schoolIndex];
      const schoolPhone = generatePhone(schoolIndex + 1, 1);

      const admin = await createAdminForSchool(schoolIndex, schoolName, schoolEmail);
      const school = await createSchoolRecord(admin, schoolName, schoolEmail, schoolPhone);
      summary.admins += 1;
      summary.schools += 1;

      const classes = await createClasses(school);
      summary.classes += classes.length;

      const { createdTeachers, createdSubjects } = await createTeachersAndSubjects(school, classes);
      summary.teachers += createdTeachers.length;

      const studentsAndParents = [];
      for (let studentIndex = 1; studentIndex <= STUDENTS_PER_SCHOOL; studentIndex += 1) {
        const assignedClass = classes[(studentIndex - 1) % classes.length];
        const result = await createStudentAndParent(school, assignedClass, createdSubjects, studentIndex);
        studentsAndParents.push(result);
        summary.students += 1;
        summary.parents += 1;
      }

      const classCount = classes.length;
      const teacherCount = createdTeachers.length;
      const studentCount = studentsAndParents.length;
      school.studentCount = studentCount;
      school.teacherCount = teacherCount;
      school.classCount = classCount;
      await school.save();

      for (const { student, parent } of studentsAndParents) {
        await createParentMessage(school, admin, parent, student);
        summary.messages += 1;
      }

      console.log(`Created test school data for ${schoolName} (${studentCount} students, ${teacherCount} teachers, ${classCount} classes).`);
    }

    console.log('Bulk seed finished.');
    console.table(summary);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Bulk seed error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();