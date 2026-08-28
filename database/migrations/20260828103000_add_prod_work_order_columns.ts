/**
 * 修复 prod_work_order 表 / 仓储层（MysqlWorkOrderRepository）schema 不一致（#product_id 等）
 *
 * 背景（2026-08-28 实测 live 库 vnerpdacahng）：
 *   - prod_work_order 真实表列：id, work_order_no, order_id, order_no, bom_id,
 *     customer_name, product_name, order_type, quantity, unit, status, priority,
 *     plan_start_date, plan_end_date, actual_start_date, actual_end_date, remark,
 *     create_by, create_time, update_by, update_time, deleted, picked_qty,
 *     finished_qty, returned_qty, total_material_cost, total_labor_cost,
 *     total_tool_cost, total_overhead_cost, unit_cost, approved_at, approved_by,
 *     cancelled_at, cancelled_by, cancelled_reason
 *   - 但领域层（WorkOrder 聚合）与仓储层（MysqlWorkOrderRepository）按另一套 schema 设计，
 *     期望 prod_work_order 含：product_id, product_code, planned_qty, completed_qty,
 *     process_id, process_name, warehouse_id。
 *   - 结果：MysqlWorkOrderRepository.save() / mapToProps() / findByStatus(product_id 过滤)
 *     引用的 7 个列在 live 表上【根本不存在】，save() 一旦被调用即报
 *     ER_BAD_FIELD_ERROR (1054) Unknown column；findByStatus 带 productId 过滤同样报错。
 *   - 线上实际写路径 /api/workorders/route.ts、SampleProcessCardService 走的是「现有列」写入，
 *     因此生产未炸，但 DDD 仓储层（ProductionApplicationService.createWorkOrder 经此）是悬空坏代码。
 *
 * 本迁移补齐这 7 个列，使仓储层与表结构一致（即修复 product_id 不一致的根因）。
 *
 * 设计要点：
 *   - 仅 ADD COLUMN，不做破坏性变更；列均有默认值，现有写入（route.ts 等不写这些列）不受影响。
 *   - 不建外键：product_id 仅作可选关联（mdm_product.id），现有工单该列默认 0，
 *     建 FK 会反噬 route 创建的 product_id=0 工单，故保持普通列。
 *   - 幂等：逐列探测 INFORMATION_SCHEMA.COLUMNS，仅缺才 ADD。
 *   - 反向迁移 (down)：逐列 DROP（逆序），不影响数据。
 */
import { Connection } from 'mysql2/promise';

interface ColSpec {
  name: string;
  ddl: string;
}

const COLUMNS: ColSpec[] = [
  {
    name: 'product_id',
    ddl: "ADD COLUMN product_id INT NOT NULL DEFAULT 0 COMMENT '产品ID(mdm_product.id)，工单关联产品，可选'",
  },
  {
    name: 'product_code',
    ddl: "ADD COLUMN product_code VARCHAR(64) NOT NULL DEFAULT '' COMMENT '产品编码'",
  },
  {
    name: 'planned_qty',
    ddl: "ADD COLUMN planned_qty DECIMAL(18,3) NOT NULL DEFAULT 0 COMMENT '计划数量'",
  },
  {
    name: 'completed_qty',
    ddl: "ADD COLUMN completed_qty DECIMAL(18,3) NOT NULL DEFAULT 0 COMMENT '已完成数量'",
  },
  {
    name: 'process_id',
    ddl: 'ADD COLUMN process_id INT NULL COMMENT \'工艺路线ID\'',
  },
  {
    name: 'process_name',
    ddl: "ADD COLUMN process_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '工艺路线名称'",
  },
  {
    name: 'warehouse_id',
    ddl: "ADD COLUMN warehouse_id INT NOT NULL DEFAULT 1 COMMENT '仓库ID'",
  },
];

async function columnExists(conn: Connection, name: string): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'prod_work_order'
       AND COLUMN_NAME = ?`,
    [name]
  );
  const result = rows as Array<{ c: number }>;
  return result[0]?.c > 0;
}

export async function up(conn: Connection): Promise<void> {
  for (const col of COLUMNS) {
    if (!(await columnExists(conn, col.name))) {
      await conn.execute(`ALTER TABLE prod_work_order ${col.ddl}`);
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  for (const col of [...COLUMNS].reverse()) {
    if (await columnExists(conn, col.name)) {
      await conn.execute(`ALTER TABLE prod_work_order DROP COLUMN ${col.name}`);
    }
  }
}
