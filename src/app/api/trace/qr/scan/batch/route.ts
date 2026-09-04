import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { scans } = body as {
      scans: Array<{ qrCode: string; operator: string; location?: string }>;
    };

    if (!Array.isArray(scans) || scans.length === 0) {
      return errorResponse(ts('k_wec0lm'), 400, 400);
    }

    const results: { qrCode: string; ok: boolean; error?: string }[] = [];

    for (const item of scans) {
      try {
        if (!item.qrCode || !item.operator) {
          results.push({ qrCode: item.qrCode ?? '', ok: false, error: ts('k_1g8af20') });
          continue;
        }
        await service.recordScan(item.qrCode, item.operator, item.location || '');
        results.push({ qrCode: item.qrCode, ok: true });
      } catch (err) {
        results.push({
          qrCode: item.qrCode,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      return NextResponse.json(
        {
          code: 207,
          success: false,
          message: `部分扫码同步失败 (${failed.length}/${results.length})`,
          data: results,
        },
        { status: 207 }
      );
    }

    return successResponse(results, `已同步 ${results.length} 条扫码`);
  },
  { logTitle: '批量同步扫码' }
);
