
const mongoose = require('mongoose');
const Student = require('./models/studentSchema');
const Assignment = require('./models/assignmentSchema');

mongoose.connect('mongodb://127.0.0.1:27017/schoolManagementSystem')
    .then(async () => {
        const james = await Student.findOne({ name: { $regex: 'james', $options: 'i' } });
        
        if (james) {
            console.log('Found James:', james.name);
            console.log('Class ID:', james.sclass);
            console.log('---');
            
            const assignments = await Assignment.find({ class: james.sclass })
                .populate('teacher', 'name')
                .populate('subject', 'subName');
            
            console.log('Total Assignments in James class:', assignments.length);
            console.log('---');
            assignments.forEach((a, i) => {
                console.log(`${i+1}. "${a.title}" | Subject: ${a.subject?.subName} | Teacher: ${a.teacher?.name}`);
            });
        } else {
            console.log('James not found');
        }
        
        process.exit(0);
    })
    .catch(e => {
        console.error('Error:', e.message);
        process.exit(1);
    });
