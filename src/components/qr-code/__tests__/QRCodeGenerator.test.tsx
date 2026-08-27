/**
 * QRCodeGenerator 组件单元测试
 *
 * 覆盖:
 * - 多语言文本渲染（zh-CN / en / zh-TW / vi）
 * - 类型未选择分支
 * - 生成成功分支
 * - 生成失败分支
 * - 网络异常分支
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// 还原 next-intl 真实实现（setup.ts 中被全局 mock 为 key 回显）
vi.unmock('next-intl');

// 模块级 mock：useToast 返回稳定的 toastSpy
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastSpy,
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

// mock logger，避免污染测试输出
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

// mock qrcode.react，避免 jsdom 中绘制 svg
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-svg-mock">{value}</div>
  ),
}));

import { QRCodeGenerator } from '@/components/qr-code/QRCodeGenerator';
import {
  loadMessages,
  renderWithIntl,
  mockFetch,
  mockClipboard,
  type Locale,
} from '@/tests/utils/i18n-test-utils';

const locales: Locale[] = ['zh-CN', 'en', 'zh-TW', 'vi'];

describe('QRCodeGenerator - 多语言文本渲染', () => {
  locales.forEach((locale) => {
    it(`[${locale}] 触发按钮显示对应语言的"生成二维码"文案`, () => {
      const messages = loadMessages(locale);
      const expected = (messages.QRCode as Record<string, string>).generateQRCode;
      renderWithIntl(<QRCodeGenerator />, locale);
      expect(screen.getByRole('button', { name: expected })).toBeInTheDocument();
    });
  });

  it('[zh-CN vs en] 同一按钮在不同语言下文案不同', () => {
    const { unmount } = renderWithIntl(<QRCodeGenerator />, 'zh-CN');
    const zhText = screen.getByRole('button').textContent;
    unmount();

    renderWithIntl(<QRCodeGenerator />, 'en');
    const enText = screen.getByRole('button').textContent;
    expect(zhText).not.toBe(enText);
  });
});

describe('QRCodeGenerator - 核心逻辑分支', () => {
  beforeEach(() => {
    toastSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('未选择类型时显示 selectType 提示，且不调用 fetch', async () => {
    const fetchMock = mockFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const expected = qrcode.selectType;

    const { getAllByRole } = renderWithIntl(
      <QRCodeGenerator initialType={'' as any} />,
      'zh-CN'
    );
    // 先点击触发按钮打开对话框
    fireEvent.click(getAllByRole('button')[0]);
    // 再点击对话框内的生成按钮（同名按钮中的最后一个）
    const dialogBtns = getAllByRole('button', { name: qrcode.generateQRCode });
    fireEvent.click(dialogBtns[dialogBtns.length - 1]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expected,
          variant: 'destructive',
        })
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('生成成功后显示 generateSuccess toast 并展示二维码', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode'),
        response: { success: true, data: { qr_code: 'QR-TEST-001' } },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);
    mockClipboard();

    const onSuccess = vi.fn();
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;

    const { getAllByRole } = renderWithIntl(
      <QRCodeGenerator onSuccess={onSuccess} />,
      'zh-CN'
    );

    // 打开对话框（第一个按钮）
    fireEvent.click(getAllByRole('button')[0]);
    // 对话框内的生成按钮（此时有两个同名按钮，选第二个）
    const dialogBtns = getAllByRole('button', { name: qrcode.generateQRCode });
    fireEvent.click(dialogBtns[dialogBtns.length - 1]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.generateSuccess,
          description: 'QR-TEST-001',
        })
      );
    });
    expect(onSuccess).toHaveBeenCalledWith('QR-TEST-001', { qr_code: 'QR-TEST-001' });
    // mock 的 QRCodeSVG 和 Card 内 <p> 都包含 'QR-TEST-001'，使用 getAllByText 验证均渲染
    expect(screen.getAllByText('QR-TEST-001').length).toBeGreaterThan(0);
    expect(screen.getByTestId('qr-svg-mock')).toHaveTextContent('QR-TEST-001');
  });

  it('生成接口返回失败时显示 generateFailed toast', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode'),
        response: { success: false, message: '参数错误' },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;

    const { getAllByRole } = renderWithIntl(<QRCodeGenerator />, 'zh-CN');
    fireEvent.click(getAllByRole('button')[0]);
    const dialogBtns = getAllByRole('button', { name: qrcode.generateQRCode });
    fireEvent.click(dialogBtns[dialogBtns.length - 1]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.generateFailed,
          description: '参数错误',
          variant: 'destructive',
        })
      );
    });
  });

  it('fetch 抛出异常时显示 operationFailed toast', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('zh-CN');
    const common = messages.Common as Record<string, string>;
    const qrcode = messages.QRCode as Record<string, string>;

    const { getAllByRole } = renderWithIntl(<QRCodeGenerator />, 'zh-CN');
    fireEvent.click(getAllByRole('button')[0]);
    const dialogBtns = getAllByRole('button', { name: qrcode.generateQRCode });
    fireEvent.click(dialogBtns[dialogBtns.length - 1]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: common.operationFailed,
          variant: 'destructive',
        })
      );
    });
  });

  it('[en] 失败分支文案随语言切换为英文', async () => {
    const fetchMock = mockFetch([
      {
        matcher: (url) => url.includes('/api/qrcode'),
        response: { success: false, message: 'invalid' },
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const messages = loadMessages('en');
    const qrcode = messages.QRCode as Record<string, string>;

    const { getAllByRole } = renderWithIntl(<QRCodeGenerator />, 'en');
    fireEvent.click(getAllByRole('button')[0]);
    const dialogBtns = getAllByRole('button', { name: qrcode.generateQRCode });
    fireEvent.click(dialogBtns[dialogBtns.length - 1]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: qrcode.generateFailed,
          variant: 'destructive',
        })
      );
    });
  });
});
