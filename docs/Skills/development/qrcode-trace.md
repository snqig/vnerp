# 二维码追溯功能开发 SOP

> SOP 编号：VNERP-SKILL-007 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 了解二维码追溯业务规则（参考 [warehouse.md](../Rules/business-rules/warehouse.md)）
- 了解 `qrcode_record` 表结构
- 了解物料拆分和 FIFO 分配逻辑

## 核心概念

### 二维码追溯链路

```
原材料入库(生成原料码) → 领料出库(关联工单) → 生产报工 → 成品入库(生成成品码) → 销售出库
```

### qrcode_record 表核心字段

| 字段 | 说明 | 取值 |
|------|------|------|
| qr_code | 二维码值 | 唯一标识 |
| qr_type | 类型 | material/product/semi |
| ref_id | 关联单据ID | 入库单ID/工单ID |
| material_id | 物料ID | - |
| quantity | 数量 | - |
| warehouse_id | 仓库ID | - |
| split_flag | 拆分标识 | 0-整料 1-小料 2-余料 |
| parent_qr_id | 父级ID | 拆分来源 |
| status | 状态 | 1-有效 2-已使用 9-作废 |

## 操作步骤

### 步骤 1：入库时创建二维码记录

```typescript
async function createQrRecordOnInbound(inboundId: number, items: InboundItem[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of items) {
      const qrCode = generateQrCode('material', item.material_id);

      await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, material_id, material_name, quantity, warehouse_id, split_flag, status)
         VALUES (?, 'material', ?, ?, ?, ?, ?, 0, 1)`,
        [qrCode, inboundId, item.material_id, item.material_name, item.quantity, item.warehouse_id]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
```

### 步骤 2：物料拆分时创建子记录

```typescript
async function splitQrRecord(parentId: number, standardQty: number) {
  const [parent]: any = await pool.execute('SELECT * FROM qrcode_record WHERE id = ?', [parentId]);

  const childQty = standardQty;
  const remainQty = parent[0].quantity - standardQty;

  // 创建小料记录
  const childCode = generateQrCode('material', parent[0].material_id);
  await pool.execute(
    `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, material_id, material_name, quantity, warehouse_id, split_flag, parent_qr_id, status)
     VALUES (?, 'material', ?, ?, ?, ?, ?, 1, ?, 1)`,
    [childCode, parent[0].ref_id, parent[0].material_id, parent[0].material_name, childQty, parent[0].warehouse_id, parentId]
  );

  // 更新余料
  if (remainQty > 0) {
    await pool.execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, material_id, material_name, quantity, warehouse_id, split_flag, parent_qr_id, status)
       VALUES (?, 'material', ?, ?, ?, ?, ?, 2, ?, 1)`,
      [generateQrCode('material', parent[0].material_id), parent[0].ref_id, parent[0].material_id, parent[0].material_name, remainQty, parent[0].warehouse_id, parentId]
    );
  }

  // 标记原始记录为已使用
  await pool.execute('UPDATE qrcode_record SET status = 2 WHERE id = ?', [parentId]);
}
```

### 步骤 3：出库时更新二维码状态

```typescript
async function consumeQrOnOutbound(materialId: number, quantity: number, warehouseId: number) {
  // FIFO 分配
  const allocations = await allocateFifo(materialId, quantity, warehouseId);

  for (const alloc of allocations) {
    if (alloc.consumeAll) {
      await pool.execute('UPDATE qrcode_record SET status = 2 WHERE id = ?', [alloc.qrId]);
    } else {
      await pool.execute('UPDATE qrcode_record SET quantity = ? WHERE id = ?', [alloc.remainQty, alloc.qrId]);
    }
  }
}
```

### 步骤 4：实现追溯查询

```typescript
async function traceQrCode(qrCode: string) {
  const [records]: any = await pool.execute(
    'SELECT * FROM qrcode_record WHERE qr_code = ?',
    [qrCode]
  );

  if (records.length === 0) return null;

  const record = records[0];

  // 向上追溯（通过 parent_qr_id）
  const ancestors = await traceAncestors(record.parent_qr_id);

  // 向下追溯（通过 parent_qr_id 查找子记录）
  const descendants = await traceDescendants(record.id);

  return {
    current: record,
    ancestors,
    descendants,
  };
}
```

## 验证方法

- [ ] 入库后 qrcode_record 记录正确创建
- [ ] 拆分后子记录和余料记录正确
- [ ] 出库后状态正确更新
- [ ] 追溯查询可获取完整链路
- [ ] FIFO 分配逻辑正确
