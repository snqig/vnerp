const http = require('http');

function loginAndFetch() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: '192.168.0.158',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', async () => {
        try {
          const loginResult = JSON.parse(data);
          console.log('登录结果:', loginResult.success ? '成功' : '失败');

          if (loginResult.success && loginResult.data?.token) {
            const token = loginResult.data.token;
            console.log('Token:', token.substring(0, 30) + '...');

            // 使用token访问入库API
            const inboundOptions = {
              hostname: '192.168.0.158',
              port: 5000,
              path: '/api/warehouse/inbound?page=1&pageSize=10',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            };

            const inboundReq = http.request(inboundOptions, (inboundRes) => {
              let inboundData = '';
              inboundRes.on('data', (chunk) => { inboundData += chunk; });
              inboundRes.on('end', () => {
                const result = JSON.parse(inboundData);
                console.log('\n入库API结果:');
                console.log('- 状态:', inboundRes.statusCode);
                console.log('- 成功:', result.success);
                console.log('- 消息:', result.message);
                const list = result.data?.list || result.data || [];
                console.log('- 数据数量:', list.length);
                if (list.length > 0) {
                  console.log('\n第一条数据:', JSON.stringify(list[0], null, 2));
                }
                resolve(result);
              });
            });
            inboundReq.on('error', reject);
            inboundReq.end();
          } else {
            resolve(loginResult);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

loginAndFetch().catch(console.error);
