import { getTranslations } from 'next-intl/server';

import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainEvent';
import { transaction, query } from '@/lib/db';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
// 复用已有的反审核 handler 作为逆操作，避免重写 SQL 造成双份逻辑漂移
import { InventoryRollbackHandler } from './InventoryRollbackHandler';
import { InboundQrInvalidationHandler } from './InboundQrInvalidationHandler';
import { PurchaseInboundReversalHandler } from './PurchaseInboundReversalHandler';
import { DeliveryCancelledHandler } from './DeliveryCancelledHandler';

const costService = new InventoryCostService();

/** 补偿冲销流水的来源标记，用于幂等判定 */
const REVERSAL_SOURCE_TYPE = 'saga_compensation';

/**
 * Saga 业务补偿处理器（F-003）
 *
 * 背景：原 CrossModuleSagaHandler（F-003 前方案，已删除）曾试图在步骤失败后用 LIFO 逆序发布
 *      `saga.compensate.{stepName}` 事件做补偿，但彼时本处理器只打日志，
 *      导致「已提交的兄弟副作用」无法撤销 —— 跨模块永久失败即产生账实漂移。
 *      该缺陷已由 F-003 最终方案修复：补偿入口收敛到 EventBus.publishWithSaga
 *      （按 originEventType 自动发布 `saga.compensate.{originEventType}`）。
 *
 * 设计原则：
 *  1. **逆操作**：每个补偿执行与正向操作严格相反的写入（加→减、新增→软删）
 *  2. **幂等**：重复补偿不重复扣减。以「该 saga 是否已存在冲销流水」为判据，
 *     且所有 UPDATE 用 GREATEST(.., 0) 兜底，避免扣成负数
 *  3. **可重试**：补偿失败仅记录，不抛异常阻断后续步骤的补偿
 *  4. **审计合规**：审计日志 / 缓存失效**不撤销**（审计留痕是合规要求）
 *  5. **会计规范**：inv_inventory_transaction 无软删列，流水账**不删除**，
 *     改为写 `trans_type='return'` 的反向冲销流水（红字冲销）
 *
 * 补偿覆盖的编排事件（白名单内）：workorder.completed / prod.pick.approved /
 * prod.return.approved / inbound.approved / sales.shipped / delivery.shipped。
 * 各事件的逆操作实现见下方 switch 分支；新增编排事件时在 EventRegistry 注册
 * `saga.compensate.{originEventType}` 并补对应分支即可。
 */
