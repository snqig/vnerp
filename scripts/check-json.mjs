import fs from 'fs';
const files = ['en.json', 'zh-CN.json', 'zh-TW.json', 'vi.json'];
for (const f of files) {
  try {
    JSON.parse(fs.readFileSync(`messages/${f}`, 'utf8'));
    console.log(`${f}: OK`);
  } catch (e) {
    console.log(`${f}: ERROR at ${e.message}`);
  }
}
