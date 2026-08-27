/**
 * Reproduce the exact login route flow with real modules to find what throws.
 * Mirrors src/app/api/auth/login/route.ts step by step.
 */
import fs from 'fs';
import path from 'path';

// load .env
const envContent = fs.readFileSync('d:/dcprint/erp-project/.env', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

// We need to run within the project's tsconfig module resolution.
// Use tsx to run a TS file that imports the real modules.
