# equipment + hr 模块 DDD 架构迁移方案

> **创建日期**：2026-07-10  
> **目标**：将 equipment（设备管理）和 hr（人力资源）两个模块从"原生 SQL + 胖路由 + 零领域层"的基础 CRUD 架构，重构为符合项目标杆（warehouse/production）的 DDD 分层架构。

---

## 一、现状分析

### 1.1 equipment 模块

| 维度 | 现状 |
|------|------|
| 页面 | 5 个：设备台账、维保记录、报废、维修、校准 |
| API | 6 个：route.ts（台账 CRUD）、maintenance、plan、repair、scrap、calibration |
| 表 | eq_equipment、eq_maintenance_record、eq_maintenance_plan（仅存于 migrations/046，未纳入 schema.ts） |
| 领域层 | **不存在** |
| 业务逻辑 | 全部内嵌在 API 路由中：维保周期计算（daily/weekly/monthly）、next_execute_date 计算、到期提醒窗口 |

**核心问题**：
- 表未纳入 ORM schema，API 全部走原生 SQL（`query`/`execute`）
- 无聚合根、无状态机、无领域事件、无值对象
- 类型定义散落在页面文件内（`interface Equipment` 重复定义）
- 维保周期算法、到期提醒逻辑无法复用和测试

### 1.2 hr 模块

| 维度 | 现状 |
|------|------|
| 页面 | 5 个：员工档案、员工查询、考勤、薪资、培训 |
| API | 6 个 + organization 侧复用：employees、departments、attendance、salary（含 stats）、training |
| 表 | sys_employee、sys_department、hr_attendance、hr_salary、hr_training（未纳入 schema.ts） |
| 领域层 | **不存在** |
| 业务逻辑 | 全部内嵌在 API 路由中：isValidDate/isValidTime/isValidStatus 校验、分页 SQL 拼接 |

**核心问题**：
- 员工/部门双 API 路径（hr + organization）造成入口分裂
- `hr_attendance` 有 `SELECT 1 FROM hr_attendance LIMIT 1` 存在性探测（表结构不稳定）
- 无状态机（员工状态流转：试用→在职→离职 全靠硬编码数字）
- 考勤校验逻辑散落在路由中，无法复用

### 1.3 标杆对照（warehouse 模块）

warehouse 模块的 DDD 结构作为迁移标杆：

```
src/domain/warehouse/
├── aggregates/
│   ├── InboundOrder.ts          # 聚合根（私有构造 + static create/reconstitute）
│   ├── OutboundOrder.ts
│   ├── TransferOrder.ts
│   └── StocktakingOrder.ts
├── entities/
│   ├── InboundItem.ts           # 实体（聚合根内部）
│   └── OutboundItem.ts
├── value-objects/
│   ├── OrderStatus.ts           # 值对象（状态机 + transitions 矩阵）
│   └── WarehouseStateMachine.ts
├── repositories/
│   └── IInboundOrderRepository.ts  # 仓储接口（领域层定义，基础设施层实现）
└── events/
    └── InboundOrderEvents.ts    # 领域事件
```

**聚合根编码模式**（InboundOrder.ts）：
- `private constructor(props)` + `static create(props)` / `static reconstitute(props)`
- `private _domainEvents: DomainEvent[]`（create 时 push 事件，reconstitute 从 DB 重建不发事件）
- 嵌入值对象（`_status: OrderStatus`、`_totalAmount: Money`）
- 不变式校验（`throw new DomainError('仓库ID不能为空')`）
- 状态流转委托给值对象（`this._status.transitionTo('confirmed')`）

---

## 二、目标架构

### 2.1 equipment 目标领域模型

```
src/domain/equipment/
├── aggregates/
│   └── Equipment.ts              # 聚合根：设备档案 + 状态管理
├── entities/
│   ├── MaintenancePlan.ts        # 实体：维保计划（周期/下次执行日）
│   └── MaintenanceRecord.ts      # 实体：维保记录
├── value-objects/
│   ├── EquipmentStatus.ts        # 值对象：运行中/待机/保养中/故障/报废
│   └── MaintenanceCycle.ts       # 值对象：daily/weekly/monthly/quarterly/yearly
├── repositories/
│   ├── IEquipmentRepository.ts
│   ├── IMaintenancePlanRepository.ts
│   └── IMaintenanceRecordRepository.ts
└── events/
    └── EquipmentEvents.ts        # 事件：设备创建/状态变更/维保完成/报废
```

