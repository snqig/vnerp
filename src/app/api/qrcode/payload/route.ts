import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import QRCode from 'qrcode';
import { successResponse, errorResponse } from '@/lib/api-response';

// 扩展的二维码数据类型
export interface QrCodePayload {
  type: 'material' | 'workorder' | 'product' | 'ink' | 'screen-plate' | 'mold' | 'process-card';
  id: string;
  code?: string;
  name?: string;
  batchNo?: string;
  version?: string;
  status?: string;

  // 印刷行业特定字段
  ink?: {
    id: string;
    code: string;
    name: string;
    color?: string;
    batchNo?: string;
    remainingKg?: number;
  };

  screenPlate?: {
    id: string;
    code: string;
    meshCount?: number;
    emulsion?: string;
    tension?: number;
    totalUseCount?: number;
    maxUseCount?: number;
  };

  processParams?: {
    ovenTemp?: number;
    speed?: number;
    pressure?: number;
    squeegeeType?: string;
  };

  qualityCheck?: {
    inspector?: string;
    checkTime?: string;
    result?: 'pass' | 'fail' | 'rework';
    notes?: string;
  };

  timestamp?: number;
  [key: string]: any;
}

// 生成带复杂数据的二维码
export async function generateQrCodeWithPayload(
  payload: QrCodePayload,
  options?: { width?: number; margin?: number }
) {
  const fullPayload: QrCodePayload & { timestamp: number } = {
    ...payload,
    timestamp: Date.now(),
  };

  const jsonString = JSON.stringify(fullPayload);
  const base64Data = await QRCode.toDataURL(jsonString, {
    width: options?.width || 200,
    margin: options?.margin || 1,
    errorCorrectionLevel: 'M',
  });

  return base64Data;
}

// 解析二维码数据
export function parseQrCodePayload(data: string): QrCodePayload | null {
  try {
    const decoded = JSON.parse(data);
    return decoded;
  } catch {
    return null;
  }
}

// API接口 - 生成带复杂数据的二维码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, width, margin } = body;

    if (!payload) {
      return errorResponse('请提供二维码数据', 400);
    }

    const base64Data = await generateQrCodeWithPayload(payload, { width, margin });

    return successResponse(
      {
        base64: base64Data,
        payload: payload,
      },
      '二维码生成成功'
    );
  } catch (error: any) {
    console.error('二维码生成失败:', error);
    return errorResponse('二维码生成失败: ' + error.message, 500);
  }
}

// API接口 - 获取二维码记录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const qrCode = searchParams.get('qrCode');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE deleted = 0';
  const params: any[] = [];

  if (qrCode) {
    whereClause += ' AND qr_code = ?';
    params.push(qrCode);
  }
  if (type) {
    whereClause += ' AND qr_type = ?';
    params.push(type);
  }

  const offset = (page - 1) * pageSize;

  const rows = await query(
    `SELECT * FROM qrcode_record ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const countResult: any = await query(
    `SELECT COUNT(*) as total FROM qrcode_record ${whereClause}`,
    params
  );
  const total = countResult.length > 0 ? countResult[0]?.total || 0 : 0;

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
  });
}
