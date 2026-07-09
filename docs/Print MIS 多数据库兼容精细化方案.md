# Print MIS 多数据库兼容精细化方案

 **适配基线** ：基于 Print MIS v0.2.0 现有架构（Next.js 16 + Drizzle ORM + DDD 分层 + MySQL 8.0）

 **兼容目标** ：MySQL 8.0+（默认）、PostgreSQL 15+、SQL Server 2019+

 **核心约束** ：领域层 / 应用层零修改，所有数据库差异封装在基础设施层；不破坏现有 CI 质量门禁；性能损耗 ≤ 5%

---

## 一、整体设计原则

1. **分层隔离原则** ：100% 遵循 DDD 分层规范，所有数据库差异内聚在 `src/infrastructure/database` 基础设施层，领域层、应用层、API 层无需感知底层数据库类型
2. **最小侵入原则** ：最大化复用现有 MySQL 代码，改造集中在数据库适配层，业务代码改动量控制在 5% 以内
3. **配置化切换原则** ：仅通过单个环境变量 `DB_TYPE` 即可切换数据库，无需修改任何业务代码
4. **版本对齐原则** ：三库 Schema 版本、迁移脚本版本、业务功能版本严格保持一致
5. **可测试原则** ：配套三库自动化测试流水线，每次提交自动验证三库兼容性

---

## 二、架构层精细化改造

### 2.1 目录结构调整（完全贴合 DDD 分层）

将原 `src/lib/db/` 数据库逻辑下沉到基础设施层，统一管理多数据库适配代码：

plaintext

```
src/infrastructure/database/
├── types.ts                  # 通用类型定义、通用函数接口、数据库枚举
├── index.ts                  # 数据库客户端工厂（唯一对外出口）
├── constants.ts              # 通用配置、类型映射常量
├── builders/                 # 通用Schema构造器（业务字段统一封装）
│   ├── common.fields.ts      # 主键、审计字段、软删除等通用字段
│   └── index.ts
├── functions/                # 通用SQL函数封装（业务层统一调用）
│   ├── date.ts               # 日期函数族
│   ├── string.ts             # 字符串函数族
│   ├── json.ts               # JSON操作函数族
│   └── index.ts
├── dialects/                 # 各数据库方言适配（差异全部在此目录）
│   ├── mysql/
│   │   ├── client.ts         # MySQL连接池初始化
│   │   ├── fields.ts         # MySQL字段构造实现
│   │   ├── functions.ts      # MySQL函数实现
│   │   └── schema.ts         # MySQL版全量表定义
│   ├── postgres/
│   │   ├── client.ts
│   │   ├── fields.ts
│   │   ├── functions.ts
│   │   └── schema.ts
│   └── mssql/
│       ├── client.ts
│       ├── fields.ts
│       ├── functions.ts
│       └── schema.ts
└── migrations/               # 分库迁移脚本（自动生成）
    ├── mysql/
    ├── postgres/
    └── mssql/
```

### 2.2 数据库客户端工厂实现

通过环境变量动态加载对应方言驱动，对外暴露统一 Drizzle 实例：

ts

```
// src/infrastructure/database/index.ts
import { DB_TYPE } from '@/config/database';
import { initMysqlClient } from './dialects/mysql/client';
import { initPostgresClient } from './dialects/postgres/client';
import { initMssqlClient } from './dialects/mssql/client';

export type DbClient = ReturnType<typeof initMysqlClient>;

let dbInstance: DbClient | null = null;

export const getDb = (): DbClient => {
  if (dbInstance) return dbInstance;

  switch (DB_TYPE) {
    case 'postgres':
      dbInstance = initPostgresClient() as unknown as DbClient;
      break;
    case 'mssql':
      dbInstance = initMssqlClient() as unknown as DbClient;
      break;
    default:
      dbInstance = initMysqlClient();
  }

  return dbInstance;
};
```

### 2.3 连接池配置适配

针对不同数据库驱动的配置差异，统一封装为通用配置项：

表格

| 通用配置项 | MySQL (mysql2)  | PostgreSQL (postgres.js) | SQL Server (tedious) |
| ---------- | --------------- | ------------------------ | -------------------- |
| 主机地址   | host            | host                     | server               |
| 端口       | port            | port                     | port                 |
| 数据库名   | database        | database                 | database             |
| 用户名     | user            | user                     | userName             |
| 密码       | password        | password                 | password             |
| 连接数上限 | connectionLimit | max                      | pool.max             |
| 超时时间   | connectTimeout  | connectionTimeoutMillis  | connectTimeout       |

### 2.4 类型一致性保障

