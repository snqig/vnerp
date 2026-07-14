'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import {
  type CardData,
  type PrintSequence,
  createEmptyData,
  toggleMultiValue,
  mapCardDataToApiPayload,
  mapApiDataToCardData,
} from './utils';

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  shortName: string;
}

const EditableCell = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  type = 'text',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full min-h-[20px] px-1 py-0.5 text-xs text-black dark:text-gray-200 bg-transparent border-none outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:ring-1 focus:ring-blue-400 rounded-sm ${className}`}
  />
);

const EditableTextarea = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  rows = 2,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-1 py-0.5 text-xs text-black dark:text-gray-200 bg-transparent border-none outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:ring-1 focus:ring-blue-400 rounded-sm resize-none ${className}`}
  />
);

function InputCardPageContent() {
  const { companyName } = useCompanyName();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  const [data, setData] = useState<CardData>(createEmptyData);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/standard-cards?id=${id}`);
      const result = await response.json();
      if (result.success && result.data) {
        setData(mapApiDataToCardData(result.data));
      } else {
        console.error('[StandardCard:Load] API返回失败:', result.message);
        setError(result.message || '加载失败');
      }
    } catch (e) {
      console.error('[StandardCard:Load] 异常:', e instanceof Error ? e.message : e, e);
      setError(e instanceof Error ? e.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await authFetch('/api/customers?page=1&pageSize=999');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const formatted: Customer[] = result.data.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          customerCode: (item.customer_code as string) || '',
          customerName: (item.customer_name as string) || '',
          shortName: (item.short_name as string) || '',
        }));
        setCustomers(formatted);
      } else if (result.success && result.data?.list && Array.isArray(result.data.list)) {
        const formatted: Customer[] = result.data.list.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          customerCode: (item.customer_code as string) || '',
          customerName: (item.customer_name as string) || '',
          shortName: (item.short_name as string) || '',
        }));
        setCustomers(formatted);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    if (editId) {
      loadData(editId);
    }
  }, [editId, loadData, fetchCustomers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateField = <K extends keyof CardData>(field: K, value: CardData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSequence = (index: number, field: keyof PrintSequence, value: string) => {
    setData((prev) => ({
      ...prev,
      sequences: prev.sequences.map((seq, i) => (i === index ? { ...seq, [field]: value } : seq)),
    }));
  };

  const handleToggleMultiValue = (
    field: 'coreType' | 'printType' | 'processMethod',
    value: string
  ) => {
    setData((prev) => ({ ...prev, [field]: toggleMultiValue(prev[field], value) }));
  };

  const handleSelectCustomer = (customer: Customer) => {
    updateField('customer', customer.customerName);
    updateField('customerCode', customer.customerCode);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!data.customer) {
      console.warn('[StandardCard:Save] 校验失败: 客户为空');
      toast({ title: '请选择客户', variant: 'destructive' });
      return;
    }
    if (!data.productName) {
      console.warn('[StandardCard:Save] 校验失败: 品名为空');
      toast({ title: '请输入品名', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const saveData = mapCardDataToApiPayload(data, isEditMode, editId || undefined);

      const url = '/api/standard-cards';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('[StandardCard:Save] API返回失败:', result.message, result);
        toast({ title: result.message || '保存失败', variant: 'destructive' });
        return;
      }

      const newId = result.data?.id || parseInt(editId || '0');
      toast({ title: isEditMode ? '标准卡更新成功' : '标准卡保存成功' });

      if (!isEditMode && newId) {
        router.push(`/sample/standard-card/input-card?id=${newId}`);
      }
    } catch (e) {
      console.error('[StandardCard:Save] 异常:', e instanceof Error ? e.message : e, e);
      toast({ title: '保存失败，请检查网络连接', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPreview = async () => {
    await handleSave();
    const id = searchParams.get('id');
    if (id) {
      router.push(`/sample/standard-card/print?id=${id}`);
    }
  };

  const coreTypes = data.coreType?.split(',').filter(Boolean) || [];
  const printTypes = data.printType?.split(',').filter(Boolean) || [];
  const processMethods = data.processMethod?.split(',').filter(Boolean) || [];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
          <p className="text-destructive">加载错误: {error}</p>
          <Button onClick={() => router.push('/sample/standard-card')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        {/* A4 横向表格录入区 */}
        <div
          ref={printRef}
          className="bg-white dark:bg-gray-800 mx-auto shadow-lg flex flex-col"
          style={{
            width: '297mm',
            minHeight: '210mm',
            padding: '3mm',
            boxSizing: 'border-box',
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
                table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif; }
                table td { padding: 1px 2px !important; vertical-align: middle; text-align: center; border: 1px solid #333 !important; font-size: 12px !important; font-weight: normal !important; line-height: 1.4 !important; }
                .dark table td { border-color: rgba(255,255,255,0.2) !important; }
                .border-none { border: none !important; }
                .border-bottom { border: none !important; border-bottom: 1px solid #000 !important; }
                .dark .border-bottom { border-bottom-color: rgba(255,255,255,0.3) !important; }
                input[type="text"], textarea { background: transparent; }
                input[type="checkbox"], input[type="radio"] { cursor: pointer; }
              `,
            }}
          />

          <table
            className="w-full border-collapse text-xs"
            style={{ tableLayout: 'fixed', height: 'calc(210mm - 6mm)' }}
          >
            <tbody>
              {/* 标题行 */}
              <tr>
                <td colSpan={16} className="text-center border-none">
                  <input
                    type="text"
                    value={companyName}
                    readOnly
                    className="w-full text-center text-2xl font-bold text-[#1a3c7a] dark:text-blue-300 bg-transparent border-none outline-none"
                  />
                </td>
                <td colSpan={3} className="py-1 border-none">
                  <div className="flex items-center w-full h-full">
                    <span className="font-bold text-sm mr-1">NO:</span>
                    <EditableCell
                      value={data.cardNo}
                      onChange={(v) => updateField('cardNo', v)}
                      className="flex-1 min-w-[120px] h-6 text-base font-bold text-[#1a3c7a] dark:text-blue-300 text-center border-b border-black dark:border-gray-400"
                    />
                  </div>
                </td>
              </tr>

              {/* 客户/版次/日期行 */}
              <tr>
                <td className="font-bold pr-2 border-none">客户：</td>
                <td colSpan={4} className="font-bold border-none">
                  <div className="customer-dropdown-container relative">
                    <input
                      type="text"
                      value={showCustomerDropdown ? customerSearch : data.customer}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        updateField('customer', e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => {
                        setCustomerSearch(data.customer);
                        setShowCustomerDropdown(true);
                      }}
                      placeholder="选择或输入客户"
                      className="w-full px-1 py-0.5 text-xs font-bold bg-transparent border-none outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 rounded-sm"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
                        {filteredCustomers.slice(0, 20).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="px-2 py-1 text-xs hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer text-left"
                          >
                            <span className="font-mono text-gray-500 mr-2">{c.customerCode}</span>
                            {c.customerName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="font-bold px-2 border-none">版次:</td>
                <td className="font-bold border-none">
                  <EditableCell value={data.version} onChange={(v) => updateField('version', v)} />
                </td>
                <td colSpan={4} className="text-center text-xl font-bold border-none">
                  标准卡（流程卡）
                </td>
                <td colSpan={4} className="text-center border-none">
                  <span className="bg-[#1a3c7a] dark:bg-blue-700 text-white px-3 py-1 rounded font-bold">
                    HSF
                  </span>
                </td>
                <td colSpan={2} className="font-bold text-right px-2 border-none">
                  日期：
                </td>
                <td colSpan={2} className="font-bold border-none">
                  <EditableCell
                    type="date"
                    value={data.date}
                    onChange={(v) => updateField('date', v)}
                  />
                </td>
              </tr>

              <tr>
                <td colSpan={19} className="h-2 border-none"></td>
              </tr>

              {/* 品名/客户料号/成品尺寸/公差 */}
              <tr>
                <td className="border font-bold text-center w-[4%]">品名</td>
                <td colSpan={4} className="border font-bold">
                  <EditableCell
                    value={data.productName}
                    onChange={(v) => updateField('productName', v)}
                    placeholder="输入品名"
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center w-[8%]">
                  客户料号
                </td>
                <td colSpan={3} className="border">
                  <EditableCell
                    value={data.customerCode}
                    onChange={(v) => updateField('customerCode', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center w-[8%]">
                  成品尺寸
                </td>
                <td colSpan={4} className="border">
                  <EditableCell
                    value={data.finishedSize}
                    onChange={(v) => updateField('finishedSize', v)}
                  />
                </td>
                <td className="border w-[4%]">m/m</td>
                <td colSpan={2} className="border font-bold">
                  公差+
                </td>
                <td className="border">
                  <EditableCell
                    value={data.tolerance}
                    onChange={(v) => updateField('tolerance', v)}
                  />
                </td>
                <td className="border w-[4%]">mm</td>
              </tr>

              {/* 材料名称/排版方式/间距/片料规格/标准用量 */}
              <tr>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  材料名称
                </td>
                <td colSpan={4} className="border font-bold">
                  <EditableCell
                    value={data.materialName}
                    onChange={(v) => updateField('materialName', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  排版方式
                </td>
                <td className="border">
                  <EditableCell
                    value={data.layoutType}
                    onChange={(v) => updateField('layoutType', v)}
                  />
                </td>
                <td
                  rowSpan={2}
                  className="border bg-gray-50 dark:bg-gray-700 font-bold text-center"
                >
                  间距
                </td>
                <td className="border">
                  <EditableCell value={data.spacing} onChange={(v) => updateField('spacing', v)} />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  片料规格
                </td>
                <td className="border">
                  <EditableCell
                    value={data.sheetSpecs.width}
                    onChange={(v) => updateField('sheetSpecs', { ...data.sheetSpecs, width: v })}
                  />
                </td>
                <td colSpan={2} className="border">
                  m/m宽x
                </td>
                <td className="border">
                  <EditableCell
                    value={data.sheetSpecs.length}
                    onChange={(v) => updateField('sheetSpecs', { ...data.sheetSpecs, length: v })}
                  />
                </td>
                <td className="border">m/m长</td>
                <td colSpan={2} className="border font-bold">
                  标准用量
                </td>
                <td className="border">
                  <EditableCell
                    value={data.standardUsage}
                    onChange={(v) => updateField('standardUsage', v)}
                  />
                </td>
                <td className="border w-[4%]">c㎡/PCS</td>
              </tr>

              {/* 纸芯类型/出纸方向/卷料宽度/纸边/跳距 */}
              <tr>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  纸芯类型
                </td>
                <td colSpan={4} className="border font-bold">
                  <div className="flex justify-center gap-3">
                    {['3#', '2#', '1#'].map((num) => (
                      <label key={num} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coreTypes.includes(num)}
                          onChange={() => handleToggleMultiValue('coreType', num)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{num}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  出纸方向
                </td>
                <td className="border">
                  <EditableCell
                    value={data.paperDirection}
                    onChange={(v) => updateField('paperDirection', v)}
                  />
                </td>
                <td className="border">
                  <EditableCell
                    value={data.spacingValue}
                    onChange={(v) => updateField('spacingValue', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  卷料宽度
                </td>
                <td className="border">
                  <EditableCell
                    value={data.rollWidth}
                    onChange={(v) => updateField('rollWidth', v)}
                  />
                </td>
                <td className="border">mm</td>
                <td className="border">纸边</td>
                <td className="border">
                  <EditableCell
                    value={data.paperEdge}
                    onChange={(v) => updateField('paperEdge', v)}
                  />
                </td>
                <td className="border">mm</td>
                <td colSpan={2} className="border font-bold">
                  跳距
                </td>
                <td className="border">
                  <EditableCell
                    value={data.jumpDistance}
                    onChange={(v) => updateField('jumpDistance', v)}
                  />
                </td>
                <td className="border">mm</td>
              </tr>

              {/* 工艺流程 */}
              <tr>
                <td
                  rowSpan={2}
                  className="border bg-gray-50 dark:bg-gray-700 font-bold text-center"
                >
                  {tc('craft')}
                  <br />
                  {tc('process')}
                </td>
                <td colSpan={18} className="border">
                  <EditableCell
                    value={data.processFlow1}
                    onChange={(v) => updateField('processFlow1', v)}
                    placeholder="工艺流程1"
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={18} className="border">
                  <EditableCell
                    value={data.processFlow2}
                    onChange={(v) => updateField('processFlow2', v)}
                    placeholder="工艺流程2"
                  />
                </td>
              </tr>

              {/* 印刷方式/第一跳距/覆膜/成型/MYLAR */}
              <tr>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  印刷方式
                </td>
                <td colSpan={6} className="border">
                  <div className="flex justify-center gap-3">
                    {['胶印', '卷料丝印', '片料丝印', '轮转印'].map((type) => (
                      <label key={type} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printTypes.includes(type)}
                          onChange={() => handleToggleMultiValue('printType', type)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  第一跳距
                </td>
                <td className="border">
                  <EditableCell
                    value={data.firstJumpDistance}
                    onChange={(v) => updateField('firstJumpDistance', v)}
                  />
                </td>
                <td colSpan={2} className="border font-bold text-center">
                  覆 膜
                </td>
                <td colSpan={4} className="border font-bold text-center">
                  成 型
                </td>
                <td colSpan={4} className="border font-bold text-center">
                  MYLAR
                </td>
              </tr>

              {/* 印序表头行 */}
              <tr>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">印序</td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">印色</td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  油墨编号
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  菲林编号
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  存放位置
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  印版编号
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">网目</td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  存放位置
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">印面</td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">种类</td>
                <td className="border">
                  <EditableCell
                    value={data.moldType}
                    onChange={(v) => updateField('moldType', v)}
                  />
                </td>
                <td
                  colSpan={4}
                  className="border bg-gray-50 dark:bg-gray-700 font-bold text-center"
                >
                  <div className="flex justify-center gap-3">
                    {['模切', '冲压'].map((type) => (
                      <label key={type} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={processMethods.includes(type)}
                          onChange={() => handleToggleMultiValue('processMethod', type)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">材料</td>
                <td colSpan={3} className="border">
                  <EditableCell
                    value={data.materialType}
                    onChange={(v) => updateField('materialType', v)}
                  />
                </td>
              </tr>

              {/* 印序数据行 1-7 */}
              {data.sequences.map((seq, index) => (
                <tr key={seq.id} style={{ height: '28px' }}>
                  <td className="border text-center font-bold">{seq.id}</td>
                  <td className="border">
                    <EditableCell
                      value={seq.color}
                      onChange={(v) => updateSequence(index, 'color', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.inkCode}
                      onChange={(v) => updateSequence(index, 'inkCode', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.linCode}
                      onChange={(v) => updateSequence(index, 'linCode', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.storageLocation}
                      onChange={(v) => updateSequence(index, 'storageLocation', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.plateCode}
                      onChange={(v) => updateSequence(index, 'plateCode', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.mesh}
                      onChange={(v) => updateSequence(index, 'mesh', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.plateStorage}
                      onChange={(v) => updateSequence(index, 'plateStorage', v)}
                    />
                  </td>
                  <td className="border">
                    <EditableCell
                      value={seq.printSide}
                      onChange={(v) => updateSequence(index, 'printSide', v)}
                    />
                  </td>
                  {index === 0 ? (
                    <>
                      <td className="border">厂商</td>
                      <td className="border">
                        <EditableCell
                          value={data.filmManufacturer}
                          onChange={(v) => updateField('filmManufacturer', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        冲压方法
                      </td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.stampingMethod}
                          onChange={(v) => updateField('stampingMethod', v)}
                        />
                      </td>
                      <td className="border">{tc('specification')}</td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.mylarSpecs}
                          onChange={(v) => updateField('mylarSpecs', v)}
                        />
                      </td>
                      <td className="border">MM</td>
                    </>
                  ) : index === 1 ? (
                    <>
                      <td className="border">编号</td>
                      <td className="border">
                        <EditableCell
                          value={data.moldCode}
                          onChange={(v) => updateField('moldCode', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        模具编号
                      </td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.backMoldCode}
                          onChange={(v) => updateField('backMoldCode', v)}
                        />
                      </td>
                      <td className="border">排模</td>
                      <td colSpan={3} className="border">
                        <EditableCell
                          value={data.layoutMethod}
                          onChange={(v) => updateField('layoutMethod', v)}
                        />
                      </td>
                    </>
                  ) : index === 2 ? (
                    <>
                      <td className="border">{tc('size')}</td>
                      <td className="border">
                        <EditableCell
                          value={data.adhesiveSize}
                          onChange={(v) => updateField('adhesiveSize', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        排模方法
                      </td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.backMylarMold}
                          onChange={(v) => updateField('backMylarMold', v)}
                        />
                      </td>
                      <td className="border">跳距</td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.jumpDistance2}
                          onChange={(v) => updateField('jumpDistance2', v)}
                        />
                      </td>
                      <td className="border">MM</td>
                    </>
                  ) : index === 3 ? (
                    <>
                      <td colSpan={2} className="border">
                        背胶
                      </td>
                      <td colSpan={2} className="border">
                        加虚线刀
                      </td>
                      <td colSpan={2} className="border">
                        <div className="flex justify-center gap-4">
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="dashedKnife"
                              checked={data.dashedKnife === true}
                              onChange={() => updateField('dashedKnife', true)}
                              className="w-3 h-3"
                            />{' '}
                            是
                          </label>
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="dashedKnife"
                              checked={data.dashedKnife === false}
                              onChange={() => updateField('dashedKnife', false)}
                              className="w-3 h-3"
                            />{' '}
                            否
                          </label>
                        </div>
                      </td>
                      <td colSpan={4} className="border">
                        包装
                      </td>
                    </>
                  ) : index === 4 ? (
                    <>
                      <td className="border">种类</td>
                      <td className="border">
                        <EditableCell
                          value={data.adhesiveType}
                          onChange={(v) => updateField('adhesiveType', v)}
                        />
                      </td>
                      <td rowSpan={3} colSpan={2} className="border font-bold">
                        切片方式
                      </td>
                      <td className="border">
                        <EditableCell
                          value={data.slicePerRow}
                          onChange={(v) => updateField('slicePerRow', v)}
                        />
                      </td>
                      <td className="border">PCS/排</td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.slicePerRoll}
                          onChange={(v) => updateField('slicePerRoll', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        PCS/卷
                      </td>
                    </>
                  ) : index === 5 ? (
                    <>
                      <td className="border">厂商</td>
                      <td className="border">
                        <EditableCell
                          value={data.adhesiveManufacturer}
                          onChange={(v) => updateField('adhesiveManufacturer', v)}
                        />
                      </td>
                      <td className="border">
                        <EditableCell
                          value={data.slicePerBundle}
                          onChange={(v) => updateField('slicePerBundle', v)}
                        />
                      </td>
                      <td className="border">PCS/袋</td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.slicePerBag}
                          onChange={(v) => updateField('slicePerBag', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        PCS/扎
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border">{tc('specification')}</td>
                      <td className="border">
                        <EditableCell
                          value={data.adhesiveSpecs}
                          onChange={(v) => updateField('adhesiveSpecs', v)}
                        />
                      </td>
                      <td className="border">
                        <EditableCell
                          value={data.slicePerBox}
                          onChange={(v) => updateField('slicePerBox', v)}
                        />
                      </td>
                      <td className="border">PCS/箱</td>
                      <td colSpan={2} className="border">
                        <EditableCell
                          value={data.packingQty}
                          onChange={(v) => updateField('packingQty', v)}
                        />
                      </td>
                      <td colSpan={2} className="border">
                        PCS/袋
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* 专色配比/离型纸/刀模行 */}
              <tr>
                <td rowSpan={3} className="border text-center font-bold">
                  专色配比
                </td>
                <td rowSpan={3} colSpan={8} className="border">
                  <EditableTextarea
                    value={data.colorFormula}
                    onChange={(v) => updateField('colorFormula', v)}
                    placeholder="专色配比"
                  />
                </td>
                <td colSpan={2} className="border">
                  离型纸
                </td>
                <td colSpan={2} className="border">
                  背刀刀模
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.backKnifeMold}
                    onChange={(v) => updateField('backKnifeMold', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.releasePaperCategory}
                    onChange={(v) => updateField('releasePaperCategory', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  PCS/箱
                </td>
              </tr>
              <tr>
                <td className="border">种类</td>
                <td className="border">
                  <EditableCell
                    value={data.releasePaperType}
                    onChange={(v) => updateField('releasePaperType', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  腐蚀刀模
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.etchMold}
                    onChange={(v) => updateField('etchMold', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  垫纸材料
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.paddingMaterial}
                    onChange={(v) => updateField('paddingMaterial', v)}
                  />
                </td>
              </tr>
              <tr>
                <td className="border">{tc('specification')}</td>
                <td className="border">
                  <EditableCell
                    value={data.releasePaperSpecs}
                    onChange={(v) => updateField('releasePaperSpecs', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  腐蚀刀模
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.extraField}
                    onChange={(v) => updateField('extraField', v)}
                  />
                </td>
                <td colSpan={2} className="border">
                  打包材料
                </td>
                <td colSpan={2} className="border">
                  <EditableCell
                    value={data.packingMaterial}
                    onChange={(v) => updateField('packingMaterial', v)}
                  />
                </td>
              </tr>

              {/* 电脑图档/样品/注意事项 */}
              <tr>
                <td colSpan={3} className="border">
                  电脑图档存储路径
                </td>
                <td colSpan={8} className="border">
                  <EditableCell
                    value={data.filePath}
                    onChange={(v) => updateField('filePath', v)}
                  />
                </td>
                <td rowSpan={2} colSpan={8} className="border align-top">
                  <div className="text-left p-1">
                    <span className="font-bold text-xs">注意事项：</span>
                    <EditableTextarea
                      value={data.notes}
                      onChange={(v) => updateField('notes', v)}
                      placeholder="输入注意事项"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border text-center font-bold">样品</td>
                <td colSpan={10} className="border">
                  <EditableCell
                    value={data.sampleInfo}
                    onChange={(v) => updateField('sampleInfo', v)}
                  />
                </td>
              </tr>

              {/* 审批行 */}
              <tr>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">制表</td>
                <td colSpan={2} className="border font-bold text-center">
                  <EditableCell value={data.creator} onChange={(v) => updateField('creator', v)} />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                  {tc('review')}
                </td>
                <td className="border">
                  <EditableCell
                    value={data.reviewer}
                    onChange={(v) => updateField('reviewer', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">厂务</td>
                <td colSpan={2} className="border font-bold text-center">
                  <EditableCell
                    value={data.factoryManager}
                    onChange={(v) => updateField('factoryManager', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">品管</td>
                <td colSpan={2} className="border font-bold text-center">
                  <EditableCell
                    value={data.qualityManager}
                    onChange={(v) => updateField('qualityManager', v)}
                  />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">业务</td>
                <td colSpan={3} className="border font-bold text-center">
                  <EditableCell value={data.sales} onChange={(v) => updateField('sales', v)} />
                </td>
                <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">核准</td>
                <td colSpan={3} className="border font-bold text-center">
                  <EditableCell
                    value={data.approver}
                    onChange={(v) => updateField('approver', v)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 底部编号 — 移至页面最底部 */}
        <div className="mt-2 flex items-center">
          <span className="font-bold text-sm mr-2">编号：</span>
          <EditableCell
            value={data.documentCode}
            onChange={(v) => updateField('documentCode', v)}
            className="flex-1 border-b border-black dark:border-gray-400 min-w-[200px]"
          />
        </div>
      </div>
    </MainLayout>
  );
}

function Loading() {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function InputCardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InputCardPageContent />
    </Suspense>
  );
}
