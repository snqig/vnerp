import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { PickOrderApprovedEvent } from '@/domain/production/events/PickOrderEvents';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const issueNo = searchParams.get('issueNo') || '';
  const workOrderNo = searchParams.get('workOrderNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE m.deleted = 0';
  const params: Loose[] = [];
  if (issueNo) {
    where += ' AND m.issue_no LIKE ?';
    params.push('%' + issueNo + '%');
  }
  if (workOrderNo) {
    where += ' AND m.work_order_no LIKE ?';
    params.push('%' + workOrderNo + '%');
  }
  if (status) {
    where += ' AND m.status = ?';
    params.push(Number(status));
  }

  const totalRows: Loose = await query(
    'SELECT COUNT(*) as total FROM prd_material_issue m ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows: Loose = await query(
    'SELECT m.*, w.warehouse_name FROM prd_material_issue m LEFT JOIN inv_warehouse w ON m.warehouse_id = w.id ' +
      where +
      ' ORDER BY m.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: Loose = await query('SELECT * FROM prd_material_issue_item WHERE issue_id = ?', [
      row.id,
    ]);
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      work_order_id,
      work_order_no,
      warehouse_id,
      issue_date,
      issue_type,
      operator_name,
      remark,
      items,
    } = body;

    if (!warehouse_id) {
      return errorResponse('仓库ID不能为空', 400, 400);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('发料明细不能为空', 400, 400);
    }

    const now = new Date();
    const issueNo =
      'MI' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result: Loose = await transaction(async (conn) => {
      if (work_order_id) {
        const [woRows]: Loose = await conn.execute(
          'SELECT id, order_no, status, plan_qty FROM prod_work_order WHERE id = ? AND deleted = 0 FOR UPDATE',
          [work_order_id]
        );
        if (woRows.length === 0) {
          throw new Error('工单不存在');
        }
        if (woRows[0].status < 20) {
          throw new Error('工单未审核，不能发料');
        }
        if (woRows[0].status >= 90) {
          throw new Error('工单已关闭，不能发料');
        }
      }

      // 超领校验：检查是否超过工单BOM需求量
      if (work_order_id) {
        for (const item of items) {
          if (!item.material_id) continue;

          // 获取BOM需求量
          const [bomRows]: Loose = await conn.execute(
            `SELECT bm.quantity, bm.loss_rate 
           FROM prod_bom b 
           JOIN prod_bom_material bm ON b.id = bm.bom_id 
           WHERE b.product_id = (SELECT product_id FROM prod_work_order WHERE id = ?) 
           AND bm.material_id = ? 
           AND b.status = 1 
           LIMIT 1`,
            [work_order_id, item.material_id]
          );

          if (bomRows.length > 0) {
            const bomQty = Number(bomRows[0].quantity);
            const lossRate = Number(bomRows[0].loss_rate || 0);
            const [planRows]: Loose = await conn.execute(
              'SELECT plan_qty FROM prod_work_order WHERE id = ?',
              [work_order_id]
            );
            const planQty = Number(planRows[0]?.plan_qty || 0);

            // 理论需求量 = BOM用量 × 工单数量 × (1 + 损耗率)
            const requiredQty = bomQty * planQty * (1 + lossRate / 100);

            // 已领料数量
            const [issuedRows]: Loose = await conn.execute(
              `SELECT COALESCE(SUM(ii.issued_qty), 0) as total_issued 
             FROM prd_material_issue i 
             JOIN prd_material_issue_item ii ON i.id = ii.issue_id 
             WHERE i.work_order_id = ? AND ii.material_id = ? AND i.status >= 3 AND i.deleted = 0`,
              [work_order_id, item.material_id]
            );
            const alreadyIssued = Number(issuedRows[0]?.total_issued || 0);

            // 本次领料后总量
            const totalAfterIssue = alreadyIssued + Number(item.issued_qty);

            // 允许超领比例（默认10%）
            const overIssueRatio = 1.1;
            const maxAllowed = requiredQty * overIssueRatio;

            if (totalAfterIssue > maxAllowed) {
              throw new Error(
                `物料 ${item.material_name || item.material_id} 超领校验失败: ` +
                  `BOM需求 ${requiredQty.toFixed(2)}, 已领 ${alreadyIssued.toFixed(2)}, ` +
                  `本次 ${item.issued_qty}, 最大允许 ${maxAllowed.toFixed(2)} (允许超领10%)`
              );
            }
          }
        }
      }

      for (const item of items) {
        if (!item.material_id || !item.issued_qty || Number(item.issued_qty) <= 0) {
          throw new Error(`物料 ${item.material_name || item.material_id} 发料数量必须大于0`);
        }

        const [invRows]: Loose = await conn.execute(
          'SELECT id, quantity, material_code, material_name FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, warehouse_id]
        );

        if (invRows.length === 0) {
          throw new Error(`物料 ${item.material_name || item.material_id} 在该仓库无库存`);
        }

        const inv = invRows[0];
        if (Number(inv.quantity) < Number(item.issued_qty)) {
          throw new Error(
            `物料 ${item.material_name || item.material_id} 库存不足: 可用 ${inv.quantity}, 需发 ${item.issued_qty}`
          );
        }
      }

      const [orderResult]: Loose = await conn.execute(
        'INSERT INTO prd_material_issue (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, operator_name, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [
          issueNo,
          work_order_id || null,
          work_order_no || null,
          warehouse_id,
          issue_date,
          issue_type || 1,
          operator_name || null,
          remark || null,
        ]
      );
      const issueId = orderResult.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO prd_material_issue_item (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            issueId,
            item.material_id,
            item.material_code || null,
            item.material_name || null,
            item.required_qty || 0,
            item.issued_qty,
            item.unit || null,
            item.batch_no || null,
          ]
        );
      }

      return { id: issueId, issue_no: issueNo };
    });

    return successResponse(result, '发料单创建成功');
  },
  { logTitle: '创建发料单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, action, status, remark } = body;

    if (!id) {
      return errorResponse('发料单ID不能为空', 400, 400);
    }

    if (action === 'post') {
      const result = await transaction(async (conn) => {
        const [issueRows]: Loose = await conn.execute(
          'SELECT id, issue_no, work_order_id, work_order_no, warehouse_id, operator_name, status FROM prd_material_issue WHERE id = ? AND deleted = 0 FOR UPDATE',
          [id]
        );

        if (issueRows.length === 0) {
          throw new Error('发料单不存在');
        }

        const issue = issueRows[0];

        if (issue.status >= 3) {
          throw new Error('发料单已完成或已取消，不能重复过账');
        }

        const [itemRows]: Loose = await conn.execute(
          'SELECT * FROM prd_material_issue_item WHERE issue_id = ?',
          [id]
        );

        // 库存充足性只读预校验（不锁行，提前发现缺料给用户友好错误；
        // 实际扣减由 PickOrderInventoryHandler 在事件处理时 FOR UPDATE + FIFO 完成）
        for (const item of itemRows) {
          const [invRows]: Loose = await conn.execute(
            'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
            [item.material_id, issue.warehouse_id]
          );
          if (invRows.length === 0) {
            throw new Error(`物料 ${item.material_name} 库存记录不存在`);
          }
          if (Number(invRows[0].quantity) < Number(item.issued_qty)) {
            throw new Error(
              `物料 ${item.material_name} 库存不足: 可用 ${invRows[0].quantity}, 需发 ${item.issued_qty}`
            );
          }
        }

        await conn.execute(
          'UPDATE prd_material_issue SET status = 3, update_time = NOW() WHERE id = ?',
          [id]
        );

        // 发布领料审核通过事件 — 库存扣减由 PickOrderInventoryHandler 订阅处理（事件驱动解耦）
        await getDomainEventOutbox().saveEvents(conn, 'MaterialIssue', id, [
          new PickOrderApprovedEvent({
            pickOrderId: id,
            pickNo: issue.issue_no,
            workOrderId: issue.work_order_id || 0,
            items: itemRows.map((item: Loose) => ({
              materialId: item.material_id,
              quantity: Number(item.issued_qty),
              batchNo: item.batch_no || '',
              warehouseId: issue.warehouse_id,
            })),
            userId: 0,
          }),
        ]);

        return { id, status: 3 };
      });
      return successResponse(result, '发料过账成功');
    }

    if (status !== undefined)
      await execute('UPDATE prd_material_issue SET status = ? WHERE id = ? AND deleted = 0', [
        status,
        id,
      ]);
    if (remark !== undefined)
      await execute('UPDATE prd_material_issue SET remark = ? WHERE id = ? AND deleted = 0', [
        remark,
        id,
      ]);
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新发料单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

    const issue: Loose = await query(
      'SELECT status FROM prd_material_issue WHERE id = ? AND deleted = 0',
      [Number(id)]
    );
    if (issue.length === 0) {
      return errorResponse('发料单不存在', 404, 404);
    }
    if (issue[0].status >= 3) {
      return errorResponse('已完成的发料单不能删除', 400, 400);
    }

    await execute('UPDATE prd_material_issue SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除发料单', logType: 'business' }
);
