const Complain = require('../models/complainSchema.js');
const { getAdminIdFromReq, verifySchoolId } = require('../middleware/schoolAccess.js');

const complainCreate = async (req, res) => {
    try {
        const school = getAdminIdFromReq(req);
        const complain = new Complain({ ...req.body, school })
        const result = await complain.save()
        res.send(result)
    } catch (err) {
        res.status(500).json(err);
    }
};

const complainList = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        let complains = await Complain.find({ school: req.params.id }).populate("user", "name");
        if (complains.length > 0) {
            res.send(complains)
        } else {
            res.send({ message: "No complains found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = { complainCreate, complainList };