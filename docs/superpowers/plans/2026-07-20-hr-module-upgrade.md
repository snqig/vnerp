# HR 模块深度升级 — 实施计划

> **目标**：将 VNERP HR 模块从"基础记录系统"升级为"制造业深度薪资计算引擎"，支持计件/计时/绩效混合薪酬模式。

**架构**：Drizzle ORM + Next.js API Routes (REST) + shadcn/ui 前端，遵循现有 DDD 分层模式。

**技术栈**：Drizzle ORM (mysql-core) + Next.js 16 + next-intl + shadcn/ui + Recharts (报表)

---

## Phase 1: 数据库与 ORM 基础 (1-2 周)

### 任务 1.1：Drizzle Schema — HR 表映射

**文件**：
- 修改：`src/lib/db/schema.ts` — 追加 HR 表定义
- 创建：`database/sql/hr_salary_standard.sql` — 新表 DDL
- 创建：`database/sql/hr_piece_rate.sql`
- 创建：`database/sql/hr_salary_profile.sql`
- 创建：`database/sql/hr_salary_calculation.sql`
- 创建：`database/sql/hr_piece_work_detail.sql`
- 创建：`database/sql/hr_attendance_exception.sql`

现有 HR 表（`sys_employee`, `sys_salary`, `hr_attendance`, `hr_training`, `hr_training_participant`）迁移到 Drizzle ORM。新增 6 张核心表。

**Drizzle 表定义要点**（追加到 `schema.ts`）：

```typescript
// ==================== HR 模块 (Drizzle ORM) ====================

// 薪资标准表
export const hrSalaryStandard = mysqlTable('hr_salary_standard', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  positionCode: varchar('position_code', { length: 50 }),
  skillLevel: int('skill_level'),
  baseSalary: decimal('base_salary', { precision: 10, scale: 2 }),
  pieceRateType: varchar('piece_rate_type', { length: 20 }),
  performanceBase: decimal('performance_base', { precision: 10, scale: 2 }),
  allowanceNight: decimal('allowance_night', { precision: 10, scale: 2 }),
  allowanceHighTemp: decimal('allowance_high_temp', { precision: 10, scale: 2 }),
  effectiveDate: date('effective_date'),
  factoryId: bigint('factory_id', { mode: 'number', unsigned: true }),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

// 工序单价表
export const hrPieceRate = mysqlTable('hr_piece_rate', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  processCode: varchar('process_code', { length: 50 }),
  productType: varchar('product_type', { length: 50 }),
  unitPrice: decimal('unit_price', { precision: 10, scale: 4 }),
  unit: varchar('unit', { length: 20 }),
  qualityThreshold: decimal('quality_threshold', { precision: 5, scale: 2 }),
  factoryId: bigint('factory_id', { mode: 'number', unsigned: true }),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

// 员工薪资档案表
export const hrSalaryProfile = mysqlTable('hr_salary_profile', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
  salaryType: varchar('salary_type', { length: 20 }), // piece/time/mixed
  baseSalary: decimal('base_salary', { precision: 10, scale: 2 }),
  socialInsuranceBase: decimal('social_insurance_base', { precision: 10, scale: 2 }),
  housingFundRate: decimal('housing_fund_rate', { precision: 5, scale: 2 }),
  taxDeduction: decimal('tax_deduction', { precision: 10, scale: 2 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  effectiveDate: date('effective_date'),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

// 月度薪资计算结果表
export const hrSalaryCalculation = mysqlTable('hr_salary_calculation', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
  calcMonth: varchar('calc_month', { length: 7 }),
  baseSalary: decimal('base_salary', { precision: 10, scale: 2 }),
  pieceSalary: decimal('piece_salary', { precision: 10, scale: 2 }),
  overtimeSalary: decimal('overtime_salary', { precision: 10, scale: 2 }),
  performanceSalary: decimal('performance_salary', { precision: 10, scale: 2 }),
  allowances: decimal('allowances', { precision: 10, scale: 2 }),
  socialInsurancePersonal: decimal('social_insurance_personal', { precision: 10, scale: 2 }),
  housingFundPersonal: decimal('housing_fund_personal', { precision: 10, scale: 2 }),
  individualTax: decimal('individual_tax', { precision: 10, scale: 2 }),
  attendanceDeduction: decimal('attendance_deduction', { precision: 10, scale: 2 }),
  grossPay: decimal('gross_pay', { precision: 10, scale: 2 }),
  totalDeduction: decimal('total_deduction', { precision: 10, scale: 2 }),
  netPay: decimal('net_pay', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('draft'), // draft/confirmed/paid
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

// 计件产量明细表
export const hrPieceWorkDetail = mysqlTable('hr_piece_work_detail', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
  workDate: date('work_date'),
  processCode: varchar('process_code', { length: 50 }),
  productCode: varchar('product_code', { length: 50 }),
  quantity: int('quantity'),
  defectiveQuantity: int('defective_quantity'),
  unitPrice: decimal('unit_price', { precision: 10, scale: 4 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  mesSyncId: varchar('mes_sync_id', { length: 50 }),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
});

// 考勤异常表
export const hrAttendanceException = mysqlTable('hr_attendance_exception', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
  exceptionDate: date('exception_date'),
  exceptionType: varchar('exception_type', { length: 20 }), // late/early_leave/absence/overtime
  minutes: int('minutes'),
  deductionAmount: decimal('deduction_amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'), // pending/approved/rejected
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});
```

