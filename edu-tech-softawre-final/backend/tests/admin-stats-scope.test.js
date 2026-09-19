
const test = require('node:test');
const assert = require('node:assert/strict');
const { getSchoolScopeFilter } = require('../controllers/admin-controller.js');

test('scopes stats to the current school for non-superadmin admins', () => {
  const admin = { role: 'Admin', school: 'school123', _id: 'admin456' };
  assert.deepStrictEqual(getSchoolScopeFilter(admin), { school: 'school123' });
});

test('keeps superadmin stats global', () => {
  const admin = { role: 'SuperAdmin', _id: 'admin456' };
  assert.deepStrictEqual(getSchoolScopeFilter(admin), {});
});
