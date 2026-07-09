import { NextRequest } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(
  async (_request: NextRequest) => {
    const result = await transaction(async (conn) => {
      const stats: Record<string, number> = {};

      await conn.execute('DELETE FROM prd_ink');
      await conn.execute('ALTER TABLE prd_ink AUTO_INCREMENT = 1');

      const inks = [
        {
          code: 'INK-UV-001',
          name: 'UV油墨-特黑',
          type: 3,
          color_name: '黑色',
          color_code: 'BK001',
          brand: '东洋油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 100,
          shelf_life: 12,
          stock_qty: 180,
          status: 1,
          remark: '高遮盖力黑色UV油墨',
        },
        {
          code: 'INK-UV-002',
          name: 'UV油墨-特白',
          type: 3,
          color_name: '白色',
          color_code: 'WH001',
          brand: '东洋油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 120,
          shelf_life: 12,
          stock_qty: 210,
          status: 1,
          remark: '高白度UV油墨',
        },
        {
          code: 'INK-UV-003',
          name: 'UV油墨-大红',
          type: 3,
          color_name: '红色',
          color_code: 'RD001',
          brand: '杭华油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 95,
          status: 1,
          remark: '鲜艳红色UV油墨',
        },
        {
          code: 'INK-UV-004',
          name: 'UV油墨-宝蓝',
          type: 3,
          color_name: '蓝色',
          color_code: 'BL001',
          brand: '杭华油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 75,
          status: 1,
          remark: '宝蓝色UV油墨',
        },
        {
          code: 'INK-UV-005',
          name: 'UV油墨-翠绿',
          type: 3,
          color_name: '绿色',
          color_code: 'GN001',
          brand: 'DIC油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 60,
          shelf_life: 12,
          stock_qty: 55,
          status: 1,
          remark: '翠绿色UV油墨',
        },
        {
          code: 'INK-SOL-001',
          name: '溶剂油墨-黑色',
          type: 2,
          color_name: '黑色',
          color_code: 'BK002',
          brand: '东洋油墨',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 150,
          shelf_life: 18,
          stock_qty: 260,
          status: 1,
          remark: '快干型溶剂黑墨',
        },
        {
          code: 'INK-SOL-002',
          name: '溶剂油墨-白色',
          type: 2,
          color_name: '白色',
          color_code: 'WH002',
          brand: '东洋油墨',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 150,
          shelf_life: 18,
          stock_qty: 240,
          status: 1,
          remark: '高遮盖溶剂白墨',
        },
        {
          code: 'INK-SOL-003',
          name: '溶剂油墨-金色',
          type: 2,
          color_name: '金色',
          color_code: 'GD001',
          brand: '杭华油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 50,
          shelf_life: 18,
          stock_qty: 42,
          status: 1,
          remark: '金属金色溶剂油墨',
        },
        {
          code: 'INK-SOL-004',
          name: '溶剂油墨-银色',
          type: 2,
          color_name: '银色',
          color_code: 'SV001',
          brand: '杭华油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 50,
          shelf_life: 18,
          stock_qty: 38,
          status: 1,
          remark: '金属银色溶剂油墨',
        },
        {
          code: 'INK-SOL-005',
          name: '溶剂油墨-透明黄',
          type: 2,
          color_name: '黄色',
          color_code: 'YL001',
          brand: 'DIC油墨',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 70,
          shelf_life: 18,
          stock_qty: 88,
          status: 1,
          remark: '透明黄溶剂油墨',
        },
        {
          code: 'INK-WB-001',
          name: '水性油墨-黑色',
          type: 1,
          color_name: '黑色',
          color_code: 'BK003',
          brand: '盛威科',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 100,
          shelf_life: 6,
          stock_qty: 150,
          status: 1,
          remark: '环保水性黑墨',
        },
        {
          code: 'INK-WB-002',
          name: '水性油墨-白色',
          type: 1,
          color_name: '白色',
          color_code: 'WH003',
          brand: '盛威科',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 100,
          shelf_life: 6,
          stock_qty: 130,
          status: 1,
          remark: '环保水性白墨',
        },
        {
          code: 'INK-WB-003',
          name: '水性油墨-蓝色',
          type: 1,
          color_name: '蓝色',
          color_code: 'BL002',
          brand: '盛威科',
          unit: 'KG',
          spec: '5KG/桶',
          safety_stock: 60,
          shelf_life: 6,
          stock_qty: 45,
          status: 1,
          remark: '环保水性蓝墨',
        },
        {
          code: 'INK-SCR-001',
          name: '丝印油墨-黑色',
          type: 4,
          color_name: '黑色',
          color_code: 'BK004',
          brand: '帝国油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 120,
          status: 1,
          remark: '丝印专用黑墨',
        },
        {
          code: 'INK-SCR-002',
          name: '丝印油墨-白色',
          type: 4,
          color_name: '白色',
          color_code: 'WH004',
          brand: '帝国油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 105,
          status: 1,
          remark: '丝印专用白墨',
        },
        {
          code: 'INK-SCR-003',
          name: '丝印油墨-红色',
          type: 4,
          color_name: '红色',
          color_code: 'RD002',
          brand: '帝国油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 50,
          shelf_life: 12,
          stock_qty: 62,
          status: 1,
          remark: '丝印专用红墨',
        },
        {
          code: 'INK-SP-001',
          name: '导电银浆-高导型',
          type: 5,
          color_name: '银色',
          color_code: 'AG001',
          brand: '杜邦',
          unit: 'G',
          spec: '500G/瓶',
          safety_stock: 50,
          shelf_life: 3,
          stock_qty: 85,
          status: 1,
          remark: '高导电性银浆2-8°C冷藏',
        },
        {
          code: 'INK-SP-002',
          name: '导电银浆-低温型',
          type: 5,
          color_name: '银色',
          color_code: 'AG002',
          brand: '汉高',
          unit: 'G',
          spec: '500G/瓶',
          safety_stock: 40,
          shelf_life: 3,
          stock_qty: 55,
          status: 1,
          remark: '低温固化银浆',
        },
        {
          code: 'INK-SP-003',
          name: '荧光油墨-黄色',
          type: 5,
          color_name: '荧光黄',
          color_code: 'FL001',
          brand: '东洋油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 30,
          shelf_life: 6,
          stock_qty: 28,
          status: 1,
          remark: '荧光防伪油墨',
        },
        {
          code: 'INK-SP-004',
          name: '温变油墨-红色',
          type: 5,
          color_name: '温变红',
          color_code: 'TC001',
          brand: 'DIC油墨',
          unit: 'KG',
          spec: '1KG/罐',
          safety_stock: 25,
          shelf_life: 6,
          stock_qty: 20,
          status: 0,
          remark: '温变防伪油墨-已停用',
        },
      ];

      for (const ink of inks) {
        await conn.execute(
          `INSERT INTO prd_ink (ink_code, ink_name, ink_type, color_name, color_code, brand, unit, specification, safety_stock, shelf_life, stock_qty, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ink.code,
            ink.name,
            ink.type,
            ink.color_name,
            ink.color_code,
            ink.brand,
            ink.unit,
            ink.spec,
            ink.safety_stock,
            ink.shelf_life,
            ink.stock_qty,
            ink.status,
            ink.remark,
          ]
        );
      }
      stats.prd_ink = inks.length;

      return stats;
    });

    const verification = await verifyDataIntegrity();

    return successResponse(
      {
        stats: result,
        verification,
      },
      '油墨种子数据初始化成功'
    );
  },
  { errorMessage: '初始化油墨种子数据失败' }
);

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, Loose> = {};

  const count: Loose = await queryOne('SELECT COUNT(*) as cnt FROM prd_ink WHERE deleted = 0');
  details.ink_count = count?.cnt || 0;
  if (details.ink_count !== 20) errors.push(`油墨数量不正确: 期望20, 实际${details.ink_count}`);

  const typeDist: Loose = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN ink_type = 1 THEN 1 ELSE 0 END), 0) as water_based,
    COALESCE(SUM(CASE WHEN ink_type = 2 THEN 1 ELSE 0 END), 0) as solvent,
    COALESCE(SUM(CASE WHEN ink_type = 3 THEN 1 ELSE 0 END), 0) as uv,
    COALESCE(SUM(CASE WHEN ink_type = 4 THEN 1 ELSE 0 END), 0) as screen,
    COALESCE(SUM(CASE WHEN ink_type = 5 THEN 1 ELSE 0 END), 0) as special
  FROM prd_ink WHERE deleted = 0`);
  details.type_distribution = typeDist;

  const statusDist: Loose = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) as active,
    COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) as disabled
  FROM prd_ink WHERE deleted = 0`);
  details.status_distribution = statusDist;

  const totalStock: Loose = await queryOne(
    'SELECT COALESCE(SUM(stock_qty), 0) as total FROM prd_ink WHERE deleted = 0'
  );
  details.total_stock = totalStock?.total || 0;

  const lowStock: Loose = await queryOne(
    'SELECT COUNT(*) as cnt FROM prd_ink WHERE deleted = 0 AND stock_qty < safety_stock'
  );
  details.low_stock_count = lowStock?.cnt || 0;

  return { valid: errors.length === 0, errors, details };
}

export const GET = withPermission(
  async (_request: NextRequest) => {
    const verification = await verifyDataIntegrity();
    return successResponse(verification, '数据完整性验证完成');
  },
  { errorMessage: '验证数据完整性失败' }
);