**创建 SQL DDL 文件**（每个表一个文件，放在 `database/sql/`）：
- 必须包含索引定义（employee_id, calc_month, work_date 等）
- 必须包含外键约束（employee_id → sys_employee.id）

### 任务 1.2：基础设施层实现

**文件**：
- 创建：`src/domain/hr/infrastructure/EmployeeRepository.ts`
- 创建：`src/domain/hr/infrastructure/SalaryRepository.ts`
- 创建：`src/domain/hr/infrastructure/AttendanceRepository.ts`
- 创建：`src/domain/hr/infrastructure/PieceRateRepository.ts`
- 创建：`src/domain/hr/infrastructure/SalaryCalculationRepository.ts`

### 任务 1.3：菜单与权限数据

**文件**：
- 创建：`database/sql/hr_menus_extended.sql`
- 创建：`database/sql/hr_permissions.sql`

新增菜单条目：薪资标准、工序单价、计件产量、薪资计算、薪资报表、社保公积金、考勤异常、技能认证。

---

## Phase 2: 组织架构升级 (1 周)

### 任务 2.1：六级组织架构表

**文件**：
- 创建：`database/sql/hr_organization.sql`

```sql
-- 集团
CREATE TABLE org_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50), name VARCHAR(100),
  sort_order INT, status TINYINT DEFAULT 1
);
-- 法人
CREATE TABLE org_legal_entity (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT, code VARCHAR(50), name VARCHAR(100)
);
-- 工厂
CREATE TABLE org_factory (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  legal_entity_id BIGINT, code VARCHAR(50), name VARCHAR(100)
);
-- 车间
CREATE TABLE org_workshop (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  factory_id BIGINT, code VARCHAR(50), name VARCHAR(100)
);
-- 班组
CREATE TABLE org_team (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  workshop_id BIGINT, code VARCHAR(50), name VARCHAR(100)
);
-- 岗位
CREATE TABLE org_position (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT, code VARCHAR(50), name VARCHAR(100),
  skill_level INT DEFAULT 1
);
```

### 任务 2.2：组织架构 API

**文件**：
- 创建：`src/app/api/organization/group/route.ts`
- 创建：`src/app/api/organization/legal-entity/route.ts`
- 创建：`src/app/api/organization/factory/route.ts`
- 创建：`src/app/api/organization/workshop/route.ts`
- 创建：`src/app/api/organization/team/route.ts`
- 创建：`src/app/api/organization/position/route.ts`
- 修改：`src/app/api/organization/employee/route.ts` — 关联到新组织架构

### 任务 2.3：组织架构前端（树形控件）

