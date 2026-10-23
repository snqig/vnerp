# 测试工程师 Playbook（前端硬编码治理 + 前后端数据对齐）

> 来源：2026-10-20 前端硬编码 / Mock 残留第一轮排查沉淀。
> 用途：① 作为长期驻场「测试工程师」角色的工作指令；② 记录已核实问题与标准校验 SQL。
> 配套脚本：`scripts/check-hardcode.mjs`（`pnpm check:hardcode`）。

## 一、长期驻场提示词（可直接粘贴为自定义指令 / Expert 人设）

```markdown
# 角色：vnERPNext 测试工程师（长期驻场）

你是 vnERPNext（Next.js App Router + Drizzle ORM + MySQL 8.0 + next-intl 四语）的资深测试工程师，
兼具前端与 MySQL DBA 视角。长期职责：保证「数据库 DB == 后端接口 API == 前端页面 UI」三层一致，
持续治理前端硬编码 / Mock 残留 / 契约漂移。

## 固定任务范围
1. 前端硬编码排查：mock 兜底、写死业务 ID/金额/状态文案、中文测试数据、dev seed 路由生产可达。
2. 前后端对齐验证：字段名（camelCase↔snake_case）、类型（Long ID / DECIMAL→string / 时间 / 枚举）、
   状态字典一致性、金额计算归属（一律后端）、分页参数、时区。
3. MySQL 校验 SQL：可直接执行的对齐/脏数据/孤儿数据/金额异常检查。
4. 输出结构化报告：按 P0/P1/P2 分组 + 文件:行号 + 证据 + keep/modify/delete 建议。

## 工作原则（必须遵守）
- verify-before-act：结论以运行时证据为准（HTTP 状态码 / SQL 实测 / 抓包）；静态读码只作线索，
  先复现路径再定性，未实测不下「已损坏」结论。
- 允许 vs 禁止：UI 静态文案（须走 i18n）、表单默认值、dev-only mock 允许；
  前端计算核心业务数据（金额/库存/折扣）、生产 mock 兜底、写死业务 ID 禁止。
- 信息不足时：先给可执行排查方案 + 标准 SQL 模板 + 待补充清单；资料齐后立即给精确 SQL 与改造代码。
- 简体中文 + 结构化 markdown，术语中英混排。

## 项目事实源（不要重新发明）
- 响应统一 successResponse(data)，列表在 data.list / data.records / data.items；
  请求走 authFetch（CSRF），中间件 withPermission / withAuthAndErrorHandler。
- withPermission 是 fail-closed：路由未在 ROUTE_PERMISSIONS / ROUTE_PERMISSIONS_EXTRA 登记即 403；
  子路径经最长前缀继承父级权限（如 /api/hr/salary/payslip 继承 /api/hr/salary 的 HR_SALARY）。
- mysql2 的 DECIMAL 返回 string：接口层应 Number() 强转，前端禁止直接运算；金额合计以后端为准。
- 软删除默认过滤；工单号 uk_work_order_no 唯一、删后不复用。
- eslint 已有 i18n/no-chinese-hardcode——只管 UI 文案，不管数据值里的中文（需靠本 playbook 巡检）。

## 输出格式（每次固定四段）
1. 结论摘要（按 P0/P1/P2 计数） 2. 问题明细表（分组|文件:行号|现象|证据|严重度|动作）
3. 立即可执行的 SQL/脚本 4. 下一步待办
```

## 二、已核实问题清单（2026-10-20 第一轮，均已修复）

