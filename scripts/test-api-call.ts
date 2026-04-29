// 测试 API 调用
async function testAPICall() {
  try {
    // 1. 先登录获取 token
    console.log('=== 1. 登录获取 Token ===');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginRes.json();
    console.log('登录响应:', loginData);
    
    if (!loginData.success) {
      console.log('❌ 登录失败');
      return;
    }
    
    const token = loginData.data.token;
    console.log(`✅ 登录成功，获取 Token\n`);
    
    // 2. 调用菜单 API
    console.log('=== 2. 调用菜单 API ===');
    const menusRes = await fetch('http://localhost:5000/api/auth/menus', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const menusData = await menusRes.json();
    console.log('菜单 API 响应:', JSON.stringify(menusData, null, 2));
    
    if (menusData.success) {
      console.log(`\n✅ 获取菜单成功`);
      console.log(`菜单数量: ${menusData.data.menus?.length || 0}`);
      console.log(`权限数量: ${menusData.data.permissions?.length || 0}`);
    } else {
      console.log('\n❌ 获取菜单失败:', menusData.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAPICall();
