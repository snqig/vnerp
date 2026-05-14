const API_BASE = 'http://127.0.0.1:5000';

async function testAPI() {
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123', remember: true })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  
  console.log('Testing /api/purchase/orders...');
  try {
    const res = await fetch(`${API_BASE}/api/purchase/orders?page=1&pageSize=10`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Success:', data.success);
    if (!data.success) {
      console.log('Error:', data.message);
    } else {
      console.log('Orders count:', data.data?.length || 0);
      console.log('Pagination:', JSON.stringify(data.pagination));
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

testAPI();
