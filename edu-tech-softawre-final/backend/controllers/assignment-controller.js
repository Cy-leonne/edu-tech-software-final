
const Assignment = require('../models/assignmentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool } = require('../middleware/schoolAccess.js');

const path = require('path');

const createAssignment = async (req, res) => {
    try {
        // support both JSON body and multipart/form-data with files
        const { title, description, subject, teacher, classId, dueDate } = req.body;
        let school = getAdminIdFromReq(req) || req.body.school || req.body.schoolId;
        if (!school && req.body.teacher) {
            const teacherDoc = await Teacher.findById(req.body.teacher).select('school');
            if (teacherDoc) {
                school = teacherDoc.school;
            }
        }

        // collect attachments from body (could be JSON string) and from uploaded files
        let bodyAttachments = [];
        if (req.body.attachments) {
            try {
                bodyAttachments = typeof req.body.attachments === 'string' ? JSON.parse(req.body.attachments) : req.body.attachments;
            } catch (e) {
                // not JSON, treat as single string
                bodyAttachments = Array.isArray(req.body.attachments) ? req.body.attachments : [req.body.attachments];
            }
        }

        const fileAttachments = (req.files || []).map(f => {
            // store URL path relative to server
            return `/uploads/assignments/${path.basename(f.path)}`;
        });

        const attachments = [...(bodyAttachments || []), ...fileAttachments];

        const assignment = new Assignment({
            title,
            description,
            subject,
            school,
            teacher,
            class: classId,
            dueDate,
            attachments: attachments
        });
        const result = await assignment.save();
        res.send({ message: 'Assignment created', assignment: result });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getAssignmentsBySchool = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.schoolId))) return;
        const assignments = await Assignment.find({ school: req.params.schoolId })
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .populate('class', 'sclassName');
        res.send(assignments);
    } catch (error) {
        res.status(500).json(error);
    }
};

const getAssignmentsByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { class: req.params.classId };
        if (adminId) query.school = adminId;
        const assignments = await Assignment.find(query)
            .populate('subject', 'subName')
            .populate('teacher', 'name email');
        res.send(assignments);
    } catch (error) {
        res.status(500).json(error);
    }
};

const getAssignmentDetail = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .populate('class', 'sclassName')
            .populate('submissions.student', 'name rollNum');
        if (!assignment) {
            return res.status(404).send({ message: 'Assignment not found' });
        }
        if (!(await verifyEntityBelongsToAdminSchool(req, res, assignment, 'school'))) return;
        res.send(assignment);
    } catch (error) {
        res.status(500).json(error);
    }
};

const submitAssignment = async (req, res) => {
    try {
        const { submissionText, fileUrl } = req.body;
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).send({ message: 'Assignment not found' });
        }
        assignment.submissions.push({
            student: req.body.studentId,
            submissionText: submissionText || '',
            fileUrl: fileUrl || ''
        });
        const result = await assignment.save();
        res.send({ message: 'Assignment submitted', assignment: result });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getAssignmentSubmissions = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('submissions.student', 'name rollNum');
        if (!assignment) {
            return res.status(404).send({ message: 'Assignment not found' });
        }
        if (!(await verifyEntityBelongsToAdminSchool(req, res, assignment, 'school'))) return;
        res.send(assignment.submissions);
    } catch (error) {
        res.status(500).json(error);
    }
};

const searchAssignments = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { query, title, teacherEmail } = req.query;
        if (!(await verifySchoolId(req, res, schoolId))) return;

        const searchQuery = { school: schoolId };
        const conditions = [];
        if (title) {
            conditions.push({ title: { $regex: title, $options: 'i' } });
        }
        if (teacherEmail) {
            // join via teacher email
            const teachers = await Teacher.find({ email: { $regex: teacherEmail, $options: 'i' } }).select('_id');
            const teacherIds = teachers.map(t => t._id);
            if (teacherIds.length > 0) conditions.push({ teacher: { $in: teacherIds } });
        }
        if (query) {
            conditions.push({ title: { $regex: query, $options: 'i' } });
            conditions.push({ description: { $regex: query, $options: 'i' } });
        }

        if (conditions.length === 0) return res.status(400).send({ message: 'Please provide a search query (title, teacherEmail or query)' });

        searchQuery.$or = conditions;

        const assignments = await Assignment.find(searchQuery)
            .populate('subject', 'subName')
            .populate('teacher', 'name email')
            .populate('class', 'sclassName');

        if (!assignments || assignments.length === 0) return res.send({ message: 'No assignments found', results: [] });
        res.send({ message: `Found ${assignments.length} assignment(s)`, count: assignments.length, results: assignments });
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = {
    createAssignment,
    getAssignmentsBySchool,
    getAssignmentsByClass,
    getAssignmentDetail,
    submitAssignment,
    getAssignmentSubmissions,
    searchAssignments
};
