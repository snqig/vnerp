/**
 * LabelPrintPreview 组件单元测试
 *
 * 覆盖:
 * - 标题在不同语言下渲染
 * - 标签内字段（物料编码/批次/数量/仓库）随语言切换
 * - 总数统计文本 totalLabelsCount 占位符替换
 * - 关闭回调、缺数据字段不渲染
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.unmock('next-intl');

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

// react-to-print 在 jsdom 环境无法真正触发打印，mock 为 noop
vi.mock('react-to-print', () => ({
  useReactToPrint: () => () => {},
}));

import { Dialog } from '@/components/ui/dialog';
import { LabelPrintPreview, type LabelData } from '@/components/printing/LabelPrintPreview';
import {
  loadMessages,
  renderWithIntl,
  type Locale,
} from '@/tests/utils/i18n-test-utils';

const sampleLabel: LabelData = {
  id: 'L1',
  qrCode: 'QR-001',
  materialCode: 'MAT-001',
  materialName: '铜版纸',
  batchNo: 'B202601',
  quantity: 100,
  unit: 'KG',
  warehouseName: '主仓库',
  supplierName: '供应商A',
  labelNo: 'LBL-001',
};

const locales: Locale[] = ['zh-CN', 'en', 'zh-TW', 'vi'];

// LabelPrintPreview 是 DialogContent，需外层 <Dialog open> 包装
function renderPreview(labels: LabelData[], locale: Locale, onClose = vi.fn()) {
  return renderWithIntl(
    <Dialog open onOpenChange={() => {}}>
      <LabelPrintPreview labels={labels} onClose={onClose} />
    </Dialog>,
    locale
  );
}

describe('LabelPrintPreview - 多语言标题与字段', () => {
  locales.forEach((locale) => {
    it(`[${locale}] 对话框标题显示对应语言的"标签打印预览"`, () => {
      const messages = loadMessages(locale);
      const qrcode = messages.QRCode as Record<string, string>;
      renderPreview([sampleLabel], locale);
      expect(screen.getByText(qrcode.labelPrintPreview)).toBeInTheDocument();
    });
  });

  it('[zh-CN] 标签字段显示中文标签前缀', () => {
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;
    renderPreview([sampleLabel], 'zh-CN');

    // warehouseName="主仓库" 包含 "仓库"，正则会匹配多个元素，使用 getAllByText 验证至少渲染
    expect(screen.getAllByText(new RegExp(qrcode.materialCode)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(qrcode.materialName)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.batch)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.quantity)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.warehouse)).length).toBeGreaterThan(0);
  });

  it('[en] 标签字段显示英文标签前缀', () => {
    const messages = loadMessages('en');
    const qrcode = messages.QRCode as Record<string, string>;
    const common = messages.Common as Record<string, string>;
    renderPreview([sampleLabel], 'en');

    expect(screen.getAllByText(new RegExp(qrcode.materialCode)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(qrcode.materialName)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.batch)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.quantity)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(common.warehouse)).length).toBeGreaterThan(0);
  });

  it('[zh-TW vs zh-CN] 物料编码前缀使用繁简不同文案', () => {
    const { unmount } = renderPreview([sampleLabel], 'zh-CN');
    const zhField = screen.getByText(/物料编码/).textContent;
    unmount();

    renderPreview([sampleLabel], 'zh-TW');
    const twField = screen.getByText(/物料編碼/).textContent;

    expect(zhField).toBe('物料编码:');
    expect(twField).toBe('物料編碼:');
  });
});

describe('LabelPrintPreview - 统计文本 totalLabelsCount', () => {
  it('单个标签 1 份时显示 1 × 1 = 1', () => {
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    renderPreview([sampleLabel], 'zh-CN');

    const expected = qrcode.totalLabelsCount
      .replace('{labels}', '1')
      .replace('{copies}', '1')
      .replace('{total}', '1');
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('多个标签 + copies 显示正确总数', () => {
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    const labels: LabelData[] = [
      sampleLabel,
      { ...sampleLabel, id: 'L2' },
      { ...sampleLabel, id: 'L3' },
    ];
    renderPreview(labels, 'zh-CN');

    // Dialog portal 渲染到 document.body，使用 screen 查询（type=number 对应 spinbutton role）
    const copiesInput = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(copiesInput, { target: { value: '5' } });

    const expected = qrcode.totalLabelsCount
      .replace('{labels}', '3')
      .replace('{copies}', '5')
      .replace('{total}', '15');
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe('LabelPrintPreview - 交互与异常', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('关闭按钮触发 onClose 回调', () => {
    const onClose = vi.fn();
    const messages = loadMessages('zh-CN');
    const common = messages.Common as Record<string, string>;
    renderPreview([sampleLabel], 'zh-CN', onClose);
    fireEvent.click(screen.getByText(common.cancel));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('缺数据字段时标签内不渲染对应行', () => {
    const minimalLabel: LabelData = { id: 'L1', qrCode: 'QR-MIN' };
    const messages = loadMessages('zh-CN');
    const qrcode = messages.QRCode as Record<string, string>;
    renderPreview([minimalLabel], 'zh-CN');
    expect(screen.queryByText(new RegExp(qrcode.materialCode))).not.toBeInTheDocument();
  });

  it('点击打印按钮调用 onPrintClick（不抛错即视为通过）', () => {
    const messages = loadMessages('zh-CN');
    const common = messages.Common as Record<string, string>;
    renderPreview([sampleLabel], 'zh-CN');

    // Dialog portal 渲染到 document.body，使用 screen 查询打印按钮
    const printBtn = screen.getByRole('button', { name: common.print });
    expect(() => fireEvent.click(printBtn)).not.toThrow();
  });
});