**文件**：
- 创建：`src/components/hr/OrganizationTree.tsx` — 可折叠的六级树
- 创建：`src/app/[locale]/hr/organization/page.tsx` — 组织架构维护页面
- 修改：`src/app/[locale]/hr/employee/page.tsx` — 部门选择器改用新组织树

### 任务 2.4：i18n 补充

**文件**：
- 修改：`messages/*.json` — 添加 Organization 命名空间翻译（group, legalEntity, factory, workshop, team, position）

---

## Phase 3: 员工档案升级 (1 周)

### 任务 3.1：员工表扩展字段

**文件**：
- 创建：`database/sql/hr_employee_ext.sql` — ALTER TABLE 添加字段
- 修改：`src/app/api/organization/employee/route.ts` — 支持新字段 CRUD

扩展字段：`skill_level`、`certificate_info`（JSON）、`contract_type`、`contract_start`、`contract_end`、`bank_account`、`emergency_contact`、`emergency_phone`、`blood_type`、`height`、`weight`、`marital_status`、`nationality`

### 任务 3.2：资质证书与合同管理

**文件**：
- 创建：`database/sql/hr_certificate.sql`
- 创建：`database/sql/hr_contract.sql`
- 创建：`src/app/api/hr/certificates/route.ts`
- 创建：`src/app/api/hr/contracts/route.ts`
- 创建：`src/app/[locale]/hr/employee/components/dialogs/CertificateDialog.tsx`
- 创建：`src/app/[locale]/hr/employee/components/dialogs/ContractDialog.tsx`

### 任务 3.3：员工 Tab 页重构

**文件**：
- 修改：`src/app/[locale]/hr/employee/page.tsx` — 增加 Tab 切换（基本信息/资质证书/合同/薪资档案）
- 修改：`src/app/[locale]/hr/employee/components/dialogs/EmployeeFormDialog.tsx` — 增加扩展字段

---

## Phase 4: 排班与考勤引擎 (2 周)

### 任务 4.1：班次规则定义

**文件**：
- 创建：`database/sql/hr_shift.sql`
- 创建：`src/app/api/hr/shifts/route.ts`
- 创建：`src/app/[locale]/hr/shifts/page.tsx`

```sql
CREATE TABLE hr_shift (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shift_name VARCHAR(50), -- 早班/中班/夜班
  start_time VARCHAR(5),  -- 08:00
  end_time VARCHAR(5),    -- 17:00
  allow_overtime TINYINT DEFAULT 1,
  overtime_rate DECIMAL(3,1) DEFAULT 1.5,
  night_allowance DECIMAL(10,2) -- 夜班津贴
);
```

### 任务 4.2：智能排班

**文件**：
- 创建：`database/sql/hr_schedule.sql`
- 创建：`src/app/api/hr/schedules/route.ts`
- 创建：`src/app/api/hr/schedules/auto-generate/route.ts` — 按生产计划自动排班
- 创建：`src/app/[locale]/hr/schedules/page.tsx`
- 创建：`src/components/hr/ScheduleCalendar.tsx` — 日历视图组件

### 任务 4.3：考勤异常识别

**文件**：
- 创建：`src/app/api/hr/attendance-exceptions/route.ts`
- 创建：`src/app/api/hr/attendance-exceptions/detect/route.ts` — 自动检测异常
- 修改：`src/app/api/hr/attendance/route.ts` — 打卡时自动检测异常
- 修改：`src/app/[locale]/hr/attendance/page.tsx` — 异常标记与处理 UI

### 任务 4.4：MES 工时同步接口

**文件**：
- 创建：`src/app/api/hr/mes-sync/work-hours/route.ts` — 接收 MES 推送的工时数据
- 创建：`src/lib/hr/mes-sync.ts` — MES 同步服务

```typescript
// MES 工时同步数据格式
interface MesWorkHoursSync {
  employeeNo: string;
  workDate: string;
  processCode: string;
  startTime: string;
  endTime: string;
  quantity: number;
  defectiveQty: number;
  machineId: string;
}
```

