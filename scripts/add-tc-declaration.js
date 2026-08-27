/**
 * 为所有使用了 tc() 但没有声明 tc 的文件添加 const tc = useTranslations('Common')
 */
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();

function walkDir(dir, fileList) {
  const fullPath = path.join(PROJECT, dir);
  if (!fs.existsSync(fullPath)) return;
  const items = fs.readdirSync(fullPath);
  for (const item of items) {
    const itemPath = path.join(fullPath, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next') continue;
      walkDir(path.join(dir, item), fileList);
    } else if (item === 'page.tsx' || item === 'layout.tsx') {
      fileList.push(path.join(dir, item));
    }
  }
}

const files = [];
walkDir('src/app/[locale]', files);

let fixedFiles = 0;

for (const file of files) {
  const fullPath = path.join(PROJECT, file);
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // 检查是否有 tc(" 调用
  if (!content.includes('tc("')) continue;
  
  // 检查是否已有 const tc = useTranslations('Common')
  if (content.includes("const tc = useTranslations('Common')")) continue;
  
  // 检查是否有 useTranslations import
  const hasImport = content.includes("import { useTranslations } from 'next-intl'");
  
  if (!hasImport) {
    // 添加 import
    content = content.replace(
      /^(['"]use client['"];?\n)/,
      "$1import { useTranslations } from 'next-intl';\n"
    );
  }
  
  // 在 export default function 后面添加 tc 声明
  const funcMatch = content.match(/export default function \w+\(\) \{/);
  if (funcMatch) {
    content = content.replace(
      /(export default function \w+\(\) \{)/,
      "$1\n  const tc = useTranslations('Common');"
    );
    fs.writeFileSync(fullPath, content, 'utf-8');
    fixedFiles++;
    console.log(`  Fixed: ${file}`);
  }
}

console.log(`\nFixed ${fixedFiles} files`);