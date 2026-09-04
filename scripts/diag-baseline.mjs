// 诊断 eslint-baseline.json 的实际格式
import { readFileSync } from 'node:fs';

const raw = readFileSync('eslint-baseline.json', 'utf8');
console.log('Total bytes:', raw.length);
console.log('First 100 chars:', JSON.stringify(raw.slice(0, 100)));
console.log('Last 100 chars:', JSON.stringify(raw.slice(-100)));
console.log('Has BOM:', raw.charCodeAt(0) === 0xFEFF);
console.log('Line count:', raw.split('\n').length);

// 尝试解析并报告错误位置
try {
  JSON.parse(raw);
  console.log('JSON OK');
} catch (e) {
  console.log('JSON error:', e.message);
  // 找到错误位置
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    console.log(`Around position ${pos}:`);
    console.log(JSON.stringify(raw.slice(Math.max(0, pos - 50), pos + 50)));
  }
}
