import { FullConfig } from '@playwright/test';

/**
 * Playwright 全局设置：在测试开始前重置 admin 账号的登录锁定状态。
 *
 * CSRF 修复（Double Submit Cookie 模式）：
 *   1. GET /en/login → middleware 在响应中种入 csrf_token cookie
 *   2. 提取 cookie 值，作为 X-CSRF-Token header 和 Cookie 一起发送
 *   3. POST /api/auth/reset-lock 携带 CSRF token 通过校验
 *
 * 参考：src/lib/csrf.ts + src/middleware.ts（非安全方法 + 非 exempt 的 API 路由需要 CSRF）
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5000';

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: GET 页面获取 csrf_token cookie（middleware 在首次访问时种入）
      const pageResp = await fetch(`${baseURL}/en/login`, {
        headers: { 'Accept': 'text/html' },
      });

      if (!pageResp.ok) {
        throw new Error(`GET /en/login returned ${pageResp.status}`);
      }

      const setCookie = pageResp.headers.get('set-cookie') || '';
      const csrfMatch = setCookie.match(/csrf_token=([^;]+)/);
      const csrfToken = csrfMatch?.[1];

      if (!csrfToken) {
        throw new Error('csrf_token cookie not found in response (middleware may not have run)');
      }

      // Step 2: POST /api/auth/reset-lock 携带 CSRF token（Double Submit Cookie 模式）
      const response = await fetch(`${baseURL}/api/auth/reset-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}`,
        },
        body: JSON.stringify({ username: 'admin' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`reset-lock returned ${response.status}: ${result.message}`);
      }

      console.log(`[GlobalSetup] Admin lock reset: ${result.message}`);
      return;
    } catch (e) {
      if (attempt < maxRetries) {
        console.warn(`[GlobalSetup] Attempt ${attempt}/${maxRetries} failed, retrying in 2s...`, e);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.warn('[GlobalSetup] Failed to reset admin lock after all retries:', e);
      }
    }
  }
}

export default globalSetup;
