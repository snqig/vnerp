/**
 * 清理 plm_eco 旧数据并重新生成演示数据，对齐 UI 列表字段。
 *
 * 规则：
 *  - eco_type: bom/process/material/design 四种类型各若干条
 *  - 状态分布：draft=1(3)、pending=2(2)、approved=3(3)、executed=4(2)、rejected=6(1)
 *  - 关联 inv_material（type=1 成品 / type=2 半成品）
 *  - applicant 从 sys_user 取真实姓名
 *  - 编号规则：ECO + YYYYMMDD + 4位序号
 */

import mysql from 'mysql2/promise';

const DB = { host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

interface Product { id: number; material_code: string; material_name: string; }
interface SysUser { id: number; real_name: string; }

type EcoSpec = {
  ecoType: string;
  productId: number;
  productCode: string;
  productName: string;
  oldVersion: string;
  newVersion: string;
  changeReason: string;
  changeContent: string;
  status: number;
  applicant: string;
};

const ecoTypeOptions = ['bom', 'process', 'material', 'design'] as const;
const statusDist = [
  ...Array(3).fill(1),  // 3 × draft
  ...Array(2).fill(2),  // 2 × pending review
  ...Array(3).fill(3),  // 3 × approved
  ...Array(2).fill(4),  // 2 × executed
  ...Array(1).fill(6),  // 1 × rejected
]; // 共 11 条

const changeReasons: Record<string, string[]> = {
  bom: ['BOM结构优化', '增加子件层级', '替换替代物料', '精简冗余物料', '新增物料编码'],
  process: ['工艺路线调整', '新增加工工序', '工序顺序优化', '工时标准变更', '取消返工工序'],
  material: ['供应商切换', '材质规格升级', '表面处理工艺变更', '尺寸公差调整', '环保合规要求'],
  design: ['外观改版', '功能迭代', '结构简化', '模具修改', '客户定制需求'],
};

const changeContents: Record<string, string[]> = {
  bom: ['新增子件 A-101，替换原 A-100', '调整 BOM 层级结构，优化装配顺序', '将 X 型号替换为 Y 型号，成本降低 8%'],
  process: ['新增 CNC 精加工工序，替换原有粗加工', '调整热处理温度参数，延长使用寿命', '工序 P-05 由外包改为自产'],
  material: ['基材由 PET 更换为 PP，提升耐温性', '表面处理由哑光改为亮光，满足客户确认样', '厚度由 0.5mm 调整为 0.6mm'],
  design: ['产品外形由圆角改为直角设计', '增加定位孔位，便于自动化装配', '修改产品结构以满足新认证要求'],
};

async function main() {
  const conn = await mysql.createConnection(DB);
  try {
    await conn.beginTransaction();

    // 1. 读取产品（inv_material type=1 成品 / type=2 半成品）
    const [products] = await conn.query<Product[]>(
      `SELECT id, material_code, material_name FROM inv_material
       WHERE deleted = 0 AND material_type IN (1, 2)
       ORDER BY id LIMIT 20`
    );
    const prodList = products as unknown as Product[];
    console.log(`[Seed] 可用产品 ${prodList.length} 个`);

    // 2. 读取系统用户
    const [users] = await conn.query<SysUser[]>(
      'SELECT id, real_name FROM sys_user WHERE deleted = 0 AND real_name IS NOT NULL AND real_name != "" ORDER BY id LIMIT 10'
    );
    const userList = users as unknown as SysUser[];
    console.log(`[Seed] 可用用户 ${userList.length} 个`);

    if (prodList.length === 0 || userList.length === 0) {
      console.error('[Seed] 产品或用户不足，跳过');
      await conn.rollback();
      return;
    }

    // 3. 软删除旧数据
    const [oldEcos] = await conn.query<{ id: number }[]>(
      'SELECT id FROM plm_eco WHERE deleted = 0'
    );
    for (const e of oldEcos) {
      await conn.execute('UPDATE plm_eco SET deleted = 1 WHERE id = ? AND deleted = 0', [e.id]);
    }
    console.log(`[Seed] 已软删除 ${oldEcos.length} 条旧 ECO 记录`);

    // 4. 构造种子数据
    const baseDate = new Date('2026-09-01');
    const seedRecords: EcoSpec[] = [];
    for (let i = 0; i < statusDist.length; i++) {
      const ecoType = ecoTypeOptions[i % ecoTypeOptions.length];
      const prod = prodList[i % prodList.length];
      const user = userList[i % userList.length];
      const reasons = changeReasons[ecoType];
      const contents = changeContents[ecoType];
      seedRecords.push({
        ecoType,
        productId: prod.id,
        productCode: prod.material_code,
        productName: prod.material_name,
        oldVersion: `V${Math.floor(i / 2) + 1}.0`,
        newVersion: `V${Math.floor(i / 2) + 2}.0`,
        changeReason: reasons[i % reasons.length],
        changeContent: contents[i % contents.length],
        status: statusDist[i],
        applicant: user.real_name,
      });
    }

    // 5. 写入 ECO 记录（eco_type 现在为 varchar，直接传字符串）
    for (let i = 0; i < seedRecords.length; i++) {
      const rec = seedRecords[i];
      const applyTime = new Date(baseDate.getTime() + i * 3 * 86400000);
      const ecoNo = `ECO${applyTime.getFullYear()}${String(applyTime.getMonth() + 1).padStart(2, '0')}${String(applyTime.getDate()).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`;
      const ecoTitle = `${rec.ecoType.toUpperCase()}-ECO-${String(i + 1).padStart(3, '0')}`;

      const [result] = await conn.execute(
        `INSERT INTO plm_eco
         (eco_no, eco_title, eco_type, product_id, product_code, product_name,
          old_version, new_version, change_reason, change_content, impact_analysis,
          status, applicant, apply_time, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          ecoNo,
          ecoTitle,
          rec.ecoType,
          rec.productId || null,
          rec.productCode || null,
          rec.productName || null,
          rec.oldVersion,
          rec.newVersion,
          rec.changeReason,
          rec.changeContent,
          `影响分析：${rec.changeContent}，需同步更新 BOM 及工艺文档`,
          rec.status,
          rec.applicant,
          applyTime.toISOString().slice(0, 19).replace('T', ' '),
          rec.status === 6 ? '审批未通过，原因待补充' : rec.status === 4 ? '已执行完毕' : '',
        ]
      );
      console.log(`[Seed] 已创建 ${ecoNo} (type=${rec.ecoType}, status=${rec.status}, product=${rec.productName})`);
    }

    await conn.commit();
    console.log(`[Seed] 共重新生成 ${seedRecords.length} 条 ECO 记录`);
  } catch (e) {
    await conn.rollback();
    console.error('[Seed] 失败:', e);
    throw e;
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
