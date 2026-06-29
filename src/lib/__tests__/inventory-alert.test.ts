import { describe, it, expect } from 'vitest';

/**
 * 库存预警逻辑 单元测试
 */

interface StockItem {
  id: number;
  material_name: string;
  quantity: number;
  safety_stock: number;
  unit: string;
}

type AlertLevel = 'normal' | 'warning' | 'critical';

/**
 * 计算库存预警级别
 */
function calculateAlertLevel(item: StockItem): AlertLevel {
  if (item.safety_stock <= 0) return 'normal';
  if (item.quantity <= 0) return 'critical';
  if (item.quantity <= item.safety_stock * 0.5) return 'critical';
  if (item.quantity <= item.safety_stock) return 'warning';
  return 'normal';
}

/**
 * 筛选预警库存
 */
function filterAlertItems(items: StockItem[]): (StockItem & { alertLevel: AlertLevel })[] {
  return items
    .map(item => ({ ...item, alertLevel: calculateAlertLevel(item) }))
    .filter(item => item.alertLevel !== 'normal');
}

describe('库存预警逻辑', () => {
  describe('calculateAlertLevel', () => {
    it('库存为0：critical', () => {
      expect(calculateAlertLevel({
        id: 1, material_name: '物料A', quantity: 0, safety_stock: 100, unit: '个',
      })).toBe('critical');
    });

    it('库存低于安全库存50%：critical', () => {
      expect(calculateAlertLevel({
        id: 2, material_name: '物料B', quantity: 40, safety_stock: 100, unit: '个',
      })).toBe('critical');
    });

    it('库存等于安全库存50%：critical（<=50%为critical）', () => {
      expect(calculateAlertLevel({
        id: 3, material_name: '物料C', quantity: 50, safety_stock: 100, unit: '个',
      })).toBe('critical');
    });

    it('库存低于安全库存但高于50%：warning', () => {
      expect(calculateAlertLevel({
        id: 4, material_name: '物料D', quantity: 80, safety_stock: 100, unit: '个',
      })).toBe('warning');
    });

    it('库存等于安全库存：warning', () => {
      expect(calculateAlertLevel({
        id: 5, material_name: '物料E', quantity: 100, safety_stock: 100, unit: '个',
      })).toBe('warning');
    });

    it('库存高于安全库存：normal', () => {
      expect(calculateAlertLevel({
        id: 6, material_name: '物料F', quantity: 150, safety_stock: 100, unit: '个',
      })).toBe('normal');
    });

    it('安全库存为0：normal（不预警）', () => {
      expect(calculateAlertLevel({
        id: 7, material_name: '物料G', quantity: 0, safety_stock: 0, unit: '个',
      })).toBe('normal');
    });

    it('负库存：critical', () => {
      expect(calculateAlertLevel({
        id: 8, material_name: '物料H', quantity: -5, safety_stock: 100, unit: '个',
      })).toBe('critical');
    });
  });

  describe('filterAlertItems', () => {
    const items: StockItem[] = [
      { id: 1, material_name: '物料A', quantity: 0, safety_stock: 100, unit: '个' },
      { id: 2, material_name: '物料B', quantity: 40, safety_stock: 100, unit: '个' },
      { id: 3, material_name: '物料C', quantity: 80, safety_stock: 100, unit: '个' },
      { id: 4, material_name: '物料D', quantity: 150, safety_stock: 100, unit: '个' },
      { id: 5, material_name: '物料E', quantity: 50, safety_stock: 0, unit: '个' },
    ];

    it('正确筛选预警项', () => {
      const alerts = filterAlertItems(items);
      expect(alerts).toHaveLength(3);
      expect(alerts[0].alertLevel).toBe('critical'); // qty=0
      expect(alerts[1].alertLevel).toBe('critical'); // qty=40 <= 50
      expect(alerts[2].alertLevel).toBe('warning');  // qty=80, 50 < 80 <= 100
    });

    it('排除正常库存', () => {
      const alerts = filterAlertItems(items);
      const normalItems = alerts.filter(a => a.alertLevel === 'normal');
      expect(normalItems).toHaveLength(0);
    });

    it('排除未设置安全库存的物料', () => {
      const alerts = filterAlertItems(items);
      const noSafetyItems = alerts.filter(a => a.material_name === '物料E');
      expect(noSafetyItems).toHaveLength(0);
    });
  });
});
