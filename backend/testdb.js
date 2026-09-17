// In-memory test database for when MongoDB is unavailable
const bcrypt = require('bcrypt');

// Pre-hashed passwords: 'zxc'
const hashedPassword = '$2b$10$YourHashedPasswordHere'; // placeholder

// Create hash for 'zxc' synchronously
const salt = bcrypt.genSaltSync(10);
const zxcHash = bcrypt.hashSync('zxc', salt);

const testDB = {
  students: [
    {
      _id: '1',
      rollNum: '1',
      name: 'Dipesh Awasthi',
      password: zxcHash,
      school: { _id: 'school1', schoolName: 'Test School' },
      sclassName: { _id: 'class1', sclassName: 'Class 1' },
      role: 'Student'
    }
  ],
  admins: [
    {
      _id: 'admin1',
      email: 'yogendra@12',
      password: zxcHash,
      schoolName: 'Test School',
      role: 'Admin'
    }
  ],
  teachers: [
    {
      _id: 'teacher1',
      email: 'tony@12',
      password: zxcHash,
      school: { _id: 'school1', schoolName: 'Test School' },
      role: 'Teacher'
    }
  ]
};

// Helper to find student by admissionNo or rollNum and name
function findStudent(identifier, name) {
  return testDB.students.find(s =>
    (s.admissionNo && s.admissionNo === String(identifier) && s.name === name) ||
    (s.rollNum === String(identifier) && s.name === name)
  );
}

// Helper to find admin by email
function findAdmin(email) {
  return testDB.admins.find(a => a.email === email);
}

// Helper to find teacher by email
function findTeacher(email) {
  return testDB.teachers.find(t => t.email === email);
}

// Helper to add admin to in-memory DB
function addAdmin(adminData) {
  const newAdmin = {
    _id: 'admin_' + Date.now(),
    ...adminData
  };
  testDB.admins.push(newAdmin);
  return newAdmin;
}

// Helper to add student to in-memory DB
function addStudent(studentData) {
  const newStudent = {
    _id: 'student_' + Date.now(),
    ...studentData
  };
  testDB.students.push(newStudent);
  return newStudent;
}

// Helper to add teacher to in-memory DB
function addTeacher(teacherData) {
  const newTeacher = {
    _id: 'teacher_' + Date.now(),
    ...teacherData
  };
  testDB.teachers.push(newTeacher);
  return newTeacher;
}

module.exports = {
  findStudent,
  findAdmin,
  findTeacher,
  addAdmin,
  addStudent,
  addTeacher,
  testDB
};