
const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool, getRequestUser } = require('../middleware/schoolAccess.js');
const { logAuditAction } = require('../utils/auditLogger');

const sclassCreate = async (req, res) => {
    try {
        const school = getAdminIdFromReq(req);
        const sclass = new Sclass({
            sclassName: req.body.sclassName,
            school
        });

        const existingSclassByName = await Sclass.findOne({
            sclassName: req.body.sclassName,
            school
        });

        if (existingSclassByName) {
            res.send({ message: 'Sorry this class name already exists' });
        }
        else {
            const result = await sclass.save();
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const sclassList = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        let sclasses = await Sclass.find({ school: req.params.id })
        if (sclasses.length > 0) {
            res.send(sclasses)
        } else {
            res.send({ message: "No sclasses found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSclassDetail = async (req, res) => {
    try {
        let sclass = await Sclass.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, sclass))) return;
        if (sclass) {
            sclass = await sclass.populate("school", "schoolName")
            res.send(sclass);
        }
        else {
            res.send({ message: "No class found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const getSclassStudents = async (req, res) => {
    try {
        const classId = req.params.id;
        
        // Validate class ID format
        if (!classId || classId === 'undefined' || classId === 'null') {
            return res.status(400).json({ message: 'Invalid class ID provided' });
        }

        const sclass = await Sclass.findById(classId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, sclass))) return;
        let students = await Student.find({ sclassName: classId })
        if (students.length > 0) {
            let modifiedStudents = students.map((student) => {
                const studentObj = student.toObject({ getters: true });
                delete studentObj.password;
                return studentObj;
            });
            res.send(modifiedStudents);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const mongoose = require('mongoose');

const promoteSclassStudents = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const sourceClassId = req.params.id;
        const targetClassId = req.body.targetClassId;
        const completedTerms = Number(req.body.completedTerms);
        const moveSubjects = !!req.body.moveSubjects;
        const updateRollNumbers = !!req.body.updateRollNumbers;

        if (!targetClassId) return res.status(400).send({ message: 'targetClassId is required in body' });
        if (completedTerms !== 3) return res.status(400).send({ message: 'Students can only be promoted after all 3 terms are completed' });
        if (sourceClassId === targetClassId) return res.status(400).send({ message: 'Target class must be different from source class' });

        const sourceClass = await Sclass.findById(sourceClassId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, sourceClass))) return;

        const targetClass = await Sclass.findById(targetClassId);
        if (!targetClass) return res.status(404).send({ message: 'Target class not found' });
        if (!(await verifyEntityBelongsToAdminSchool(req, res, targetClass))) return;

        const requestUser = await getRequestUser(req);
        const userId = requestUser?.user?._id || getAdminIdFromReq(req) || null;
        const userName = requestUser?.user?.name || requestUser?.user?.schoolName || 'Unknown';
        const userRole = requestUser?.user?.role || (Array.isArray(requestUser?.user?.roles) ? requestUser.user.roles.join(',') : 'Admin');
        const schoolId = requestUser?.schoolId || sourceClass.school?.toString();

        let resultSummary = {
            studentsMatched: 0,
            studentsModified: 0,
            subjectsMoved: 0,
            clearedAttendance: 0,
            clearedExamResults: 0,
            message: ''
        };

        await session.withTransaction(async () => {
            const studentsToMove = await Student.find({ sclassName: sourceClassId }).session(session);

            if (studentsToMove.length === 0) {
                resultSummary = { message: 'No students to promote', studentsMatched: 0, studentsModified: 0, subjectsMoved: 0, clearedAttendance: 0, clearedExamResults: 0 };
                return;
            }

            if (moveSubjects) {
                const subjResult = await Subject.updateMany({ sclassName: sourceClassId }, { $set: { sclassName: targetClassId } }).session(session);
                resultSummary.subjectsMoved = subjResult.modifiedCount || subjResult.nModified || 0;
            }

            const targetClassStudents = await Student.find({ sclassName: targetClassId }).select('rollNum').session(session);
            const occupiedRolls = new Set(targetClassStudents.map((stu) => stu.rollNum));

            if (!updateRollNumbers) {
                const collision = studentsToMove.find((stu) => occupiedRolls.has(stu.rollNum));
                if (collision) {
                    throw new Error(`Roll number collision detected for student ${collision.name} with roll number ${collision.rollNum}. Enable updateRollNumbers to avoid conflicts.`);
                }
            }

            const baseUpdate = {
                sclassName: targetClassId,
                attendance: [],
                examResult: [],
                feePeriodKey: `promotion-${targetClassId}-${Date.now()}`,
                amountPaid: 0,
            };
            const previousPeriodKey = `promotion-source-${sourceClassId}-${Date.now()}`;
            baseUpdate.carriedForwardBalance = 0;
            studentsToMove.forEach((student) => {
                const previousBalance = Math.max(Number(student.balance || 0), 0);
                student.paymentHistory.forEach((payment) => {
                    if (!payment.feePeriodKey || payment.feePeriodKey === 'initial') payment.feePeriodKey = previousPeriodKey;
                });
                student.feePeriodKey = baseUpdate.feePeriodKey;
                student.carriedForwardBalance = previousBalance;
                student.amountPaid = 0;
                student.totalFees = 0;
                student.balance = previousBalance;
            });
            resultSummary.clearedAttendance = studentsToMove.reduce((count, stu) => count + (Array.isArray(stu.attendance) && stu.attendance.length ? 1 : 0), 0);
            resultSummary.clearedExamResults = studentsToMove.reduce((count, stu) => count + (Array.isArray(stu.examResult) && stu.examResult.length ? 1 : 0), 0);

            if (updateRollNumbers) {
                const maxRoll = targetClassStudents.reduce((max, stu) => Math.max(max, Number(stu.rollNum || 0)), 0);
                let nextRoll = maxRoll + 1;
                const bulkOps = studentsToMove.map((stu) => {
                    const assignedRoll = nextRoll++;
                    return {
                        updateOne: {
                            filter: { _id: stu._id },
                            update: { $set: { ...baseUpdate, rollNum: assignedRoll } }
                        }
                    };
                });

                studentsToMove.forEach((student, index) => {
                    bulkOps[index].updateOne.update.$set = {
                        ...bulkOps[index].updateOne.update.$set,
                        feePeriodKey: student.feePeriodKey,
                        carriedForwardBalance: student.carriedForwardBalance,
                        amountPaid: student.amountPaid,
                        totalFees: student.totalFees,
                        balance: student.balance,
                        paymentHistory: student.paymentHistory,
                    };
                });
                const bulkResult = await Student.bulkWrite(bulkOps, { session });
                resultSummary.studentsMatched = bulkResult.nMatched || bulkResult.matchedCount || studentsToMove.length;
                resultSummary.studentsModified = bulkResult.nModified || bulkResult.modifiedCount || studentsToMove.length;
            } else {
                const bulkOps = studentsToMove.map((student) => ({
                    updateOne: {
                        filter: { _id: student._id },
                        update: { $set: {
                            ...baseUpdate,
                            feePeriodKey: student.feePeriodKey,
                            carriedForwardBalance: student.carriedForwardBalance,
                            amountPaid: student.amountPaid,
                            totalFees: student.totalFees,
                            balance: student.balance,
                            paymentHistory: student.paymentHistory,
                        } }
                    }
                }));
                const upd = await Student.bulkWrite(bulkOps, { session });
                resultSummary.studentsMatched = upd.matchedCount || upd.n || 0;
                resultSummary.studentsModified = upd.modifiedCount || upd.nModified || 0;
            }
        });

        await logAuditAction({
            school: schoolId,
            user: userId,
            userName,
            userRole,
            action: 'BULK_OPERATION',
            entityType: 'class',
            entityId: sourceClassId,
            entityName: sourceClass.sclassName,
            changesBefore: {
                sourceClass: sourceClass.sclassName,
                targetClass: targetClass.sclassName,
                moveSubjects: moveSubjects === true,
                updateRollNumbers: updateRollNumbers === true,
            },
            changesAfter: {
                sourceClassId,
                targetClassId,
                targetClassName: targetClass.sclassName,
                moveSubjects,
                updateRollNumbers,
                summary: resultSummary,
            },
            changedFields: ['sclassName', 'rollNum', 'examResult', 'attendance', 'subjects'],
            ipAddress: req.clientIP || 'Unknown',
            userAgent: req.userAgent || '',
            resultMessage: `Promoted ${resultSummary.studentsModified} students from ${sourceClass.sclassName} to ${targetClass.sclassName}`,
            context: {
                module: 'Class Management',
                page: 'Class Details',
                endpoint: `/Sclass/Promote/${sourceClassId}`,
                method: 'PUT'
            }
        });

        res.send({ message: 'Promotion completed', summary: resultSummary });
    } catch (err) {
        const statusCode = err.message && err.message.includes('Roll number collision') ? 409 : 500;
        res.status(statusCode).json({ message: err.message || 'Promotion failed', error: err.message || err });
    } finally {
        await session.endSession();
    }
}

const deleteSclass = async (req, res) => {
    try {
        const sclass = await Sclass.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, sclass))) return;
        const deletedClass = await Sclass.findByIdAndDelete(req.params.id);
        if (!deletedClass) {
            return res.send({ message: "Class not found" });
        }
        const deletedStudents = await Student.deleteMany({ sclassName: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ sclassName: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ teachSclass: req.params.id });
        res.send(deletedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteSclasses = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        const deletedClasses = await Sclass.deleteMany({ school: req.params.id });
        if (deletedClasses.deletedCount === 0) {
            return res.send({ message: "No classes found to delete" });
        }
        const deletedStudents = await Student.deleteMany({ school: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ school: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ school: req.params.id });
        res.send(deletedClasses);
    } catch (error) {
        res.status(500).json(error);
    }
}

module.exports = { sclassCreate, sclassList, deleteSclass, deleteSclasses, getSclassDetail, getSclassStudents, promoteSclassStudents };
