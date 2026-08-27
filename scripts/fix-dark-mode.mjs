import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '../src/app/[locale]/warehouse/outbound/page.tsx');
let content = fs.readFileSync(file, 'utf8');
const original = content;

// Pattern 1: style={{ backgroundColor: '#ffffff', borderColor: '#eeeeee', boxShadow: '...' }}
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*backgroundColor:\s*'#ffffff',[\s\n]*borderColor:\s*'#eeeeee',[\s\n]*boxShadow:\s*'[^']*',[\s\n]*\}[\s\n]*\}/g,
  'className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 shadow-sm"'
);

// Pattern 2: style={{ backgroundColor: '#ffffff' }} (single property)
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*backgroundColor:\s*'#ffffff',?[\s\n]*\}[\s\n]*\}/g,
  'className="bg-white dark:bg-gray-950"'
);

// Pattern 3: color: '#1f2329' → text-gray-900 dark:text-gray-100
// Only on standalone style={{ color: '#1f2329' }}
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*color:\s*'#1f2329',?[\s\n]*\}[\s\n]*\}/g,
  'className="text-gray-900 dark:text-gray-100"'
);

// Pattern 4: color: '#4e5969' → text-gray-600 dark:text-gray-300
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*color:\s*'#4e5969',?[\s\n]*\}[\s\n]*\}/g,
  'className="text-gray-600 dark:text-gray-300"'
);

// Pattern 5: color: '#86909c' → text-gray-400 dark:text-gray-500
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*color:\s*'#86909c',?[\s\n]*\}[\s\n]*\}/g,
  'className="text-gray-400 dark:text-gray-500"'
);

// Pattern 6: backgroundColor: '#f5f7fa' → bg-gray-50 dark:bg-gray-800
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*backgroundColor:\s*'#f5f7fa',?[\s\n]*\}[\s\n]*\}/g,
  'className="bg-gray-50 dark:bg-gray-800"'
);

// Pattern 7: backgroundColor: '#1677ff' in icon containers → bg-blue-600
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*backgroundColor:\s*'#1677ff',?[\s\n]*\}[\s\n]*\}/g,
  'className="bg-blue-600"'
);

// Pattern 8: Combined style with backgroundColor + color
content = content.replace(
  /style=\{[\s\n]*\{[\s\n]*backgroundColor:\s*'#1677ff',[\s\n]*borderColor:\s*'#1677ff',?[\s\n]*\}[\s\n]*\}/g,
  'className="bg-blue-600 border-blue-600"'
);

if (content !== original) {
  fs.writeFileSync(file, content, 'utf8');
  const count = (content.match(/className="/g) || []).length - (original.match(/className="/g) || []).length;
  console.log(`Fixed ${count} inline styles for dark mode`);
} else {
  console.log('No changes made');
}