**聚合根设计**：

```typescript
// Equipment.ts 核心结构
export interface EquipmentProps {
  id?: number;
  equipmentCode: string;
  name: string;
  model: string;
  workshop: string;
  status: number;           // DB 状态码
  purchaseDate: string;
  lastMaintenanceDate?: string;
  maintenancePlans?: MaintenancePlanProps[];
}

export class Equipment {
  private _domainEvents: DomainEvent[] = [];
  private _status: EquipmentStatus;

  private constructor(props: EquipmentProps) {
    // 不变式校验
    if (!props.equipmentCode) throw new DomainError('设备编码不能为空');
    if (!props.name) throw new DomainError('设备名称不能为空');
    // ... 赋值
    this._status = EquipmentStatus.fromDb(props.status);
  }

  static create(props: EquipmentProps): Equipment {
    const equipment = new Equipment(props);
    equipment._domainEvents.push(EquipmentCreatedEvent.create(equipment));
    return equipment;
  }

  static reconstitute(props: EquipmentProps): Equipment {
    return new Equipment(props);  // 从 DB 重建，不发事件
  }

  // 状态流转
  startMaintenance(): void {
    this._status.transitionTo('maintaining');
    this._domainEvents.push(EquipmentMaintenanceStartedEvent.create(this));
  }

  completeMaintenance(record: MaintenanceRecord): void {
    this._status.transitionTo('running');
    this._lastMaintenanceDate = record.executedAt;
    this._domainEvents.push(EquipmentMaintenanceCompletedEvent.create(this, record));
  }

  scrap(reason: string): void {
    this._status.transitionTo('scrapped');
    this._domainEvents.push(EquipmentScrappedEvent.create(this, reason));
  }

  get domainEvents(): DomainEvent[] { return this._domainEvents; }
}
```

**状态机设计**：

```typescript
// EquipmentStatus.ts
const TRANSITIONS = {
  running:    ['standby', 'maintaining', 'fault'],
  standby:    ['running', 'maintaining', 'fault'],
  maintaining:['running', 'standby'],
  fault:      ['maintaining', 'scrapped'],
  scrapped:   [],  // 终态
};
```

### 2.2 hr 目标领域模型

```
src/domain/hr/
├── aggregates/
│   └── Employee.ts              # 聚合根：员工档案 + 状态管理
├── entities/
│   └── Department.ts            # 实体：部门（树形结构）
├── value-objects/
│   ├── EmployeeStatus.ts        # 值对象：试用/在职/停用/离职
│   └── AttendanceStatus.ts      # 值对象：正常/迟到/早退/缺勤/请假
├── repositories/
│   ├── IEmployeeRepository.ts
│   ├── IDepartmentRepository.ts
│   ├── IAttendanceRepository.ts
│   └── ISalaryRepository.ts
└── events/
    └── EmployeeEvents.ts        # 事件：员工入职/转正/离职/状态变更
```

**聚合根设计**：

```typescript
// Employee.ts 核心结构
export class Employee {
  private _domainEvents: DomainEvent[] = [];
  private _status: EmployeeStatus;

  private constructor(props: EmployeeProps) {
    if (!props.name) throw new DomainError('员工姓名不能为空');
    if (!props.employeeNo) throw new DomainError('员工编号不能为空');
    // ... 赋值
    this._status = EmployeeStatus.fromDb(props.status);
  }

  static create(props: EmployeeProps): Employee {
    const employee = new Employee(props);
    employee._domainEvents.push(EmployeeOnboardedEvent.create(employee));
    return employee;
  }

  // 试用转正
  confirm(): void {
    this._status.transitionTo('active');
    this._domainEvents.push(EmployeeConfirmedEvent.create(this));
  }

  // 离职
  resign(reason: string): void {
    this._status.transitionTo('resigned');
    this._domainEvents.push(EmployeeResignedEvent.create(this, reason));
  }
}
```

**状态机设计**：

```typescript
// EmployeeStatus.ts
const TRANSITIONS = {
  probation: ['active', 'inactive', 'resigned'],
  active:    ['inactive', 'resigned'],
  inactive:  ['active', 'resigned'],
  resigned:  [],  // 终态
};
```

---

## 三、迁移步骤（分阶段）

### 阶段 0：Schema 纳管（前置条件）

**目标**：将 equipment 和 hr 的表纳入 `src/lib/db/schema.ts` ORM 管理