* TypeScript 层返回类型三库完全统一：`bigint` 主键统一转为 `number`、日期统一为 `Date` 对象、布尔值统一为 `boolean`
* 所有仓储接口返回类型统一，业务层无需做任何类型判断与兼容

---

## 三、Schema 层精细化适配

### 3.1 通用字段构造器（核心复用机制）

封装项目高频通用字段，三库差异化实现，业务 Schema 只需调用构造函数，无需关心底层差异：

ts

```
// 通用字段接口定义
export interface CommonFields {
  pkId: () => AnyColumn;
  createTime: () => AnyColumn;
  updateTime: () => AnyColumn;
  softDelete: () => AnyColumn;
  amountDecimal: (precision?: number, scale?: number) => AnyColumn;
  statusInt: () => AnyColumn;
  boolField: () => AnyColumn;
  jsonField: () => AnyColumn;
}
```

#### 各数据库字段映射对照表（贴合项目现有字段规范）

表格

| 业务语义   | MySQL 实现                                                        | PostgreSQL 实现                                                                    | SQL Server 实现                                                  |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 主键 ID    | `bigint('id', { mode: 'number' }).primaryKey().autoincrement()` | `bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`      | `bigint('id', { mode: 'number' }).primaryKey().identity()`     |
| 创建时间   | `datetime('create_time').notNull().defaultNow()`                | `timestamp('create_time', { withTimezone: true }).notNull().defaultNow()`        | `datetime2('create_time').notNull().default(sql`GETDATE()`)` |
| 更新时间   | `datetime('update_time').onUpdateNow()`                         | `timestamp('update_time', { withTimezone: true }).$onUpdateFn(() => new Date())` | `datetime2('update_time')`触发器 / 应用层自动更新              |
| 软删除标记 | `tinyint('is_deleted').notNull().default(0)`                    | `smallint('is_deleted').notNull().default(0)`                                    | `tinyint('is_deleted').notNull().default(0)`                   |
| 金额字段   | `decimal('amount', { precision: 12, scale: 4 })`                | `decimal('amount', { precision: 12, scale: 4 })`                                 | `decimal('amount', { precision: 12, scale: 4 })`               |
| 状态字段   | `tinyint('status').notNull().default(1)`                        | `smallint('status').notNull().default(1)`                                        | `tinyint('status').notNull().default(1)`                       |
| 布尔字段   | `tinyint('is_enable').notNull().default(1)`+ 自动转 boolean     | `boolean('is_enable').notNull().default(true)`                                   | `bit('is_enable').notNull().default(1)`+ 自动转 boolean        |
| JSON 字段  | `json('extra')`                                                 | `jsonb('extra')`                                                                 | `nvarchar('extra', { length: 'max' })`+ 自动序列化             |

### 3.2 业务 Schema 编写规范

所有业务表结构仅写业务字段，通用字段通过构造器引入，单份业务定义自动适配三库：

ts

```
// 示例：工装表Schema定义（通用业务逻辑只写一次）
export const createToolSchema = (f: CommonFields) => {
  return mysqlTable('dcprint_tool', {
    id: f.pkId(),
    toolType: f.statusInt(),
    toolCode: varchar('tool_code', { length: 50 }).notNull().unique(),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    totalLife: int('total_life').notNull(),
    originalCost: f.amountDecimal(),
    status: f.statusInt(),
    createTime: f.createTime(),
    updateTime: f.updateTime(),
    isDeleted: f.softDelete(),
  });
};
```

各数据库方言目录导入通用业务 Schema，传入对应字段构造器，生成本地 Schema 实例。

### 3.3 索引与约束兼容

表格

| 索引类型      | 兼容方案                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| 普通 B 树索引 | 三库通用，Drizzle 自动适配语法                                                                               |
| 唯一索引      | 三库通用，统一命名规范：`{表名}_{字段}_idx`                                                                |
| 联合索引      | 三库通用，字段顺序保持一致                                                                                   |
| 外键约束      | 三库通用，级联规则统一为 RESTRICT                                                                            |
| 全文索引      | MySQL 用 FULLTEXT，PG 用 GIN 索引，SQL Server 用全文目录；核心查询降级为 LIKE 模糊查询，高级搜索后续分库适配 |

---

## 四、SQL 函数与查询兼容层

### 4.1 通用 SQL 函数封装

所有项目中用到的数据库特有函数，统一封装为可组合的 Drizzle SQL 表达式，业务层调用通用函数，底层自动适配方言：

#### 项目高频函数适配清单

表格

