const http = require('http');

function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://192.168.0.158:5000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Testing /api/init/business-seed...\n');

  const response = await makeRequest('/api/init/business-seed', 'POST');
  console.log('Status:', response.status);
  console.log('Body:', response.body);

  if (response.status >= 400) {
    console.log('\n\nTrying /api/diagnose/inbound...\n');
    const diagnose = await makeRequest('/api/diagnose/inbound', 'GET');
    console.log('Status:', diagnose.status);
    console.log('Body:', diagnose.body);
  }
}

main().catch(console.error);
