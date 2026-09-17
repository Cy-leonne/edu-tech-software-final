/*
  Mock M-Pesa callback sender
  Usage: node scripts/mockMpesaCallback.js --checkout=<checkoutRequestId> --result=0 --receipt=ABC123 --date=20240722123045
  Example:
    node scripts/mockMpesaCallback.js --checkout=ws_CO_1234567890 --result=0 --receipt=MPESA12345 --date=20240722123045
*/

const axios = require('axios');

const argv = (() => {
  const args = {};
  process.argv.slice(2).forEach(a => {
    const m = a.match(/^--?([^=]+)=?(.*)$/);
    if (m) args[m[1]] = m[2] || true;
  });
  return args;
})();
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

const checkout = argv.checkout || argv.c;
const resultCode = typeof argv.result !== 'undefined' ? String(argv.result) : '0';
const receipt = argv.receipt || 'MPESA-MOCK-12345';
const date = argv.date || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14);

if (!checkout) {
  console.error('Missing --checkout argument (checkoutRequestId)');
  process.exit(2);
}

const payload = {
  Result: {
    ResultType: 0,
    ResultCode: resultCode,
    ResultDesc: resultCode === '0' ? 'The service request is processed successfully.' : 'The request failed or was cancelled',
    MerchantRequestID: `MR-${Date.now()}`,
    CheckoutRequestID: checkout,
    MpesaReceiptNumber: receipt,
    TransactionDate: date,
    Amount: '1000.00',
    PhoneNumber: '2547XXXXXXXX'
  }
};

(async () => {
  try {
    const res = await axios.post(`${API_BASE}/Payment/MpesaCallback`, payload, { headers: { 'Content-Type': 'application/json' } });
    console.log('Callback response status:', res.status);
    console.log('Body:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Callback error status:', err.response.status, err.response.data);
    } else {
      console.error('Request failed:', err.message);
    }
    process.exit(1);
  }
})();