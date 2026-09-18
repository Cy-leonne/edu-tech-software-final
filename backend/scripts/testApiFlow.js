
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Admin = require('../models/adminSchema.js');
const Parent = require('../models/parentSchema.js');

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || 'http://127.0.0.1:5000';
const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || '12345';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const findApprovedAdmin = async () => {
  // Choose an admin who is approved and has at least one parent linked to their school
  const parent = await Parent.findOne().lean();
  if (parent && parent.school) {
    return Admin.findOne({ _id: parent.school, approved: true }).lean();
  }

  return Admin.findOne({ approved: true }).lean();
};

const findParentForAdmin = async (adminId) => {
  return Parent.findOne({ school: adminId }).lean();
};

const loginAdmin = async (email, password) => {
  const response = await api.post('/AdminLogin', { email, password });
  return response.data;
};

const sendParentMessage = async (adminId, parentId) => {
  const payload = {
    parentId,
    messageSubject: 'Test Parent Notification',
    messageBody: 'This is a system verification message from your school admin.',
    messageType: 'Both',
    priority: 'Normal',
    template: 'Announcement',
  };

  return api.post('/Message/Parent/Send', payload, {
    headers: { 'x-admin-id': adminId },
  });
};

const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`Finding an approved admin in ${MONGO_URI}`);
    const admin = await findApprovedAdmin();
    if (!admin) {
      throw new Error('No approved admin account found in the database. Run seedBulkTestData.js first.');
    }

    console.log(`Found admin: ${admin.email} (${admin._id})`);

    const parent = await findParentForAdmin(admin._id);
    if (!parent) {
      throw new Error('No parent record found for admin school. Run seedBulkTestData.js first.');
    }

    console.log(`Found parent: ${parent.email} (${parent._id})`);

    console.log('Logging in as admin via API...');
    const loginData = await loginAdmin(admin.email, PASSWORD);
    const adminId = loginData._id || loginData.id || admin._id;
    console.log('Login successful. adminId:', adminId);

    console.log('Sending message to parent via API...');
    const messageResponse = await sendParentMessage(adminId, parent._id);
    console.log('Message API response status:', messageResponse.status);
    console.log('Message response data:', JSON.stringify(messageResponse.data, null, 2));

    console.log('API verification completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('API verification failed:', error.message || error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

main();
