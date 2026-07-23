const LODOP_URL = 'https://localhost:8443/CLodopfuncs.js?priority=1';

type LodopType = {
  PRINT_INIT: (taskName: string) => void;
  SET_PRINTER_INDEX: (index: number) => void;
  SET_PRINTER_INDEXA: (name: string) => void;
  ADD_PRINT_TEXT: (top: number, left: number, width: number, height: number, text: string) => void;
  ADD_PRINT_IMAGE: (top: number, left: number, width: number, height: number, url: string) => void;
  ADD_PRINT_BARCODE: (
    top: number,
    left: number,
    width: number,
    height: number,
    codeType: string,
    value: string
  ) => void;
  ADD_PRINT_QRCODE: (
    top: number,
    left: number,
    width: number,
    height: number,
    value: string
  ) => void;
  SET_PRINT_PAGESIZE: (pageType: number, width: number, height: number, name: string) => void;
  SET_PRINT_MODE: (mode: string, value: number | string) => void;
  SET_PRINT_COPIES: (copies: number) => void;
  PREVIEW: () => void;
  PRINT: () => void;
  PRINT_SETUP: () => void;
  SET_SHOW_MODE: (mode: string, value: number) => void;
  GET_VALUE: (name: string, ...args: Loose[]) => string | number;
};

let _loadPromise: Promise<void> | null = null;

async function ensureLodop(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as Loose).CLODOP) return true;

  if (!_loadPromise) {
    _loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LODOP_URL;
      script.async = true;
      script.onload = () => {
        const checkExist = setInterval(() => {
          if ((window as Loose).CLODOP) {
            clearInterval(checkExist);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkExist);
          reject(new Error('Lodop load timeout'));
        }, 10000);
      };
      script.onerror = () => reject(new Error('Lodop script load failed'));
      document.head.appendChild(script);
    });
  }

  try {
    await _loadPromise;
    return !!(window as Loose).CLODOP;
  } catch {
    return false;
  }
}

export function getLodop(): LodopType | null {
  if (typeof window === 'undefined') return null;
  const LODOP = (window as Loose).CLODOP;
  if (!LODOP) return null;
  return LODOP;
}

export async function printLabel(params: {
  taskName?: string;
  labelNo: string;
  qrCode: string;
  materialCode: string;
  materialName: string;
  specification?: string;
  batchNo: string;
  quantity: number;
  unit: string;
  copies?: number;
  printerName?: string;
  labelWidth?: number;
  labelHeight?: number;
}): Promise<{ success: boolean; message: string }> {
  const available = await ensureLodop();
  if (!available) {
    return { success: false, message: 'Lodop 未安装或未启动，请使用浏览器打印' };
  }

  try {
    const LODOP = getLodop();
    if (!LODOP) return { success: false, message: 'Lodop 初始化失败' };

    LODOP.PRINT_INIT(params.taskName || '标签打印');
    if (params.printerName) {
      LODOP.SET_PRINTER_INDEXA(params.printerName);
    }

    const w = params.labelWidth || 60;
    const h = params.labelHeight || 40;
    LODOP.SET_PRINT_PAGESIZE(1, w * 10, h * 10, '');

    LODOP.ADD_PRINT_QRCODE(10, 10, 100, 100, params.qrCode);

    let top = 10;
    const textX = 120;
    LODOP.ADD_PRINT_TEXT(top, textX, 200, 20, params.materialCode);
    top += 24;
    LODOP.ADD_PRINT_TEXT(top, textX, 200, 20, params.materialName);
    top += 22;
    if (params.specification) {
      LODOP.ADD_PRINT_TEXT(top, textX, 200, 18, params.specification);
      top += 20;
    }
    LODOP.ADD_PRINT_TEXT(top, textX, 200, 18, `${params.quantity}${params.unit}`);
    top += 22;
    LODOP.ADD_PRINT_TEXT(top, textX, 200, 16, `批号: ${params.batchNo}`);
    top += 18;
    LODOP.ADD_PRINT_TEXT(10, 10, 300, 14, params.labelNo);

    LODOP.SET_PRINT_COPIES(params.copies || 1);

    LODOP.PRINT();
    return { success: true, message: '打印任务已发送' };
  } catch (error) {
    return { success: false, message: `打印失败: ${(error as Error).message}` };
  }
}

export async function printZPL(
  zplContent: string,
  printerName?: string
): Promise<{ success: boolean; message: string }> {
  const available = await ensureLodop();
  if (!available) {
    return { success: false, message: 'Lodop 未安装或未启动' };
  }

  try {
    const LODOP = getLodop();
    if (!LODOP) return { success: false, message: 'Lodop 初始化失败' };

    LODOP.PRINT_INIT('ZPL标签打印');
    if (printerName) {
      LODOP.SET_PRINTER_INDEXA(printerName);
    }

    LODOP.ADD_PRINT_TEXT(0, 0, 100, 100, zplContent);
    LODOP.SET_PRINT_MODE('POS_BASEON_BARCODE', 1);
    LODOP.PRINT();
    return { success: true, message: 'ZPL打印任务已发送' };
  } catch (error) {
    return { success: false, message: `ZPL打印失败: ${(error as Error).message}` };
  }
}

export async function checkLodopStatus(): Promise<{
  installed: boolean;
  version: string;
  printerCount: number;
  printers: string[];
}> {
  const available = await ensureLodop();
  if (!available) {
    return { installed: false, version: '', printerCount: 0, printers: [] };
  }

  try {
    const LODOP = getLodop();
    if (!LODOP) return { installed: false, version: '', printerCount: 0, printers: [] };

    const count = Number(LODOP.GET_VALUE('PRINTER_COUNT'));
    const printers: string[] = [];
    for (let i = 0; i < count; i++) {
      printers.push(String(LODOP.GET_VALUE('PRINTER_INDEX_NAME', i)));
    }
    const version = String(LODOP.GET_VALUE('VERSION'));

    return { installed: true, version, printerCount: count, printers };
  } catch {
    return { installed: false, version: '', printerCount: 0, printers: [] };
  }
}
