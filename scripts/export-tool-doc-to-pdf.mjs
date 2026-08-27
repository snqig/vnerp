/**
 * 将刀模/网版工装方案文档导出为 PDF
 * 使用 Playwright chromium 渲染
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const mdPath = path.join(projectRoot, 'docs', '刀模 _ 网版工装全生命周期管理 完整落地方案.md');
const pdfPath = path.join(projectRoot, 'docs', '刀模_网版工装全生命周期管理方案.pdf');

function mdToHtml(md) {
  const lines = md.split('\n');
  const html = [];
  let inTable = false;
  let inCodeBlock = false;
  let inList = false;
  let listType = 'ul';
  let tableRows = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const header = tableRows[0].map((c) => `<th>${c}</th>`).join('');
    const body = tableRows
      .slice(2)
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
      .join('');
    html.push(`<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`);
    tableRows = [];
    inTable = false;
  }

  function flushList() {
    if (!inList) return;
    html.push(`</${listType}>`);
    inList = false;
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('</code></pre>');
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        html.push('<pre><code>');
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      html.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)[1].length;
      const text = line.replace(/^#+\s/, '');
      html.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      flushList();
      html.push('<hr/>');
      continue;
    }

    if (/^>\s/.test(line)) {
      flushList();
      html.push(`<blockquote>${line.replace(/^>\s/, '')}</blockquote>`);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      if (!inList || listType !== 'ul') {
        flushList();
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${line.replace(/^[-*]\s/, '')}</li>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== 'ol') {
        flushList();
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${line.replace(/^\d+\.\s/, '')}</li>`);
      continue;
    }

    if (line.trim() === '') {
      flushList();
      html.push('');
      continue;
    }

    flushList();
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    html.push(`<p>${processed}</p>`);
  }

  flushList();
  flushTable();
  if (inCodeBlock) html.push('</code></pre>');

  return html.join('\n');
}

async function main() {
  const md = fs.readFileSync(mdPath, 'utf8');
  const bodyHtml = mdToHtml(md);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.7; font-size: 14px; }
  h1 { color: #1a1a2e; border-bottom: 3px solid #16213e; padding-bottom: 10px; font-size: 24px; }
  h2 { color: #16213e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px; font-size: 20px; }
  h3 { color: #0f3460; margin-top: 24px; font-size: 17px; }
  h4 { color: #533483; font-size: 15px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th { background: #16213e; color: white; padding: 8px 12px; text-align: left; }
  td { border: 1px solid #ddd; padding: 8px 12px; }
  tbody tr:nth-child(even) { background: #f8f9fa; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: "Consolas", monospace; font-size: 13px; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 4px solid #0f3460; margin: 16px 0; padding: 8px 16px; background: #f0f4ff; }
  hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  @page { margin: 2cm; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const tmpHtmlPath = path.join(projectRoot, 'docs', '_tmp_export.html');
  fs.writeFileSync(tmpHtmlPath, fullHtml, 'utf8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///' + tmpHtmlPath.replace(/\\/g, '/'));
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '2cm', bottom: '2cm', left: '1.5cm', right: '1.5cm' } });
  await browser.close();

  fs.unlinkSync(tmpHtmlPath);
  console.log('PDF exported to:', pdfPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
