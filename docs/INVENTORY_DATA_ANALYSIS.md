# 5月份成品原料报表分析报告

## 文件概览

| 文件名 | 类型 | 工作表 | 行数 | 用途 |
|--------|------|--------|------|------|
| 5月份辅料月报表.xls | 辅料 | 达昌辅料 | 725 | 原料仓库 |
| | | 汉霖辅料 | 999 | 原料仓库 |
| 5月原材料月报表.xlsx | 原材料 | 月报表 | 1,815 | 原料仓库 |
| | | 网版 | 61 | 原料仓库 |
| 五月份成品管制帐.xlsm | 成品 | 主料 | 7,790 | 成品仓库 |
| 五月份其它管制帐.xlsm | 其它 | Sheet1 | 998 | 其它管制 |
| | | 主料 | 197 | 其它管制 |

**总计**: 约 **12,585 条记录**

---

## 数据结构分析

### 1. 辅料表（达昌辅料、汉霖辅料）

**列结构**（53列）：
- 规格型号
- 料号
- 品名
- 类别
- 供应商
- 上月结存
- 累计入库
- 累计出库
- 每日入库/出库记录...

**数据示例**：
| 规格型号 | 料号 | 品名 | 类别 | 供应商 |
|----------|------|------|------|--------|
| 101.4*114*66.7 | 纸管 | 个 | 常熟造纸厂 | ... |

### 2. 原材料月报表

**列结构**（313列）：
- 物料编码
- 物料名称
- 规格型号
- 类别
- 供应商
- 期初库存
- 入库/出库记录（按日期）
- 期末库存

**数据特点**：
- 包含详细的每日出入库记录
- 网版单独一个工作表

### 3. 成品管制帐

**列结构**（109列）：
- 产品编码
- 规格型号
- 品名
- 客户
- 批次
- 入库/出库记录
- 结存

**数据量**：7,790 条成品记录

---

## 数据库表设计

### 成品库存表 (inv_product_inventory)

```sql
CREATE TABLE inv_product_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(100),      -- 产品编码
    product_name VARCHAR(255),      -- 品名
    specification VARCHAR(255),     -- 规格型号
    category VARCHAR(100),          -- 类别
    customer VARCHAR(255),          -- 客户
    unit VARCHAR(50),               -- 单位
    warehouse VARCHAR(100),         -- 仓库
    location VARCHAR(100),          -- 储位
    opening_balance DECIMAL(18,4),  -- 期初库存
    total_in DECIMAL(18,4),         -- 累计入库
    total_out DECIMAL(18,4),        -- 累计出库
    current_balance DECIMAL(18,4),  -- 当前库存
    batch_no VARCHAR(100),          -- 批次号
    supplier VARCHAR(255),          -- 供应商
    source_file VARCHAR(255),       -- 来源文件
    source_sheet VARCHAR(100),      -- 来源工作表
    import_time DATETIME,           -- 导入时间
    remarks TEXT                    -- 备注
);
```

### 原料库存表 (inv_material_inventory)

```sql
CREATE TABLE inv_material_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_code VARCHAR(100),     -- 物料编码
    material_name VARCHAR(255),     -- 物料名称
    specification VARCHAR(255),     -- 规格型号
    category VARCHAR(100),          -- 类别
    material_type VARCHAR(50),      -- 物料类型
    unit VARCHAR(50),               -- 单位
    warehouse VARCHAR(100),         -- 仓库
    location VARCHAR(100),          -- 储位
    supplier VARCHAR(255),          -- 供应商
    opening_balance DECIMAL(18,4),  -- 期初库存
    total_in DECIMAL(18,4),         -- 累计入库
    total_out DECIMAL(18,4),        -- 累计出库
    current_balance DECIMAL(18,4),  -- 当前库存
    safety_stock DECIMAL(18,4),     -- 安全库存
    source_file VARCHAR(255),       -- 来源文件
    source_sheet VARCHAR(100),      -- 来源工作表
    import_time DATETIME,           -- 导入时间
    remarks TEXT                    -- 备注
);
```

