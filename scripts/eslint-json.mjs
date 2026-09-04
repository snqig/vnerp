// Run ESLint and capture only the JSON array (skip pnpm banner)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

console.log('Running pnpm lint --format json...');
const proc = spawn('pnpm', ['lint', '--format', 'json'], {
  stdio: ['ignore', 'pipe', 'inherit'],
  shell: true,
});

let out = '';
proc.stdout.on('data', (d) => (out += d.toString('utf8')));

proc.on('close', (code) => {
  // Find first '[' (start of JSON array) and last ']' (end)
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start === -1 || end === -1) {
    console.log('No JSON array found. First 500 chars:');
    console.log(out.slice(0, 500));
    return;
  }
  const json = out.slice(start, end + 1);
  console.log(`JSON span: ${start}-${end} (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
  writeFileSync('eslint-baseline.json', json);
  try {
    JSON.parse(json);
    console.log('JSON OK');
  } catch (e) {
    console.log('JSON error:', e.message);
  }
});
