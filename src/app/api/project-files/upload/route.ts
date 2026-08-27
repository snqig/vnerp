// This route has been removed for security reasons.
// Git operations should be performed via CLI scripts, not API endpoints.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'This endpoint has been removed for security reasons' },
    { status: 410 }
  );
}