| 通用函数                     | 业务用途             | MySQL 实现                                                                                        | PG 实现                      | SQL Server 实现            |    |                 |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------- | -- | --------------- |
| `dbNow()`                  | 获取当前时间         | `sql`NOW()``                                                                                    | `sql`CURRENT_TIMESTAMP``   | `sql`GETDATE()``         |    |                 |
| `dbDateAdd(date, n, unit)` | 日期加减             | `DATE_ADD(date, INTERVAL n unit)`                                                               | `date + interval 'n unit'` | `DATEADD(unit, n, date)` |    |                 |
| `dbDateFormat(date, fmt)`  | 日期格式化           | `DATE_FORMAT(date, fmt)`                                                                        | `TO_CHAR(date, fmt)`       | `FORMAT(date, fmt)`      |    |                 |
| `dbDateDiff(d1, d2, unit)` | 日期差计算           | `DATEDIFF(unit, d1, d2)`                                                                        | `d1 - d2`+ 提取单位        | `DATEDIFF(unit, d1, d2)` |    |                 |
| `dbJsonGet(col, key)`      | JSON 字段取值        | `JSON_EXTRACT(col, '$.key')`      | `col->>'key'`              | `JSON_VALUE(col, '$.key')` |                              |                            |    |                 |
| `dbConcat(...args)`        | 字符串拼接           | `CONCAT(a,b)`                                                                                   | `a                           |                            | b` | `CONCAT(a,b)` |
| `dbILike(col, keyword)`    | 不区分大小写模糊查询 | `LOWER(col) LIKE LOWER('%kw%')`                                                                 | `col ILIKE '%kw%'`         | `col LIKE '%kw%'`        |    |                 |

### 4.2 复杂查询兼容方案

项目中账龄分析、损耗统计、报表等复杂原生 SQL 查询，全部下沉到仓储实现层，通过方言分支适配：

ts

```
// 示例：账龄查询仓储实现
export class FinanceRepositoryImpl implements IFinanceRepository {
  async getAgingAnalysis(type: ReceivableType) {
    const db = getDb();
    const tableName = type === 'receivable' ? 'fin_receivable' : 'fin_payable';
  
    // 不同数据库使用对应SQL语法
    switch (process.env.DB_TYPE) {
      case 'postgres':
        return db.execute(sql`/* PostgreSQL 版账龄SQL */`);
      case 'mssql':
        return db.execute(sql`/* SQL Server 版账龄SQL */`);
      default:
        return db.execute(sql`/* MySQL 版账龄SQL */`);
    }
  }
}
```

### 4.3 分页与事务兼容

* **分页** ：Drizzle 原生 `.limit().offset()` 自动适配三库语法（SQL Server 自动转为 OFFSET FETCH），业务层无需修改
* **事务** ：Drizzle 事务 API 三库通用，默认隔离级别统一为「读已提交」，与现有 MySQL 配置保持一致
* **批量操作** ：批量插入、批量更新统一使用 Drizzle 原生 API，自动适配各数据库批量语法

---

## 五、迁移体系精细化改造

### 5.1 Drizzle Kit 多配置方案

新增 3 份独立 drizzle 配置文件，对应三个数据库，迁移脚本分目录存储：

ts

```
// drizzle.mysql.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/infrastructure/database/dialects/mysql/schema.ts',
  out: './src/infrastructure/database/migrations/mysql',
  dialect: 'mysql',
  dbCredentials: { /* MySQL连接配置 */ }
});

// drizzle.postgres.config.ts
// drizzle.mssql.config.ts 同理，修改dialect与输出目录
```

### 5.2 package.json 脚本扩展

json

```
{
  "scripts": {
    "db:generate:mysql": "drizzle-kit generate --config=drizzle.mysql.config.ts",
    "db:generate:pg": "drizzle-kit generate --config=drizzle.postgres.config.ts",
    "db:generate:mssql": "drizzle-kit generate --config=drizzle.mssql.config.ts",
    "db:generate:all": "pnpm db:generate:mysql && pnpm db:generate:pg && pnpm db:generate:mssql",
    "db:push:mysql": "drizzle-kit push --config=drizzle.mysql.config.ts",
    "db:push:pg": "drizzle-kit push --config=drizzle.postgres.config.ts",
    "db:push:mssql": "drizzle-kit push --config=drizzle.mssql.config.ts"
  }
}
```

### 5.3 迁移规范

1. **版本对齐** ：每次 Schema 变更必须同时执行 `db:generate:all`，三库迁移版本号严格一致
2. **命名规范** ：迁移文件前缀统一为时间戳，描述一致，如 `0001_add_tool_table.sql`
3. **基线同步** ：以当前 v0.2.0 的 MySQL Schema 为基线，生成 PG 和 SQL Server 的初始全量迁移脚本