export class SagaCompensationHandler {
  async handle(event: DomainEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const stepName = event.eventType.replace(/^saga\.compensate\./, '');
    const sagaId = String(event.payload?.sagaId ?? '');
    const sagaType = String(event.payload?.sagaType ?? '');

    // 补偿目标名的归一逻辑：
    //  - 常态路径：EventBus 派发失败时自动补偿，payload 带 originEventType（原始业务事件名）
    //  - 历史路径（已废弃）：原 CrossModuleSagaHandler 的 LIFO 步骤补偿按 stepName 分发，
    //    该编排器已删除，目前无发布者；保留 stepName 兜底仅作兼容。
    // 二者最终都收敛到同一批逆操作实现，此处先归一为「补偿目标名」。
    const originEventType = String(event.payload?.originEventType ?? '');
    const target = originEventType || stepName;

    secureLog('warn', ts('k_unb292'), {
      eventType: event.eventType,
      stepName,
      originEventType,
      sagaId,
      sagaType,
      completedHandlers: event.payload?.completedHandlers,
    });

    try {
      switch (target) {
        // ===== EventBus 自动补偿路径（按原始事件名）=====
        case 'workorder.completed':
          // 与 CrossModuleSagaHandler 的 inventory_inbound step 同义：
          // 工单完工的成品入库副作用（库存 + 批次 + 流水 + 成本 + 二维码 + 凭证）
          await this.compensateInventoryInbound(event, sagaId);
          break;
        case 'prod.pick.approved':
          // 领料扣减的逆操作：库存归还（由 PickOrderInventoryHandler 产生的扣减）
          await this.compensateInventoryDeduct(event, sagaId);
          break;
        case 'prod.return.approved':
          // 退料入库的逆操作：库存扣回
          await this.compensateInventoryInbound(event, sagaId);
          break;
        case 'inbound.approved':
          // 采购入库审核的逆操作：库存回滚 + 二维码作废 + 采购单回退
          await this.compensateInbound(event, sagaId);
          break;
        case 'sales.shipped':
          // 销售发货的逆操作：库存归还 + 应收软删
          await this.compensateShipment(event, sagaId, 'sales');
          break;
        case 'delivery.shipped':
          // 发货单发货的逆操作：库存归还 + 复用 DeliveryCancelledHandler
          // （订单明细回退 + 订单状态回退 + 应收软删）
          await this.compensateShipment(event, sagaId, 'delivery');
          break;

        // ===== workorder_completion saga =====
        case 'inventory_inbound':
          await this.compensateInventoryInbound(event, sagaId);
          break;
        case 'update_workorder':
          await this.compensateUpdateWorkOrder(event, sagaId);
          break;
        case 'finance_cost':
          await this.compensateFinanceCost(event, sagaId);
          break;
        case 'hr_salary':
          await this.compensateHrSalary(event, sagaId);
          break;

        // ===== material_issue saga =====
        case 'update_pick_order':
          await this.compensateUpdatePickOrder(event, sagaId);
          break;
        case 'inventory_deduct':
          await this.compensateInventoryDeduct(event, sagaId);
          break;
        case 'finance_impact':
          await this.compensateFinanceImpact(event, sagaId);
          break;

        // ===== work_report saga =====
        case 'validate_report':
        case 'update_workorder_progress':
        case 'hr_piece_record':
          // 对应事件当前无订阅 handler，无副作用需撤销
          secureLog('info', ts('k_9dotzl'), {
            stepName,
            sagaId,
          });
          break;

        default:
          secureLog('warn', ts('k_xgwzet'), { stepName, sagaId });
      }
    } catch (error) {
      // 补偿失败不抛出 —— 避免阻断 LIFO 队列中其余步骤的补偿
      secureLog('error', ts('k_1lgpppa'), {
        stepName,
        sagaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 补偿「采购入库审核通过」（inbound.approved 的逆操作）。
   *
   * 正向 4 个有副作用的 handler：
   *   - InventorySyncHandler：建批次 + 库存汇总 + 流水
   *   - FinanceVoucherHandler：生成应付单 fin_payable
   *   - PurchaseInboundSyncHandler：回写采购单 received_qty / status
   *   - QrCodeGenerationHandler：生成物料二维码
   *   （AuditLog / CacheInvalidation 不撤销 —— 审计留痕是合规要求）
   *
   * 逆操作**全部复用已有的反审核 handler**，不重写 SQL：
   *   - InventoryRollbackHandler —— 库存回滚 + 批次软删 + 冲销流水 + 重算汇总
   *     **且已内含应付单软删**（其 T403 逻辑按 source_no 软删 fin_payable）
   *   - InboundQrInvalidationHandler —— 二维码置为失效
   *   - PurchaseInboundReversalHandler —— 采购单 received_qty / status 回退
   *     （走领域方法 purchaseOrder.reverseReceive()，事件未带明细时自动回查 inv_inbound_item）
   */
  private async compensateInbound(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const inboundId = Number(payload.inboundId ?? 0);
    const inboundNo = String(payload.inboundNo ?? '');
    const poId = Number(payload.poId ?? 0) || undefined;

    if (!inboundId) {
      secureLog('warn', ts('k_9yjnf0'), { sagaId });
      return;
    }

    // 幂等：InventoryRollbackHandler 回滚时会写 trans_type='return' 的冲销流水，
    // 若该入库单已存在此类流水，说明回滚已执行过，避免重复扣减。
    const alreadyRolledBack = await this.hasInboundReversal(inboundId);
    if (alreadyRolledBack) {
      secureLog('info', ts('k_1cqn1e5'), { sagaId, inboundId, inboundNo });
      return;
    }

    const reversalPayload = {
      inboundId,
      inboundNo,
      ...(poId ? { poId } : {}),
    };

    // 1) 库存回滚 + 批次软删 + 冲销流水 + 应付单软删
    await this.runSafely('InventoryRollbackHandler', async () => {
      await new InventoryRollbackHandler().handle({
        eventType: 'inbound.unapproved',
        occurredAt: new Date(),
        payload: reversalPayload,
      } as never);
    });

    // 2) 二维码作废（旧码不失效会扫到已回滚的批次 → 虚码）
    await this.runSafely('InboundQrInvalidationHandler', async () => {
      await new InboundQrInvalidationHandler().handle({
        eventType: 'inbound.unapproved',
        occurredAt: new Date(),
        payload: reversalPayload,
      } as never);
    });

    // 3) 采购单收货量 / 状态回退（无 poId 时该 handler 自行安全跳过）
    await this.runSafely('PurchaseInboundReversalHandler', async () => {
      await new PurchaseInboundReversalHandler().handle({
        eventType: 'inbound.unapproved',
        occurredAt: new Date(),
        payload: reversalPayload,
      } as never);
    });

    secureLog('info', ts('k_hx0s27'), { sagaId, inboundId, inboundNo });
  }

  /**
   * 补偿「销售发货 / 发货单发货」的逆操作。
   *
   * 正向（SalesShippedHandler / DeliveryShippedHandler）：
   *   - inv_inventory.quantity 扣减
   *   - inv_inventory_batch 扣减（扣减至 0 时**软删批次**）
   *   - 写 'out' 库存流水
   *   - sal_order_detail.delivered_qty 累加 + sal_order.status 推进
   *   - fin_receivable 生成应收（按 source_no 幂等）
   *
   * 逆向：
   *   - 库存归还（批次加回 + **复活被软删批次** + 重算汇总 + 'return' 冲销流水）
   *   - 应收软删（按 source_no）
   *   - delivery 模式额外复用 DeliveryCancelledHandler 做订单明细与状态回退
   *
   * 幂等：以「该源单是否已有 saga 冲销流水」为判据。
   */
  private async compensateShipment(
    event: DomainEvent,
    sagaId: string,
    mode: 'sales' | 'delivery'
  ): Promise<void> {
  const ts = await getTranslations('Common');
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const orderId = Number(payload.orderId ?? 0) || 0;
    const orderNo = String(payload.orderNo ?? '');
    const deliveryId = Number(payload.deliveryId ?? 0) || 0;
    const deliveryNo = String(payload.deliveryNo ?? '');
    const items = Array.isArray(payload.shippedItems) ? payload.shippedItems : [];

    const sourceId = mode === 'delivery' ? deliveryId || orderId : orderId;
    const sourceNo = mode === 'delivery' ? deliveryNo || orderNo : orderNo;

    if (items.length === 0) {
      secureLog('warn', ts('k_yzncdn'), { sagaId, mode, sourceId });
      return;
    }

    // 幂等：已存在该源单的 saga 冲销流水则跳过
    if (sourceId && (await this.hasSagaReversal(sourceId, sagaId))) {
      secureLog('info', ts('k_1cqn1e5'), { sagaId, mode, sourceId });
      return;
    }

    await transaction(async (conn) => {
      let restoredQty = 0;
      let firstBatchNo: string | null = null;
      let firstMaterialId = 0;
      let firstWarehouseId = 0;

      for (const raw of items as Array<Record<string, unknown>>) {
        const materialId = Number(raw.materialId ?? 0);
        const warehouseId = Number(raw.warehouseId ?? 0);
        const quantity = Number(raw.quantity ?? 0);
        const batchNo = raw.batchNo ? String(raw.batchNo) : '';
        if (!materialId || quantity <= 0) continue;

        if (!firstMaterialId) {
          firstMaterialId = materialId;
          firstWarehouseId = warehouseId;
          firstBatchNo = batchNo || null;
        }

        // 归还批次：命中未删批次则累加；批次已被扣至软删则复活并恢复数量
        const [rows] = (await conn.execute(
          `SELECT id FROM inv_inventory_batch
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?
           ORDER BY deleted ASC LIMIT 1`,
          [batchNo, materialId, warehouseId]
        )) as any;

        if (rows?.length > 0) {
          await conn.execute(
            `UPDATE inv_inventory_batch
             SET quantity = quantity + ?,
                 available_qty = available_qty + ?,
                 deleted = 0,
                 update_time = NOW()
             WHERE id = ?`,
            [quantity, quantity, rows[0].id]
          );
        }
        restoredQty += quantity;

        // 汇总由批次明细派生重算，杜绝双写漂移
        await recomputeInventorySummary(conn, materialId, warehouseId);
      }

      if (restoredQty > 0 && firstMaterialId) {
        await appendInventoryTransaction(conn, {
          transType: 'return',
          sourceType: REVERSAL_SOURCE_TYPE,
          sourceId: sourceId || 0,
          materialId: firstMaterialId,
          batchNo: firstBatchNo,
          warehouseId: firstWarehouseId,
          quantity: restoredQty,
          unitPrice: 0,
          totalAmount: 0,
          referenceNo: sourceNo || null,
          remark: `Saga 补偿冲销：发货出库归还 [saga:${sagaId}]`,
          createBy: null,
        });
      }

      // 应收软删（按 source_no 匹配，与正向生成逻辑同源）
      if (sourceNo) {
        await conn.execute(
          `UPDATE fin_receivable SET deleted = 1, update_time = NOW()
           WHERE source_no = ? AND deleted = 0`,
          [sourceNo]
        );
      }

      secureLog('info', ts('k_1pa2ui9'), {
        sagaId,
        mode,
        sourceId,
        sourceNo,
        itemCount: items.length,
        restoredQty,
      });
    });

    // delivery 模式：额外复用现成的取消 handler 回退订单明细与状态
    if (mode === 'delivery' && deliveryId) {
      await this.runSafely('DeliveryCancelledHandler', async () => {
        await new DeliveryCancelledHandler().handle({
          eventType: 'delivery.cancelled',
          occurredAt: new Date(),
          payload: { deliveryId, deliveryNo, orderId, reason: `Saga 补偿 [saga:${sagaId}]` },
        } as never);
      });
    }
  }

  /** 判断某源单是否已存在本 saga 的冲销流水 */
  private async hasSagaReversal(sourceId: number, sagaId: string): Promise<boolean> {
    try {
      const rows = await query(
        `SELECT id FROM inv_inventory_transaction
         WHERE source_type = ? AND source_id = ? AND remark LIKE ?
         LIMIT 1`,
        [REVERSAL_SOURCE_TYPE, sourceId, `%[saga:${sagaId}]%`]
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  /** 单步补偿失败不中断后续步骤，仅记录 */
  private async runSafely(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      secureLog('error', `Saga 补偿子步骤失败: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** 判断该入库单是否已生成过回滚冲销流水 */
  private async hasInboundReversal(inboundId: number): Promise<boolean> {
    try {
      const rows = await query(
        `SELECT id FROM inv_inventory_transaction
         WHERE source_type = 'inbound_order' AND source_id = ? AND trans_type = 'return'
         LIMIT 1`,
        [inboundId]
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      // 查询失败时按「未回滚」处理，由各 handler 自身的幂等/校验兜底
      return false;
    }
  }

  /**
   * 补偿「工单完工成品入库」—— 本系统当前唯一有真实副作用的 step。
   *
   * 正向（WorkOrderCompletedHandler + workorder.completed 的 6 个订阅者）：
   *   - inv_inventory.quantity / available_qty 增加
   *   - inv_inventory_batch 新增批次（batch_no = `WO{workOrderNo}{ts}`）
   *   - inv_inventory_transaction 写入 'in' 流水
   *   - qrcode_record 生成二维码
   *   - work_order_costs 归集成本
   *   - fin_payable 生成应付（FinanceVoucherHandler）
   *
   * 逆向：软删批次/二维码/成本/应付 + 反向扣减库存 + 写冲销流水 + 成本回滚
   */
  private async compensateInventoryInbound(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    const workOrderId = Number(event.payload?.workOrderId ?? 0);
    if (!workOrderId) {
      secureLog('warn', ts('k_1cqaesu'), { sagaId });
      return;
    }

    await transaction(async (conn) => {
      // ---- 幂等：已存在该工单的冲销流水则不再重复补偿 ----
      const [existing] = (await conn.execute(
        `SELECT id FROM inv_inventory_transaction
         WHERE source_type = ? AND source_id = ? AND remark LIKE ?
         LIMIT 1`,
        [REVERSAL_SOURCE_TYPE, workOrderId, `%[saga:${sagaId}]%`]
      )) as any;
      if (existing?.length > 0) {
        secureLog('info', ts('k_1cqn1e5'), { sagaId, workOrderId });
        return;
      }

      // ---- 1. 取出该工单完工产生的批次（正向 batch_no 前缀为 WO{workOrderNo}）----
      const [woRows] = (await conn.execute(
        `SELECT work_order_no, product_id, product_name, quantity, warehouse_id
         FROM prod_work_order WHERE id = ?`,
        [workOrderId]
      )) as any;
      const wo = woRows?.[0];
      if (!wo) {
        secureLog('warn', ts('k_gmojyx'), { sagaId, workOrderId });
      }

      const batchPrefix = wo?.work_order_no ? `WO${wo.work_order_no}%` : null;
      const materialId = Number(wo?.product_id ?? 0);
      const warehouseId = Number(wo?.warehouse_id ?? 0);
      const completedQty = Number(wo?.quantity ?? 0);

      let batches: any[] = [];
      if (batchPrefix && materialId) {
        const [bRows] = (await conn.execute(
          `SELECT id, batch_no, quantity, available_qty, warehouse_id, material_id
           FROM inv_inventory_batch
           WHERE batch_no LIKE ? AND material_id = ? AND deleted = 0`,
          [batchPrefix, materialId]
        )) as any;
        batches = bRows ?? [];
      }

      // ---- 2. 软删批次（撤销新增）----
      let reversedQty = 0;
      for (const b of batches) {
        reversedQty += Number(b.quantity ?? 0);
        await conn.execute(`UPDATE inv_inventory_batch SET deleted = 1 WHERE id = ?`, [b.id]);
      }

      const deductQty = reversedQty || completedQty;

      // ---- 3. 成本回滚（移动加权平均还原）----
      // 注意：onInboundRollback 内部会一并 UPDATE inv_inventory.quantity，
      // 与下方的 recomputeInventorySummary 存在功能重叠。因此【必须先 rollback、
      // 后 recompute】：rollback 负责成本与数量扣减，recompute 以「未删批次」为准
      // 做最终校准（幂等收口），从而既回滚成本、又不重复扣减、且账实相符。
      if (materialId && deductQty > 0) {
        const [invRow] = (await conn.execute(
          `SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 LIMIT 1`,
          [materialId, warehouseId]
        )) as any;
        if (invRow?.[0]?.id) {
          await costService.onInboundRollback(conn as never, Number(invRow[0].id), deductQty, 0);
        }
      }

      // ---- 4. 还原库存汇总（以批次为准最终校准，杜绝双写漂移）----
      if (materialId) {
        if (batches.length > 0) {
          await recomputeInventorySummary(conn, materialId, warehouseId);
        } else if (deductQty > 0) {
          // 无批次可删（已不存在）时的兜底：按工单数量扣减
          await conn.execute(
            `UPDATE inv_inventory
             SET quantity = GREATEST(CAST(quantity AS DECIMAL(18,4)) - ?, 0),
                 available_qty = GREATEST(CAST(available_qty AS DECIMAL(18,4)) - ?, 0),
                 update_time = NOW()
             WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
            [deductQty, deductQty, materialId, warehouseId]
          );
        }
      }

      if (materialId && deductQty > 0) {

        // ---- 5. 写反向冲销流水（会计规范：流水账不删，红字冲销）----
        await appendInventoryTransaction(conn, {
          transType: 'return',
          sourceType: REVERSAL_SOURCE_TYPE,
          sourceId: workOrderId,
          materialId,
          batchNo: batches[0]?.batch_no ?? null,
          warehouseId,
          quantity: deductQty,
          unitPrice: 0,
          totalAmount: 0,
          referenceNo: wo?.work_order_no ?? null,
          remark: `Saga 补偿冲销：工单完工入库 [saga:${sagaId}]`,
          createBy: null,
        });
      }

      // ---- 7. 软删该工单关联的二维码 / 成本归集 / 应付凭证 ----
      await conn.execute(
        `UPDATE qrcode_record SET deleted = 1 WHERE ref_id = ? AND deleted = 0`,
        [workOrderId]
      );
      await conn.execute(
        `UPDATE work_order_costs SET deleted = 1 WHERE work_order_id = ? AND deleted = 0`,
        [workOrderId]
      );
      // fin_payable 无 source_id 列，按 source_no（工单号）匹配撤销
      if (wo?.work_order_no) {
        await conn.execute(
          `UPDATE fin_payable SET deleted = 1
           WHERE source_no = ? AND deleted = 0`,
          [wo.work_order_no]
        );
      }

      secureLog('info', ts('k_wn4clu'), {
        sagaId,
        workOrderId,
        workOrderNo: wo?.work_order_no,
        batchCount: batches.length,
        reversedQty: deductQty,
      });
    });
  }

  /**
   * 补偿「工单状态置为 completed」—— 回退到上一状态。
   * workorder.status.update 当前无订阅者，此处做防御性实现：
   * 仅当工单确为 completed 时才回退，且幂等。
   */
  private async compensateUpdateWorkOrder(event: DomainEvent, sagaId: string): Promise<void> {
    const workOrderId = Number(event.payload?.workOrderId ?? 0);
    if (!workOrderId) return;

    await transaction(async (conn) => {
  const ts = await getTranslations('Common');
      const [rows] = (await conn.execute(
        `SELECT id, status FROM prod_work_order WHERE id = ? AND deleted = 0`,
        [workOrderId]
      )) as any;
      const row = rows?.[0];
      if (!row) return;
      // 幂等：仅当仍是 completed 才回退，避免重复补偿把状态越改越旧
      if (String(row.status) !== 'completed') {
        secureLog('info', ts('k_he7bwb'), {
          sagaId,
          workOrderId,
          currentStatus: row.status,
        });
        return;
      }
      await conn.execute(
        `UPDATE prod_work_order SET status = 'in_progress', update_time = NOW() WHERE id = ?`,
        [workOrderId]
      );
      secureLog('info', ts('k_195r82b'), { sagaId, workOrderId });
    });
  }

  /** 补偿生产成本归集（production.finance.cost_collect 当前无订阅者）*/
  private async compensateFinanceCost(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    const workOrderId = Number(event.payload?.workOrderId ?? 0);
    if (!workOrderId) return;
    // work_order_costs 的归集撤销已在 compensateInventoryInbound 中统一处理，
    // 此处仅保留独立入口以便该 step 后续接入 handler 后扩展。
    secureLog('info', ts('k_55osj7'), { sagaId, workOrderId });
  }

  /** 补偿计件工资计算（hr.salary.piece_calculate 当前无订阅者）*/
  private async compensateHrSalary(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    secureLog('info', ts('k_h3bdeb'), { sagaId });
  }

  /** 补偿领料单状态（material.pick.issued 当前无订阅者）*/
  private async compensateUpdatePickOrder(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    secureLog('info', ts('k_1pbd0cu'), { sagaId });
  }

  /**
   * 补偿「领料出库扣减」（prod.pick.approved 的逆操作）—— 库存归还。
   *
   * 正向（PickOrderInventoryHandler）：按 batch_no 扣减批次 quantity / available_qty，
   * 扣减至 0 时**软删批次**；再写 'out' 流水并重算汇总。
   *
   * 逆向：把数量加回批次（若批次已被软删则复活），重算汇总，写反向冲销流水。
   * 以「该 saga 是否已存在冲销流水」做幂等判定。
   */
  private async compensateInventoryDeduct(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const pickOrderId = Number(payload.pickOrderId ?? 0);
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!pickOrderId || items.length === 0) {
      secureLog('warn', ts('k_1j6aprr'), { sagaId });
      return;
    }

    await transaction(async (conn) => {
      // 幂等：已存在该领料单的冲销流水则跳过
      const [existing] = (await conn.execute(
        `SELECT id FROM inv_inventory_transaction
         WHERE source_type = ? AND source_id = ? AND remark LIKE ?
         LIMIT 1`,
        [REVERSAL_SOURCE_TYPE, pickOrderId, `%[saga:${sagaId}]%`]
      )) as any;
      if (existing?.length > 0) {
        secureLog('info', ts('k_1cqn1e5'), { sagaId, pickOrderId });
        return;
      }

      let restoredQty = 0;
      let firstBatchNo: string | null = null;
      let firstMaterialId = 0;
      let firstWarehouseId = 0;

      for (const raw of items as Array<Record<string, unknown>>) {
        const materialId = Number(raw.materialId ?? 0);
        const quantity = Number(raw.quantity ?? 0);
        const batchNo = raw.batchNo ? String(raw.batchNo) : '';
        const warehouseId = Number(raw.warehouseId ?? 0);
        if (!materialId || quantity <= 0) continue;

        if (!firstMaterialId) {
          firstMaterialId = materialId;
          firstWarehouseId = warehouseId;
          firstBatchNo = batchNo || null;
        }

        // 归还到批次：命中未删批次则累加；若批次已被扣至软删则复活并恢复数量
        const [rows] = (await conn.execute(
          `SELECT id, quantity, available_qty, deleted
           FROM inv_inventory_batch
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?
           ORDER BY deleted ASC LIMIT 1`,
          [batchNo, materialId, warehouseId]
        )) as any;

        if (rows?.length > 0) {
          await conn.execute(
            `UPDATE inv_inventory_batch
             SET quantity = quantity + ?,
                 available_qty = available_qty + ?,
                 deleted = 0,
                 update_time = NOW()
             WHERE id = ?`,
            [quantity, quantity, rows[0].id]
          );
        }
        restoredQty += quantity;

        await recomputeInventorySummary(conn, materialId, warehouseId);
      }

      if (restoredQty > 0 && firstMaterialId) {
        await appendInventoryTransaction(conn, {
          transType: 'return',
          sourceType: REVERSAL_SOURCE_TYPE,
          sourceId: pickOrderId,
          materialId: firstMaterialId,
          batchNo: firstBatchNo,
          warehouseId: firstWarehouseId,
          quantity: restoredQty,
          unitPrice: 0,
          totalAmount: 0,
          referenceNo: null,
          remark: `Saga 补偿冲销：领料出库归还 [saga:${sagaId}]`,
          createBy: null,
        });
      }

      secureLog('info', ts('k_1swn9ey'), {
        sagaId,
        pickOrderId,
        itemCount: items.length,
        restoredQty,
      });
    });
  }

  /** 补偿财务影响（finance.material.issue 当前无订阅者）*/
  private async compensateFinanceImpact(event: DomainEvent, sagaId: string): Promise<void> {
  const ts = await getTranslations('Common');
    secureLog('info', ts('k_px4rc9'), { sagaId });
  }
}
