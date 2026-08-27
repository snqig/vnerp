// This route has been removed for security reasons.
// Debug endpoints that expose internal data should not be available in production.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'This endpoint has been removed for security reasons' },
    { status: 410 }
  );
}