---

## 六、现有代码改造清单（精准定位，最小侵入）

### 6.1 必须改造的核心文件

表格

| 文件路径                       | 改造内容                                   | 工作量 |
| ------------------------------ | ------------------------------------------ | ------ |
| `src/lib/db/schema.ts`       | 迁移到基础设施层，重构为通用 Schema 构造器 | 4h     |
| `src/lib/db/index.ts`        | 替换为多数据库工厂实现，兼容原有调用方式   | 2h     |
| `src/lib/soft-delete.ts`     | 替换通用 SQL 函数，适配三库语法            | 1h     |
| `src/lib/finance-core.ts`    | 账龄计算原生 SQL 下沉到仓储层，分库适配    | 3h     |
| `src/lib/rate-limit.ts`      | 限流计数 SQL 适配三库                      | 1h     |
| `src/lib/token-blacklist.ts` | Token 黑名单 SQL 适配三库                  | 1h     |
| 各模块仓储实现                 | 原生 SQL 替换为通用函数调用                | 4h     |
| `drizzle.config.ts`          | 拆分为三库独立配置                         | 0.5h   |

### 6.2 无需改造的模块

* 所有领域层、应用层代码：完全不感知数据库差异
* 领域事件、消息队列、缓存、认证等基础设施：与数据库无关
* 前端页面、API 路由：仅调用应用服务，无直接数据库操作
* CI/CD 核心流程：仅新增三库测试矩阵

---

## 七、分阶段落地计划（适配 v0.3.0 迭代节奏）

### 阶段一：适配层搭建与 MySQL 兼容验证（P0，2 人天）

 **目标** ：架构重构完成，原有 MySQL 功能 100% 兼容，无业务破坏性变更

1. 重构数据库目录结构，实现工厂模式与通用字段构造器
2. 迁移现有 MySQL Schema 到新架构，生成 MySQL 版迁移脚本
3. 封装核心通用 SQL 函数，替换现有高频原生 SQL
4. 全量回归测试，保证 MySQL 环境下所有功能与改造前完全一致
5. **验收标准** ：所有单元测试、E2E 测试通过，功能无差异，性能波动 ≤ 2%

### 阶段二：PostgreSQL 兼容落地（P1，3 人天）

 **目标** ：PG 环境可正常运行核心业务全链路

1. 完成 PostgreSQL 字段构造器与函数适配
2. 生成 PG 版全量迁移脚本，验证表结构正确性
3. 改造所有仓储层原生 SQL，适配 PG 语法
4. 核心业务链路验证：采购入库→生产领料→报工→完工入库→应收应付
5. **验收标准** ：核心模块 CRUD 正常，主链路跑通，单元测试通过率 ≥ 95%

### 阶段三：SQL Server 兼容落地（P2，3.5 人天）

 **目标** ：SQL Server 环境可正常运行核心业务全链路

1. 完成 SQL Server 字段构造器与函数适配
2. 生成 SQL Server 版全量迁移脚本，验证表结构正确性
3. 适配 SQL Server 特有语法（分页、日期、JSON、自增主键）
4. 核心业务链路全量验证
5. **验收标准** ：核心模块 CRUD 正常，主链路跑通，单元测试通过率 ≥ 95%

### 阶段四：全量测试与优化（P3，2 人天）

 **目标** ：三库功能完全对齐，性能与稳定性达标

1. 基于 Testcontainers 搭建三库自动化集成测试
2. 全模块功能回归测试，修复边缘场景兼容问题
3. 三库性能基准测试，优化慢查询与索引
4. 补充多数据库部署文档、切换指南
5. **验收标准** ：三库全量测试通过，性能差异 ≤ 5%，文档齐全

---

## 八、测试与验证体系

### 8.1 单元测试

* 仓储层测试：针对每个数据库方言运行相同用例，验证返回结果一致性
* 通用函数测试：验证三库下函数计算结果完全一致

### 8.2 集成测试（Testcontainers）

* CI 流水线新增三库测试矩阵，每次 PR 自动在 MySQL/PG/SQL Server 三个环境运行全量测试
* 测试容器版本与生产兼容版本严格对齐

### 8.3 业务回归用例

表格

| 核心链路           | 验证点                                         |
| ------------------ | ---------------------------------------------- |
| 采购 - 入库 - 应付 | 单据创建、审核、库存增减、应付生成、成本计算   |
| 销售 - 出库 - 应收 | 订单、发货、库存扣减、应收生成、FIFO 分配      |
| 生产 - 领料 - 完工 | 工单创建、领料扣库存、报工、完工入库、成本归集 |
| 印前模块           | 油墨配方、工装管理、打样工艺卡、版本流转       |
| 系统管理           | 用户、权限、登录、Token 黑名单、限流           |

