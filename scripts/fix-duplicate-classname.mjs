import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '../src/app/[locale]/warehouse/outbound/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Merge duplicate className attributes: className="a" className="b" → className="a b"
content = content.replace(
  /className="([^"]*)"\s+className="([^"]*)"/g,
  (_, first, second) => `className="${first} ${second}"`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Merged duplicate className attributes');
