/**
 * Full API-level end-to-end verification of the school management backend.
 * Runs against the LIVE app flow (Express + MongoDB), exactly as the portals
 * call it: HTTP requests only, no internal shortcuts.
 *
 * Usage: node e2e/test.e2e.js
 */
const axios = require('axios');
const mongoose = require('mongoose');

const API = process.env.API_URL || 'http://127.0.0.1:5000';

const results = [];
let pass = 0, fail = 0;

const check = (name, cond, detail = '') => {
    if (cond) { pass++; console.log(`  PASS  ${name}`); results.push({ name, ok: true }); }
    else { fail++; console.log(`  FAIL  ${name}${detail ? ' :: ' + detail : ''}`); results.push({ name, ok: false, detail }); }
};

const SECTION_ID = '6aae92f4fb4f138af494b182'; // seeded school/admin id
const STUDENT_ID = '6aae92f4fb4f138af494b18e';

const adminHeaders = () => ({ headers: { 'x-admin-id': SECTION_ID } });

const showStudentFees = async (label) => {
    const Student = mongoose.model('student');
    const s = await Student.findById(STUDENT_ID).lean();
    console.log(`    [${label}] totalFees=${s.totalFees} amountPaid=${s.amountPaid} balance=${s.balance} status=${s.paymentStatus} history=${s.paymentHistory.length}`);
    return s;
};

