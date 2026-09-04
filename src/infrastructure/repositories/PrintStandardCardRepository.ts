import { getTranslations } from 'next-intl/server';

/**
 * PrintStandardCardRepository
 * --------------------------------------------------------------------------
 * 适配层：将领域实体 StandardCard 映射到「live 的 print 取向单表」 prd_standard_card。
 *
 * 背景（P1-17 / 统一修复）：
 * 项目历史上存在两套互不兼容的 prd_standard_card schema：
 *   - print 取向单表（update_standard_card.sql / vnerpdacahng_schema.sql，column: card_no / status TINYINT 1-4 / FK crm_customer）—— 由整个前端驱动，是 live 权威表；
 *   - 模块化 DDD 设计（standard_card_migration.sql，column: code / is_current / status VARCHAR 枚举）—— 仅被 /api/standard-card/action 状态流转端点依赖。
 * 原 MysqlStandardCardRepository 按模块化 schema 读写（is_current/is_obsolete/is_locked/status 字符串），对 live print 表必然报“未知列/类型不符”。
 *
 * 本仓库让状态流转端点直接操作 live print 表：
 *   - 保留领域状态机（StandardCard.submit/approve/...）做合法性校验；
 *   - 仅持久化 print 表真实存在的列；
 *   - status 在 领域枚举 <-> TINYINT 之间映射（见下）。
 */
import { db } from '@/lib/db';
import { StandardCard } from '@/domain/standard-card/aggregates/StandardCard';
import { StandardCardStatus } from '@/domain/standard-card/value-objects/StandardCardStatus';
import {
  StandardCardType,
} from '@/domain/standard-card/value-objects/StandardCardType';

/** 领域状态枚举 -> print 表 TINYINT（1-草稿 2-待审核 3-已启用 4-已归档 5-已作废） */
const STATUS_TO_INT: Record<StandardCardStatus, number> = {
  [StandardCardStatus.DRAFT]: 1,
  [StandardCardStatus.AUDITING]: 2,
  [StandardCardStatus.APPROVED]: 3,
  [StandardCardStatus.CONFIRMED]: 4,
  [StandardCardStatus.OBSOLETE]: 5,
};

/** print 表 TINYINT -> 领域状态枚举（容错：未知值回退为 DRAFT） */
const INT_TO_STATUS: Record<number, StandardCardStatus> = {
  1: StandardCardStatus.DRAFT,
  2: StandardCardStatus.AUDITING,
  3: StandardCardStatus.APPROVED,
  4: StandardCardStatus.CONFIRMED,
  5: StandardCardStatus.OBSOLETE,
};

export class PrintStandardCardRepository {
  /**
   * 读取单条标准卡并构建领域实体。
   * 注意：print 表没有 material_id / is_current / is_locked 列，这里做兼容处理：
   *   - isLocked 仅在「已归档(CONFIRMED=4)」时视为 true，以允许基于已确认卡创建新版本；
   *   - name 在 print 表恒为 NULL（print 表单用 product_name），构造实体时回退避免校验报错。
   */
  async findById(id: number): Promise<StandardCard | null> {
  const ts = await getTranslations('Common');
    const rows = await db.query(
      `SELECT id, card_no, name, type, customer_id, customer_name, product_name, version, status, create_by, update_by
       FROM prd_standard_card WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, any>;
    const statusInt = Number(row.status);
    return new StandardCard({
      id: row.id,
      code: row.card_no,
      version: row.version || '1.0',
      // print 表 name 恒为空，回退保证领域实体可构造
      name: row.name || row.product_name || row.card_no || ts('k_19s2wpf'),
      type: (row.type || 'process') as StandardCardType,
      materialId: undefined,
      customerId: row.customer_id ?? undefined,
      customerName: row.customer_name ?? undefined,
      status: INT_TO_STATUS[statusInt] ?? StandardCardStatus.DRAFT,
      isCurrent: false,
      isObsolete: statusInt === 5,
      isLocked: statusInt === 4,
      createUser: row.create_by ?? undefined,
    });
  }

  /**
   * 持久化一次状态流转。仅写 print 表真实存在的列。
   * 作废(OBSOLETE)时额外写 obsolete_reason / obsolete_by / obsolete_at（依赖迁移 072 增加的列）。
   */
  async transition(card: StandardCard, userId: number, reason?: string): Promise<void> {
    const statusInt = STATUS_TO_INT[card.status] ?? 1;
    const params: any[] = [statusInt, userId];
    let sql =
      'UPDATE prd_standard_card SET status = ?, update_by = ?, update_time = NOW()';
    if (card.status === StandardCardStatus.OBSOLETE) {
      sql += ', obsolete_reason = ?, obsolete_by = ?, obsolete_at = NOW()';
      params.push(reason ?? '', userId);
    }
    sql += ' WHERE id = ? AND deleted = 0';
    params.push(card.id!);
    await db.execute(sql, params as any);
  }

  /**
   * 克隆一张新版本标准卡（仅写 print 表真实存在的列；product_name 等不在领域模型中，留空待后续编辑）。
   * 返回新行 id。
   */
  async saveNewVersion(
    card: StandardCard,
    originalCardNo: string,
    userId: number
  ): Promise<number> {
    const newCardNo = `${originalCardNo}-V${card.version}`;
    const result = await db.insert('prd_standard_card', {
      card_no: newCardNo,
      name: card.name,
      type: card.type,
      customer_id: card.customerId ?? null,
      customer_name: '',
      product_name: '',
      version: card.version,
      status: 1,
      create_by: userId,
      update_by: userId,
    });
    return result.insertId;
  }
}
