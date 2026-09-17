const mongoose = require('mongoose');
const Student = require('./models/studentSchema');
const Assignment = require('./models/assignmentSchema');

mongoose.connect('mongodb://127.0.0.1:27017/schoolManagementSystem')
    .then(async () => {
        // Find all students named James
        const jamesStudents = await Student.find({ name: { $regex: 'james', $options: 'i' } });
        
        console.log('Total James students found:', jamesStudents.length);
        console.log('---');
        
        jamesStudents.forEach((s, i) => {
            console.log(`${i+1}. ${s.name} | sclass: ${s.sclass} | school: ${s.school}`);
        });
        
        console.log('---');
        console.log('Total Assignments in DB:', await Assignment.countDocuments());
        
        // Try to find all assignments
        const allAssignments = await Assignment.find({})
            .select('title class teacher')
            .limit(20);
        
        console.log('Sample Assignments:');
        allAssignments.forEach((a, i) => {
            console.log(`${i+1}. "${a.title}" | class: ${a.class} | teacher: ${a.teacher}`);
        });
        
        process.exit(0);
    })
    .catch(e => {
        console.error('Error:', e.message);
        process.exit(1);
    });