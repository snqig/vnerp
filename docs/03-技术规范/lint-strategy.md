# ESLint 存量债务治理策略

> 生成日期：2026-08-10 ｜ 审计项 P2-E（原 #19）

## 现状（实测，非旧文档的 4708）

对 `src/`（1173 个文件）做类型感知全量 lint，结果：

| 指标 | 数值 |
| --- | --- |
| 错误（severity 2） | **0** |
| 警告（severity 1） | **22,323** |
| 有问题的文件 | 704 / 1173 |

**警告构成（Top）：**

| 规则 | 数量 | 说明 |
| --- | --- | --- |
| `@typescript-eslint/no-unsafe-*` | ~16,914 | 源于 `type Loose = any` 别名（审计 P1-#18），系统性债务 |
| `i18n/no-chinese-hardcode` | 4,125 | 硬编码中文（审计 P2-F） |
| `react-hooks/set-state-in-effect` | 173 | 历史 useEffect+fetch 模式 |
| `react-hooks/exhaustive-deps` | 116 | hook 依赖 |
| `@typescript-eslint/no-explicit-any` | 75 | 显式 any |

> 注：审计文档里的「4708 errors」来自**旧配置快照**（`no-unused-vars` 当时为 error 级）。当前配置已把绝大多数规则降为 `warn`，实测错误级仅 1 处（且已修复，见下），故实际“错误”近乎为 0。

## 核心问题

- 存量警告 2.2 万条，**一次性清零不现实**且收益低（多为 `Loose=any` 衍生）。
- 但放任不管会导致“新代码悄悄加债”无人察觉。
- 旧 `eslint_errors.json` 文件内容损坏（仅 1 行 `}`），不可用。

## 治理策略：债务冻结 + 增量守门

原则：**存量债务冻结在基线，禁止新增或恶化；新文件不引入 error 级债务。**

### 1. 基线（Baseline）

`eslint-baseline.json`（eslint `--format json` 全量快照，含每个文件的 error/warning 数）。

- 重新生成：`pnpm lint:baseline`
- 该文件是 CI 守门的“冻结线”，**应提交进版本库**。

### 2. 守门（Gate）

`scripts/lint-gate.mjs`（git 无关，适用于本仓库无 HEAD 的损坏状态）：

- 比对当前 lint 结果与 `eslint-baseline.json`：
  - 已存在文件：error/warning 数 **不得超过** 基线（只能修、不能恶化）
  - 新增文件：**不允许 error 级债务**（warning 允许但计入）
  - 已删除文件：视为改善，忽略
- 用法：
  - `pnpm lint:gate` —— 全量 lint 并比对（CI 默认）
  - `node scripts/lint-gate.mjs --files a.ts b.tsx` —— 仅检查指定文件（pre-commit / 改动集）
- 退出码：0 通过；1 发现回归；2 基线缺失。

### 3. CI 集成建议

```yaml
# 伪代码
lint:
  - run: pnpm lint:gate      # 冻结线守门（推荐主门）
  # 或仅拦错误：eslint src/ 本身在 error>0 时退出非 0，可直接作为硬门
```

当前 `eslint src/` 在 error 级为 0 时退出码 0，因此也可直接把 `pnpm lint` 当作“零错误硬门”；`lint:gate` 进一步防止警告恶化。

### 4. 债务消化路线（可选，按收益排序）

1. **`Loose = any` 治理（P1-#18）**：逐步把高频 `Loose` 替换为具体类型，可一次性消灭 ~1.7 万条 `no-unsafe-*`。这是 ROI 最高的单项。
2. **i18n 提取（P2-F）**：配合翻译提取流水线，逐步消除 `no-chinese-hardcode`。
3. **react-hooks 规则**：随 React Compiler 迁移自然下降。

## 本次改动

- `eslint.config.mjs`：`globalIgnores` 增加 `**/*.d.ts`（声明文件无执行逻辑，类型感知 parser 无法映射 tsconfig project，原 `dialog.d.ts` 因此产生唯一 1 个 error；忽略后错误级归零）。
- `scripts/lint-gate.mjs`：新增增量守门脚本。
- `package.json`：新增 `lint:baseline`、`lint:gate` 脚本。
- `eslint-baseline.json`：重新生成（0 error / 22,323 warning）。
- `eslint_errors.json`：由损坏的 `}` 修复为合法 JSON（当前 0 条 error）。