### 辅料库存表 (inv_auxiliary_inventory)

```sql
CREATE TABLE inv_auxiliary_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aux_code VARCHAR(100),          -- 辅料编码
    aux_name VARCHAR(255),          -- 辅料名称
    specification VARCHAR(255),     -- 规格型号
    category VARCHAR(100),          -- 类别
    unit VARCHAR(50),               -- 单位
    warehouse VARCHAR(100),         -- 仓库
    location VARCHAR(100),          -- 储位
    supplier VARCHAR(255),          -- 供应商
    opening_balance DECIMAL(18,4),  -- 期初库存
    total_in DECIMAL(18,4),         -- 累计入库
    total_out DECIMAL(18,4),        -- 累计出库
    current_balance DECIMAL(18,4),  -- 当前库存
    source_file VARCHAR(255),       -- 来源文件
    source_sheet VARCHAR(100),      -- 来源工作表
    import_time DATETIME,           -- 导入时间
    remarks TEXT                    -- 备注
);
```

---

## 使用方法

### 1. 分析数据

```bash
python scripts/analyze_excel_report.py
```

输出：
- 各文件工作表信息
- 列结构
- 数据样本
- 统计信息

### 2. 导入数据到数据库

```bash
python scripts/import_inventory_data.py
```

功能：
- 自动创建数据库表
- 导入辅料数据
- 导入原材料数据
- 导入成品数据
- 生成导入报告

### 3. 查看分析结果

分析结果保存在：
- `C:\Users\snqig\Desktop\新建文件夹\analysis_results.json`
- `C:\Users\snqig\Desktop\新建文件夹\import_results.json`

---

## ERP 项目应用

### 成品仓库模块

**数据来源**: 五月份成品管制帐.xlsm

**应用场景**:
- 成品入库管理
- 成品出库管理
- 库存查询
- 批次追溯

### 原料仓库模块

**数据来源**: 
- 5月原材料月报表.xlsx
- 5月份辅料月报表.xls

**应用场景**:
- 原料入库管理
- 原料出库管理
- 辅料管理
- 供应商管理
- 安全库存预警

---

## 数据字段映射

### 辅料数据映射

| Excel 列 | 数据库字段 | 说明 |
|----------|------------|------|
| 规格型号 | specification | 规格型号 |
| 料号 | aux_code | 辅料编码 |
| 品名 | aux_name | 辅料名称 |
| 类别 | category | 类别 |
| 供应商 | supplier | 供应商 |
| 上月结存 | opening_balance | 期初库存 |
| 累计入库 | total_in | 累计入库 |
| 累计出库 | total_out | 累计出库 |

### 原材料数据映射

| Excel 列 | 数据库字段 | 说明 |
|----------|------------|------|
| 物料编码 | material_code | 物料编码 |
| 物料名称 | material_name | 物料名称 |
| 规格型号 | specification | 规格型号 |
| 类别 | category | 类别 |
| 供应商 | supplier | 供应商 |

### 成品数据映射

| Excel 列 | 数据库字段 | 说明 |
|----------|------------|------|
| 产品编码 | product_code | 产品编码 |
| 规格型号 | specification | 规格型号 |
| 品名 | product_name | 品名 |

---

## 后续建议

1. **数据清洗**: 部分数据存在空值或格式不一致，建议导入前进行清洗
2. **字段补全**: Excel 中部分列名未识别（Unnamed），需要根据实际业务补全
3. **日期处理**: 入库/出库日期列需要解析为标准日期格式
4. **关联建立**: 建立物料与供应商、仓库的关联关系
5. **权限配置**: 为仓库管理模块配置访问权限

---

## 相关文件

| 文件 | 说明 |
|------|------|
| [analyze_excel_report.py](file:///d:/dcprint/erp-project/scripts/analyze_excel_report.py) | 数据分析脚本 |
| [import_inventory_data.py](file:///d:/dcprint/erp-project/scripts/import_inventory_data.py) | 数据导入脚本 |
| [analysis_results.json](file:///C:/Users/snqig/Desktop/新建文件夹/analysis_results.json) | 分析结果 |
