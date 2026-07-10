// This route has been removed for security reasons.
// File system traversal should not be exposed via API.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'This endpoint has been removed for security reasons' },
    { status: 410 }
  );
}