**步骤**：
1. 在 `src/lib/db/schema.ts` 中添加表定义：
   - `eq_equipment`、`eq_maintenance_record`、`eq_maintenance_plan`
   - `sys_employee`、`sys_department`、`hr_attendance`、`hr_salary`、`hr_training`
2. 创建迁移脚本 `database/migrations/061_ensure_equipment_hr_tables.sql`（CREATE TABLE IF NOT EXISTS，确保表结构与 schema.ts 一致）
3. 运行 `node scripts/setup-db.mjs` 验证

**预计工作量**：0.5 天

---

### 阶段 1：领域层搭建

**目标**：创建 equipment 和 hr 的完整领域层

**步骤**：

#### 1.1 equipment 领域层
1. 创建 `src/domain/equipment/value-objects/EquipmentStatus.ts`
   - 定义状态枚举（running/standby/maintaining/fault/scrapped）
   - 实现 `transitions` 矩阵 + `canTransitionTo` / `transitionTo`
   - 实现 `DB_TO_DOMAIN_STATUS` 映射表
2. 创建 `src/domain/equipment/value-objects/MaintenanceCycle.ts`
   - 定义周期枚举（daily/weekly/monthly/quarterly/yearly）
   - 实现 `calculateNextDate(lastDate: string): string` 方法
3. 创建 `src/domain/equipment/entities/MaintenancePlan.ts`
   - 封装维保计划属性 + `calculateNextExecuteDate()` 方法
4. 创建 `src/domain/equipment/entities/MaintenanceRecord.ts`
   - 封装维保记录属性
5. 创建 `src/domain/equipment/aggregates/Equipment.ts`
   - 私有构造 + `static create` / `static reconstitute`
   - 状态流转方法：`startMaintenance()` / `completeMaintenance()` / `reportFault()` / `scrap()`
   - 领域事件收集
6. 创建 `src/domain/equipment/events/EquipmentEvents.ts`
   - `EquipmentCreatedEvent` / `EquipmentMaintenanceStartedEvent` / `EquipmentMaintenanceCompletedEvent` / `EquipmentScrappedEvent`
7. 创建仓储接口：
   - `src/domain/equipment/repositories/IEquipmentRepository.ts`
   - `src/domain/equipment/repositories/IMaintenancePlanRepository.ts`
   - `src/domain/equipment/repositories/IMaintenanceRecordRepository.ts`

#### 1.2 hr 领域层
1. 创建 `src/domain/hr/value-objects/EmployeeStatus.ts`
   - 状态枚举（probation/active/inactive/resigned）+ transitions 矩阵
2. 创建 `src/domain/hr/value-objects/AttendanceStatus.ts`
   - 状态枚举（normal/late/early_leave/absent/leave）
3. 创建 `src/domain/hr/entities/Department.ts`
   - 树形结构（parent_id）+ `getPath()` 方法
4. 创建 `src/domain/hr/aggregates/Employee.ts`
   - 私有构造 + `static create` / `static reconstitute`
   - 状态流转：`confirm()` / `deactivate()` / `reactivate()` / `resign()`
5. 创建 `src/domain/hr/events/EmployeeEvents.ts`
   - `EmployeeOnboardedEvent` / `EmployeeConfirmedEvent` / `EmployeeResignedEvent`
6. 创建仓储接口：
   - `src/domain/hr/repositories/IEmployeeRepository.ts`
   - `src/domain/hr/repositories/IDepartmentRepository.ts`
   - `src/domain/hr/repositories/IAttendanceRepository.ts`
   - `src/domain/hr/repositories/ISalaryRepository.ts`

**验收标准**：
- `pnpm exec eslint src/domain/equipment/ src/domain/hr/` 无 DDD 分层违规
- `pnpm ts-check` 无类型错误

**预计工作量**：2 天

---

### 阶段 2：基础设施层实现

**目标**：创建 MySQL 仓储实现

**步骤**：

#### 2.1 equipment 仓储实现
1. 创建 `src/infrastructure/repositories/MysqlEquipmentRepository.ts`
   - 实现 `IEquipmentRepository`
   - 使用 `src/lib/db` 的查询构建器（非原生 SQL）
   - `findById` / `findPaginated` / `save` / `update` / `delete`
2. 创建 `src/infrastructure/repositories/MysqlMaintenancePlanRepository.ts`
3. 创建 `src/infrastructure/repositories/MysqlMaintenanceRecordRepository.ts`

