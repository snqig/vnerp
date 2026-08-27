// 清除认证缓存脚本
// 在浏览器控制台运行此代码

function clearAuthCache() {
  // 清除 localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('menu_order');
  
  // 清除 sessionStorage
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  console.log('✅ 认证缓存已清除');
  console.log('请刷新页面重新登录');
}

clearAuthCache();
