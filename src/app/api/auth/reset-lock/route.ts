import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, message: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ success: false, message: 'Username required' }, { status: 400 });
    }

    await execute(
      'UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE username = ?',
      [username]
    );

    return NextResponse.json({ success: true, message: `Lock reset for ${username}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