---

## Phase 5: 薪资计算引擎 (3-4 周) ⭐ 核心

### 任务 5.1：计件工资模块

**文件**：
- 创建：`src/app/api/hr/salary/piece-rate/route.ts` — 工序单价 CRUD
- 创建：`src/app/api/hr/salary/piece-work/route.ts` — 计件产量录入
- 创建：`src/app/api/hr/salary/calculate-piece/route.ts` — 计件工资计算
- 创建：`src/app/[locale]/hr/salary/piece-rate/page.tsx` — 单价管理页面
- 创建：`src/app/[locale]/hr/salary/piece-work/page.tsx` — 产量录入页面

**计算逻辑**（`calculate-piece/route.ts`）：

```typescript
async function calculatePieceSalary(employeeId: number, month: string) {
  // 1. 查询当月计件产量明细
  const details = await db.select().from(hrPieceWorkDetail)
    .where(and(
      eq(hrPieceWorkDetail.employeeId, employeeId),
      like(hrPieceWorkDetail.workDate, `${month}-%`)
    ));

  // 2. 按工序分组计算
  let totalPieceSalary = 0;
  for (const detail of details) {
    const qualifiedRate = detail.quantity > 0
      ? (detail.quantity - detail.defectiveQuantity) / detail.quantity
      : 0;
    const pieceAmount = detail.quantity * Number(detail.unitPrice) * qualifiedRate;
    totalPieceSalary += pieceAmount;
  }

  // 3. 最低工资保障检查
  const minWage = await getLocalMinWage();
  return Math.max(totalPieceSalary, minWage);
}
```

### 任务 5.2：加班工资计算

**文件**：
- 创建：`src/app/api/hr/salary/calculate-overtime/route.ts`
- 创建：`src/lib/hr/overtime-calculator.ts`

```typescript
function calculateOvertimeSalary(
  baseSalary: number,
  attendanceRecords: AttendanceRecord[]
) {
  const hourlyRate = baseSalary / 21.75 / 8;
  let total = 0;

  for (const record of attendanceRecords) {
    switch (record.overtimeType) {
      case 'weekday': // 平时 1.5 倍
        total += record.hours * hourlyRate * 1.5;
        break;
      case 'weekend': // 周末 2 倍
        total += record.hours * hourlyRate * 2;
        break;
      case 'holiday': // 法定 3 倍
        total += record.hours * hourlyRate * 3;
        break;
    }
  }

  // 加班上限校验 (每月不超过 36 小时)
  const totalOvertimeHours = attendanceRecords.reduce((s, r) => s + r.hours, 0);
  if (totalOvertimeHours > 36) {
    throw new Error('加班时长超过法定上限 (36小时/月)');
  }

  return total;
}
```

### 任务 5.3：绩效奖金计算

**文件**：
- 创建：`src/app/api/hr/salary/calculate-performance/route.ts`
- 创建：`src/lib/hr/performance-calculator.ts`
- 创建：`src/app/api/hr/performance/route.ts` — KPI 评分 CRUD
- 创建：`src/app/[locale]/hr/performance/page.tsx` — 绩效评分页面

```typescript
function calculatePerformanceBonus(
  baseAmount: number,
  kpiScore: number,
  qualityRate: number
) {
  // 产量达成率 40%, 质量合格率 30%, 设备稼动率 15%, 5S 15%
  const scoreCoefficient = kpiScore / 100;
  return baseAmount * scoreCoefficient * qualityRate;
}
```

### 任务 5.4：社保公积金计算

**文件**：
- 创建：`src/app/api/hr/salary/calculate-insurance/route.ts`
- 创建：`src/lib/hr/insurance-calculator.ts`

