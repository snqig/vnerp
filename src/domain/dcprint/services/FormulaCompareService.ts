/**
 * 配方版本对比领域服务 — 纯函数实现版本差异计算
 * 依据: docs/油墨配方版本管理完整落地方案.md 第六节
 */
import { InkFormulaVersion } from '../aggregates/InkFormulaVersion';
import { FormulaItemVO } from '../value-objects/FormulaItemVO';
import { DomainError } from '@/domain/shared/DomainTypes';

export interface FormulaItemDiff {
  left?: FormulaItemVO;
  right?: FormulaItemVO;
}

export interface FormulaItemModified {
  left: FormulaItemVO;
  right: FormulaItemVO;
  fields: string[];
}

export interface FormulaCompareResult {
  baseInfo: {
    left: {
      id: number;
      versionNo: string;
      versionName: string | null;
      changeReason: string | null;
      processNote: string | null;
      totalWeight: number | null;
      theoreticalCost: number | null;
    };
    right: {
      id: number;
      versionNo: string;
      versionName: string | null;
      changeReason: string | null;
      processNote: string | null;
      totalWeight: number | null;
      theoreticalCost: number | null;
    };
    diffFields: string[];
  };
  items: {
    added: FormulaItemVO[];
    removed: FormulaItemVO[];
    modified: FormulaItemModified[];
    unchanged: FormulaItemVO[];
  };
  summary: {
    totalLeft: number;
    totalRight: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

export class FormulaCompareService {
  /**
   * 对比两个配方版本
   * 规则：仅同色号版本可对比，以 materialCode 为匹配键
   */
  compare(left: InkFormulaVersion, right: InkFormulaVersion): FormulaCompareResult {
    if (left.colorId !== right.colorId) {
      throw new DomainError('只能对比同色号的版本');
    }

    const leftMap = new Map<string, FormulaItemVO>();
    const rightMap = new Map<string, FormulaItemVO>();

    left.items.forEach((item) => leftMap.set(item.materialCode, item));
    right.items.forEach((item) => rightMap.set(item.materialCode, item));

    const added: FormulaItemVO[] = [];
    const removed: FormulaItemVO[] = [];
    const modified: FormulaItemModified[] = [];
    const unchanged: FormulaItemVO[] = [];

    const allCodes = new Set([...leftMap.keys(), ...rightMap.keys()]);
    for (const code of allCodes) {
      const lItem = leftMap.get(code);
      const rItem = rightMap.get(code);

      if (!lItem && rItem) {
        added.push(rItem);
      } else if (lItem && !rItem) {
        removed.push(lItem);
      } else if (lItem && rItem) {
        const fields = lItem.diffFields(rItem);
        if (fields.length > 0) {
          modified.push({ left: lItem, right: rItem, fields });
        } else {
          unchanged.push(rItem);
        }
      }
    }

    // 基础信息差异
    const diffFields: string[] = [];
    const baseFieldMap: Record<string, [string, string]> = {
      version_no: [left.versionNo, right.versionNo],
      version_name: [left.versionName ?? '', right.versionName ?? ''],
      change_reason: [left.changeReason ?? '', right.changeReason ?? ''],
      process_note: [left.processNote ?? '', right.processNote ?? ''],
      total_weight: [String(left.totalWeight ?? ''), String(right.totalWeight ?? '')],
      theoretical_cost: [String(left.theoreticalCost ?? ''), String(right.theoreticalCost ?? '')],
    };
    for (const [field, [lVal, rVal]] of Object.entries(baseFieldMap)) {
      if (lVal !== rVal) {
        diffFields.push(field);
      }
    }

    return {
      baseInfo: {
        left: {
          id: left.id!,
          versionNo: left.versionNo,
          versionName: left.versionName,
          changeReason: left.changeReason,
          processNote: left.processNote,
          totalWeight: left.totalWeight,
          theoreticalCost: left.theoreticalCost,
        },
        right: {
          id: right.id!,
          versionNo: right.versionNo,
          versionName: right.versionName,
          changeReason: right.changeReason,
          processNote: right.processNote,
          totalWeight: right.totalWeight,
          theoreticalCost: right.theoreticalCost,
        },
        diffFields,
      },
      items: { added, removed, modified, unchanged },
      summary: {
        totalLeft: left.items.length,
        totalRight: right.items.length,
        addedCount: added.length,
        removedCount: removed.length,
        modifiedCount: modified.length,
        unchangedCount: unchanged.length,
      },
    };
  }
}
