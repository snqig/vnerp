import { NextRequest, NextResponse } from 'next/server';
import { initializeApplication } from '@/application/AppInitializer';

let initialized = false;

export function withApplicationInitialization() {
  return async (request: NextRequest, handler: (request: NextRequest) => Promise<NextResponse>) => {
    if (!initialized) {
      initializeApplication();
      initialized = true;
    }
    return handler(request);
  };
}
