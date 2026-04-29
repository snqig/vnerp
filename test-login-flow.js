// 测试登录脚本
const testLogin = async () => {
  console.log('开始测试登录流程...');
  
  try {
    // 1. 清除现有认证状态
    console.log('\n1. 清除现有认证状态');
    
    // 2. 执行登录
    console.log('\n2. 执行登录请求');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log('登录响应状态:', loginResponse.status);
    const loginResult = await loginResponse.json();
    console.log('登录结果:', JSON.stringify(loginResult, null, 2));
    
    if (loginResult.success) {
      console.log('\n✅ 登录成功！');
      console.log('Token:', loginResult.data.token);
      console.log('用户:', loginResult.data.user.username);
      
      // 3. 测试菜单 API
      console.log('\n3. 测试菜单 API');
      const menuResponse = await fetch('http://localhost:5000/api/auth/menus', {
        headers: { 
          'Authorization': `Bearer ${loginResult.data.token}` 
        }
      });
      
      console.log('菜单 API 响应状态:', menuResponse.status);
      const menuResult = await menuResponse.json();
      console.log('菜单数量:', menuResult.data?.menus?.length || 0);
      
    } else {
      console.log('\n❌ 登录失败:', loginResult.message);
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
};

testLogin();