```typescript
function calculateSocialInsurance(base: number) {
  return {
    personal: {
      pension: base * 0.08,    // 养老 8%
      medical: base * 0.02,    // 医疗 2%
      unemployment: base * 0.005, // 失业 0.5%
      total: base * 0.105,
    },
    enterprise: {
      pension: base * 0.16,    // 养老 16%
      medical: base * 0.08,    // 医疗 8%
      unemployment: base * 0.005, // 失业 0.5%
      injury: base * 0.005,    // 工伤 0.5%
      maternity: base * 0.005, // 生育 0.5%
      total: base * 0.255,
    },
  };
}

function calculateHousingFund(base: number, rate: number) {
  return {
    personal: base * rate / 100,
    enterprise: base * rate / 100,
  };
}
```

### 任务 5.5：个税计算（累计预扣法）

**文件**：
- 创建：`src/lib/hr/tax-calculator.ts`

```typescript
// 2026 年个税税率表（年度）
const TAX_BRACKETS = [
  { threshold: 0, rate: 0.03, deduction: 0 },
  { threshold: 36000, rate: 0.1, deduction: 2520 },
  { threshold: 144000, rate: 0.2, deduction: 16920 },
  { threshold: 300000, rate: 0.25, deduction: 31920 },
  { threshold: 420000, rate: 0.3, deduction: 52920 },
  { threshold: 660000, rate: 0.35, deduction: 85920 },
  { threshold: 960000, rate: 0.45, deduction: 181920 },
];

function calculateCumulativeTax(
  cumulativeIncome: number,     // 累计收入
  cumulativeDeduction: number,  // 累计专项附加扣除
  cumulativeBase: number,       // 累计减除费用 (5000 × 月数)
  monthCount: number            // 当前月份
) {
  const taxableIncome = cumulativeIncome - cumulativeBase - cumulativeDeduction;
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (taxableIncome > TAX_BRACKETS[i].threshold) {
      tax = taxableIncome * TAX_BRACKETS[i].rate - TAX_BRACKETS[i].deduction;
      break;
    }
  }

  return Math.max(0, tax);
}
```

### 任务 5.6：薪资计算主引擎

**文件**：
- 创建：`src/app/api/hr/salary/calculate/route.ts` — 总计算入口
- 创建：`src/lib/hr/salary-engine.ts` — 计算引擎协调器

```typescript
// 薪资计算引擎主入口
async function calculateMonthlySalary(
  employeeId: number,
  month: string,
  options: {
    includeOvertime?: boolean;
    includePerformance?: boolean;
    includeInsurance?: boolean;
    includeTax?: boolean;
  } = {}
) {
  // 1. 获取员工薪资档案
  const profile = await getSalaryProfile(employeeId);

  // 2. 并行计算各子项
  const [pieceSalary, overtimeSalary, performanceBonus, allowances] = await Promise.all([
    options.includeOvertime !== false ? calculatePieceSalary(employeeId, month) : 0,
    options.includeOvertime !== false ? calculateOvertimeSalary(profile.baseSalary, month) : 0,
    options.includePerformance !== false ? calculatePerformanceBonus(employeeId, month) : 0,
    calculateAllowances(employeeId, month, profile),
  ]);

  // 3. 应发合计
  const grossPay = Number(profile.baseSalary)
    + Number(pieceSalary)
    + Number(overtimeSalary)
    + Number(performanceBonus)
    + Number(allowances);

  // 4. 计算应扣款项
  const [insurance, fund, tax, attendanceDeduction] = await Promise.all([
    options.includeInsurance !== false
      ? calculateSocialInsurance(profile.socialInsuranceBase)
      : { personal: { total: 0 } },
    options.includeInsurance !== false
      ? calculateHousingFund(profile.socialInsuranceBase, profile.housingFundRate)
      : { personal: 0 },
    options.includeTax !== false && grossPay > 5000
      ? calculateCumulativeTax(employeeId, month, grossPay)
      : 0,
    calculateAttendanceDeduction(employeeId, month),
  ]);

  const totalDeduction = insurance.personal.total
    + Number(fund.personal)
    + Number(tax)
    + Number(attendanceDeduction);

  // 5. 实发工资
  const netPay = grossPay - totalDeduction;

  // 6. 保存计算结果
  return saveCalculation(employeeId, month, {
    grossPay, totalDeduction, netPay,
    pieceSalary, overtimeSalary, performanceBonus, allowances,
    socialInsurance: insurance.personal.total,
    housingFund: fund.personal,
    individualTax: tax,
    attendanceDeduction,
  });
}
```

