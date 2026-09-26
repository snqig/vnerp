# ERP 系统 API 接口文档

> **版本**：v1.0
> **更新日期**：2026-09-26
> **Base URL**：`http://127.0.0.1:5000/api`

---

## 通用说明

### 认证方式

所有 API 请求需在 Header 中携带 Token：
```
Authorization: Bearer <token>
```

### 统一响应格式

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 分页参数

| 参数 | 类型 | 说明 |
|---|---|---|
| page | number | 页码，默认 1 |
| pageSize | number | 每页条数，默认 20 |

---

## 一、仓储模块 API

### 1.1 入库管理

#### GET /api/warehouse/inbound
**说明**：获取入库单列表

**查询参数**：
- `page` - 页码
- `pageSize` - 每页条数
- `status` - 状态筛选
- `supplier_id` - 供应商筛选

**返回数据**：
```json
{
  "list": [
    {
      "id": 1,
      "inbound_no": "IN20260926001",
      "status": "completed",
      "supplier_name": "XX供应商",
      "warehouse_name": "原材料仓",
      "total_qty": 100,
      "create_time": "2026-09-26 10:00:00"
    }
  ],
  "total": 50
}
```

#### POST /api/warehouse/inbound
**说明**：创建入库单

**请求体**：
```json
{
  "supplier_id": 1,
  "warehouse_id": 1,
  "items": [
    {
      "material_id": 1,
      "qty": 100,
      "batch_no": "BATCH001"
    }
  ]
}
```

---

### 1.2 库存查询

#### GET /api/warehouse/inventory
**说明**：获取库存汇总列表

**查询参数**：
- `material_id` - 物料筛选
- `warehouse_id` - 仓库筛选

---

### 1.3 批次库存

#### GET /api/warehouse/batch
**说明**：获取批次库存列表

**返回统计**：
```json
{
  "list": [...],
  "total": 100,
  "stats": {
    "total_batches": 100,
    "expiring": 5,
    "expired": 2,
    "available": 93
  }
}
```

---

### 1.4 库存成本

#### GET /api/warehouse/cost
**说明**：获取库存成本列表

**返回统计**：
```json
{
  "list": [...],
  "stats": {
    "total_cost": 100000,
    "in_stock_cost": 80000
  }
}
```

---

### 1.5 库存重算

#### POST /api/warehouse/inventory/recompute
**说明**：从批次表重算库存汇总表

---

## 二、生产模块 API

### 2.1 生产工单

#### GET /api/production/orders
**说明**：获取生产工单列表

---

## 三、销售模块 API

### 3.1 销售订单

#### GET /api/orders/sales
**说明**：获取销售订单列表

---

## 四、系统模块 API

### 4.1 登录

#### POST /api/auth/login
**说明**：用户登录

**请求体**：
```json
{
  "username": "admin",
  "password": "******"
}
```

**返回**：
```json
{
  "token": "xxx",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "管理员"
  }
}
```

---

**文档结束**