#### 2.2 hr 仓储实现
1. 创建 `src/infrastructure/repositories/MysqlEmployeeRepository.ts`
   - 实现 `IEmployeeRepository`
   - 含 `findByDepartment` / `findByStatus` 查询
2. 创建 `src/infrastructure/repositories/MysqlDepartmentRepository.ts`
   - 含 `findTree()` 树形查询
3. 创建 `src/infrastructure/repositories/MysqlAttendanceRepository.ts`
4. 创建 `src/infrastructure/repositories/MysqlSalaryRepository.ts`

**验收标准**：
- 仓储实现依赖领域层接口（依赖倒置）
- `pnpm ts-check` 无类型错误

**预计工作量**：1.5 天

---

### 阶段 3：应用层编排

**目标**：创建应用服务，收敛业务逻辑

**步骤**：

#### 3.1 equipment 应用服务
1. 创建 `src/application/services/EquipmentApplicationService.ts`
   - 构造函数注入 `IEquipmentRepository` + `IMaintenancePlanRepository` + `IMaintenanceRecordRepository`
   - 方法：
     - `createEquipment(props)` → 创建设备 + 发布事件
     - `scheduleMaintenance(equipmentId, planId)` → 安排维保
     - `completeMaintenance(equipmentId, record)` → 完成维保 + 更新设备状态 + 更新 last_maintenance_date + 计算下次维保日
     - `scrapEquipment(equipmentId, reason)` → 报废设备
   - 通过 `getDomainEventOutbox()` + `persistAndPublishEvents` 落库并发布事件

2. 创建事件处理器（注册到 `src/application/EventRegistry.ts`）：
   - `src/application/handlers/EquipmentMaintenanceHandler.ts`
     - 监听 `EquipmentMaintenanceCompletedEvent` → 更新维保计划 next_execute_date
   - `src/application/handlers/EquipmentScrapHandler.ts`
     - 监听 `EquipmentScrappedEvent` → 归集报废成本

#### 3.2 hr 应用服务
1. 创建 `src/application/services/EmployeeApplicationService.ts`
   - 方法：
     - `onboard(props)` → 入职 + 发布 `EmployeeOnboardedEvent`
     - `confirm(employeeId)` → 转正
     - `deactivate(employeeId)` → 停用
     - `resign(employeeId, reason)` → 离职
2. 创建 `src/application/services/AttendanceApplicationService.ts`
   - 方法：`recordAttendance(props)` / `getAttendanceStats(params)`
3. 创建 `src/application/services/SalaryApplicationService.ts`
   - 方法：`calculateSalary(params)` / `getSalaryStats(params)`
4. 创建事件处理器：
   - `src/application/handlers/EmployeeResignedHandler.ts`
     - 监听 `EmployeeResignedEvent` → 释放权限、归档考勤

**验收标准**：
- 应用服务遵循"加载聚合 → 调用领域方法 → 持久化 → 发布事件"标准流程
- 事件处理器注册到 `EventRegistry.ts`

**预计工作量**：2 天

---

### 阶段 4：API 路由重构

**目标**：将胖路由瘦化为 Thin Controller

**步骤**：

#### 4.1 equipment API 重构
- `src/app/api/equipment/route.ts`：仅做协议转换，调用 `EquipmentApplicationService`
- `src/app/api/equipment/maintenance/route.ts`：调用 `completeMaintenance`
- `src/app/api/equipment/plan/route.ts`：调用 `scheduleMaintenance`
- `src/app/api/equipment/repair/route.ts`：调用 `reportFault` + 修复记录
- `src/app/api/equipment/scrap/route.ts`：调用 `scrapEquipment`
- `src/app/api/equipment/calibration/route.ts`：调用校准逻辑

#### 4.2 hr API 重构 + 入口统一
- **合并双路径**：将 `src/app/api/hr/employees/route.ts`（当前 re-export organization）改为直接调用 `EmployeeApplicationService`
- `src/app/api/organization/employee/route.ts`：保留为兼容入口，或重定向到 hr 路径
- `src/app/api/hr/attendance/route.ts`：调用 `AttendanceApplicationService`
- `src/app/api/hr/salary/route.ts`：调用 `SalaryApplicationService`
- `src/app/api/hr/salary/stats/route.ts`：调用 `getSalaryStats`
- `src/app/api/hr/training/route.ts`：保持 CRUD（培训管理业务逻辑较简单）