### 任务 5.7：薪资计算前端

**文件**：
- 创建：`src/app/[locale]/hr/salary/calculate/page.tsx` — 计算页面
- 创建：`src/components/hr/SalaryCalculationWizard.tsx` — 分步计算向导
- 创建：`src/components/hr/SalaryDetailTable.tsx` — 详细工资表明细
- 创建：`src/components/hr/SalaryBatchActions.tsx` — 批量确认/发放
- 修改：`src/app/[locale]/hr/salary/page.tsx` — 集成新计算引擎

### 任务 5.8：银行报盘与工资条

**文件**：
- 创建：`src/app/api/hr/salary/bank-report/route.ts` — 生成银行代发文件
- 创建：`src/app/api/hr/salary/payslips/route.ts` — 电子工资条
- 创建：`src/app/[locale]/hr/salary/bank-report/page.tsx`
- 创建：`src/app/[locale]/hr/salary/payslips/page.tsx`
- 创建：`src/components/hr/PayslipCard.tsx` — 工资条展示组件

---

## Phase 6: 培训与技能认证 (1 周)

### 任务 6.1：技能矩阵

**文件**：
- 创建：`database/sql/hr_skill_matrix.sql`
- 创建：`src/app/api/hr/skills/route.ts`
- 创建：`src/app/[locale]/hr/skills/page.tsx`
- 创建：`src/components/hr/SkillMatrixGrid.tsx` — 四维矩阵（岗位×技能×等级×认证）

### 任务 6.2：证书有效期预警

**文件**：
- 创建：`src/app/api/hr/certificates/expiring/route.ts` — 即将到期证书列表
- 修改：`src/app/[locale]/hr/employee/page.tsx` — 增加证书过期预警标记

### 任务 6.3：培训效果评估

**文件**：
- 修改：`src/app/api/hr/training/route.ts` — 增加效果评估字段
- 修改：`src/app/[locale]/hr/training/page.tsx` — 增加评分/合格率统计
- 修改：`src/app/[locale]/hr/employee/components/dialogs/EmployeeFormDialog.tsx` — 技能关联

---

## Phase 7: HR 分析报表 (1 周)

### 任务 7.1：人力成本分析

**文件**：
- 创建：`src/app/api/hr/reports/labor-cost/route.ts`
- 创建：`src/app/[locale]/hr/reports/labor-cost/page.tsx`
- 创建：`src/components/hr/charts/LaborCostChart.tsx` — Recharts 堆叠柱状图

```typescript
// 人力成本分析维度
interface LaborCostReport {
  totalCost: number;
  byDepartment: { deptName: string; cost: number; headcount: number }[];
  byType: { type: string; amount: number; percentage: number }[];
  trend: { month: string; cost: number; headcount: number }[];
  kpi: {
    avgCostPerHead: number;
    costRatio: number; // 人力成本占总成本比例
    productivity: number; // 人均产值
  };
}
```

### 任务 7.2：薪资结构分析

**文件**：
- 创建：`src/app/api/hr/reports/salary-structure/route.ts`
- 创建：`src/app/[locale]/hr/reports/salary-structure/page.tsx`
- 创建：`src/components/hr/charts/SalaryStructureChart.tsx` — 饼图/环形图

### 任务 7.3：离职率与人员流动

**文件**：
- 创建：`src/app/api/hr/reports/turnover/route.ts`
- 创建：`src/app/[locale]/hr/reports/turnover/page.tsx`

---

## Phase 8: 集成与部署 (1 周)

### 任务 8.1：MES 产量数据对接

**文件**：
- 创建：`src/app/api/hr/mes-sync/piece-work/route.ts` — MES 推送计件产量
- 创建：`src/lib/hr/piece-work-sync.ts`

### 任务 8.2：质量系统对接

