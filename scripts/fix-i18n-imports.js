const fs = require('fs');
const path = require('path');

const dir = 'd:/dcprint/erp-project/src/app/[locale]';
let count = 0;

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const fp = path.join(d, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      walk(fp);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      let c = fs.readFileSync(fp, 'utf8');
      const orig = c;

      // Replace various next/navigation imports that include useRouter
      // Pattern: import { useRouter, ...others } from 'next/navigation';
      c = c.replace(
        /import \{ (useRouter[^}]*) \} from 'next\/navigation';/g,
        (match, imports) => {
          const importList = imports.split(',').map(s => s.trim());
          const i18nImports = [];
          const nextImports = [];

          for (const imp of importList) {
            if (imp === 'useRouter' || imp === 'usePathname') {
              i18nImports.push(imp);
            } else {
              nextImports.push(imp);
            }
          }

          let result = '';
          if (nextImports.length > 0) {
            result += `import { ${nextImports.join(', ')} } from 'next/navigation';\n`;
          }
          if (i18nImports.length > 0) {
            result += `import { ${i18nImports.join(', ')} } from '@/i18n/navigation';`;
          }
          return result;
        }
      );

      if (c !== orig) {
        fs.writeFileSync(fp, c, 'utf8');
        count++;
        console.log('Updated:', fp);
      }
    }
  }
}

walk(dir);
console.log('Total updated:', count);
