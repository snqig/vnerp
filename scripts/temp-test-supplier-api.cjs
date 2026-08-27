// 测试供应商 API 是否正常返回
const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/purchase/suppliers?pageSize=1000',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('SUCCESS:', parsed.success);
      console.log('CODE:', parsed.code);
      if (parsed.data) {
        console.log('DATA_TYPE:', Array.isArray(parsed.data) ? 'array' : 'object');
        if (parsed.data.list) {
          console.log('LIST_LENGTH:', parsed.data.list.length);
          console.log('FIRST_ITEM:', JSON.stringify(parsed.data.list[0]));
        } else {
          console.log('DATA:', JSON.stringify(parsed.data).substring(0, 500));
        }
      }
      if (parsed.pagination) {
        console.log('PAGINATION:', JSON.stringify(parsed.pagination));
      }
    } catch (e) {
      console.log('RAW_DATA:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('ERROR:', e.message));
req.end();
