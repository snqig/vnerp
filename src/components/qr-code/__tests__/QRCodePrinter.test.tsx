/**
 * QRCodePrinter 组件单元测试
 *
 * 覆盖:
 * - 多语言按钮文本（print/preview）
 * - 标签模板名称在不同语言下渲染
 * - 打印成功分支
 * - 打印失败分支
 * - 网络异常分支
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.unmock('next-intl');

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastSpy,
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    branch: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-svg-mock">{value}</div>
  ),
}));

import { QRCodePrinter } from '@/components/qr-code/QRCodePrinter';
import {
  loadMessages,
  renderWithIntl,
  mockFetch,
  type Locale,
} from '@/tests/utils/i18n-test-utils';

const locales: Locale[] = ['zh-CN', 'en', 'zh-TW', 'vi'];

describe('QRCodePrinter - 多语言按钮文本', () => {
  locales.forEach((locale) => {
    it(`[${locale}] icon=both 显示预览和打印两个按钮（对应语言文案）`, () => {
      const messages = loadMessages(locale);
      const common = messages.Common as Record<string, string>;
      renderWithIntl(<QRCodePrinter qrCode="QR-X" icon="both" />, locale);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      expect(buttons.some((b) => b.textContent?.includes(common.print))).toBe(true);
      expect(buttons.some((b) => b.textContent?.includes(common.preview))).toBe(true);
    });
  });

  it('icon=print 时只显示打印按钮', () => {
    const messages = loadMessages('zh-CN');
    const common = messages.Common as Record<string, string>;
    renderWithIntl(<QRCodePrinter qrCode="QR-X" icon="print" />, 'zh-CN');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain(common.print);
  });
});

describe('QRCodePrinter - 标签模板多语言渲染', () => {
  it('[zh-CN] 预览对话框标题包含对应语言的模板名称', () => {
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;
    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-X" icon="both" />,
      'zh-CN'
    );
    fireEvent.click(getByText(common.preview));
    const expectedTitle = `${qrcode.labelPreview} - ${qrcode.labelMaterial}`;
    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
  });

  it('[en] 打印配置对话框标题显示英文', () => {
    const messages = loadMessages('en');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;
    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-X" icon="print" />,
      'en'
    );
    fireEvent.click(getByText(common.print));
    expect(screen.getByText(qrcode.printConfig)).toBeInTheDocument();
  });
});

describe('QRCodePrinter - 核心逻辑分支', () => {
  beforeEach(() => {
    toastSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('打印成功时显示 printJobSent + printCopiesSent toast', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode/print'),
        response: { success: true, data: { job_id: 'J1' } },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;

    const onPrintSuccess = vi.fn();
    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-OK" icon="print" copies={3} onPrintSuccess={onPrintSuccess} />,
      'zh-CN'
    );

    fireEvent.click(getByText(common.print));
    fireEvent.click(getByText(qrcode.confirmPrint));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.printJobSent,
        })
      );
    });
    expect(onPrintSuccess).toHaveBeenCalledWith({ job_id: 'J1' });
  });

  it('打印接口返回失败时显示 printFailed toast', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode/print'),
        response: { success: false, message: '打印机离线' },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;

    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-FAIL" icon="print" />,
      'zh-CN'
    );

    fireEvent.click(getByText(common.print));
    fireEvent.click(getByText(qrcode.confirmPrint));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.printFailed,
          description: '打印机离线',
          variant: 'destructive',
        })
      );
    });
  });

  it('fetch 异常时显示 printFailed + printServiceError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;

    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-ERR" icon="print" />,
      'zh-CN'
    );

    fireEvent.click(getByText(common.print));
    fireEvent.click(getByText(qrcode.confirmPrint));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.printFailed,
          description: qrcode.printServiceError,
          variant: 'destructive',
        })
      );
    });
  });

  it('[vi] 成功分支文案随语言切换为越南语', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode/print'),
        response: { success: true, data: {} },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('vi');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;

    const { getByText } = renderWithIntl(
      <QRCodePrinter qrCode="QR-VI" icon="print" />,
      'vi'
    );

    fireEvent.click(getByText(common.print));
    fireEvent.click(getByText(qrcode.confirmPrint));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.printJobSent,
        })
      );
    });
  });
});