| 文件 | 问题（修复前） | 处置 |
|------|----------------|------|
| `src/app/[locale]/hr/salary/payslips/page.tsx` | mockPayslip 兜底：接口 404/异常时渲染「张三」完整假工资条且可打印；month 选择器未传参（旧接口恒返回最新月） | 删除 mock；改用 `/api/hr/salary/payslip?employeeId=&month=`（字段契约一致、路由层 Number() 强转）；失败走 toast + 空态 |
| `src/app/[locale]/hr/salary/bank-report/page.tsx` | 调 `/api/hr/salary/calculate?status=&month=`（GET 只认 employeeId）恒 400 → 恒展示 mockBankData 6 条假代发数据；netPay 无 Number() 强转（DECIMAL→string）；bankCardNo 无数据源；status 过滤无后端支持 | 删除 mock 与 status 过滤；改用 `/api/hr/salary?month=&pageSize=500`；Number() 强转；CSV 单元格加引号转义；后端补 `SELECT e.bank_account` |
| `src/app/[locale]/settings/organization/page.tsx` | loadMockCompany/loadMockRoles 兜底；saveCompany 可把假公司 PUT 写回后端（脏写） | 删除两个 mock 函数及全部调用点，改 toast + 空态；假角色 id 同域脏写风险一并消除 |
| `src/app/api/hr/salary/route.ts` | 列表接口未选 bank_account，银行报表缺卡号列 | SELECT 补 `e.bank_account`（列已存在，2026-09-27 迁移补建） |
| `src/app/[locale]/hr/schedules/page.tsx` | 班次下拉用 mockShifts 硬编码 id 1/2/3（与库中 hr_shift 不对应），shiftName 存的是 i18n key | 删除 mock；新增 `fetchShifts()` 走 `/api/hr/shifts?pageSize=100`，下拉渲染真实班次名 |
| `src/components/quality/QualityProcessPage.tsx` | 「查看检验记录」弹窗恒显 3 条 mockInspectRecords 假记录（QI2024…） | 删除 mock；`handleViewRecords` 改走 `/api/quality/process?cardId=`（该分支本就是为弹窗提供），inspection_result 1/2/3 → 合格/不合格/让步接收 |
| `src/lib/db/index.ts` | `mockConnection` 命名触发巡检规则（实为 isDemoMode() 守卫下的演示桩，合法） | 更名 `demoConnection` 语义更准确，非行为变更 |

遗留关联项（未在本次范围）：
- mock 公司/角色曾使用的 `Common.k_*` i18n key 已无引用 → **dead-key 清理必须安排在删 mock 之后**，顺序反了会误删。
- `src/app/api/init/*` 为开发期种子路由（巡检脚本默认跳过），需确认生产环境可达性。
- `warehouse-category/stats` 的「使用率」列假数据问题（代码注释已自记载）。

## 三、标准 MySQL 校验 SQL（表名列名均已从代码核实）

```sql
-- 1) 工资条净额一致性：net_pay 应 = gross_pay - total_deduction
SELECT id, employee_id, calc_month, gross_pay, total_deduction, net_pay,
       net_pay - (gross_pay - total_deduction) AS diff
FROM hr_salary_calculation
WHERE ABS(net_pay - (gross_pay - total_deduction)) > 0.01;

-- 2) sys_salary 与 hr_salary_calculation 双表对齐（actual_salary vs net_pay）
SELECT s.employee_id, s.month, s.actual_salary, c.net_pay
FROM sys_salary s
LEFT JOIN hr_salary_calculation c
  ON c.employee_id = s.employee_id AND c.calc_month = s.month
WHERE c.id IS NULL OR ABS(s.actual_salary - c.net_pay) > 0.01;

-- 3) 银行代发前置检查：在职员工缺银行账号
SELECT id, employee_no, name, bank_account
FROM sys_employee
WHERE status = 1 AND deleted = 0 AND (bank_account IS NULL OR bank_account = '');
```

## 四、巡检脚本

```bash
pnpm check:hardcode            # 全量扫描 src，发现违规退出码 1（可接 CI / pre-commit）
pnpm check:hardcode -- --warn-only   # 只告警不阻断
```

检测规则：mock 变量声明 / `setXxx(mock...)` 兜底 / mock 模块 import / 中文测试花名册（张三/李四/王五/赵六/孙七/周八）。
跳过规则：测试文件（`*.test.*`、`*.spec.*`、`__tests__/`、`src/test/`）与开发期种子路由 `src/app/api/init/`。

接入卡点（待确认后执行）：

```bash
# pre-commit（.husky/pre-commit 末尾追加）
node scripts/check-hardcode.mjs
```

## 五、判定标准：允许 vs 禁止

| 模式 | 判定 | 说明 |
|------|------|------|
| UI 静态文案 | 允许（须走 i18n/字典） | eslint `i18n/no-chinese-hardcode` 已卡 |
| 表单默认值 | 允许 | 默认月份、分页大小 |
| 接口字段兜底 | 允许（需日志） | `res.name \|\| '-'` |
| dev-only mock | 仅开发环境 | 生产构建禁止残留 |
| 前端计算金额/库存/折扣 | 禁止 | 核心业务数据以后端为准 |
| 写死业务 ID / 生产 mock 兜底 | 禁止 | 环境变更即错；假数据可被写回 |
