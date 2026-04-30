import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const results: string[] = [];

  const views = [
    {
      name: 'v_purchase_request_full',
      sql: `
        CREATE OR REPLACE VIEW v_purchase_request_full AS
        SELECT
          pr.id,
          pr.request_no,
          pr.request_date,
          pr.request_type,
          pr.request_dept_id,
          d.dept_name AS request_dept_name,
          pr.requester_id,
          e1.name AS requester_name,
          pr.reviewer_id,
          e2.name AS reviewer_name,
          pr.approver_id,
          e3.name AS approver_name,
          pr.status,
          pr.priority,
          pr.expected_date,
          pr.total_amount,
          pr.currency,
          pr.remark,
          pr.create_time,
          pr.update_time
        FROM pur_request pr
        LEFT JOIN sys_department d ON pr.request_dept_id = d.id
        LEFT JOIN sys_employee e1 ON pr.requester_id = e1.id
        LEFT JOIN sys_employee e2 ON pr.reviewer_id = e2.id
        LEFT JOIN sys_employee e3 ON pr.approver_id = e3.id
        WHERE pr.deleted = 0
      `,
    },
    {
      name: 'v_purchase_order_std_full',
      sql: `
        CREATE OR REPLACE VIEW v_purchase_order_std_full AS
        SELECT
          po.id,
          po.po_code,
          po.request_id,
          pr.request_no,
          po.supplier_id,
          s.supplier_name,
          po.order_date,
          po.delivery_date,
          po.total_amount,
          po.tax_rate,
          po.tax_amount,
          po.grand_total,
          po.status,
          po.currency,
          po.remark,
          po.create_by,
          e.name AS create_by_name,
          po.create_time,
          po.approve_by,
          po.approve_time
        FROM pur_order_std po
        LEFT JOIN pur_request pr ON po.request_id = pr.id
        LEFT JOIN pur_supplier s ON po.supplier_id = s.id
        LEFT JOIN sys_employee e ON po.create_by = e.id
        WHERE po.deleted = 0
      `,
    },
    {
      name: 'v_bom_std_full',
      sql: `
        CREATE OR REPLACE VIEW v_bom_std_full AS
        SELECT
          bh.id AS bom_id,
          bh.bom_code,
          bh.product_id,
          m.material_code AS product_code,
          m.material_name AS product_name,
          bh.version,
          bh.effective_date,
          bh.obsolete_date,
          bh.status,
          bl.id AS line_id,
          bl.line_no,
          bl.material_id,
          bl.material_code,
          bl.material_name,
          bl.consumption_qty,
          bl.waste_rate,
          bl.material_type
        FROM prd_bom_std bh
        LEFT JOIN prd_bom_line_std bl ON bh.id = bl.bom_id AND bl.deleted = 0
        LEFT JOIN inv_material_std m ON bh.product_id = m.id
        WHERE bh.deleted = 0
      `,
    },
    {
      name: 'v_inventory_batch_full',
      sql: `
        CREATE OR REPLACE VIEW v_inventory_batch_full AS
        SELECT
          i.id AS inventory_id,
          i.material_id,
          m.material_code,
          m.material_name,
          m.specification AS material_spec,
          m.unit,
          i.warehouse_id,
          w.warehouse_name,
          i.quantity AS total_qty,
          COALESCE(b.total_available, 0) AS batch_available_qty,
          i.quantity - COALESCE(b.total_available, 0) AS diff_qty
        FROM inv_inventory i
        LEFT JOIN inv_material m ON i.material_id = m.id
        LEFT JOIN inv_warehouse w ON i.warehouse_id = w.id
        LEFT JOIN (
          SELECT material_id, warehouse_id, SUM(available_qty) AS total_available
          FROM inv_inventory_batch
          WHERE deleted = 0
          GROUP BY material_id, warehouse_id
        ) b ON i.material_id = b.material_id AND i.warehouse_id = b.warehouse_id
        WHERE i.deleted = 0
      `,
    },
    {
      name: 'v_hr_attendance_full',
      sql: `
        CREATE OR REPLACE VIEW v_hr_attendance_full AS
        SELECT
          a.id,
          a.attendance_date,
          a.employee_id AS employee_code,
          a.emp_id,
          e.name AS employee_name,
          a.department_name,
          a.check_in_time,
          a.check_out_time,
          a.status,
          a.working_hours,
          a.overtime_hours,
          a.remark
        FROM hr_attendance a
        LEFT JOIN sys_employee e ON a.emp_id = e.id
        WHERE a.deleted = 0
      `,
    },
    {
      name: 'v_outbound_batch_allocation_full',
      sql: `
        CREATE OR REPLACE VIEW v_outbound_batch_allocation_full AS
        SELECT
          ba.id,
          ba.source_type,
          ba.source_id,
          ba.source_no,
          ba.warehouse_id,
          w.warehouse_name,
          ba.material_id,
          m.material_code,
          m.material_name,
          ba.batch_id,
          ba.batch_no,
          ba.allocated_qty,
          ba.unit_cost,
          ba.total_cost,
          ba.fifo_mode,
          ba.operator_name,
          ba.create_time
        FROM inv_outbound_batch_allocation ba
        LEFT JOIN inv_warehouse w ON ba.warehouse_id = w.id
        LEFT JOIN inv_material m ON ba.material_id = m.id
      `,
    },
  ];

  for (const view of views) {
    try {
      await execute(view.sql);
      results.push(`Created/Updated view: ${view.name}`);
    } catch (e: any) {
      results.push(`View ${view.name} failed: ${e.message}`);
    }
  }

  return successResponse(results, '数据库视图创建完成');
});