**文件**：
- 创建：`src/app/api/hr/quality-sync/defect-rate/route.ts` — 获取员工次品率
- 修改：`src/lib/hr/performance-calculator.ts` — 质量系数挂钩

### 任务 8.3：财务系统对接

**文件**：
- 创建：`src/app/api/hr/finance-sync/salary-transfer/route.ts` — 工资发放凭证
- 创建：`src/app/api/hr/finance-sync/insurance/route.ts` — 社保缴纳凭证

### 任务 8.4：数据库迁移与 CI

**文件**：
- 修改：`package.json` — 添加 `db:push:hr` 脚本
- 创建：`database/sql/hr_all_tables.sql` — 全量 DDL 汇总
- 创建：`database/sql/hr_all_seed.sql` — 种子数据（示例员工、岗位、单价）

### 任务 8.5：菜单注册

**文件**：
- 创建：`database/sql/hr_menu_registration.sql`

```sql
-- HR 模块完整菜单结构
INSERT INTO sys_menu (name, permission, path, parent_id, sort_order) VALUES
('HR管理', 'hr:manage', '/hr', NULL, 40),
('├ 员工管理', 'hr:employee', '/hr/employee', LAST_INSERT_ID(), 1),
('├ 组织架构', 'hr:organization', '/hr/organization', @hr_id, 2),
('├ 班次管理', 'hr:shift', '/hr/shifts', @hr_id, 3),
('├ 排班管理', 'hr:schedule', '/hr/schedules', @hr_id, 4),
('├ 考勤管理', 'hr:attendance', '/hr/attendance', @hr_id, 5),
('├ 工序单价', 'hr:piece-rate', '/hr/salary/piece-rate', @hr_id, 6),
('├ 计件产量', 'hr:piece-work', '/hr/salary/piece-work', @hr_id, 7),
('├ 薪资计算', 'hr:salary-calc', '/hr/salary/calculate', @hr_id, 8),
('├ 薪资管理', 'hr:salary', '/hr/salary', @hr_id, 9),
('├ 银行报盘', 'hr:bank-report', '/hr/salary/bank-report', @hr_id, 10),
('├ 工资条', 'hr:payslip', '/hr/salary/payslips', @hr_id, 11),
('├ 绩效评分', 'hr:performance', '/hr/performance', @hr_id, 12),
('├ 培训管理', 'hr:training', '/hr/training', @hr_id, 13),
('├ 技能认证', 'hr:skill', '/hr/skills', @hr_id, 14),
('├ 人力报表', 'hr:report', '/hr/reports', @hr_id, 15);
```

---

## 实施顺序建议

```
Phase 1 (DB+ORM) ──→ Phase 2 (组织架构) ──→ Phase 3 (员工档案)
                                                    │
                                                    ↓
Phase 4 (排班考勤) ──→ Phase 5 (薪资引擎) ←── 依赖 Phase 3 薪资档案
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           ↓                        ↓                        ↓
                   Phase 6 (培训认证)      Phase 7 (分析报表)      Phase 8 (集成部署)
```

**关键依赖路径**：
- Phase 5 薪资引擎需要 Phase 1 (DB) + Phase 3 (员工薪资档案) + Phase 4 (考勤/排班)
- Phase 7 报表依赖 Phase 5 (薪资数据) + Phase 6 (培训数据)
- Phase 8 集成本质上是"胶水代码"，可在各阶段并行

---

## 文件变更总清单

| 类型 | 数量 | 说明 |
|------|------|------|
| 创建 Drizzle Schema | 12 表 | 6 张新表 + 6 张现有表迁移 |
| 创建 API 路由 | ~25 个 | 涵盖所有新功能端点 |
| 创建前端页面 | ~20 个 | 新功能页面 + 组件 |
| 修改前端页面 | ~8 个 | 现有页面集成升级 |
| 创建工具库 | ~8 个 | 计算/同步/校验 |
| 创建 SQL 脚本 | ~15 个 | DDL + 种子 + 菜单 |
| 修改 i18n | 4 文件 | 新增命名空间翻译 |
| **总计** | **~80 个文件** | |
