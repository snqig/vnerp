# 库存管理模块使用说明

## 模块概述

本模块实现了制造业ERP系统中的核心库存管理功能，支持多仓库管理、实时库存预警和批次追踪。

### 核心功能

1. **多仓库管理**：支持原料仓、成品仓、板房仓、油墨仓的独立管理
2. **实时库存预警**：基于库存量和有效期的智能预警系统
3. **批次追踪**：完整的批次生命周期管理，支持先进先出(FIFO)

## 技术栈

- **前端**：Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL + Drizzle ORM

## 数据库结构

### 核心表结构

#### 1. 仓库表 (warehouses)
```sql
- id: 主键
- code: 仓库编码
- name: 仓库名称
- type: 仓库类型 (原料仓/成品仓/板房仓/油墨仓)
- manager: 仓库管理员
- status: 状态
```

#### 2. 库位表 (locations)
```sql
- id: 主键
- code: 库位编码
- warehouse_id: 所属仓库
- name: 库位名称
- zone/shelf/layer: 区域/货架/层
```

#### 3. 批次库存表 (inventory_batches)
```sql
- id: 主键
- batch_no: 批次号 (唯一)
- qr_code: 二维码
- material_id: 物料ID
- product_id: 产品ID
- warehouse_id: 仓库ID
- location_id: 库位ID
- quantity: 总数量
- available_qty: 可用数量
- reserved_qty: 预占数量
- unit: 单位
- source_type: 来源类型 (采购/生产/委外)
- source_no: 来源单号
- expiry_date: 有效期
- production_date: 生产日期
- status: 状态 (可用/冻结/待检)
- alert_level: 预警级别 (normal/warning/critical) ← 新增
- inspection_status: 检验状态 (pending/pass/fail) ← 新增
- quarantine_status: 隔离状态 (none/quarantined/released) ← 新增
```

#### 4. 库存事务表 (inventory_transactions)
```sql
- id: 主键
- trans_no: 事务编号
- trans_type: 事务类型 (入库/出库/调拨/盘点)
- batch_id: 批次ID
- quantity: 变动数量
- before_qty/after_qty: 变动前后数量
- source_type/source_no: 来源信息
- operator_id: 操作员
```

## API 接口文档

### 1. 获取库存列表

**Endpoint**: `GET /api/inventory`

**查询参数**:
- `warehouseId`: 仓库ID (可选, "all"表示全部)
- `status`: 库存状态 (可选, "all"表示全部)
- `keyword`: 搜索关键词 (可选, 支持批次号模糊搜索)
- `alertLevel`: 预警级别 (可选, "all"表示全部)

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "batchNo": "RAW20240115001",
      "materialName": "PET膜-透明",
      "warehouseName": "原料仓库",
      "locationName": "A-01-03",
      "quantity": 5000,
      "availableQty": 4200,
      "unit": "㎡",
      "status": "available",
      "alertLevel": "warning",
      "expiryDate": "2024-06-15"
    }
  ],
  "total": 1
}
```

### 2. 库存操作

**Endpoint**: `POST /api/inventory`

**请求体**:
```json
{
  "action": "inbound", // inbound/outbound/transfer
  "batchNo": "RAW20240115001",
  "quantity": 100,
  "warehouseId": 1,
  "locationId": 1,
  "sourceType": "purchase",
  "sourceNo": "PO20240115001"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "入库成功",
  "data": {
    "batchNo": "RAW20240115001",
    "quantity": 100,
    "warehouseId": 1,
    "locationId": 1,
    "operatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## 使用说明

### 1. 环境配置

确保已安装依赖：
```bash
pnpm install
```

### 2. 数据库迁移

执行迁移脚本：
```bash
# 使用 Drizzle Kit (如果配置了)
pnpm drizzle-kit push

# 或手动执行 SQL
psql -d your_database -f migrations/0001_add_inventory_alerts.sql
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000/warehouse/inventory` 查看库存管理页面。

### 4. 功能使用

#### 库存查询
1. 进入"库存查询"页面
2. 使用搜索框输入批次号或物料名称
3. 通过下拉菜单筛选仓库和状态
4. 查看库存预警信息

#### 入库操作
1. 进入"入库管理"页面
2. 扫描或输入批次信息
3. 确认入库数量和库位
4. 提交入库记录

#### 批次追溯
1. 在库存列表中点击"追溯"按钮
2. 查看批次的完整生命周期
3. 包括入库、出库、检验记录

## 单元测试示例

### 测试文件: `src/lib/inventory.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateAlertLevel, validateBatchNo } from './inventory';

describe('Inventory Utilities', () => {
  describe('calculateAlertLevel', () => {
    it('should return critical for expired items', () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      expect(calculateAlertLevel(expiredDate, 100, 200)).toBe('critical');
    });

    it('should return warning for items expiring soon', () => {
      const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      expect(calculateAlertLevel(soonDate, 100, 200)).toBe('warning');
    });

    it('should return normal for valid items', () => {
      const validDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      expect(calculateAlertLevel(validDate, 100, 200)).toBe('normal');
    });
  });

  describe('validateBatchNo', () => {
    it('should validate correct batch number format', () => {
      expect(validateBatchNo('RAW20240115001')).toBe(true);
      expect(validateBatchNo('INK20240112001')).toBe(true);
    });

    it('should reject invalid batch number format', () => {
      expect(validateBatchNo('INVALID')).toBe(false);
      expect(validateBatchNo('')).toBe(false);
    });
  });
});
```

### 运行测试

```bash
pnpm test
```

## 注意事项

1. **数据一致性**：库存操作需要保证事务性，避免超卖
2. **性能优化**：大仓库建议分页查询，避免一次性加载过多数据
3. **权限控制**：生产环境需添加操作权限验证
4. **备份策略**：定期备份库存数据，防止数据丢失

## 更新日志

### v1.0.0 (2026-03-03)
- 实现多仓库管理功能
- 添加实时库存预警系统
- 完善批次追踪功能
- 更新数据库 schema
- 提供完整的 API 接口