/*
  testMockPaymentFlow.js

  Usage:
    node scripts/testMockPaymentFlow.js --student=<studentId> --amount=2000 --parentEmail=parent@example.test --api=http://localhost:5000

  What it does:
  - Calls POST /Test/MockInitiateStk/:studentId to create a pending STK payment
  - Calls scripts/mockMpesaCallback.js to simulate the M-Pesa callback
  - Polls GET /Student/:studentId until the payment record is marked Completed or times out
  - Prints success/failure and final payment totals
*/

const http = require('http');
const https = require('https');
const { exec } = require('child_process');

const argv = (() => {
  const args = {};
  process.argv.slice(2).forEach(a => {
    const m = a.match(/^--?([^=]+)=?(.*)$/);
    if (m) args[m[1]] = m[2] || true;
  });
  return args;
})();

const studentIdArg = argv.student || argv.s;
const amount = argv.amount || argv.a || 100;
const parentEmail = argv.parentEmail || argv.parent || argv.p;
const API_BASE = argv.api || process.env.API_BASE || 'http://localhost:5000';
const adminId = argv.adminId || argv.admin || argv.aid;
const classId = argv.class || argv.sclass || argv.classId;
const POLL_INTERVAL = 1500; // ms
const TIMEOUT = 30000; // ms

if (!studentIdArg && (!adminId || !classId)) {
  console.error('When no --student is provided, you must supply --adminId and --class to create a temporary student.');
  console.error('Usage: node scripts/testMockPaymentFlow.js [--student=<studentId>] --amount=2000 --parentEmail=parent@example.test [--api=http://localhost:5000] [--adminId=<adminId> --class=<classId>]');
  process.exit(2);
}

function requestJson(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const client = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = client.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function createTempStudent() {
  const now = Date.now();
  const payload = {
    name: `Temp Test Student ${now}`,
    sclassName: classId,
    rollNum: 9999,
    admissionNo: `TMP-${now}`,
    parentName: 'Temp Parent',
    parentPhone: '+254700000000',
    parentEmail: parentEmail || `parent+${now}@example.test`,
    nationalId: '',
    birthCertificateNumber: '',
    nemisNumber: '',
    previousLevelGrade: ''
  };
  const url = `/StudentReg`;
  const headers = {};
  if (adminId) headers['x-admin-id'] = adminId;
  return new Promise((resolve, reject) => {
    const u = new URL(API_BASE + url);
    const client = u.protocol === 'https:' ? https : http;
    const body = JSON.stringify(payload);
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    if (headers['x-admin-id']) opts.headers['x-admin-id'] = headers['x-admin-id'];
    const req = client.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) return reject(new Error(`Create student failed ${res.statusCode}: ${JSON.stringify(json)}`));
          resolve(json);
        } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async function run() {
  try {
    let studentId = studentIdArg;
    let createdTemp = false;
    if (!studentId) {
      console.log('No student id provided — creating temporary student...');
      const created = await createTempStudent();
      studentId = created._id || created.id || (created.data && (created.data._id || created.data.id));
      if (!studentId) throw new Error('Failed to obtain created student id from response: ' + JSON.stringify(created));
      console.log('Created temp student', studentId);
      createdTemp = true;
    }

    console.log('Initiating mock STK for student', studentId, 'amount', amount);
    const init = await requestJson('POST', `/Test/MockInitiateStk/${studentId}`, { amount, parentEmail });
    if (init.status >= 400) {
      console.error('Initiate returned', init.status, init.body);
      process.exit(1);
    }
    const checkoutRequestId = init.body.checkoutRequestId || init.body.checkout_request_id || init.body.data && init.body.data.checkoutRequestId;
    console.log('Initiate response:', init.body);
    if (!checkoutRequestId) {
      console.error('No checkoutRequestId in response; aborting');
      process.exit(1);
    }

    console.log('Triggering mock callback via scripts/mockMpesaCallback.js');
    const callbackCmd = `node scripts/mockMpesaCallback.js --checkout=${checkoutRequestId} --result=0 --receipt=MOCKRCPT`;
    exec(callbackCmd, { cwd: __dirname + '/../' }, (err, stdout, stderr) => {
      if (err) {
        console.error('mockMpesaCallback failed:', err.message);
        console.error(stderr);
      } else {
        console.log('mockMpesaCallback output:', stdout);
      }
    });

    console.log('Polling student record for completed payment...');
    const start = Date.now();
    while (Date.now() - start < TIMEOUT) {
      const s = await requestJson('GET', `/Student/${studentId}`);
      if (s.status >= 400) {
        console.warn('GET /Student returned', s.status, s.body);
      } else {
        const student = s.body;
        const payments = (student.paymentHistory || []);
        const match = payments.find(p => (p.checkoutRequestId === checkoutRequestId || p.checkout_request_id === checkoutRequestId));
        if (match) {
          console.log('Found payment record:', match);
          if ((match.status || '').toLowerCase() === 'completed' || match.resultCode === '0' || match.resultCode === 0) {
            console.log('Payment completed. Final totals: amountPaid=', student.amountPaid, 'balance=', student.balance);
            process.exit(0);
          } else {
            console.log('Payment present but not completed yet. Status:', match.status || match.resultCode);
          }
        } else {
          console.log('Payment not yet in history. waiting...');
        }
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }

    console.error('Timed out waiting for payment to complete');
    process.exit(1);
  } catch (err) {
    console.error('Error during test flow:', err);
    process.exit(1);
  }
})();