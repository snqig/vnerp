const http = require('http');

(async () => {
  const loginRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 5000,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ username: 'admin', password: 'admin123' }));
    req.end();
  });
  const { token } = JSON.parse(loginRes.body).data;
  console.log('Login status:', loginRes.status);

  const res = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 5000,
      path: '/api/init/reset-orders', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    }, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => resolve({ status: r.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
  console.log('Reset-orders status:', res.status);
  console.log('Reset-orders body:', res.body);

  const parts = token.split('.');
  const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  console.log('JWT payload:', payload);
})();