### 8.4 性能验证

* 三库分别执行基准压测，对比 QPS、响应时间、资源占用
* 慢查询优化，保证核心查询在三库下响应时间均 < 200ms

---

## 九、部署与运维适配

### 9.1 Docker Compose 多环境配置

新增三套独立部署文件：

* `docker-compose.mysql.yml`：默认生产配置，兼容现有部署方式
* `docker-compose.postgres.yml`：含 PostgreSQL 15 服务 + 应用适配配置
* `docker-compose.mssql.yml`：含 SQL Server 2022 服务 + 应用适配配置

### 9.2 环境变量全清单

env

```
# 核心切换变量
DB_TYPE=mysql              # mysql / postgres / mssql

# 通用连接配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=print_mis
DB_USER=root
DB_PASSWORD=your_password

# 性能配置
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=10000
DB_SSL=false
```

### 9.3 CI/CD 适配

GitHub Actions 新增数据库矩阵测试：

yaml

```
strategy:
  matrix:
    db: [mysql, postgres, mssql]
```

每次提交自动在三个数据库环境运行 lint、类型检查、单元测试、集成测试。

---

## 十、风险与回滚方案

### 10.1 核心风险与应对

表格

| 风险                | 影响                      | 应对方案                                           |
| ------------------- | ------------------------- | -------------------------------------------------- |
| 原生 SQL 遗漏改造   | 部分功能在非 MySQL 下报错 | 全局扫描 raw sql 标记改造点，CI 三库测试兜底       |
| 性能下降            | SQL Server/PG 查询变慢    | 针对性优化索引与 SQL 写法，性能差异控制在 5% 以内  |
| 迁移脚本不一致      | 三库表结构有差异          | 每次生成迁移同时生成三库版本，脚本校验工具自动对比 |
| 日期 / 数值精度差异 | 成本计算结果不一致        | 统一精度规则，单元测试校验计算结果一致性           |

### 10.2 回滚方案

1. **代码回滚** ：保留原有 `src/lib/db` 入口兼容层，出现问题可一键切回单 MySQL 模式
2. **数据回滚** ：数据库切换前全量备份，支持快速回退到 MySQL 版本
3. **灰度验证** ：先在测试环境验证三库兼容性，再逐步上线生产，默认仍使用 MySQL

---

## 十一、落地执行 TODO 清单（Trae CN 可直接执行）

### P0 基础架构改造（MySQL 兼容验证）

* [ ] 重构数据库目录结构，实现多数据库工厂模式
* [ ] 封装通用字段构造器，迁移现有 MySQL Schema
* [ ] 封装核心通用 SQL 函数（日期、字符串、JSON）
* [ ] 全局扫描原生 SQL，标记改造点并完成核心改造
* [ ] 拆分 drizzle 配置，生成 MySQL 版迁移脚本
* [ ] 全量回归测试，验证 MySQL 功能与改造前完全一致

* 验收：所有测试通过，业务无感知，性能波动≤2%

### P1 PostgreSQL 兼容

* [ ] 实现 PostgreSQL 字段构造器与函数适配
* [ ] 生成 PG 版全量迁移脚本，验证表结构一致性
* [ ] 完成所有仓储层原生 SQL 的 PG 语法适配
* [ ] 核心业务链路全量验证（采购 / 销售 / 生产 / 印前）
* [ ] 单元测试通过率 ≥ 95%

* 验收：PG 环境可正常跑通所有核心业务流程

### P2 SQL Server 兼容

* [ ] 实现 SQL Server 字段构造器与函数适配
* [ ] 生成 SQL Server 版全量迁移脚本
* [ ] 适配 SQL Server 特有语法（分页、日期、自增主键等）
* [ ] 完成所有原生 SQL 的 SQL Server 适配
* [ ] 核心业务链路全量验证
* [ ] 单元测试通过率 ≥ 95%

* 验收：SQL Server 环境可正常跑通所有核心业务流程

### P3 测试与文档完善

* [ ] 搭建 Testcontainers 三库集成测试
* [ ] CI 流水线新增三库测试矩阵
* [ ] 全模块功能回归测试，修复边缘问题
* [ ] 三库性能基准测试与优化
* [ ] 补充多数据库部署文档与切换指南

* 验收：三库全量测试通过，文档齐全，性能差异≤5%
