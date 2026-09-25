import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { resetRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ success: false, message: 'Username required' }, { status: 400 });
    }

    await execute('UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE username = ?', [
      username,
    ]);

    // 同时清零该来源 IP 的登录限流计数。
    // 历史缺陷：本接口只重置 DB 里的 login_fail_count / lock_time（账号维度），
    // 而 /api/auth/login 的 429 来自 @/lib/rate-limit 的 **IP 维度**固定窗口，
    // 两者互不相通 —— 即便本接口返回 success，账号也仍处于「请求过于频繁」状态，
    // 导致 E2E global-setup 与 tests/utils/api-auth 的 resetAdminLock 形同无效。
    try {
      await resetRateLimit(getClientIP(request), 'login');
    } catch {
      // 限流计数清理失败不影响账号解锁结果
    }

    return NextResponse.json({ success: true, message: `Lock reset for ${username}` });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
