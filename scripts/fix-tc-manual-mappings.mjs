/**
 * Fix remaining 207 module-scope tc() errors by replacing with Chinese literals
 * reconstructed from code context (variable names, surrounding code, data models).
 *
 * These tc('text_xxx') calls were created by eslint --fix auto-conversion, but the
 * original Chinese was never committed to git (files were created with tc() already).
 * The keys don't exist in translation files either, so we reconstruct from context.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('.');

// Complete key → Chinese mapping reconstructed from code context analysis
const keyToChinese = {
  // === ink-formula/page.tsx ===
  text_ebukb: '启用',
  text_fserk: '未核算',
  text_imlcd1: '核算中',
  text_gt7wog: '色号',
  text_gt0ljc: '颜色名称',
  text_mvgp: '色系',
  text_t0i9dz: '当前版本',
  text_h8pho: '版本数',
  text_oyzcd0: '暂无色号数据',
  text_mtuf0: '新增版本',
  text_eugxjz: '版本对比',
  text_eufntz: '版本名称',
  text_csxkx3: '成本状态',
  text_c2uubz: '暂无版本数据',
  text_vziwxm: '色号',
  text_qkehhu: '颜色名称',
  text_r29cju: '变更原因',
  text_ce4kun: '工艺说明',
  text_ir5mro: '配方明细',
  text_e7ze4d: '添加物料',
  text_iof: '序号',
  text_dh5c1x: '比例',
  text_fg8e: '单位',
  text_aus8we: '加料顺序',
  text_cdvyd2: '工艺备注',
  text_x2sthc: '暂无配方明细',
  text_arcyhh: '创建草稿',
  text_c6kv1h: '对比版本',
  text_axejg8: '被对比版本',
  text_pj4m6u: '理论成本',
  text_xseus: '差异字段',
  text_fit3a: '版本差异',
  text_c7iry: '物料对比',
  text_c8v28i: '比例',
  text_gety: '重量',
  text_epwp: '差异',
  text_u2mtun: '返回色号列表',
  text_ji49h: '色号',
  text_cqznp9: '颜色名称',
  text_anshly: '色系',
  text_dznm1v: '变更原因',
  text_7hp3v9: '来源版本',
  text_ax8uvf: '原始版本',
  text_lpkhnn: '创建时间',
  text_q2e9v1: '生效时间',
  text_whpylj: '作废时间',
  text_t0dojv: '工艺说明',
  text_ymbxls: '成本快照时间',
  text_g74iqp: '暂无成本预警',
  text_ix94dw: '配方明细',
  text_pxow: '项',
  text_dcvedy: '暂无配方明细',
  text_cxaq59: '生效',
  text_azkcii: '删除',

  // === dcprint/page.tsx ===
  text_ad2q8s: '今日刀具',

  // === tool/page.tsx ===
  text_gw1v: '闲置',
  text_6oqc3w: '刀具管理',
  text_ceubkl: '刀具总数',
  text_ifh114: '净值合计',
  text_bysdu1: '类型',
  text_cez1tc: '刀具编码',
  text_cezo6j: '刀具名称',
  text_cesd1f: '规格型号',
  text_nktn4b: '品牌',
  text_hucgoq: '原值',
  text_avx7q1: '使用寿命',
  text_apeqtc: '预警阈值',
  text_i35nw: '刀具详情',
  text_in9vu: '类型',
  text_cvxuf: '名称',
  text_ko5z6: '规格',
  text_h9767: '状态',
  text_umhogx: '总寿命',
  text_re8gad: '已用次数',
  text_mjeyd0: '剩余寿命',
  text_oqq97g: '预警阈值',
  text_cmkwt: '原值',
  text_a7fw9w: '累计折旧',
  text_ccpq6: '净值',
  text_fej5n2: '单位成本',
  text_is1b: '使用时长',
  text_arlt0g: '日期',
  text_byrrn3: '备注',
  text_14efe3: '使用记录',
  text_1xw61i: '剩余寿命',
  text_k3zlyy: '使用时长',
  text_gc5jbb: '保养记录',
  text_b5wslc: '确认保养',
  text_bynkou: '取消',
  text_gcjvta: '备注',
  text_kljgmy: '保养费用',
  text_6ge4se: '经办人',
  text_kdlsk9: '刀具报废',
  text_qz3ind: '确认报废此刀具？报废后不可恢复。',

  // === modules/page.tsx ===
  text_5o6tmn: '客户信用管控',
  text_8nmok4: '应收账款跟踪',
  text_jo1tyf: '打样工单管理',
  text_gf8f7m: '批次效期管理',
  text_lwwunp: '安全库存预警',
  text_xwneu7: '报工进度跟踪',
  text_uinwdj: '设备OEE分析',
  text_4tq0pa: 'SPC统计分析',
  text_lvcuzy: '售后追溯',
  text_vm0tcm: '供应商评级',
  text_etx0ro: '对账付款',
  text_aegk2c: '委外损耗管理',
  text_csr5z8: '装车确认',
  text_s99qhz: '对账支持',
  text_53muf: '保养计划管理',
  text_utn633: '备件管理',
  text_stggif: '生产看板',
  text_5lx15g: '品质看板',
  text_ayyzag: '收货上架',

  // === standard-card/input-v2/page.tsx ===
  text_moww1l: '查看工艺卡',
  text_12p8jd: '填写须知',
  text_cu4sef: '工艺卡名称',
  text_bj5mqu: '产品名称',
  text_avn2ot: '客户名称',
  text_e3a6ms: '基材',
  text_asc8rl: '印刷颜色',
  text_gjar4n: '模切',
  text_giq5j: '添加物料',
  text_kfxpk: '金额',
  text_i2r8: '时薪',
  text_cdv0mb: '备注',
  text_bzeu5w: '工艺路线',
  text_euupnw: '物料清单',
  text_ceun4s: '工序清单',

  // === standard-card/input/page.tsx (additional unique keys) ===
  text_my3hv1: '查看工艺卡',
  text_ho0d5q: '基本信息',
  text_leggup: '物料清单',
  text_j9i84i: '工序清单',
  text_d7qqus: '工艺卡预览',
  text_s8ih1p: '样品名称',
  text_ygcm2l: '产品名称',
  text_2cbpmc: '基材',
  text_hwnk4j: '印刷颜色',
  text_an4s5i: '油墨色号',
  text_kqzbqf: '模切刀具',
  text_feidk3: '网版刀具',
  text_d2jw23: '损耗率',
  text_wk7dwj: '预计工时',
  text_eugdlz: '版本号',
  text_yei8g0: '物料明细',
  text_izew: '项',
  text_ohqhn2: '工序明细',
  text_btcrz: '上一步',
  text_btdio: '下一步',

  // === standard-card/page.tsx ===
  text_fs1hnw: '新建工艺卡',
  text_pb0gel: '复制',
  text_obw: '第',
  text_njq8u: '页，共',

  // === settings/config/page.tsx ===
  text_j8sepf: '库存允许负数',

  // === warehouse-category.tsx ===
  text_bu30q: '个仓库',

  // === process-cards/route.ts ===
  text_le25fc: '操作成功',
  text_lq5xax: '流程卡已解锁',

  // === settings/system/route.ts ===
  text_pzjn5e: '配置类型',
  text_1hn796: '分类',
  text_r8prlt: '显示名称',
  text_f87tlz: '描述',
  text_c4y2el: '排序',
  text_shjucc: '是否必填',
  text_93vfex: '需要审批',
  text_m4e84i: '状态',

  // === PrinterManagement.tsx ===
  text_bkj10: '创建时间',

  // === QRCodeScanner.tsx ===
  text_9zob8j: '扫描历史',

  // === material-picker.tsx ===
  text_fp4s1: '种物料',

  // === api-auth.ts ===
  text_r1wt8y: '无权限访问',

  // === data-diff.ts ===
  text_o6y: '空',

  // === die-matcher.ts ===
  text_l5xt: '海绵',
  text_jbzmp: '胶带',
  text_evlj: '双面胶',

  // === logger.ts ===
  text_b849kh: '✗ 未命中',

  // === soft-delete.ts ===
  text_d91rwu: '已付款记录不可作废',
};

console.log(`Loaded ${Object.keys(keyToChinese).length} key→Chinese mappings`);

// Run tsc to get error lines
let tscOutput;
try {
  tscOutput = execSync('npx tsc --noEmit 2>&1', {
    cwd: projectRoot, encoding: 'utf8', timeout: 300000,
    maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  tscOutput = err.stdout || err.stderr || '';
}

// Parse tsc errors: path(line,col): error TS2304: Cannot find name 'tc'.
const errorRegex = /^(.+?)\((\d+),(\d+)\): error TS2304: Cannot find name 'tc'\./gm;
const fileErrors = new Map();
let match;
while ((match = errorRegex.exec(tscOutput)) !== null) {
  const file = match[1];
  const line = parseInt(match[2], 10);
  if (!fileErrors.has(file)) fileErrors.set(file, new Set());
  fileErrors.get(file).add(line);
}

console.log(`Found tc errors in ${fileErrors.size} files`);

// tc() call pattern: tc('text_xxx')
const tcCallRegex = /\btc\(\s*['"]([^'"]+)['"]\s*\)/g;

let totalReplaced = 0;
let totalNotFound = 0;
const notFoundKeys = new Set();

for (const [relFile, errorLines] of fileErrors) {
  const fullPath = resolve(projectRoot, relFile);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    console.log(`SKIP (not found): ${relFile}`);
    continue;
  }

  const lines = content.split('\n');
  let fileReplaced = 0;
  let fileNotFound = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (!errorLines.has(lineNum)) continue;

    lines[i] = lines[i].replace(tcCallRegex, (full, key) => {
      if (keyToChinese[key] !== undefined) {
        fileReplaced++;
        totalReplaced++;
        const chinese = keyToChinese[key];
        // Escape single quotes for string literal
        return `'${chinese.replace(/'/g, "\\'")}'`;
      } else {
        fileNotFound++;
        totalNotFound++;
        notFoundKeys.add(key);
        return full;
      }
    });
  }

  if (fileReplaced > 0) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
    console.log(`FIXED ${relFile}: ${fileReplaced} replaced${fileNotFound > 0 ? `, ${fileNotFound} not found` : ''}`);
  } else if (fileNotFound > 0) {
    console.log(`PARTIAL ${relFile}: ${fileNotFound} not found`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total replaced: ${totalReplaced}`);
console.log(`Total not found: ${totalNotFound}`);
if (notFoundKeys.size > 0) {
  console.log(`Not found keys (${notFoundKeys.size}):`, [...notFoundKeys].join(', '));
}
