import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function setupBrowser() {
  (global as any).window = {} as any;
  (global as any).document = {
    createElement: vi.fn(() => ({})),
    head: { appendChild: vi.fn() },
  } as any;
}

function cleanupBrowser() {
  delete (global as any).window;
  delete (global as any).document;
}

describe('lodop', () => {
  let lodopModule: typeof import('@/lib/lodop');

  beforeEach(() => {
    vi.resetModules();
    setupBrowser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanupBrowser();
  });

  describe('getLodop', () => {
    it('should return null when CLODOP is not available', async () => {
      lodopModule = await import('@/lib/lodop');
      expect(lodopModule.getLodop()).toBeNull();
    });

    it('should return CLODOP instance when available', async () => {
      const clodop = { PRINT_INIT: vi.fn(), PRINT: vi.fn(), GET_VALUE: vi.fn() };
      (global as any).window.CLODOP = clodop;
      lodopModule = await import('@/lib/lodop');
      expect(lodopModule.getLodop()).toBe(clodop);
    });
  });

  describe('printLabel with CLODOP available', () => {
    let mockLodop: Record<string, any>;

    beforeEach(() => {
      mockLodop = {
        PRINT_INIT: vi.fn(),
        SET_PRINTER_INDEXA: vi.fn(),
        SET_PRINT_PAGESIZE: vi.fn(),
        ADD_PRINT_QRCODE: vi.fn(),
        ADD_PRINT_TEXT: vi.fn(),
        SET_PRINT_COPIES: vi.fn(),
        PRINT: vi.fn(),
      };
      (global as any).window.CLODOP = mockLodop;
    });

    it('should return success and call all Lodop APIs', async () => {
      lodopModule = await import('@/lib/lodop');
      const result = await lodopModule.printLabel({
        labelNo: 'LBL-001',
        qrCode: '{"ID":"LBL-001","TYPE":"1","NAME":"M1"}',
        materialCode: 'MC1',
        materialName: 'M1',
        specification: 'A4',
        batchNo: 'B1',
        quantity: 10,
        unit: 'kg',
        copies: 2,
        printerName: 'Zebra ZD621',
        labelWidth: 60,
        labelHeight: 40,
      });

      expect(mockLodop.PRINT_INIT).toHaveBeenCalledWith('标签打印');
      expect(mockLodop.SET_PRINTER_INDEXA).toHaveBeenCalledWith('Zebra ZD621');
      expect(mockLodop.SET_PRINT_PAGESIZE).toHaveBeenCalledWith(1, 600, 400, '');
      expect(mockLodop.ADD_PRINT_QRCODE).toHaveBeenCalledWith(10, 10, 100, 100, '{"ID":"LBL-001","TYPE":"1","NAME":"M1"}');
      expect(mockLodop.ADD_PRINT_TEXT).toHaveBeenCalledTimes(6);
      expect(mockLodop.SET_PRINT_COPIES).toHaveBeenCalledWith(2);
      expect(mockLodop.PRINT).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
      expect(result.message).toBe('打印任务已发送');
    });

    it('should print without specification', async () => {
      lodopModule = await import('@/lib/lodop');
      const result = await lodopModule.printLabel({
        labelNo: 'LBL-002',
        qrCode: 'qr2',
        materialCode: 'MC2',
        materialName: 'M2',
        batchNo: 'B2',
        quantity: 5,
        unit: 'pcs',
      });
      // Without specification: 5 text calls (code, name, qty, batch, labelNo)
      expect(mockLodop.ADD_PRINT_TEXT).toHaveBeenCalledTimes(5);
      expect(result.success).toBe(true);
    });
  });

  describe('printZPL with CLODOP available', () => {
    let mockLodop: Record<string, any>;

    beforeEach(() => {
      mockLodop = {
        PRINT_INIT: vi.fn(),
        SET_PRINTER_INDEXA: vi.fn(),
        ADD_PRINT_TEXT: vi.fn(),
        SET_PRINT_MODE: vi.fn(),
        PRINT: vi.fn(),
      };
      (global as any).window.CLODOP = mockLodop;
    });

    it('should send ZPL content with printer name', async () => {
      lodopModule = await import('@/lib/lodop');
      const result = await lodopModule.printZPL('^XA^FS^XZ', 'Zebra Printer');

      expect(mockLodop.PRINT_INIT).toHaveBeenCalledWith('ZPL标签打印');
      expect(mockLodop.SET_PRINTER_INDEXA).toHaveBeenCalledWith('Zebra Printer');
      expect(mockLodop.ADD_PRINT_TEXT).toHaveBeenCalledWith(0, 0, 100, 100, '^XA^FS^XZ');
      expect(mockLodop.PRINT).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
    });

    it('should send ZPL without printer name', async () => {
      lodopModule = await import('@/lib/lodop');
      const result = await lodopModule.printZPL('^XA^LL200^FS^XZ');
      expect(mockLodop.SET_PRINTER_INDEXA).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('checkLodopStatus with CLODOP available', () => {
    it('should return printer list and version', async () => {
      const mockLodop = {
        GET_VALUE: vi.fn((name: string, ...args: Loose[]) => {
          if (name === 'PRINTER_COUNT') return 2;
          if (name === 'PRINTER_INDEX_NAME') return args[0] === 0 ? 'Zebra ZD621' : 'Zebra ZT410';
          if (name === 'VERSION') return '6.7.3.1';
          return '';
        }),
      };
      (global as any).window.CLODOP = mockLodop;
      lodopModule = await import('@/lib/lodop');
      const status = await lodopModule.checkLodopStatus();
      expect(status.installed).toBe(true);
      expect(status.version).toBe('6.7.3.1');
      expect(status.printerCount).toBe(2);
      expect(status.printers).toEqual(['Zebra ZD621', 'Zebra ZT410']);
    });
  });
});
