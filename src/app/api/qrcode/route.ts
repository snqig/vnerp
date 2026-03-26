import { NextRequest, NextResponse } from 'next/server';
import { generateQRCode, generateOrderNo, generateBatchNo, parseQRCode } from '@/lib/utils';
import QRCode from 'qrcode';

type QRCodeType = 'wo' | 'batch' | 'sample' | 'outsource' | 'equipment' | 'employee' | 'purchase_order';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, data } = body as {
      type: QRCodeType;
      id: string | number;
      data?: Record<string, unknown>;
    };

    const qrContent = type === 'purchase_order' 
      ? `PO:${id}` 
      : generateQRCode(type.toUpperCase(), id);
    
    const qrCodeUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeId: `QR${Date.now()}`,
        qrCodeUrl,
        content: qrContent,
        orderData: data,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '生成二维码失败' },
      { status: 500 }
    );
  }
}

// GET - 解析二维码
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get('code');

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: '请提供二维码内容' },
        { status: 400 }
      );
    }

    const parsed = parseQRCode(qrCode);
    
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: '无效的二维码格式' },
        { status: 400 }
      );
    }

    // 根据类型返回对应的模拟数据
    let data: Record<string, unknown> = { parsed };
    
    switch (parsed.type) {
      case 'WO':
        data = {
          ...data,
          type: 'work_order',
          workOrder: {
            id: `WO${parsed.id}`,
            product: '包装膜-透明',
            quantity: 5000,
            completedQty: 3750,
            currentProcess: '印刷',
            efficiency: 92,
            status: 'producing',
          },
        };
        break;
      case 'BATCH':
        data = {
          ...data,
          type: 'inventory_batch',
          batch: {
            batchNo: parsed.id,
            material: 'PET膜-透明',
            warehouse: '原料仓库',
            location: 'A-01-03',
            quantity: 5000,
            availableQty: 4200,
            status: 'available',
          },
        };
        break;
      case 'SAMPLE':
        data = {
          ...data,
          type: 'sample',
          sample: {
            id: parsed.id,
            productName: '测试样品',
            status: 'completed',
          },
        };
        break;
      default:
        data = {
          ...data,
          type: 'unknown',
        };
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '解析二维码失败' },
      { status: 500 }
    );
  }
}
