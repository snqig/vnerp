FIFO 引擎统一重构 - 任务清单（TODO）

目标：将分散在 4 个模块中的 FIFO 逻辑收敛为一个统一引擎，实现 Plan 与 Execute 分离、唯一扣账入口、统一排序策略。

总工期：建议分 4 阶段，每阶段可独立上线，总约 8~12 人日。

优先级：Phase 0（数据对齐）+ Phase 1（引擎统一）为必做止血项，其余可迭代。

Phase 0：数据对齐（必须最先完成）

0.1 数据库字段一致性校验

□ 0.1.1 编写 SQL 校验脚本，扫描 inv_inventory_batch 表中 available_qty 与 remaining_quantity 不一致的记录（含 NULL）。

□ 0.1.2 设计回填策略：若 available_qty 为 NULL 或 0 且 remaining_quantity > 0，则用 remaining_quantity 填充；若反向不一致，以 available_qty 为准并记录警告。

□ 0.1.3 执行回填前备份相关表，并编写回滚脚本。

□ 0.1.4 添加数据库 CHECK 约束（或触发器）确保 available_qty >= 0 且 remaining_quantity 与 available_qty 同步（过渡期）。

□ 0.1.5 在 Drizzle schema 中为 remaining_quantity 添加 @deprecated 注释，并标记后续迁移计划。

0.2 拆分/新建批次逻辑修正

□ 0.2.1 检查 splitMaterial 函数（warehouse-core），确保新建小料/余料批次时 必须写入 available_qty，不再仅写 remaining_quantity。

□ 0.2.2 审查所有通过 SQL 直接插入批次的脚本（如数据迁移工具），统一使用 available_qty。

□ 0.2.3 修改 adjustInventory 中涉及批次数量更新的部分，使其同时维护 available_qty（直至废弃）。

0.3 灰度验证

□ 0.3.1 在测试环境运行校验脚本，确认无异常记录。

□ 0.3.2 编写单元测试，验证新建批次时两个字段一致。

□ 0.3.3 上线 Phase 0 至预发布环境，观察 1 天无报警。

Phase 1：扩展 fifo-allocation.ts 为唯一引擎

1.1 统一排序策略（核心）

□ 1.1.1 定义 FIFO_POLICY 常量，包含排序规则：

sql

ORDER BY

  CASE WHEN split_flag = 2 THEN 0 ELSE 1 END ASC,

  CASE WHEN opened_at IS NOT NULL THEN 0 ELSE 1 END ASC,

  expire_date ASC,

  inbound_date ASC,

  id ASC

□ 1.1.2 修改 allocateFIFO 中的查询，使用上述排序规则，移除原有各模块独立的排序代码。

□ 1.1.3 在 buildBatchQuery 中加入过滤条件：deleted=0, status='正常', available_qty>0，并排除 quarantine、pending、frozen 状态，但保留 allowExpired 开关。

□ 1.1.4 确保查询返回字段包含：split_flag, opened_at, qr_code, location, version（乐观锁所需）。

1.2 新增 planFIFOAllocation 纯计算函数

□ 1.2.1 创建 FIFOPlanOptions 接口（含 allowExpired, excludeBatchIds, respectFifoEnabled, policy）。

□ 1.2.2 实现 planFIFOAllocation，内部调用 buildBatchQuery 获取批次列表，但不加 FOR UPDATE，仅做只读计算。

□ 1.2.3 重构现有 allocateFIFO，将其改为调用 planFIFOAllocation 获取分配计划，然后在事务内加锁执行扣减（复用 executeFIFODeductionWithRetry）。

□ 1.2.4 在 planFIFOAllocation 中处理 fifo_enabled=false 的统一回退逻辑（返回所有可用批次，不再额外排序）。

1.3 适配旧模块的返回形状

□ 1.3.1 实现 toLegacyBatchAllocation 适配函数，将新引擎返回的 FIFOAllocationResult 转换为 warehouse-core 期望的旧格式（过渡期使用）。

