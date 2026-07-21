/**
 * 配方版本仓储接口
 * 依据: docs/油墨配方版本管理完整落地方案.md 第三节
 */
import { InkFormulaVersion } from '../aggregates/InkFormulaVersion';

export interface IFormulaVersionRepository {
  /** 按 ID 查找版本（不含明细） */
  findById(id: number): Promise<InkFormulaVersion | null>;

  /** 按 ID 查找版本（含明细） */
  findByIdWithItems(id: number): Promise<InkFormulaVersion | null>;

  /** 按色号查找所有版本（倒序） */
  findByColorId(colorId: number): Promise<InkFormulaVersion[]>;

  /** 获取色号下当前生效版本 */
  getActiveVersion(colorId: number): Promise<InkFormulaVersion | null>;

  /** 获取色号下所有版本号（用于生成新版本号） */
  getVersionNos(colorId: number): Promise<string[]>;

  /** 保存新版本（含明细） */
  save(version: InkFormulaVersion): Promise<number>;

  /** 更新版本（含明细） */
  update(version: InkFormulaVersion): Promise<void>;

  /** 更新版本状态（生效/作废） */
  updateStatus(
    id: number,
    status: number,
    operatorId: number,
    extra?: {
      activateBy?: number;
      activateTime?: Date;
      cancelBy?: number;
      cancelReason?: string;
      cancelTime?: Date;
    }
  ): Promise<void>;

  /** 将同色号下其他已生效版本置为已作废 */
  archiveOtherActiveVersions(
    colorId: number,
    excludeVersionId: number,
    operatorId: number
  ): Promise<void>;

  /** 软删除版本（含明细级联删除） */
  softDelete(id: number): Promise<void>;

  /** 判断版本是否存在 */
  exists(id: number): Promise<boolean>;
}

export interface InkColor {
  id: number;
  code: string;
  name: string;
  status?: number;
}

/**
 * 色号仓储接口
 */
export interface IInkColorRepository {
  findById(id: number): Promise<InkColor | null>;
  findByCode(code: string): Promise<InkColor | null>;
  findList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: number;
  }): Promise<{ list: InkColor[]; total: number }>;
  save(data: Partial<InkColor>, operatorId: number): Promise<number>;
  update(id: number, data: Partial<InkColor>, operatorId: number): Promise<void>;
  softDelete(id: number): Promise<void>;
}
