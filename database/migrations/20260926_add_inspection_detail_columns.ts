import type { Connection } from 'mysql2/promise';

/**
 * Migration: 补全 eqp_inspection 点检详情字段
 *
 * 原 DDL 将点检结果存为 JSON items 字段，
 * 但 API route.ts 已使用独立列（temperature/vibration/pressure/noise_level/oil_level/belt_tension/handling_advice）读写，
 * 需补充对应列以确保 INSERT/UPDATE 不静默丢失数据。
 */

export async function up(conn: Connection): Promise<void> {
  const extraCols = [
    { name: 'temperature', type: "DECIMAL(6,2) DEFAULT NULL COMMENT '温度（℃）'" },
    { name: 'vibration',   type: "DECIMAL(8,3) DEFAULT NULL COMMENT '振动值（mm/s）'" },
    { name: 'pressure',    type: "DECIMAL(8,2) DEFAULT NULL COMMENT '压力（MPa）'" },
    { name: 'noise_level', type: "DECIMAL(5,1) DEFAULT NULL COMMENT '噪声等级（dB）'" },
    { name: 'oil_level',   type: "DECIMAL(5,2) DEFAULT NULL COMMENT '油位（%）'" },
    { name: 'belt_tension',type: "DECIMAL(6,2) DEFAULT NULL COMMENT '皮带张力（N）'" },
    { name: 'handling_advice', type: "VARCHAR(500) DEFAULT NULL COMMENT '处理建议'" },
  ];

  for (const col of extraCols) {
    try {
      await conn.query(`ALTER TABLE eqp_inspection ADD COLUMN ${col.name} ${col.type}`, []);
    } catch {
      // 列已存在，忽略
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  const dropCols = ['temperature', 'vibration', 'pressure', 'noise_level', 'oil_level', 'belt_tension', 'handling_advice'];
  for (const col of dropCols) {
    try {
      await conn.query(`ALTER TABLE eqp_inspection DROP COLUMN ${col}`, []);
    } catch {
      // 列不存在，忽略
    }
  }
}