□ 1.3.2 更新 fifo-allocation.test.ts，添加 split_flag 和 opened_at 排序用例，确保测试全绿。

1.4 删除 outbound/fifo/route.ts 内联副本

□ 1.4.1 移除该文件中的独立 FIFO 查询和扣减逻辑，改为导入 allocateFIFO 和 executeFIFODeductionWithRetry。

□ 1.4.2 检查该接口的请求/响应格式，确保与新引擎返回一致，调整参数映射。

1.5 更新 fifo-recommend/route.ts

□ 1.5.1 修改批次列表获取逻辑，调用 planFIFOAllocation（只读），不再自建查询。

□ 1.5.2 保留 UI 评分（Pantone、包装量、工单匹配）作为 overlay，不改变底层顺序。

□ 1.5.3 若存在 override 审批，记录审批日志但底层仍然使用 planFIFOAllocation 的批次清单。

1.6 集成测试与验收

□ 1.6.1 编写集成测试：同物料多批次（含余料、已开封、临期），验证排序结果符合新策略。

□ 1.6.2 测试并发场景下乐观锁生效（多个请求同时扣减同一批次）。

□ 1.6.3 验证 planFIFOAllocation 与 allocateFIFO 的返回结果一致（除了锁状态）。

Phase 2：warehouse-core 变薄，只保留业务规则

2.1 删除 warehouse-core 中的 FIFO 核心逻辑

□ 2.1.1 移除 allocateFIFO 函数及其内部实现（查询、排序、计算）。

□ 2.1.2 移除 allocateFromBatches 及相关的批次选择算法。

□ 2.1.3 删除 enforceFIFO 中自建的查询逻辑，改为调用 planFIFOAllocation。

2.2 新增薄封装函数

□ 2.2.1 实现 recommendFIFO(materialId, qty, warehouseId?)，内部调用 planFIFOAllocation，并处理 fifo_enabled 旧 fallback。

□ 2.2.2 实现 enforceFIFO(materialId, batchNo, warehouseId?)，使用 planFIFOAllocation 获取推荐批次，保留原有校验逻辑（如是否匹配 batchNo）。

□ 2.2.3 保留 checkWholeMaterial、splitMaterial、logFIFOOverride、queryExpiringMaterials 等正交功能，不做修改。

2.3 修改调用方

□ 2.3.1 在 material-requisition.ts 中，将 allocateFIFO 调用替换为 recommendFIFO 或直接使用 planFIFOAllocation。

□ 2.3.2 更新 queryMaterialBatches 排序逻辑，使其与引擎策略一致（可复用 FIFO_POLICY）。

□ 2.3.3 检查其他间接调用 warehouse-core.allocateFIFO 的地方，逐一替换。

2.4 测试迁移

□ 2.4.1 将 warehouse-core.test.ts 中关于 FIFO 排序的用例迁移到 fifo-allocation.test.ts。

□ 2.4.2 修改 warehouse-core 的测试，改为 mock planFIFOAllocation 返回值，仅测试业务规则逻辑。

□ 2.4.3 确保所有单元测试通过，覆盖率不下降。

Phase 3：统一扣账路径（消除 adjustInventory 直接扣批次）

3.1 改造领料发料流程

□ 3.1.1 在 material-requisition.ts 发料段，移除直接调用 adjustInventory 扣减批次的代码。

□ 3.1.2 改为调用 executeFIFODeductionWithRetry，若物料指定了具体批次号则调用 executeSpecifiedBatchDeduction。

□ 3.1.3 确保事务内同时记录流水（inventory_transaction）并更新 version 乐观锁。

3.2 改造 FIFO 出库 API（outbound/fifo/route.ts）

□ 3.2.1 删除该接口内联的 UPDATE 扣减逻辑，统一使用 executeFIFODeductionWithRetry。

□ 3.2.2 调整请求参数，使其适配引擎所需字段（如 sourceType, sourceNo）。

3.3 明确 adjustInventory 的保留范围

□ 3.3.1 在代码中注释 adjustInventory 仅用于 非 FIFO 场景（盘点调整、简单入出库）。