**验收标准**：
- API 路由不超过 30 行（仅协议转换 + 错误处理）
- 无原生 SQL 残留
- `pnpm exec eslint src/app/api/equipment/ src/app/api/hr/` 无警告

**预计工作量**：1.5 天

---

### 阶段 5：页面适配 + 测试

**目标**：前端页面适配新 API 响应格式 + 补充单元测试

**步骤**：

#### 5.1 页面适配
- equipment 页面：移除页面内 `interface Equipment` 定义，改用 `@/domain/equipment` 导出的类型
- hr 页面：同上，使用 `@/domain/hr` 导出的类型
- 统一员工 API 入口（移除 organization/employee 兼容路径或标注 deprecated）

#### 5.2 单元测试
- `tests/unit/domain/equipment/Equipment.test.ts`
  - 测试状态流转（running→maintaining→running、fault→scrapped）
  - 测试不变式校验（空编码抛 DomainError）
- `tests/unit/domain/hr/Employee.test.ts`
  - 测试状态流转（probation→active→resigned）
  - 测试 `confirm()` / `resign()` 发布正确事件
- `tests/unit/application/EquipmentApplicationService.test.ts`
  - 测试 `completeMaintenance` 调用仓储 + 发布事件
- `tests/unit/application/EmployeeApplicationService.test.ts`
  - 测试 `onboard` / `confirm` / `resign` 全流程

**验收标准**：
- `pnpm test:unit` 全部通过
- `pnpm ts-check` 无类型错误

**预计工作量**：1.5 天

---

## 四、风险评估与注意事项

### 4.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| hr 双 API 路径合并 | 可能影响前端页面调用 | 保留 organization/employee 兼容入口，前端逐步切换 |
| 表结构未纳入 schema.ts | 迁移期间可能出现表结构不一致 | 阶段 0 先用 CREATE TABLE IF NOT EXISTS 确保表存在 |
| equipment 维保计划算法 | 原算法内嵌在路由中，提取时可能遗漏边界条件 | 提取前先写测试用例覆盖现有算法行为 |

### 4.2 注意事项

1. **领域层零框架依赖**：领域层禁止 import `@/lib/db/schema`、`drizzle-orm`、`next` 等（已由 `ddd/layer-dependencies` ESLint 规则约束）
2. **仓储接口在领域层定义**：接口中的类型用领域层的 Props 接口，不引用 Drizzle 的 `InferSelectModel`
3. **事件处理器注册**：新建的 handler 必须在 `src/application/EventRegistry.ts` 中注册，否则事件不会被消费
4. **状态码映射**：DB 中的 status 字段（TINYINT）需通过值对象的 `DB_TO_DOMAIN_STATUS` 映射表隔离，领域层不直接使用数字状态码
5. **迁移期间不中断功能**：每个阶段完成后验证对应页面功能正常，确保渐进式迁移

### 4.3 依赖关系

```
阶段 0（Schema） → 阶段 1（领域层） → 阶段 2（基础设施层） → 阶段 3（应用层） → 阶段 4（API 重构） → 阶段 5（页面+测试）
```

每个阶段是下一阶段的前置条件，不可并行。

---

## 五、工作量预估

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| 阶段 0 | Schema 纳管 | 0.5 天 |
| 阶段 1 | 领域层搭建 | 2 天 |
| 阶段 2 | 基础设施层实现 | 1.5 天 |
| 阶段 3 | 应用层编排 | 2 天 |
| 阶段 4 | API 路由重构 | 1.5 天 |
| 阶段 5 | 页面适配 + 测试 | 1.5 天 |
| **合计** | | **9 天** |

equipment 和 hr 可并行推进（互不依赖），单人完成约 9 天，两人并行约 5 天。

---

## 六、参考文件

- 标杆聚合根：`src/domain/warehouse/aggregates/InboundOrder.ts`
- 标杆值对象：`src/domain/warehouse/value-objects/OrderStatus.ts`
- 标杆应用服务：`src/application/services/InboundApplicationService.ts`
- 领域异常体系：`src/domain/shared/DomainTypes.ts`
- 事件注册：`src/application/EventRegistry.ts`
- DDD 分层 ESLint 规则：`eslint-rules/ddd-layer-dependencies.js`
- 现有迁移脚本：`database/migrations/046_create_equipment_maintenance_tables.sql`
