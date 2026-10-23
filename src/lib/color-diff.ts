/**
 * ΔE 色差计算 — 纯函数
 *
 * CIE76 公式：ΔE = √(ΔL² + Δa² + Δb²)
 * 适用于签样色样 Lab 基准与实测 Lab 值的色差判定。
 * 注：CIEDE2000 更精确，但印刷行业 ΔE(CIE76) 仍是通用验收口径。
 */

export interface LabValue {
  l: number;
  a: number;
  b: number;
}

/** CIE76 色差，保留 4 位小数 */
export function calculateDeltaE(base: LabValue, actual: LabValue): number {
  const dl = actual.l - base.l;
  const da = actual.a - base.a;
  const db = actual.b - base.b;
  const deltaE = Math.sqrt(dl * dl + da * da + db * db);
  return Math.round(deltaE * 10000) / 10000;
}

/** ΔE 判定：≤ 阈值合格 */
export function judgeDeltaE(deltaE: number, threshold: number): 'pass' | 'fail' {
  return deltaE <= threshold ? 'pass' : 'fail';
}

/** lab-test 联动信息（编辑回显用，Lab 转字符串供输入框） */
export interface SignColorLinkInfo {
  color_standard_id: number | null;
  measured_lab?: { l: string; a: string; b: string };
}

/**
 * 从 lab-test detail_data JSON 提取签样色样联动信息。
 * 联动数据由 lab-test API 写入 detail_data.color_standard（见 /api/quality/lab-test）。
 * 任何解析失败均返回 { color_standard_id: null }。
 */
export function extractSignColorLink(detailData: unknown): SignColorLinkInfo {
  if (typeof detailData !== 'string' || !detailData) {
    return { color_standard_id: null };
  }
  try {
    const parsed = JSON.parse(detailData) as {
      color_standard?: {
        color_standard_id?: number;
        measured_lab?: { l: number; a: number; b: number };
      };
    };
    const cs = parsed.color_standard;
    if (!cs?.color_standard_id) {
      return { color_standard_id: null };
    }
    const info: SignColorLinkInfo = { color_standard_id: cs.color_standard_id };
    if (cs.measured_lab) {
      info.measured_lab = {
        l: String(cs.measured_lab.l),
        a: String(cs.measured_lab.a),
        b: String(cs.measured_lab.b),
      };
    }
    return info;
  } catch {
    return { color_standard_id: null };
  }
}
