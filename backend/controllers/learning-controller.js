const LearningMaterial = require('../models/learningMaterialSchema.js');
const LiveClass = require('../models/liveClassSchema.js');
const Quiz = require('../models/quizSchema.js');
const Student = require('../models/studentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const path = require('path');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool } = require('../middleware/schoolAccess.js');

const createLearningMaterial = async (req, res) => {
    try {
        const { title, description, type, subject, classId, dueDate } = req.body;
        const school = req.body.school_id || req.body.school || req.body.schoolId || getAdminIdFromReq(req);
        const teacher = req.body.teacher_id || req.body.teacher || req.body.teacherId;
        const subjectId = req.body.subject_id || subject;
        const classIdValue = req.body.class_id || classId;
        const materialType = req.body.material_type || type;
        const uploadedFiles = (req.files || []).map((file) => `/uploads/learning/${path.basename(file.path)}`);
        const fileUrl = req.body.file_url || req.body.fileUrl || uploadedFiles[0] || '';

        const material = new LearningMaterial({
            title,
            description,
            material_type: materialType,
            file_url: fileUrl,
            school_id: school,
            teacher_id: teacher,
            subject_id: subjectId,
            class_id: classIdValue,
            school,
            teacher,
            subject: subjectId,
            class: classIdValue,
            type: materialType,
            fileUrl,
        });

        const saved = await material.save();
        res.status(201).send({ message: 'Learning material uploaded', material: saved });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getLearningMaterialsByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { class: req.params.classId };
        if (adminId) query.school = adminId;
        const materials = await LearningMaterial.find(query)
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });
        res.send(materials);
    } catch (error) {
        res.status(500).json(error);
    }
};

const getLearningMaterialsBySchool = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.schoolId))) return;
        const materials = await LearningMaterial.find({ school: req.params.schoolId })
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });
        res.send(materials);
    } catch (error) {
        res.status(500).json(error);
    }
};

const createLiveClass = async (req, res) => {
    try {
        const { title, description, scheduledAt, meetingLink, subject, classId, topic, meeting_url, start_time, end_time } = req.body;
        const school = req.body.school_id || getAdminIdFromReq(req) || req.body.school || req.body.schoolId;
        const teacher = req.body.teacher_id || req.body.teacher || req.body.teacherId;
        const subjectId = req.body.subject_id || subject;
        const classIdValue = req.body.class_id || classId;
        const liveTopic = topic || title;
        const meetingUrl = meeting_url || meetingLink;
        const startTime = start_time || scheduledAt;
        const endTime = end_time || null;

        const liveClass = new LiveClass({
            topic: liveTopic,
            title: liveTopic,
            description,
            meeting_url: meetingUrl,
            start_time: startTime,
            end_time: endTime,
            school_id: school,
            teacher_id: teacher,
            subject_id: subjectId,
            class_id: classIdValue,
            scheduledAt: startTime,
            meetingLink: meetingUrl,
            school,
            teacher,
            subject: subjectId,
            class: classIdValue,
        });

        const saved = await liveClass.save();
        res.status(201).send({ message: 'Live class scheduled', liveClass: saved });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getLiveClassesByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { class: req.params.classId };
        if (adminId) {
            const schoolTeachers = await Teacher.find({ school: adminId }).select('_id');
            query.$or = [
                { school: adminId },
                { teacher: { $in: schoolTeachers.map((teacher) => teacher._id) } },
            ];
        }
        const liveClasses = await LiveClass.find(query)
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .sort({ scheduledAt: 1 });
        res.send(liveClasses);
    } catch (error) {
        res.status(500).json(error);
    }
};

const joinLiveClass = async (req, res) => {
    try {
        const studentId = req.body.studentId || req.get('x-user-id');
        if (!studentId) return res.status(400).json({ message: 'Student ID is required' });

        const [liveClass, student] = await Promise.all([
            LiveClass.findById(req.params.liveClassId),
            Student.findById(studentId),
        ]);
        if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const classId = liveClass.class || liveClass.class_id;
        const schoolId = liveClass.school || liveClass.school_id;
        const subjectId = liveClass.subject || liveClass.subject_id;
        if (String(student.sclassName) !== String(classId) || String(student.school) !== String(schoolId)) {
            return res.status(403).json({ message: 'Student is not enrolled in this class' });
        }
        if (!subjectId) return res.status(400).json({ message: 'Live class subject is missing' });

        const today = new Date();
        const alreadyMarked = student.attendance.some((record) => {
            return String(record.subName) === String(subjectId)
                && new Date(record.date).toDateString() === today.toDateString();
        });
        if (!alreadyMarked) {
            student.attendance.push({ date: today, status: 'Present', checkInMethod: 'Online Class', subName: subjectId });
            await student.save();
        }

        res.json({ message: 'Attendance recorded', alreadyMarked, meetingLink: liveClass.meetingLink || liveClass.meeting_url });
    } catch (error) {
        console.error('Live class join error:', error);
        res.status(500).json({ message: 'Unable to record attendance', error: error.message });
    }
};

const createQuiz = async (req, res) => {
    try {
        const { title, description, subject, classId, questions } = req.body;
        const school = req.body.school || req.body.schoolId || getAdminIdFromReq(req);
        const teacher = req.body.teacher || req.body.teacherId;

        const quiz = new Quiz({
            title,
            description,
            school,
            teacher,
            subject,
            class: classId,
            questions,
        });

        const saved = await quiz.save();
        res.status(201).send({ message: 'Quiz created', quiz: saved });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getQuizzesByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { class: req.params.classId };
        if (adminId) {
            const schoolTeachers = await Teacher.find({ school: adminId }).select('_id');
            query.$or = [
                { school: adminId },
                { teacher: { $in: schoolTeachers.map((teacher) => teacher._id) } },
            ];
        }
        const quizzes = await Quiz.find(query)
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });
        res.send(quizzes);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = {
    createLearningMaterial,
    getLearningMaterialsByClass,
    getLearningMaterialsBySchool,
    createLiveClass,
    getLiveClassesByClass,
    joinLiveClass,
    createQuiz,
    getQuizzesByClass,
};