□ 3.3.2 增加静态检查或运行时断言，禁止生产领料、销售出库等流程调用 adjustInventory 扣批次。

3.4 灰度开关与回滚计划

□ 3.4.1 添加 fifo_unified_deduction 特性开关，允许按租户/物料灰度启用新扣账路径。

□ 3.4.2 编写监控：对比新旧扣账路径的批次选择差异，记录警告日志。

□ 3.4.3 准备回滚脚本：若新路径出现异常，可快速切回旧逻辑（但需确保数据一致）。

3.5 集成测试（关键）

□ 3.5.1 编写端到端测试：创建领料单 → 生成推荐批次 → 确认发料 → 验证实际扣减批次与推荐一致。

□ 3.5.2 并发压测：模拟多个出库单同时扣减同一物料，验证乐观锁冲突及重试机制。

□ 3.5.3 验证库存流水表中 source_type 和 source_no 正确记录。

Phase 4：清理与文档

4.1 废弃 remaining_quantity 字段

□ 4.1.1 编写数据库迁移脚本，将 remaining_quantity 改为 generated column（基于 available_qty）或直接删除。

□ 4.1.2 删除代码中所有对 remaining_quantity 的引用，替换为 available_qty。

□ 4.1.3 更新 ORM 映射，确保不再映射该字段。

4.2 删除过时代码

□ 4.2.1 在 warehouse-core 中为 allocateFIFO 添加 @deprecated，一个版本后删除。

□ 4.2.2 移除 toLegacyBatchAllocation 等过渡适配函数（待所有调用方迁移后）。

□ 4.2.3 清理 outbound/fifo/route.ts 中的冗余代码。

4.3 更新技术文档

□ 4.3.1 修订 docs/02-模块详细设计/26-仓库管理核心原则专项说明.md，删除“两套文件各管一段”的描述。

□ 4.3.2 新增 fifo-engine.md 文档，描述统一引擎的设计、API 和扩展方式。

□ 4.3.3 更新架构图，展示新的调用关系（引擎 → 薄封装）。

4.4 测试合并与持续集成

□ 4.4.1 合并 tests/unit/fifo-allocation.test.ts 和 warehouse-core.test.ts 中 FIFO 相关测试。

□ 4.4.2 在 CI 中增加性能测试，确保新引擎的查询效率不低于旧逻辑（索引检查）。

□ 4.4.3 更新部署检查清单，包含新引擎的数据库索引建议（如 (warehouse_id, material_id, expire_date, inbound_date)）。

额外任务（贯穿各阶段）

监控与告警

□ 增加引擎执行耗时监控，拆分 plan 和 execute 阶段。

□ 记录批次选择日志，便于追溯推荐 vs 实际扣减差异。

□ 设置 available_qty 为负数的告警（应立即介入）。

文档与培训

□ 组织内部技术分享，介绍新引擎设计及迁移影响。

□ 更新 API 文档（Swagger）中 FIFO 相关接口的说明。

□ 编写运维手册，包含故障排查步骤（如乐观锁冲突处理）。

代码质量

□ 引入 ESLint 规则，禁止直接导入已废弃的 FIFO 函数。

□ 使用 TypeScript 严格模式，确保 available_qty 非空。

□ 优化 executeFIFODeductionWithRetry 中的重试退避策略，防止死循环。

里程碑与验收标准

阶段	关键产出	验收标准

Phase 0	数据一致，新建批次正确	校验脚本无差异；拆分批次测试通过

Phase 1	统一引擎上线，内联副本删除	排序策略与设计一致；所有现有测试通过

Phase 2	warehouse-core 薄封装完成	领料推荐仍正常；无直接调用旧函数

Phase 3	统一扣账，领料走新路径	端到端测试通过；灰度期间无异常

Phase 4	清理废弃代码，文档更新	无 deprecated 引用；文档已同步

风险应对措施（如遇阻塞）

数据不一致紧急修复：提供 sync_qty_fields 管理命令，可随时执行。

新引擎性能下降：准备回退至旧逻辑的开关（fifo_engine_fallback
