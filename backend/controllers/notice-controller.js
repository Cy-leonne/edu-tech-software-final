
const Notice = require('../models/noticeSchema.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool } = require('../middleware/schoolAccess.js');

const noticeCreate = async (req, res) => {
    try {
        const school = getAdminIdFromReq(req);
        const notice = new Notice({
            ...req.body,
            school
        })
        const result = await notice.save()
        res.send(result)
    } catch (err) {
        res.status(500).json(err);
    }
};

const noticeList = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        let notices = await Notice.find({ school: req.params.id })
        if (notices.length > 0) {
            res.send(notices)
        } else {
            res.send({ message: "No notices found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const updateNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, notice))) return;
        const result = await Notice.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, notice))) return;
        const result = await Notice.findByIdAndDelete(req.params.id)
        res.send(result)
    } catch (error) {
        res.status(500).json(err);
    }
}

const deleteNotices = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        const result = await Notice.deleteMany({ school: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No notices found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

module.exports = { noticeCreate, noticeList, updateNotice, deleteNotice, deleteNotices };
