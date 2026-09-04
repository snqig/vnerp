/**
 * 自动填充 standard-card 卡片「新增」页的所有输入框（验证模式，默认不落库）。
 *
 * 用法：
 *   node scripts/fill-standard-card.cjs            # 仅填充并截图验证，不保存
 *   SAVE=1 node scripts/fill-standard-card.cjs     # 填充后点击"保存"以 POST 新增一条记录
 *
 * 说明：
 *   - 进入「新增」模式：URL 不带 id/edit 参数（/sample/standard-card?mode=card），
 *     此时 useStandardCardForm 的 isEditMode=false → 保存走 POST 而非 PUT。
 *   - 数据来自项目根目录 standard-card-fill-data.json（覆盖 CardData 全部字段）
 *   - 文本/日期/文本域按组件 DOM 顺序填充；复选框（纸芯类型/印刷方式/工艺）、
 *     单选（加虚线刀）按数据中的逗号列表勾选
 *   - 验证模式不会调用保存接口，因此不会改动数据库；如需新增请加 SAVE=1
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:5000';
// 「新增」模式：不带 id/edit 参数，表单以 createEmptyData 初始化并以 POST 提交
const ADD_URL = `${BASE}/sample/standard-card?mode=card`;
const DATA_PATH = path.resolve(__dirname, '..', 'standard-card-fill-data.json');
const SAVE = process.env.SAVE === '1';

// 与 src/app/[locale]/sample/standard-card/InputCardForm.tsx 的 DOM 顺序严格一致。
// 仅包含有 <input>/<textarea> 的字段（不含 readonly 的公司名，不含 checkbox/radio）。
// 注意：印序表头行内嵌两个输入框（moldType、materialType）；每个 seq 行除 8 个标准列外，
// 还按 index 附带 3 个条件字段（index 3 仅 radio、无文本框）。顺序务必与下述一致。
const ORDER = [
  'cardNo', 'customer', 'version', 'date', 'productName', 'customerCode', 'finishedSize',
  'tolerance', 'materialName', 'layoutType', 'spacing', 'sheetSpecs.width', 'sheetSpecs.length',
  'standardUsage', 'paperDirection', 'spacingValue', 'rollWidth', 'paperEdge', 'jumpDistance',
  'processFlow1', 'processFlow2', 'firstJumpDistance',
  'moldType', 'materialType',
  // seq0（8 标准 + filmManufacturer, stampingMethod, mylarSpecs）
  'seq0.color', 'seq0.inkCode', 'seq0.linCode', 'seq0.storageLocation', 'seq0.plateCode',
  'seq0.mesh', 'seq0.plateStorage', 'seq0.printSide',
  'filmManufacturer', 'stampingMethod', 'mylarSpecs',
  // seq1（8 标准 + moldCode, backMoldCode, layoutMethod）
  'seq1.color', 'seq1.inkCode', 'seq1.linCode', 'seq1.storageLocation', 'seq1.plateCode',
  'seq1.mesh', 'seq1.plateStorage', 'seq1.printSide',
  'moldCode', 'backMoldCode', 'layoutMethod',
  // seq2（8 标准 + adhesiveSize, backMylarMold, jumpDistance2）
  'seq2.color', 'seq2.inkCode', 'seq2.linCode', 'seq2.storageLocation', 'seq2.plateCode',
  'seq2.mesh', 'seq2.plateStorage', 'seq2.printSide',
  'adhesiveSize', 'backMylarMold', 'jumpDistance2',
  // seq3（仅 8 标准，无附加文本框）
  'seq3.color', 'seq3.inkCode', 'seq3.linCode', 'seq3.storageLocation', 'seq3.plateCode',
  'seq3.mesh', 'seq3.plateStorage', 'seq3.printSide',
  // seq4（8 标准 + adhesiveType, slicePerRow, slicePerRoll）
  'seq4.color', 'seq4.inkCode', 'seq4.linCode', 'seq4.storageLocation', 'seq4.plateCode',
  'seq4.mesh', 'seq4.plateStorage', 'seq4.printSide',
  'adhesiveType', 'slicePerRow', 'slicePerRoll',
  // seq5（8 标准 + adhesiveManufacturer, slicePerBundle, slicePerBag）
  'seq5.color', 'seq5.inkCode', 'seq5.linCode', 'seq5.storageLocation', 'seq5.plateCode',
  'seq5.mesh', 'seq5.plateStorage', 'seq5.printSide',
  'adhesiveManufacturer', 'slicePerBundle', 'slicePerBag',
  // seq6（8 标准 + adhesiveSpecs, slicePerBox, packingQty）
  'seq6.color', 'seq6.inkCode', 'seq6.linCode', 'seq6.storageLocation', 'seq6.plateCode',
  'seq6.mesh', 'seq6.plateStorage', 'seq6.printSide',
  'adhesiveSpecs', 'slicePerBox', 'packingQty',
  // tail
  'colorFormula', 'backKnifeMold', 'releasePaperCategory', 'releasePaperType', 'etchMold',
  'paddingMaterial', 'releasePaperSpecs', 'extraField', 'packingMaterial',
  'filePath', 'notes', 'sampleInfo',
  'creator', 'reviewer', 'factoryManager', 'qualityManager', 'sales', 'approver',
];

function getVal(data, key) {
  if (key.startsWith('seq')) {
    const m = key.match(/^seq(\d+)\.(\w+)$/);
    const idx = parseInt(m[1], 10);
    const f = m[2];
    return (data.sequences[idx] && data.sequences[idx][f]) || '';
  }
  if (key.includes('.')) {
    const [a, b] = key.split('.');
    return (data[a] && data[a][b]) || '';
  }
  return data[key] ?? '';
}

async function checkByLabels(page, labels, type) {
  for (const label of labels) {
    const sel = `label:has-text("${label}") input[type=${type}]`;
    const loc = page.locator(sel);
    const n = await loc.count();
    if (n === 0) {
      console.log(`  [warn] 未找到 ${type} 标签 "${label}"`);
      continue;
    }
    const box = loc.first();
    const checked = await box.isChecked().catch(() => false);
    if (!checked) await box.click();
  }
}

(async () => {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [browser-error]', m.text()); });

  console.log('==> 登录');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: /登录|登入|Login|Sign/ }).click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 }).catch(() => {});
  console.log('    登录后 URL:', page.url());

  console.log('==> 打开「新增」页', ADD_URL);
  await page.goto(ADD_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('table input, table textarea', { timeout: 15000 });

  // 注意：documentCode 输入框在 <table> 之外（底部 div），单独处理
  const inputSel = 'table input[type="text"]:not([readonly]), table input[type="date"]:not([readonly]), table textarea';
  const inputs = page.locator(inputSel);
  const actual = await inputs.count();
  console.log(`    可填充输入框数量: 期望 ${ORDER.length} / 实际 ${actual}`);
  if (actual !== ORDER.length) {
    console.log('    [ERROR] 数量不一致，停止填充以避免错位。请核对 ORDER 顺序或组件改动。');
    await browser.close();
    process.exit(2);
  }

  console.log('==> 逐字段填充');
  for (let i = 0; i < ORDER.length; i++) {
    const key = ORDER[i];
    const val = String(getVal(data, key));
    if (val === '') continue;
    try {
      await inputs.nth(i).fill(val);
    } catch (e) {
      console.log(`    [warn] 填充 ${key} 失败: ${e.message}`);
    }
  }

  console.log('==> 勾选复选/单选');
  await checkByLabels(page, data.coreType.split(',').filter(Boolean), 'checkbox');
  await checkByLabels(page, data.printType.split(',').filter(Boolean), 'checkbox');
  await checkByLabels(page, data.processMethod.split(',').filter(Boolean), 'checkbox');
  // 加虚线刀：true -> 第一个 radio(是)
  const radios = page.locator('input[type="radio"][name="dashedKnife"]');
  if ((await radios.count()) >= 1) {
    const target = data.dashedKnife ? radios.first() : radios.nth(1);
    if (!(await target.isChecked().catch(() => false))) await target.click();
  }

  // documentCode 在表格外，单独填充
  const docInput = page.locator('xpath=//span[normalize-space()="编号："]/following-sibling::input');
  if (await docInput.count()) {
    await docInput.first().fill(String(data.documentCode));
  }

  // 回读抽样验证（含之前错位的字段）
  console.log('==> 抽样回读');
  const samples = [
    'cardNo', 'customer', 'productName', 'materialName', 'moldType', 'materialType',
    'filmManufacturer', 'mylarSpecs', 'moldCode', 'layoutMethod', 'adhesiveSize',
    'jumpDistance2', 'slicePerRoll', 'packingQty', 'releasePaperType', 'approver',
  ];
  let mismatch = 0;
  for (const k of samples) {
    const idx = ORDER.indexOf(k);
    const v = await inputs.nth(idx).inputValue().catch(() => '');
    const ok = v === getVal(data, k);
    if (!ok) mismatch++;
    console.log(`    ${k}: "${v}"  (期望 "${getVal(data, k)}")  ${ok ? 'OK' : 'MISMATCH'}`);
  }
  if (await docInput.count()) {
    const dv = await docInput.first().inputValue().catch(() => '');
    const ok = dv === data.documentCode;
    if (!ok) mismatch++;
    console.log(`    documentCode: "${dv}"  (期望 "${data.documentCode}")  ${ok ? 'OK' : 'MISMATCH'}`);
  }
  if (mismatch > 0) {
    console.log(`    [ERROR] ${mismatch} 个字段回读不一致，停止保存以避免错位落库。请核对 ORDER 顺序。`);
    await browser.close();
    process.exit(3);
  }

  const shot = path.resolve(__dirname, '..', '_fill_preview.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('    截图已保存:', shot);

  if (SAVE) {
    console.log('==> 点击"保存"以 POST 新增一条记录');
    await page.getByRole('button', { name: /保存/ }).click();
    await page.waitForTimeout(2500);
    console.log('    保存后 URL:', page.url());
  } else {
    console.log('==> 验证模式：未提交（加 SAVE=1 将以 POST 新增记录）');
  }

  await browser.close();
  console.log('DONE');
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
