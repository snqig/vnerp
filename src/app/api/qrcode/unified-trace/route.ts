import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 双轨打通 —— 统一溯源解析端点
 *
 * 现有两套扫码/溯源彼此割裂：
 *   - 通用溯源轨 qrcode_record：qr_code 为裸字符串（MA-/TYPE-…），由 trace/qr/scan、qrcode/trace 解析
 *   - 印厂标签轨 inv_material_label：qr_code 为 JSON{ID:label_no,TYPE}，由 dcprint/scan 按 label_no 解析
 * 同一物理批次若两轨各有码，换设备/换入口就查不到另一轨。
 *
 * 本端点作为「统一入口」：给定任意扫码内容，并行解析两轨，并通过互链列
 * （qrcode_record.label_id / inv_material_label.qr_record_id，batch 161/162 已加）补齐另一轨，
 * 最终返回合并后的溯源数据与时间线。纯新增、不改动既有写/读路径，零回归。
 */
type AnyRow = Record<string, any>;

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const content = (searchParams.get('content') || '').trim();
  if (!content) return errorResponse('缺少 content 参数', 400, 400);

  // 解析扫码内容：dcprint 格式为 JSON {ID, TYPE, ...}；通用轨为裸 qr_code 字符串
  let labelNo: string | null = null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.ID) labelNo = String(parsed.ID);
  } catch {
    /* 裸 qr_code，非 JSON */
  }

  // 并行解析两轨
  const [labelByNo, qrByCode] = await Promise.all([
    labelNo ? fetchLabelByNo(labelNo) : Promise.resolve(null),
    fetchQrByCode(content),
  ]);

  // 通过互链列补齐另一轨（未来同一批次走两轨时自动生效）
  let labelRes: AnyRow | null = labelByNo;
  let qrRes: AnyRow | null = qrByCode;
  if (!labelRes && qrRes?.label_id != null) labelRes = await fetchLabelById(Number(qrRes.label_id));
  if (!qrRes && labelRes?.qr_record_id != null) qrRes = await fetchQrById(Number(labelRes.qr_record_id));

  // 兜底：通用轨 content 也可能是 dcprint JSON 原文被直接存进了 qrcode_record（历史 label-service 写法）
  if (!qrRes && labelNo) qrRes = await fetchQrByCode(content);

  if (!labelRes && !qrRes) return errorResponse('未找到对应的二维码或标签', 404, 404);

  const timeline = buildUnifiedTimeline(labelRes, qrRes);

  return successResponse({
    source: labelNo ? 'dcprint_label' : 'generic_qrcode',
    label: labelRes,
    qr: qrRes,
    timeline,
  });
});

// ---- 印厂标签轨（inv_material_label） ----
async function fetchLabelByNo(labelNo: string): Promise<AnyRow | null> {
  const label: AnyRow | null = await queryOne(
    `SELECT l.*, pl.label_no AS parent_label_no
     FROM inv_material_label l
     LEFT JOIN inv_material_label pl ON l.parent_label_id = pl.id
     WHERE l.label_no = ? AND l.deleted = 0`,
    [labelNo]
  );
  if (!label) return null;
  await enrichLabel(label);
  return label;
}

async function fetchLabelById(id: number): Promise<AnyRow | null> {
  const label: AnyRow | null = await queryOne(
    `SELECT l.*, pl.label_no AS parent_label_no
     FROM inv_material_label l
     LEFT JOIN inv_material_label pl ON l.parent_label_id = pl.id
     WHERE l.id = ? AND l.deleted = 0`,
    [id]
  );
  if (!label) return null;
  await enrichLabel(label);
  return label;
}

async function enrichLabel(label: AnyRow): Promise<void> {
  if (Number(label.is_main_material) === 1) {
    label.cuttingRecords = await query(
      `SELECT r.id, r.record_no AS recordNo, r.cut_total_width AS cutTotalWidth, r.remain_width AS remainWidth,
              r.cut_time AS cutTime, r.operator_name AS operatorName, d.new_label_no AS newLabelNo, d.cut_width AS cutWidth
       FROM inv_cutting_record r
       LEFT JOIN inv_cutting_detail d ON r.id = d.record_id
       WHERE r.source_label_id = ? ORDER BY r.cut_time DESC`,
      [label.id]
    );
  }
  if (Number(label.is_cut) === 1) {
    label.childLabels = await query(
      `SELECT label_no AS labelNo, width, material_code AS materialCode, material_name AS materialName,
              is_used AS isUsed, create_time AS createTime
       FROM inv_material_label WHERE parent_label_id = ? AND deleted = 0 ORDER BY create_time`,
      [label.id]
    );
  }
}

// ---- 通用溯源轨（qrcode_record） ----
async function fetchQrByCode(qrCode: string): Promise<AnyRow | null> {
  const qr: AnyRow | null = await queryOne(
    'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0 LIMIT 1',
    [qrCode]
  );
  if (!qr) return null;
  qr.scanLogs = await query(
    'SELECT * FROM qrcode_scan_log WHERE qr_code = ? ORDER BY create_time ASC',
    [qrCode]
  );
  return qr;
}

async function fetchQrById(id: number): Promise<AnyRow | null> {
  const qr: AnyRow | null = await queryOne(
    'SELECT * FROM qrcode_record WHERE id = ? AND deleted = 0 LIMIT 1',
    [id]
  );
  if (!qr) return null;
  qr.scanLogs = await query(
    'SELECT * FROM qrcode_scan_log WHERE qr_code = ? ORDER BY create_time ASC',
    [qr.qr_code]
  );
  return qr;
}

// ---- 合并时间线 ----
function buildUnifiedTimeline(
  label: AnyRow | null,
  qr: AnyRow | null
): Array<{ time: string; track: string; event: string; detail: string }> {
  const timeline: Array<{ time: string; track: string; event: string; detail: string }> = [];

  if (label) {
    if (label.create_time) {
      timeline.push({
        time: String(label.create_time),
        track: 'label',
        event: '标签创建',
        detail: `标签 ${label.label_no}（${label.material_name || ''}）入库`,
      });
    }
    const cutting = (label.cuttingRecords as AnyRow[]) || [];
    for (const c of cutting) {
      timeline.push({
        time: String(c.cutTime || ''),
        track: 'label',
        event: '分切',
        detail: `分切记录 ${c.recordNo || ''}，剩余宽幅 ${c.remainWidth ?? ''}`,
      });
    }
  }

  if (qr) {
    if (qr.create_time) {
      timeline.push({
        time: String(qr.create_time),
        track: 'qr',
        event: `生成${String(qr.qr_type)}二维码`,
        detail: `二维码 ${qr.qr_code} 已生成`,
      });
    }
    const logs = (qr.scanLogs as AnyRow[]) || [];
    for (const log of logs) {
      timeline.push({
        time: String(log.create_time),
        track: 'qr',
        event: `扫码(${log.scan_type || 'trace'})`,
        detail: `${log.operator_name || '-'}：${log.scan_message || log.scan_result || ''}`,
      });
    }
  }

  timeline.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return timeline;
}
