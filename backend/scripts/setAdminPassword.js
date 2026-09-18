
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema.js');
const bcrypt = require('bcrypt');

(async ()=>{
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/schoolManagementSystem');
    const id = '6a280988cd3f792008693237';
    const plain = 'adminpass123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plain, salt);
    const res = await Admin.findByIdAndUpdate(id, { $set: { password: hash } }, { new: true });
    console.log('Updated admin:', res ? 'ok' : 'not found');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
