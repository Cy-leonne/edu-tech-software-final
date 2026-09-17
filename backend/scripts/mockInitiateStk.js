/*
  Script to call the Test/MockInitiateStk endpoint to create a pending STK payment without real M-Pesa.
  Optionally auto-completes by calling the mock callback script.

  Usage:
    node scripts/mockInitiateStk.js --student=<studentId> --amount=2000 --parentEmail=parent@example.test --auto
*/

const http = require('http');
const https = require('https');

const argv = (() => {
  const args = {};
  process.argv.slice(2).forEach(a => {
    const m = a.match(/^--?([^=]+)=?(.*)$/);
    if (m) args[m[1]] = m[2] || true;
  });
  return args;
})();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const studentId = argv.student || argv.s;
const amount = argv.amount || argv.a;
const parentEmail = argv.parentEmail || argv.parent || argv.p;
const auto = argv.auto || false;

if (!studentId || !amount || !parentEmail) {
  console.error('Required args: --student, --amount, --parentEmail');
  process.exit(2);
}

const payload = JSON.stringify({ amount, parentEmail });

const url = new URL(`${API_BASE}/Test/MockInitiateStk/${studentId}`);
const client = url.protocol === 'https:' ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + (url.search || ''),
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = client.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', async () => {
    try {
      const json = JSON.parse(data || '{}');
      console.log('Mock initiate response:', json);
      if (auto && json.checkoutRequestId) {
        // Call mock callback script to complete payment
        console.log('Auto-completing payment via mock callback...');
        const cp = require('child_process');
        const cbCmd = `node scripts/mockMpesaCallback.js --checkout=${json.checkoutRequestId} --result=0 --receipt=MOCKRECEIPT`;
        const child = cp.exec(cbCmd, { cwd: __dirname + '/../' }, (err, stdout, stderr) => {
          if (err) {
            console.error('Mock callback failed:', err.message);
            console.error(stderr);
            process.exit(1);
          }
          console.log(stdout);
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error('Failed to parse response:', err.message, data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(payload);
req.end();