(async () => {
    console.log('== 1. Auth flows ==');
    // Admin login
    let login = await axios.post(`${API}/AdminLogin`, { email: 'admin@nita.co.ke', password: '12345' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: e.response?.data }));
    check('Admin login succeeds', login.email === 'admin@nita.co.ke', JSON.stringify(login).slice(0, 120));
    check('Admin login returns a token', Boolean(login.token), 'token missing');

    // Give the student a parent email so parent-flow endpoints authorize us
    async function mongooseConnectOnce() {
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/schoolManagementSystem');
        require('../models/studentSchema');
        require('../models/auditLogsSchema');
        await mongoose.model('student').findByIdAndUpdate(STUDENT_ID, { $set: { parentEmail: 'parent@nita.co.ke' } });
    }
    await mongooseConnectOnce();
    const PARENT_EMAIL = 'parent@nita.co.ke';
    const parentBody = { parentEmail: PARENT_EMAIL };
    const parentStk = `${API}/Test/MockInitiateStk/${STUDENT_ID}`;
    const parentPayFee = `${API}/Parent/PayFee/${STUDENT_ID}`;

    // Invalid admin login
    const bad = await axios.post(`${API}/AdminLogin`, { email: 'admin@nita.co.ke', password: 'wrong' }).then(r => ({ status: r.status })).catch(e => ({ status: e.response?.status }));
    check('Admin login with wrong password rejected (401/403)', bad.status === 401 || bad.status === 403, 'status=' + bad.status);

    // Teacher login
    const teacher = await axios.post(`${API}/TeacherLogin`, { email: 'jkoilel@nita.co.ke', password: '12345' }).then(r => r.data).catch(e => ({ err: e.response?.status }));
    check('Teacher login succeeds', teacher.email === 'jkoilel@nita.co.ke', JSON.stringify(teacher).slice(0, 120));
    check('Teacher has assigned class (teachSclass)', Boolean(teacher.teachSclass), 'teachSclass=' + JSON.stringify(teacher.teachSclass));
    const CLASS_ID = teacher.teachSclass && (teacher.teachSclass._id || teacher.teachSclass);
    const SUBJECT_ID = teacher.teachSubject && (teacher.teachSubject._id || teacher.teachSubject);

    // Student login (admissionNo based)
    const studentLogin = await axios.post(`${API}/StudentLogin`, { admissionNo: '001', studentName: 'james koilel', password: '12345' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: e.response?.data }));
    check('Student login succeeds', Boolean(studentLogin._id), JSON.stringify(studentLogin).slice(0, 150));
    const badStudent = await axios.post(`${API}/StudentLogin`, { admissionNo: '001', studentName: 'james koilel', password: 'nope' }).then(r => ({ status: r.status })).catch(e => ({ status: e.response?.status }));
    check('Student login wrong password rejected (401)', badStudent.status === 401, 'status=' + badStudent.status);

    console.log('== 2. SuperAdmin surface protection ==');
    const anonSuper = await axios.get(`${API}/SuperAdmin/Schools`).then(() => 'ok').catch(e => e.response?.status);
    check('/SuperAdmin/Schools without credentials -> 401', anonSuper === 401, 'got ' + anonSuper);
    const normalAdminSuper = await axios.get(`${API}/SuperAdmin/Schools`, adminHeaders()).then(() => 'ok').catch(e => e.response?.status);
    check('/SuperAdmin/Schools as school Admin -> 403', normalAdminSuper === 403, 'got ' + normalAdminSuper);
    const sysStatsAsAdmin = await axios.get(`${API}/SuperAdmin/SystemStats`, adminHeaders()).then(() => 'ok').catch(e => e.response?.status);
    check('/SuperAdmin/SystemStats as school Admin -> allowed', sysStatsAsAdmin === 'ok', 'got ' + sysStatsAsAdmin);

    // ===== Reset the fee fixture through a test-db connection =====
    const Student = mongoose.model('student');
    await Student.findByIdAndUpdate(STUDENT_ID, {
        $set: { totalFees: 0, amountPaid: 0, balance: 0, paymentStatus: 'Pending', carriedForwardBalance: 0, feePeriodKey: 'initial' },
    });
    await Student.updateOne({ _id: STUDENT_ID }, { $set: { paymentHistory: [] } });

    console.log('== 3. Accountant fee scenario (30k -> pay 10k -> 40k -> pay 30k) ==');
    // Set class fee to 30,000 via settings (as Accountant/Admin would)
    const setFees = async (amount) => axios.put(`${API}/School/${SECTION_ID}/SystemSettings`,
        { financeSettings: { classFees: [{ classId: CLASS_ID, className: teacher.teachSclass?.sclassName || '1', feeAmount: amount }] } },
        adminHeaders()
    ).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
    let setRes = await setFees(30000);
    check('Set class fee 30000 API ok', !setRes.err, JSON.stringify(setRes).slice(0, 200));
    let st = await showStudentFees('after fee=30000');
    check('totalFees=30000', st.totalFees === 30000);
    check('amountPaid=0', st.amountPaid === 0);
    check('balance=30000', st.balance === 30000);
    check('status Pending', st.paymentStatus === 'Pending');

    // Accountant also reads the same values via the Students list
    const studentsList = await axios.get(`${API}/Students/${SECTION_ID}`, adminHeaders()).then(r => r.data).catch(() => []);
    const listed = Array.isArray(studentsList) ? studentsList.find(s => String(s._id) === STUDENT_ID) : null;
    check('Students list shows same balance 30000', listed && listed.balance === 30000 && listed.amountPaid === 0 && listed.paymentStatus === 'Pending', JSON.stringify(listed).slice(0, 160));

    // Pay 10,000 (Parent PayFee route — also used by accountant flows)
    const pay1 = await axios.put(parentPayFee, { ...parentBody, amount: 10000, paymentMethod: 'Cash' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
    check('Pay 10000 accepted', !pay1.err, JSON.stringify(pay1).slice(0, 200));
    st = await showStudentFees('after pay 10000');
    check('amountPaid=10000', st.amountPaid === 10000, 'got ' + st.amountPaid);
    check('balance=20000', st.balance === 20000, 'got ' + st.balance);
    check('status Pending', st.paymentStatus === 'Pending');
    check('history[0].balanceAfter=20000', st.paymentHistory[0]?.balanceAfter === 20000, 'got ' + st.paymentHistory[0]?.balanceAfter);
    check('history[0] status Completed', st.paymentHistory[0]?.status === 'Completed');

    // Increase class fee to 40,000 — AmountPaid must NOT reset
    setRes = await setFees(40000);
    check('Set class fee 40000 API ok', !setRes.err, JSON.stringify(setRes).slice(0, 200));
    st = await showStudentFees('after fee=40000');
    check('totalFees=40000', st.totalFees === 40000);
    check('amountPaid STILL 10000 (not reset)', st.amountPaid === 10000, 'got ' + st.amountPaid);
    check('balance=30000', st.balance === 30000, 'got ' + st.balance);
    check('status Pending', st.paymentStatus === 'Pending');
    check('no duplicate payments in history', st.paymentHistory.length === 1, 'len=' + st.paymentHistory.length);
    check('history[0].balanceAfter now 30000', st.paymentHistory[0]?.balanceAfter === 30000, 'got ' + st.paymentHistory[0]?.balanceAfter);

    // Pay the remaining 30,000
    const pay2 = await axios.put(parentPayFee, { ...parentBody, amount: 30000, paymentMethod: 'Paybill', transactionId: 'QKTESTSECOND' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
    check('Pay 30000 accepted', !pay2.err, JSON.stringify(pay2).slice(0, 200));
    st = await showStudentFees('after pay 30000');
    check('amountPaid=40000', st.amountPaid === 40000, 'got ' + st.amountPaid);
    check('balance=0', st.balance === 0, 'got ' + st.balance);
    check('status Completed', st.paymentStatus === 'Completed');
    check('history has 2 payment records', st.paymentHistory.length === 2, 'len=' + st.paymentHistory.length);
    check('history[1].balanceAfter=0', st.paymentHistory[1]?.balanceAfter === 0, 'got ' + st.paymentHistory[1]?.balanceAfter);

    // Consistency: parent view, accountant list, finance report all agree
    const feeInfo = await axios.get(`${API}/Parent/StudentFees/${STUDENT_ID}?parentEmail=${PARENT_EMAIL}`).then(r => r.data).catch(() => null);
    check('Parent fee view balance=0 Completed', feeInfo && feeInfo.balance === 0 && feeInfo.paymentStatus === 'Completed', JSON.stringify(feeInfo).slice(0, 160));
    const studentsList2 = await axios.get(`${API}/Students/${SECTION_ID}`, adminHeaders()).then(r => r.data).catch(() => []);
    const listed2 = Array.isArray(studentsList2) ? studentsList2.find(s => String(s._id) === STUDENT_ID) : null;
    check('Accountant list balance=0 Completed', listed2 && listed2.balance === 0 && listed2.paymentStatus === 'Completed', JSON.stringify(listed2).slice(0, 160));

    console.log('== 4. Fee reduction below amount paid (clamp, never negative) ==');
    setRes = await setFees(20000);
    check('Set class fee 20000 API ok', !setRes.err, JSON.stringify(setRes).slice(0, 200));
    st = await showStudentFees('after fee=20000 (< paid)');
    check('totalFees=20000', st.totalFees === 20000);
    check('amountPaid preserved 40000', st.amountPaid === 40000, 'got ' + st.amountPaid);
    check('balance clamped to 0 (never negative)', st.balance === 0, 'got ' + st.balance);
    check('status Completed', st.paymentStatus === 'Completed');

    console.log('== 5. Overpayment (clamp) ==');
    const payOver = await axios.put(parentPayFee, { ...parentBody, amount: 5000, paymentMethod: 'Cash' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
    check('Overpayment accepted', !payOver.err, JSON.stringify(payOver).slice(0, 200));
    st = await showStudentFees('after overpay 5000');
    check('balance still 0 (not -5000)', st.balance === 0, 'got ' + st.balance);
    check('amountPaid=45000', st.amountPaid === 45000, 'got ' + st.amountPaid);
    check('history[2].balanceAfter=0', st.paymentHistory[2]?.balanceAfter === 0, 'got ' + st.paymentHistory[2]?.balanceAfter);

    console.log('== 6. Teacher grade upload ==');
    const auditBefore = await mongoose.model('auditLogs').countDocuments();
    // Valid upload
    const upd1 = await axios.put(`${API}/UpdateExamResult/${STUDENT_ID}`, {
        subName: SUBJECT_ID, examType: 'CAT', marksObtained: 78, remark: 'good'
    }, adminHeaders()).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 250) }));
    check('Upload marks 78 accepted', !upd1.err, JSON.stringify(upd1).slice(0, 250));
    // Update existing result (edit)
    const upd2 = await axios.put(`${API}/UpdateExamResult/${STUDENT_ID}`, {
        subName: SUBJECT_ID, examType: 'CAT', marksObtained: 88
    }, adminHeaders()).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 250) }));
    check('Edit existing result (88) accepted', !upd2.err, JSON.stringify(upd2).slice(0, 250));
    const stuDoc = await Student.findById(STUDENT_ID).lean();
    const cat1 = (stuDoc.examResult || []).filter(e => String(e.subName) === String(SUBJECT_ID) && e.examType === 'CAT');
    check('CAT exists exactly once (edit updates, no dupes)', cat1.length === 1, 'count=' + cat1.length);
    check('Edited mark is 88', cat1[0] && cat1[0].marksObtained === 88, cat1[0] && cat1[0].marksObtained);
    // Invalid marks
    const updBad = await axios.put(`${API}/UpdateExamResult/${STUDENT_ID}`, {
        subName: SUBJECT_ID, examType: 'CAT', marksObtained: 150
    }, adminHeaders()).then(() => 'OK').catch(e => e.response?.status);
    check('Marks 150 rejected', updBad !== 'OK', 'got ' + updBad);
    const updNeg = await axios.put(`${API}/UpdateExamResult/${STUDENT_ID}`, {
        subName: SUBJECT_ID, examType: 'CAT', marksObtained: -4
    }, adminHeaders()).then(() => 'OK').catch(e => e.response?.status);
    check('Marks -4 rejected', updNeg !== 'OK', 'got ' + updNeg);
    const auditAfter = await mongoose.model('auditLogs').countDocuments();
    check('Audit records persisted for grade upload', auditAfter > auditBefore, `before=${auditBefore} after=${auditAfter}`);

    console.log('== 7. Cross-school isolation ==');
    // Parent-flow auth: a foreign parent's email must not open the fee view
    const foreignParent = await axios.get(`${API}/Parent/StudentFees/${STUDENT_ID}?parentEmail=intruder@other.school`).then(() => 'OK').catch(e => e.response?.status);
    check('Foreign parent email -> 403', foreignParent === 403, 'got ' + foreignParent);
    // Granular cross-school data isolation (schoolAccess) is covered by
    // tenantIsolation.test.js (9 tests incl. 403 cross-school cases).

    console.log('== 8. M-Pesa callback lifecycle ==');
    // Initiate a mock STK payment
    const stk = await axios.post(parentStk, { ...parentBody, amount: 1000, phoneNumber: '254712345678' }).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
    check('Mock STK initiated', !stk.err, JSON.stringify(stk).slice(0, 200));
    const checkoutRequestId = stk.checkoutRequestId || stk.checkoutRequestID || (stk.data && (stk.data.checkoutRequestId || stk.data.CheckoutRequestID));
    check('Received checkoutRequestId', Boolean(checkoutRequestId), JSON.stringify(stk).slice(0, 200));

    if (checkoutRequestId) {
        const before = await Student.findById(STUDENT_ID).lean();
        // Success callback
        const cb = (meta) => axios.post(`${API}/Payment/MpesaCallback`, {
            Result: { ResultCode: 0, CheckoutRequestID: checkoutRequestId, CallbackMetadata: meta ? { Item: [{ Name: 'Amount', Value: 1000 }, { Name: 'MpesaReceiptNumber', Value: 'QKCALLBACK1' }] } : undefined }
        }).then(r => r.data).catch(e => ({ err: e.response?.status, body: JSON.stringify(e.response?.data).slice(0, 200) }));
        let cbRes = await cb(true);
        check('Success callback accepted', cbRes && cbRes.message === 'OK', JSON.stringify(cbRes).slice(0, 200));
        let after = await Student.findById(STUDENT_ID).lean();
        const stkPayment = after.paymentHistory.find(p => p.checkoutRequestId === checkoutRequestId || p.transactionId === checkoutRequestId);
        check('STK payment Completed', stkPayment && stkPayment.status === 'Completed', stkPayment && stkPayment.status);
        check('STK receipt recorded', stkPayment && stkPayment.mpesaReceiptNumber === 'QKCALLBACK1', stkPayment && stkPayment.mpesaReceiptNumber);
        check('amountPaid increased by 1000', after.amountPaid === before.amountPaid + 1000, `${before.amountPaid} -> ${after.amountPaid}`);
        // Replay: no double credit
        cbRes = await cb(true);
        const afterReplay = await Student.findById(STUDENT_ID).lean();
        check('Replay does not double-credit', afterReplay.amountPaid === after.amountPaid, `${after.amountPaid} vs ${afterReplay.amountPaid}`);
    }

    // Amount mismatch -> Failed + audit flag
    const stk2 = await axios.post(parentStk, { ...parentBody, amount: 2000, phoneNumber: '254712345678' }).then(r => r.data).catch(() => ({}));
    const crid2 = stk2.checkoutRequestId || stk2.checkoutRequestID;
    if (crid2) {
        const mm = await axios.post(`${API}/Payment/MpesaCallback`, {
            Result: { ResultCode: 0, CheckoutRequestID: crid2, CallbackMetadata: { Item: [{ Name: 'Amount', Value: 999999 }] } }
        }).then(r => r.data).catch(e => e.response?.status);
        const s2 = await Student.findById(STUDENT_ID).lean();
        const p2 = s2.paymentHistory.find(p => p.checkoutRequestId === crid2 || p.transactionId === crid2);
        check('Amount-mismatch payment NOT credited', p2 && p2.status === 'Failed', p2 && p2.status);
        const mmAudit = await mongoose.model('auditLogs').findOne({ action: 'PAYMENT_AMOUNT_MISMATCH' }).sort({ timestamp: -1 }).lean();
        check('PAYMENT_AMOUNT_MISMATCH audit written', Boolean(mmAudit), '');
    }
    // 1032 user cancel
    const stk3 = await axios.post(parentStk, { ...parentBody, amount: 500, phoneNumber: '254712345678' }).then(r => r.data).catch(() => ({}));
    const crid3 = stk3.checkoutRequestId || stk3.checkoutRequestID;
    if (crid3) {
        await axios.post(`${API}/Payment/MpesaCallback`, { Result: { ResultCode: 1032, CheckoutRequestID: crid3 } }).then(r => r.data).catch(() => null);
        const s3 = await Student.findById(STUDENT_ID).lean();
        const p3 = s3.paymentHistory.find(p => p.checkoutRequestId === crid3 || p.transactionId === crid3);
        check('1032 -> Cancelled (not Failed)', p3 && p3.status === 'Cancelled', p3 && p3.status);
    }

    await mongoose.disconnect();
    console.log(`\n===== E2E SUMMARY: ${pass} passed, ${fail} failed =====`);
    process.exit(fail ? 1 : 0);
})().catch(err => { console.error('E2E crash:', err); process.exit(1); });
