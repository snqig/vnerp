// 测试客户 API 创建
(async () => {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const data = await res.json();
  const token = data.data.token;
  const setCookie = res.headers.get('set-cookie') || '';
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/);
  const accessMatch = setCookie.match(/access_token=([^;]+)/);
  const csrf = csrfMatch ? csrfMatch[1] : '';
  const accessCookie = accessMatch ? accessMatch[1] : '';
  const cookieHeader = `access_token=${accessCookie}; csrf_token=${csrf}`;

  // 测试创建客户
  const testCustomer = {
    customer_code: 'C-TEST-001',
    customer_name: '测试客户',
    customer_type: 1,
    status: 1,
  };

  const r = await fetch('http://localhost:5000/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-csrf-token': csrf,
      Cookie: cookieHeader,
    },
    body: JSON.stringify(testCustomer),
  });
  const text = await r.text();
  console.log('status:', r.status);
  console.log('body:', text);
})();
