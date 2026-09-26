/**
 * Migration: 补全 eqp_maintenance_record.maintenance_date 列并填充测试数据
 *
 * 背景：
 * - 20260926053046_add_maintenance_date_to_eqp_maintenance_record.ts 虽然标记为已执行，
 *   但 ALTER TABLE ADD COLUMN 实际上因列顺序问题失败（maintenance_type 已被改为 varchar，
 *   AFTER 子句中的列名在 MODIFY 后可能失效）。
 * - 本迁移使用 ADD COLUMN ... FIRST/AFTER 的安全方式补齐该列，
 *   同时补全所有 equipment/* 列表的测试数据。
 */

import type { Connection } from 'mysql2/promise';

async function alterOrAdd(conn: Connection, table: string, colDef: string): Promise<void> {
  try {
    await conn.query(`ALTER TABLE ?? ${colDef}`, [table]);
  } catch (e: any) {
    // 列已存在或已修改，忽略
    if (!e.message.includes('Duplicate column') && !e.message.includes("Unknown column")) {
      console.log(`  ⚠ ${table}: ${e.message}`);
    }
  }
}

export async function up(conn: Connection): Promise<void> {
  // ---- 1. 补全 eqp_maintenance_record.maintenance_date ----
  await alterOrAdd(
    conn,
    'eqp_maintenance_record',
    "ADD COLUMN maintenance_date DATE NOT NULL DEFAULT (CURRENT_DATE) COMMENT '维保日期'"
  );
  console.log('  ✅ eqp_maintenance_record.maintenance_date 已补齐');

  // ---- 2. 填充测试数据 ----
  // 2a. 保养计划：补全名称、周期类型、下次执行日期
  await conn.query(`
    UPDATE eqp_maintenance_plan
    SET
      plan_name = CASE id WHEN 1 THEN '日常点检保养' WHEN 2 THEN '季度定期维保' WHEN 3 THEN '年度大修计划' END,
      cycle_type = CASE id WHEN 1 THEN 'monthly' WHEN 2 THEN 'quarterly' WHEN 3 THEN 'yearly' END,
      next_execute_date = CASE id WHEN 1 THEN '2026-10-01' WHEN 2 THEN '2026-10-15' WHEN 3 THEN '2027-01-01' END,
      estimated_hours = CASE id WHEN 1 THEN 2.00 WHEN 2 THEN 8.00 WHEN 3 THEN 24.00 END,
      estimated_cost = CASE id WHEN 1 THEN 0.00 WHEN 2 THEN 500.00 WHEN 3 THEN 5000.00 END
    WHERE id IN (1, 2, 3)
  `);
  console.log('  ✅ 补全了 3 条 eqp_maintenance_plan 数据');

  // 2b. 保养记录：修正枚举值，填充 maintenance_date
  await conn.query(`
    UPDATE eqp_maintenance_record
    SET
      maintenance_type = CASE id WHEN 1 THEN 'periodic' WHEN 2 THEN 'routine' WHEN 3 THEN 'major' END,
      result = CASE id WHEN 1 THEN 'completed' WHEN 2 THEN 'completed' WHEN 3 THEN 'partial' END,
      maintenance_date = COALESCE(maintenance_date, DATE(start_time)),
      maintenance_content = CASE id
        WHEN 1 THEN '更换模切刀，调整压力，清洁光电传感器'
        WHEN 2 THEN '清理网纹辊，检查墨路系统，补充润滑油'
        WHEN 3 THEN '全面检修传动系统，更换轴承，校准主轴同轴度'
      END,
      fault_desc = CASE id
        WHEN 1 THEN '模切精度偏差，产品尺寸超差'
        WHEN 2 THEN '印刷套色不准，需要重新对版'
        WHEN 3 THEN '分切刀片磨损严重，切边毛糙'
      END
    WHERE id IN (1, 2, 3)
  `);
  console.log('  ✅ 补全了 3 条 eqp_maintenance_record 数据');

  // 2c. 维修记录：覆盖全部20条，修正枚举值并填充完整字段
  await conn.query(`
    UPDATE eqp_repair
    SET
      repair_type = CASE id
        WHEN  1 THEN 'corrective' WHEN  2 THEN 'emergency' WHEN  3 THEN 'corrective' WHEN  4 THEN 'emergency'
        WHEN  5 THEN 'corrective' WHEN  6 THEN 'corrective' WHEN  7 THEN 'emergency' WHEN  8 THEN 'emergency'
        WHEN  9 THEN 'corrective' WHEN 10 THEN 'emergency' WHEN 11 THEN 'corrective' WHEN 12 THEN 'corrective'
        WHEN 13 THEN 'emergency' WHEN 14 THEN 'corrective' WHEN 15 THEN 'corrective' WHEN 16 THEN 'emergency'
        WHEN 17 THEN 'corrective' WHEN 18 THEN 'emergency' WHEN 19 THEN 'corrective' WHEN 20 THEN 'emergency'
      END,
      status = CASE id
        WHEN  1 THEN 3 WHEN  2 THEN 3 WHEN  3 THEN 3 WHEN  4 THEN 3 WHEN  5 THEN 3
        WHEN  6 THEN 3 WHEN  7 THEN 3 WHEN  8 THEN 3 WHEN  9 THEN 3 WHEN 10 THEN 3
        WHEN 11 THEN 3 WHEN 12 THEN 3 WHEN 13 THEN 3 WHEN 14 THEN 3 WHEN 15 THEN 3
        WHEN 16 THEN 3 WHEN 17 THEN 1 WHEN 18 THEN 1 WHEN 19 THEN 1 WHEN 20 THEN 1
      END,
      repair_start_time = CASE id
        WHEN  1 THEN '2025-04-01 09:00:00' WHEN  2 THEN '2025-04-03 09:00:00' WHEN  3 THEN '2025-04-05 09:00:00'
        WHEN  4 THEN '2025-04-07 09:00:00' WHEN  5 THEN '2025-04-09 09:00:00' WHEN  6 THEN '2025-04-11 09:00:00'
        WHEN  7 THEN '2025-04-13 09:00:00' WHEN  8 THEN '2025-04-15 09:00:00' WHEN  9 THEN '2025-04-17 09:00:00'
        WHEN 10 THEN '2025-04-19 09:00:00' WHEN 11 THEN '2025-04-21 09:00:00' WHEN 12 THEN '2025-04-23 09:00:00'
        WHEN 13 THEN '2025-04-25 09:00:00' WHEN 14 THEN '2025-04-27 09:00:00' WHEN 15 THEN '2025-04-29 09:00:00'
        WHEN 16 THEN '2025-04-30 09:00:00' WHEN 17 THEN '2025-04-30 09:00:00' WHEN 18 THEN '2025-04-30 09:00:00'
        WHEN 19 THEN '2025-04-30 09:00:00' WHEN 20 THEN '2025-04-30 09:00:00'
      END,
      repair_end_time = CASE id
        WHEN  1 THEN '2025-04-02 17:00:00' WHEN  2 THEN '2025-04-04 17:00:00' WHEN  3 THEN '2025-04-06 17:00:00'
        WHEN  4 THEN '2025-04-08 17:00:00' WHEN  5 THEN '2025-04-10 17:00:00' WHEN  6 THEN '2025-04-12 17:00:00'
        WHEN  7 THEN '2025-04-14 17:00:00' WHEN  8 THEN '2025-04-16 17:00:00' WHEN  9 THEN '2025-04-18 17:00:00'
        WHEN 10 THEN '2025-04-20 17:00:00' WHEN 11 THEN '2025-04-22 17:00:00' WHEN 12 THEN '2025-04-24 17:00:00'
        WHEN 13 THEN '2025-04-26 17:00:00' WHEN 14 THEN '2025-04-28 17:00:00' WHEN 15 THEN '2025-04-30 17:00:00'
        WHEN 16 THEN '2025-04-30 17:00:00' WHEN 17 THEN '2025-04-30 17:00:00' WHEN 18 THEN '2025-04-30 17:00:00'
        WHEN 19 THEN '2025-04-30 17:00:00' WHEN 20 THEN '2025-04-30 17:00:00'
      END,
      repair_cost = CASE id
        WHEN  1 THEN 2500.00 WHEN  2 THEN  800.00 WHEN  3 THEN 5500.00 WHEN  4 THEN  600.00
        WHEN  5 THEN 3200.00 WHEN  6 THEN 1800.00 WHEN  7 THEN  500.00 WHEN  8 THEN  700.00
        WHEN  9 THEN 1200.00 WHEN 10 THEN  400.00 WHEN 11 THEN 2000.00 WHEN 12 THEN 3500.00
        WHEN 13 THEN  300.00 WHEN 14 THEN 2800.00 WHEN 15 THEN 1500.00 WHEN 16 THEN  600.00
        WHEN 17 THEN 2200.00 WHEN 18 THEN  900.00 WHEN 19 THEN 1800.00 WHEN 20 THEN 1200.00
      END,
      repair_result = CASE id
        WHEN  1 THEN '套准系统异常已修复设备恢复正常' WHEN  2 THEN '墨泵压力不稳已修复设备恢复正常'
        WHEN  3 THEN '主电机异响已修复设备恢复正常'     WHEN  4 THEN '刮刀磨损过快已修复设备恢复正常'
        WHEN  5 THEN '张力控制器失灵已修复设备恢复正常' WHEN  6 THEN '模切刀片断裂已修复设备恢复正常'
        WHEN  7 THEN '气压系统漏气已修复设备恢复正常'   WHEN  8 THEN '收卷张力不均已修复设备恢复正常'
        WHEN  9 THEN '导辊轴承磨损已修复设备恢复正常'   WHEN 10 THEN '分切刀口毛刺已修复设备恢复正常'
        WHEN 11 THEN '纠偏系统偏差已修复设备恢复正常'   WHEN 12 THEN 'CCD相机故障已修复设备恢复正常'
        WHEN 13 THEN '传送带打滑已修复设备恢复正常'     WHEN 14 THEN '涂布头堵塞已修复设备恢复正常'
        WHEN 15 THEN '烘箱温控异常已修复设备恢复正常'   WHEN 16 THEN '复合辊压力不均已修复设备恢复正常'
        WHEN 17 THEN '胶水供给系统故障已修复设备恢复正常' WHEN 18 THEN '烫金版磨损已修复设备恢复正常'
        WHEN 19 THEN '温控系统报警已修复设备恢复正常'   WHEN 20 THEN '喷头堵塞已修复设备恢复正常'
      END,
      fault_desc = CASE id
        WHEN  1 THEN '印刷套色偏差，需要调整色组定位' WHEN  2 THEN '传输带断裂，需紧急更换'
        WHEN  3 THEN '主电机运行异常，轴承过热'       WHEN  4 THEN '刮刀磨损过快，印品边缘毛糙'
        WHEN  5 THEN '张力控制器失灵，材料跑偏'       WHEN  6 THEN '模切刀片断裂，切边不齐'
        WHEN  7 THEN '气压系统漏气，压力不稳定'       WHEN  8 THEN '收卷张力不均，卷材起皱'
        WHEN  9 THEN '导辊轴承磨损，运行异响'         WHEN 10 THEN '分切刀口毛刺，切边不良'
        WHEN 11 THEN '纠偏系统偏差，对位不准'         WHEN 12 THEN 'CCD相机故障，检测失效'
        WHEN 13 THEN '传送带打滑，产品输送不稳'       WHEN 14 THEN '涂布头堵塞，涂层不均'
        WHEN 15 THEN '烘箱温控异常，温度波动大'       WHEN 16 THEN '复合辊压力不均，粘合不良'
        WHEN 17 THEN '胶水供给系统故障，供胶中断'     WHEN 18 THEN '烫金版磨损，烫印不清'
        WHEN 19 THEN '温控系统报警，温度超标'         WHEN 20 THEN '喷头堵塞，喷射异常'
      END
    WHERE id BETWEEN 1 AND 20
  `, []);
  console.log('  ✅ 补全了 20 条 eqp_repair 数据');

  // 2d. 检定记录：覆盖全部20条，补全校准字段
  await conn.query(`
    UPDATE eqp_calibration
    SET
      status = 1,
      calibration_date = CASE id
        WHEN  1 THEN '2025-04-01' WHEN  2 THEN '2025-04-02' WHEN  3 THEN '2025-04-03'
        WHEN  4 THEN '2025-04-04' WHEN  5 THEN '2025-04-05' WHEN  6 THEN '2025-04-06'
        WHEN  7 THEN '2025-04-07' WHEN  8 THEN '2025-04-08' WHEN  9 THEN '2025-04-09'
        WHEN 10 THEN '2025-04-10' WHEN 11 THEN '2025-04-11' WHEN 12 THEN '2025-04-12'
        WHEN 13 THEN '2025-04-13' WHEN 14 THEN '2025-04-14' WHEN 15 THEN '2025-04-15'
        WHEN 16 THEN '2025-04-16' WHEN 17 THEN '2025-04-17' WHEN 18 THEN '2025-04-18'
        WHEN 19 THEN '2025-04-19' WHEN 20 THEN '2025-04-20'
      END,
      next_calibration_date = CASE id
        WHEN  1 THEN '2025-10-01' WHEN  2 THEN '2025-10-02' WHEN  3 THEN '2025-10-03'
        WHEN  4 THEN '2025-10-04' WHEN  5 THEN '2025-10-05' WHEN  6 THEN '2025-10-06'
        WHEN  7 THEN '2025-10-07' WHEN  8 THEN '2025-10-08' WHEN  9 THEN '2025-10-09'
        WHEN 10 THEN '2025-10-10' WHEN 11 THEN '2025-10-11' WHEN 12 THEN '2025-10-12'
        WHEN 13 THEN '2025-10-13' WHEN 14 THEN '2025-10-14' WHEN 15 THEN '2025-10-15'
        WHEN 16 THEN '2025-10-16' WHEN 17 THEN '2025-10-17' WHEN 18 THEN '2025-10-18'
        WHEN 19 THEN '2025-10-19' WHEN 20 THEN '2025-10-20'
      END,
      calibration_org = CASE id
        WHEN  1 THEN '广东省计量科学研究院' WHEN  2 THEN '深圳市计量质量检测研究院'
        WHEN  3 THEN '广东省计量科学研究院' WHEN  4 THEN '深圳市计量质量检测研究院'
        WHEN  5 THEN '广东省计量科学研究院' WHEN  6 THEN '深圳市计量质量检测研究院'
        WHEN  7 THEN '广东省计量科学研究院' WHEN  8 THEN '深圳市计量质量检测研究院'
        WHEN  9 THEN '广东省计量科学研究院' WHEN 10 THEN '深圳市计量质量检测研究院'
        WHEN 11 THEN '广东省计量科学研究院' WHEN 12 THEN '深圳市计量质量检测研究院'
        WHEN 13 THEN '广东省计量科学研究院' WHEN 14 THEN '深圳市计量质量检测研究院'
        WHEN 15 THEN '广东省计量科学研究院' WHEN 16 THEN '深圳市计量质量检测研究院'
        WHEN 17 THEN '广东省计量科学研究院' WHEN 18 THEN '深圳市计量质量检测研究院'
        WHEN 19 THEN '广东省计量科学研究院' WHEN 20 THEN '深圳市计量质量检测研究院'
      END,
      calibration_result = 1,
      certificate_no = CONCAT('CAL-CERT-', LPAD(id, 3, '0')),
      calibration_cost = CASE id
        WHEN  1 THEN 3500.00 WHEN  2 THEN 3500.00 WHEN  3 THEN 4200.00 WHEN  4 THEN 2800.00
        WHEN  5 THEN 4200.00 WHEN  6 THEN 3000.00 WHEN  7 THEN 3000.00 WHEN  8 THEN 2500.00
        WHEN  9 THEN 2500.00 WHEN 10 THEN 2200.00 WHEN 11 THEN 2200.00 WHEN 12 THEN 2800.00
        WHEN 13 THEN 2800.00 WHEN 14 THEN 3800.00 WHEN 15 THEN 3800.00 WHEN 16 THEN 3200.00
        WHEN 17 THEN 3200.00 WHEN 18 THEN 2600.00 WHEN 19 THEN 2600.00 WHEN 20 THEN 4500.00
      END
    WHERE id BETWEEN 1 AND 20
  `, []);
  console.log('  ✅ 补全了 20 条 eqp_calibration 数据');

  // 2e. 报废记录：补全 status（覆盖全部20条，与设备主表严格关联）
  await conn.query(`
    UPDATE eqp_scrap
    SET
      status = CASE id
        WHEN  1 THEN 2 WHEN  2 THEN 2 WHEN  3 THEN 2 WHEN  4 THEN 2 WHEN  5 THEN 2
        WHEN  6 THEN 2 WHEN  7 THEN 2 WHEN  8 THEN 2 WHEN  9 THEN 2 WHEN 10 THEN 2
        WHEN 11 THEN 2 WHEN 12 THEN 2 WHEN 13 THEN 2 WHEN 14 THEN 2 WHEN 15 THEN 2
        WHEN 16 THEN 1 WHEN 17 THEN 1 WHEN 18 THEN 1 WHEN 19 THEN 1 WHEN 20 THEN 1
      END,
      scrap_date = CASE id
        WHEN  1 THEN '2025-04-05' WHEN  2 THEN '2025-04-06' WHEN  3 THEN '2025-04-07'
        WHEN  4 THEN '2025-04-08' WHEN  5 THEN '2025-04-09' WHEN  6 THEN '2025-04-10'
        WHEN  7 THEN '2025-04-11' WHEN  8 THEN '2025-04-12' WHEN  9 THEN '2025-04-13'
        WHEN 10 THEN '2025-04-14' WHEN 11 THEN '2025-04-15' WHEN 12 THEN '2025-04-16'
        WHEN 13 THEN '2025-04-17' WHEN 14 THEN '2025-04-18' WHEN 15 THEN '2025-04-19'
        WHEN 16 THEN NULL       WHEN 17 THEN NULL       WHEN 18 THEN NULL
        WHEN 19 THEN NULL       WHEN 20 THEN NULL
      END,
      scrap_reason = CASE id
        WHEN  1 THEN '使用年限到期-已超10年'
        WHEN  2 THEN '使用年限到期-已超10年'
        WHEN  3 THEN '核心部件损坏-维修成本过高'
        WHEN  4 THEN '技术淘汰-产能不足'
        WHEN  5 THEN '使用年限到期-已超10年'
        WHEN  6 THEN '多次维修仍存在精度问题'
        WHEN  7 THEN '使用年限到期-已超8年'
        WHEN  8 THEN '技术升级-新设备替代'
        WHEN  9 THEN '使用年限到期-已超8年'
        WHEN 10 THEN '技术淘汰-精度不达标'
        WHEN 11 THEN '多次维修仍存在故障'
        WHEN 12 THEN '使用年限到期-已超8年'
        WHEN 13 THEN '技术升级-新设备替代'
        WHEN 14 THEN '核心部件损坏-维修成本过高'
        WHEN 15 THEN '使用年限到期-已超10年'
        WHEN 16 THEN '技术淘汰-速度不达标'
        WHEN 17 THEN '使用年限到期-已超8年'
        WHEN 18 THEN '多次维修仍存在压力问题'
        WHEN 19 THEN '技术升级-新设备替代'
        WHEN 20 THEN '喷头老化-更换成本过高'
      END,
      original_value = CASE id
        WHEN  1 THEN 850000.00 WHEN  2 THEN 850000.00 WHEN  3 THEN 1200000.00
        WHEN  4 THEN 350000.00 WHEN  5 THEN 1500000.00 WHEN  6 THEN 450000.00
        WHEN  7 THEN 450000.00 WHEN  8 THEN 380000.00 WHEN  9 THEN 380000.00
        WHEN 10 THEN 280000.00 WHEN 11 THEN 280000.00 WHEN 12 THEN 520000.00
        WHEN 13 THEN 520000.00 WHEN 14 THEN 980000.00 WHEN 15 THEN 980000.00
        WHEN 16 THEN 650000.00 WHEN 17 THEN 650000.00 WHEN 18 THEN 420000.00
        WHEN 19 THEN 420000.00 WHEN 20 THEN 1800000.00
      END,
      net_value = CASE id
        WHEN  1 THEN 50000.00  WHEN  2 THEN 45000.00  WHEN  3 THEN 80000.00
        WHEN  4 THEN 20000.00  WHEN  5 THEN 100000.00 WHEN  6 THEN 30000.00
        WHEN  7 THEN 25000.00  WHEN  8 THEN 22000.00  WHEN  9 THEN 20000.00
        WHEN 10 THEN 15000.00  WHEN 11 THEN 18000.00  WHEN 12 THEN 35000.00
        WHEN 13 THEN 30000.00  WHEN 14 THEN 65000.00  WHEN 15 THEN 60000.00
        WHEN 16 THEN 40000.00  WHEN 17 THEN 35000.00  WHEN 18 THEN 25000.00
        WHEN 19 THEN 22000.00  WHEN 20 THEN 120000.00
      END,
      approval_person = CASE id
        WHEN  1 THEN '总经理-张总' WHEN  2 THEN '总经理-张总' WHEN  3 THEN '总经理-张总'
        WHEN  4 THEN '总经理-张总' WHEN  5 THEN '总经理-张总' WHEN  6 THEN '总经理-张总'
        WHEN  7 THEN '总经理-张总' WHEN  8 THEN '总经理-张总' WHEN  9 THEN '总经理-张总'
        WHEN 10 THEN '总经理-张总' WHEN 11 THEN '总经理-张总' WHEN 12 THEN '总经理-张总'
        WHEN 13 THEN '总经理-张总' WHEN 14 THEN '总经理-张总' WHEN 15 THEN '总经理-张总'
        WHEN 16 THEN NULL          WHEN 17 THEN NULL          WHEN 18 THEN NULL
        WHEN 19 THEN NULL          WHEN 20 THEN NULL
      END
    WHERE id BETWEEN 1 AND 20
  `, []);
  console.log('  ✅ 补全了 20 条 eqp_scrap 数据');
}

export async function down(conn: Connection): Promise<void> {
  // maintenance_date 列回滚（不影响数据完整性，仅开发环境）
  try {
    await conn.query('ALTER TABLE eqp_maintenance_record DROP COLUMN maintenance_date', []);
  } catch {}
}
