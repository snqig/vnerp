// This route has been removed for security reasons.
// Writing to the project filesystem via API is not allowed.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'This endpoint has been removed for security reasons' },
    { status: 410 }
  );
}
