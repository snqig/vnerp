'use client';

import { useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Printer } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useTranslations } from 'next-intl';
import { type CardData, type PrintSequence } from './input-card/utils';
import { useStandardCardForm } from '@/hooks/useStandardCardForm';

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

// A4 表格式录入组件（不含 MainLayout 包装，由父页面统一提供）
export function InputCardForm() {
  const { companyName } = useCompanyName();
  const router = useRouter();
  const tc = useTranslations('Common');
  const t = useTranslations('StandardCard');
  const printRef = useRef<HTMLDivElement>(null);

  const {
    data,
    loading,
    saving,
    error,
    customers,
    customerSearch,
    setCustomerSearch,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers,
    updateField,
    updateSequence,
    handleToggleMultiValue,
    handleSelectCustomer,
    handleSave,
    handleSaveAndPreview,
    isEditMode,
  } = useStandardCardForm({ mode: 'card' });

  const coreTypes = data.coreType?.split(',').filter(Boolean) || [];
  const printTypes = data.printType?.split(',').filter(Boolean) || [];
  const processMethods = data.processMethod?.split(',').filter(Boolean) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <p className="text-destructive">
          {t('loadError')}: {error}
        </p>
        <Button onClick={() => router.push('/sample/standard-card')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
      </div>
    );
  }

  return (
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
              <td className="font-bold pr-2 border-none">{t('cardCustomer')}：</td>
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
                    placeholder={t('cardSelectCustomer')}
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
              <td className="font-bold px-2 border-none">{t('cardVersion')}:</td>
              <td className="font-bold border-none">
                <EditableCell value={data.version} onChange={(v) => updateField('version', v)} />
              </td>
              <td colSpan={4} className="text-center text-xl font-bold border-none">
                {t('cardFormTitle')}
              </td>
              <td colSpan={4} className="text-center border-none">
                <span className="bg-[#1a3c7a] dark:bg-blue-700 text-white px-3 py-1 rounded font-bold">
                  HSF
                </span>
              </td>
              <td colSpan={2} className="font-bold text-right px-2 border-none">
                {t('cardDate')}：
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
              <td className="border font-bold text-center w-[4%]">{t('cardProductName')}</td>
              <td colSpan={4} className="border font-bold">
                <EditableCell
                  value={data.productName}
                  onChange={(v) => updateField('productName', v)}
                  placeholder={t('cardInputProductName')}
                />
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center w-[8%]">
                {t('cardCustomerCode')}
              </td>
              <td colSpan={3} className="border">
                <EditableCell
                  value={data.customerCode}
                  onChange={(v) => updateField('customerCode', v)}
                />
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center w-[8%]">
                {t('cardFinishedSize')}
              </td>
              <td colSpan={4} className="border">
                <EditableCell
                  value={data.finishedSize}
                  onChange={(v) => updateField('finishedSize', v)}
                />
              </td>
              <td className="border w-[4%]">m/m</td>
              <td colSpan={2} className="border font-bold">
                {t('cardTolerance')}
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
                {t('cardMaterialName')}
              </td>
              <td colSpan={4} className="border font-bold">
                <EditableCell
                  value={data.materialName}
                  onChange={(v) => updateField('materialName', v)}
                />
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardLayoutType')}
              </td>
              <td className="border">
                <EditableCell
                  value={data.layoutType}
                  onChange={(v) => updateField('layoutType', v)}
                />
              </td>
              <td rowSpan={2} className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardSpacing')}
              </td>
              <td className="border">
                <EditableCell value={data.spacing} onChange={(v) => updateField('spacing', v)} />
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardSheetSpecs')}
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
                {t('cardStandardUsage')}
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
                {t('cardCoreType')}
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
                {t('cardPaperDirection')}
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
                {t('cardRollWidth')}
              </td>
              <td className="border">
                <EditableCell
                  value={data.rollWidth}
                  onChange={(v) => updateField('rollWidth', v)}
                />
              </td>
              <td className="border">mm</td>
              <td className="border">{t('cardPaperEdge')}</td>
              <td className="border">
                <EditableCell
                  value={data.paperEdge}
                  onChange={(v) => updateField('paperEdge', v)}
                />
              </td>
              <td className="border">mm</td>
              <td colSpan={2} className="border font-bold">
                {t('cardJumpDistance')}
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
              <td rowSpan={2} className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {tc('craft')}
                <br />
                {tc('process')}
              </td>
              <td colSpan={18} className="border">
                <EditableCell
                  value={data.processFlow1}
                  onChange={(v) => updateField('processFlow1', v)}
                  placeholder={t('cardProcessFlow1')}
                />
              </td>
            </tr>
            <tr>
              <td colSpan={18} className="border">
                <EditableCell
                  value={data.processFlow2}
                  onChange={(v) => updateField('processFlow2', v)}
                  placeholder={t('cardProcessFlow2')}
                />
              </td>
            </tr>

            {/* 印刷方式/第一跳距/覆膜/成型/MYLAR */}
            <tr>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardPrintType')}
              </td>
              <td colSpan={6} className="border">
                <div className="flex justify-center gap-3">
                  {[
                    t('cardOffsetPrint'),
                    t('cardRollScreenPrint'),
                    t('cardSheetScreenPrint'),
                    t('cardRotaryPrint'),
                  ].map((type) => (
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
                {t('cardFirstJumpDistance')}
              </td>
              <td className="border">
                <EditableCell
                  value={data.firstJumpDistance}
                  onChange={(v) => updateField('firstJumpDistance', v)}
                />
              </td>
              <td colSpan={2} className="border font-bold text-center">
                {t('cardLaminating')}
              </td>
              <td colSpan={4} className="border font-bold text-center">
                {t('cardForming')}
              </td>
              <td colSpan={4} className="border font-bold text-center">
                MYLAR
              </td>
            </tr>

            {/* 印序表头行 */}
            <tr>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardPrintSequence')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardPrintColor')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardInkCode')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardFilmCode')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardStorageLocation')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardPlateCode')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardMesh')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardStorageLocation')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardPrintSide')}
              </td>
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardCategory')}
              </td>
              <td className="border">
                <EditableCell value={data.moldType} onChange={(v) => updateField('moldType', v)} />
              </td>
              <td colSpan={4} className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                <div className="flex justify-center gap-3">
                  {[t('cardDieCut'), t('cardStamping')].map((type) => (
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
              <td className="border bg-gray-50 dark:bg-gray-700 font-bold text-center">
                {t('cardMaterial')}
              </td>
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
                    <td className="border">{t('cardManufacturer')}</td>
                    <td className="border">
                      <EditableCell
                        value={data.filmManufacturer}
                        onChange={(v) => updateField('filmManufacturer', v)}
                      />
                    </td>
                    <td colSpan={2} className="border">
                      {t('cardStampingMethod')}
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
                <EditableCell value={data.etchMold} onChange={(v) => updateField('etchMold', v)} />
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
                <EditableCell value={data.filePath} onChange={(v) => updateField('filePath', v)} />
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
                <EditableCell value={data.reviewer} onChange={(v) => updateField('reviewer', v)} />
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
                <EditableCell value={data.approver} onChange={(v) => updateField('approver', v)} />
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

      {/* 操作按钮 */}
      <div className="mt-4 flex items-center justify-center gap-3 pb-4">
        <Button variant="outline" onClick={() => router.push('/sample/standard-card')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : isEditMode ? '更新' : '保存'}
        </Button>
        <Button onClick={handleSaveAndPreview} disabled={saving}>
          <Printer className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存并预览'}
        </Button>
      </div>
    </div>
  );
}
