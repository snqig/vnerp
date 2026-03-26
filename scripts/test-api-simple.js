// 测试 API 是否能正常返回数据
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/standard-cards',
  method: 'GET',
};

console.log('Testing API: http://localhost:5000/api/standard-cards');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\nAPI Response:');
      console.log('Success:', result.success);
      console.log('Data count:', result.data ? result.data.length : 0);
      console.log('Pagination:', result.pagination);
      
      if (result.data && result.data.length > 0) {
        console.log('\nFirst item:');
        console.log(result.data[0]);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
