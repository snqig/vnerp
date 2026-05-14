const http = require('http');

function makeRequest(path, method = 'POST', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://192.168.0.158:5000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data.substring(0, 500)
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== 1. 先获取登录Token ===\n');

  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  console.log('登录状态:', loginRes.status);
  console.log('登录结果:', JSON.stringify(loginRes.data, null, 2));

  let token = null;
  if (loginRes.data?.data?.token) {
    token = loginRes.data.data.token;
    console.log('\n获取Token成功:', token.substring(0, 50) + '...');

    console.log('\n=== 2. 使用Token调用入库API ===\n');
    const inboundRes = await makeRequest('/api/warehouse/inbound?page=1&pageSize=10', 'GET', null, token);
    console.log('入库API状态:', inboundRes.status);
    console.log('入库API结果:', JSON.stringify(inboundRes.data, null, 2).substring(0, 2000));
  }
}

main().catch(console.error);
