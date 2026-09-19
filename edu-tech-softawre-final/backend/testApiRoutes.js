
const urls = [
  { name: 'ADMIN_ACCOUNTANTS', url: 'http://localhost:5000/Admin/Accountants' },
  { name: 'SCHOOLS', url: 'http://localhost:5000/SuperAdmin/Schools' },
  { name: 'RECONCILIATION', url: 'http://localhost:5000/Student/PaymentReconciliation/6a366405ea3976fc464c2ef0' }
];
const headers = { 'x-admin-id': '6a0fee936c00eed1efcf7816' };

(async () => {
  for (const { name, url } of urls) {
    console.log('\n' + name + ':');
    try {
      const res = await fetch(url, { headers });
      const text = await res.text();
      console.log('STATUS', res.status);
      console.log(text.substring(0, 500));
    } catch (err) {
      console.log('ERROR', err.message);
    }
  }
  process.exit(0);
})();
