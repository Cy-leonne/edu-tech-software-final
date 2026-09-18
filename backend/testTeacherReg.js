
const http = require('http');

const data = JSON.stringify({
  name: 'Test Teacher',
  email: 'testteacher@example.com',
  password: 'Test@1234',
  role: 'Teacher',
  school: '6a3a48e5562cf26f9c77c0fc',
  teachSubject: '507f1f77bcf86cd799439011',
  teachSclass: '507f1f77bcf86cd799439012'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/TeacherReg',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS:`, JSON.stringify(res.headers));
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.write(data);
req.end();
