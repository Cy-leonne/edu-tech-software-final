
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');
const Admin = require('../models/adminSchema.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool, getRequestUser } = require('../middleware/schoolAccess.js');

const subjectCreate = async (req, res) => {
    try {
        const school = getAdminIdFromReq(req);
        const subjects = req.body.subjects.map((subject) => ({
            subName: subject.subName,
            subCode: subject.subCode,
            sessions: subject.sessions,
        }));

        const existingSubjectBySubCode = await Subject.findOne({
            subCode: subjects[0].subCode,
            school,
        });

        if (existingSubjectBySubCode) {
            res.send({ message: 'Sorry this subcode must be unique as it already exists' });
        } else {
            const newSubjects = subjects.map((subject) => ({
                ...subject,
                sclassName: req.body.sclassName,
                school,
            }));

            const result = await Subject.insertMany(newSubjects);
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const allSubjects = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        let subjects = await Subject.find({ school: req.params.id })
            .populate("sclassName", "sclassName")
        if (subjects.length > 0) {
            res.send(subjects)
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const classSubjects = async (req, res) => {
    try {
        const requestUser = await getRequestUser(req);
        const schoolIds = [];

        if (requestUser?.schoolId) {
            schoolIds.push(requestUser.schoolId.toString());
        }

        const requestSchool = requestUser?.user?.school;
        if (requestSchool) {
            const resolvedSchool = typeof requestSchool === 'object'
                ? (requestSchool._id || requestSchool.id)
                : requestSchool;
            if (resolvedSchool) schoolIds.push(resolvedSchool.toString());
        }

        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const requester = adminId ? await Admin.findById(adminId).select('school schoolName') : null;
        const matchingSchoolAdmins = requester?.schoolName
            ? await Admin.find({ schoolName: requester.schoolName }).select('_id')
            : [];

        const adminSchoolIds = [requester?.school, ...matchingSchoolAdmins.map((admin) => admin._id)]
            .filter(Boolean)
            .map((school) => school?._id || school?.id || school?.toString?.() || school)
            .filter(Boolean);

        const uniqueSchoolIds = [...new Set([...schoolIds, ...adminSchoolIds])];
        const query = { sclassName: req.params.id };
        if (uniqueSchoolIds.length > 0) query.school = { $in: uniqueSchoolIds };

        let subjects = await Subject.find(query)
        if (subjects.length > 0) {
            res.send(subjects)
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const freeSubjectList = async (req, res) => {
    try {
        const requestUser = await getRequestUser(req);
        const schoolIds = [];

        if (requestUser?.schoolId) {
            schoolIds.push(requestUser.schoolId.toString());
        }

        const requestSchool = requestUser?.user?.school;
        if (requestSchool) {
            const resolvedSchool = typeof requestSchool === 'object'
                ? (requestSchool._id || requestSchool.id)
                : requestSchool;
            if (resolvedSchool) schoolIds.push(resolvedSchool.toString());
        }

        const query = { sclassName: req.params.id, teacher: { $exists: false } };
        if (schoolIds.length > 0) query.school = { $in: [...new Set(schoolIds)] };

        let subjects = await Subject.find(query);
        if (subjects.length > 0) {
            res.send(subjects);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSubjectDetail = async (req, res) => {
    try {
        let subject = await Subject.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, subject))) return;
        if (subject) {
            subject = await subject.populate("sclassName", "sclassName")
            subject = await subject.populate("teacher", "name")
            res.send(subject);
        }
        else {
            res.send({ message: "No subject found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, subject))) return;
        const deletedSubject = await Subject.findByIdAndDelete(req.params.id);

        // Remove deleted subject from teacher subject lists and clear the primary subject if needed
        await Teacher.updateMany(
            {
                $or: [
                    { teachSubject: deletedSubject._id },
                    { teachSubjects: deletedSubject._id }
                ]
            },
            {
                $pull: { teachSubjects: deletedSubject._id },
                $set: { teachSubject: null }
            }
        );

        // Remove the objects containing the deleted subject from students' examResult array within the same school
        await Student.updateMany(
            { school: deletedSubject.school },
            { $pull: { examResult: { subName: deletedSubject._id } } }
        );

        // Remove the objects containing the deleted subject from students' attendance array within the same school
        await Student.updateMany(
            { school: deletedSubject.school },
            { $pull: { attendance: { subName: deletedSubject._id } } }
        );

        res.send(deletedSubject);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteSubjects = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        const deletedSubjects = await Subject.deleteMany({ school: req.params.id });

        // Set the teachSubject field to null in teachers
        await Teacher.updateMany(
            { teachSubject: { $in: deletedSubjects.map(subject => subject._id) } },
            { $unset: { teachSubject: "" }, $unset: { teachSubject: null } }
        );

        // Set examResult and attendance to null in students within the same school
        await Student.updateMany(
            { school: req.params.id },
            { $set: { examResult: null, attendance: null } }
        );

        res.send(deletedSubjects);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteSubjectsByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { sclassName: req.params.id };
        if (adminId) query.school = adminId;
        const deletedSubjects = await Subject.deleteMany(query);

        // Set the teachSubject field to null in teachers
        await Teacher.updateMany(
            { teachSubject: { $in: deletedSubjects.map(subject => subject._id) } },
            { $unset: { teachSubject: "" }, $unset: { teachSubject: null } }
        );

        // Set examResult and attendance to null in students within the school scope
        const studentFilter = adminId ? { school: adminId } : {};
        await Student.updateMany(
            studentFilter,
            { $set: { examResult: null, attendance: null } }
        );

        res.send(deletedSubjects);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = { subjectCreate, freeSubjectList, classSubjects, getSubjectDetail, deleteSubjectsByClass, deleteSubjects, deleteSubject, allSubjects };
