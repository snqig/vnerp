'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';

interface PrintSequence {
  id: number;
  color: string;
  inkCode: string;
  linCode: string;
  storageLocation: string;
  plateCode: string;
  mesh: string;
  plateStorage: string;
  printSide: string;
}

interface CardData {
  cardNo: string;
  customer: string;
  customerCode: string;
  productName: string;
  version: string;
  date: string;
  finishedSize: string;
  tolerance: string;
  materialName: string;
  materialType: string;
  layoutType: string;
  printType: string;
  processMethod: string;
  glueType: string;
  packingType: string;
  status?: number;
  spacing?: string;
  spacingValue?: string;
  sheetSpecs?: { width: string; length: string };
  coreType?: string;
  paperDirection?: string;
  rollWidth?: string;
  paperEdge?: string;
  standardUsage?: string;
  jumpDistance?: string;
  processFlow1?: string;
  processFlow2?: string;
  firstJumpDistance?: string;
  sequences?: PrintSequence[];
  filmManufacturer?: string;
  filmCode?: string;
  filmSize?: string;
  stampingMethod?: string;
  moldCode?: string;
  layoutMethod?: string;
  layoutWay?: string;
  jumpDistance2?: string;
  mylarMaterial?: string;
  mylarSpecs?: string;
  mylarLayout?: string;
  mylarJump?: string;
  adhesiveType?: string;
  adhesiveManufacturer?: string;
  adhesiveCode?: string;
  adhesiveSize?: string;
  adhesiveSpecs?: string;
  dashedKnife?: boolean;
  slicePerRow?: string;
  slicePerRoll?: string;
  slicePerBundle?: string;
  slicePerBag?: string;
  slicePerBox?: string;
  packingQty?: string;
  backKnifeMold?: string;
  backMoldCode?: string;
  backMylarMold?: string;
  releasePaperCode?: string;
  releasePaperType?: string;
  releasePaperCategory?: string;
  releasePaperSpecs?: string;
  paddingMaterial?: string;
  packingMaterial?: string;
  specialColor?: string;
  colorFormula?: string;
  filePath?: string;
  sampleInfo?: string;
  notes?: string;
  creator?: string;
  reviewer?: string;
  factoryManager?: string;
  qualityManager?: string;
  sales?: string;
  approver?: string;
  documentCode?: string;
  moldType?: string;
  etchMold?: string;
  storageLocation?: string;
  extraField?: string;
}

const InputCell = ({
  value,
  placeholder = '',
  className = '',
}: {
  value: string;
  placeholder?: string;
  className?: string;
}) => (
  <div
    className={`min-h-[20px] flex items-center justify-center text-xs ${value ? 'text-black dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'} ${className}`}
  >
    {value || placeholder}
  </div>
);

function PrintPageContent() {
  const { companyName } = useCompanyName();
  const router = useRouter();
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoPrintTriggered = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const id = searchParams.get('id');
        if (id) {
          const response = await fetch(`/api/standard-cards?id=${id}`);
          const result = await response.json();
          if (result.success && result.data) {
            const item = result.data;
            setData({
              cardNo: item.card_no || '',
              customer: item.customer_name || '',
              customerCode: item.customer_code || '',
              productName: item.product_name || '',
              version: item.version || '',
              date: item.date || '',
              documentCode: item.document_code || '',
              finishedSize: item.finished_size || '',
              tolerance: item.tolerance || '',
              materialName: item.material_name || '',
              materialType: item.material_type || '',
              layoutType: item.layout_type || '',
              spacing: item.spacing || '',
              spacingValue: item.spacing_value || '',
              sheetSpecs: { width: item.sheet_width || '', length: item.sheet_length || '' },
              coreType: item.core_type || '',
              paperDirection: item.paper_direction || '',
              rollWidth: item.roll_width || '',
              paperEdge: item.paper_edge || '',
              standardUsage: item.standard_usage || '',
              jumpDistance: item.jump_distance || '',
              processFlow1: item.process_flow1 || '',
              processFlow2: item.process_flow2 || '',
              printType: item.print_type || '',
              firstJumpDistance: item.first_jump_distance || '',
              sequences: item.sequences
                ? typeof item.sequences === 'string'
                  ? JSON.parse(item.sequences)
                  : item.sequences
                : [],
              filmManufacturer: item.film_manufacturer || '',
              filmCode: item.film_code || '',
              filmSize: item.film_size || '',
              processMethod: item.process_method || '',
              stampingMethod: item.stamping_method || '',
              moldCode: item.mold_code || '',
              layoutMethod: item.layout_method || '',
              layoutWay: item.layout_way || '',
              jumpDistance2: item.jump_distance2 || '',
              mylarMaterial: item.mylar_material || '',
              mylarSpecs: item.mylar_specs || '',
              mylarLayout: item.mylar_layout || '',
              mylarJump: item.mylar_jump || '',
              adhesiveType: item.adhesive_type || '',
              adhesiveManufacturer: item.adhesive_manufacturer || '',
              adhesiveCode: item.adhesive_code || '',
              adhesiveSize: item.adhesive_size || '',
              adhesiveSpecs: item.adhesive_specs || '',
              dashedKnife: item.dashed_knife === 1,
              slicePerRow: item.slice_per_row || '',
              slicePerRoll: item.slice_per_roll || '',
              slicePerBundle: item.slice_per_bundle || '',
              slicePerBag: item.slice_per_bag || '',
              slicePerBox: item.slice_per_box || '',
              packingQty: item.packing_qty || '',
              backKnifeMold: item.back_knife_mold || '',
              backMoldCode: item.back_mold_code || '',
              backMylarMold: item.back_mylar_mold || '',
              releasePaperCode: item.release_paper_code || '',
              releasePaperType: item.release_paper_type || '',
              releasePaperCategory: item.release_paper_category || '',
              releasePaperSpecs: item.release_paper_specs || '',
              paddingMaterial: item.padding_material || '',
              packingMaterial: item.packing_material || '',
              specialColor: item.special_color || '',
              colorFormula: item.color_formula || '',
              filePath: item.file_path || '',
              sampleInfo: item.sample_info || '',
              notes: item.notes || '',
              glueType: item.glue_type || '',
              packingType: item.packing_type || '',
              creator: item.creator || '',
              reviewer: item.reviewer || '',
              factoryManager: item.factory_manager || '',
              qualityManager: item.quality_manager || '',
              sales: item.sales || '',
              approver: item.approver || '',
              moldType: item.mold_type || '',
              etchMold: item.etch_mold || '',
              storageLocation: item.storage_location || '',
              extraField: item.extra_field || '',
            });
          }
        } else {
          const savedData = sessionStorage.getItem('standardCardData');
          if (savedData) {
            setData(JSON.parse(savedData));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [searchParams]);

  useEffect(() => {
    const autoPrint = searchParams.get('autoPrint');
    if (autoPrint === 'true' && !autoPrintTriggered.current && !loading && data) {
      autoPrintTriggered.current = true;
      setTimeout(() => {
        handlePrint();
      }, 800);
    }
  }, [searchParams, loading, data]);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>标准卡打印</title>
          <style>
            @page { size: A4 landscape; margin: 3mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            table td { padding: 2px 4px; vertical-align: middle; text-align: center; border: 1px solid #333; font-size: 12px; font-weight: normal; line-height: 1.4; color: #000; }
            .border-none { border: none !important; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .flex-1 { flex: 1; }
            .mt-2 { margin-top: 8px; }
            .mr-1 { margin-right: 4px; }
            .text-2xl { font-size: 24px; }
            .text-base { font-size: 16px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-black { color: #000; }
            .text-gray-400 { color: #9ca3af; }
            .bg-white { background-color: #fff; }
            .bg-\\[\\#1a3c7a\\] { background-color: #1a3c7a; }
            .text-\\[\\#1a3c7a\\] { color: #1a3c7a; }
            .text-white { color: #fff; }
            .px-3 { padding-left: 12px; padding-right: 12px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .rounded { border-radius: 4px; }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .w-4 { width: 16px; }
            .h-4 { height: 16px; }
            .w-3 { width: 12px; }
            .h-3 { height: 12px; }
            .align-top { vertical-align: top; }
            .border-b { border-bottom: 1px solid #000; }
            .border-black { border-color: #000; }
            * { box-sizing: border-box; }
            input[type="checkbox"], input[type="radio"] { margin-right: 4px; }
          </style>
        </head>
        <body>
          <div style="width: 297mm; height: 210mm; padding: 3mm; box-sizing: border-box; background: white;">
            ${printContent}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

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
        <p className="text-destructive">加载错误: {error}</p>
        <Button onClick={() => router.push('/sample/standard-card/input')}>重新录入</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <p className="text-muted-foreground">暂无数据，请先录入</p>
        <Button onClick={() => router.push('/sample/standard-card/input')}>前往录入</Button>
      </div>
    );
  }

  const d = {
    cardNo: data.cardNo || '',
    customer: data.customer || '',
    customerCode: data.customerCode || '',
    productName: data.productName || '',
    version: data.version || '',
    date: data.date || '',
    finishedSize: data.finishedSize || '',
    tolerance: data.tolerance || '',
    materialName: data.materialName || '',
    materialType: data.materialType || '',
    layoutType: data.layoutType || '',
    printType: data.printType || '',
    processMethod: data.processMethod || '',
    glueType: data.glueType || '',
    packingType: data.packingType || '',
    spacing: data.spacing || '',
    spacingValue: data.spacingValue || '',
    sheetSpecs:
      typeof data.sheetSpecs === 'object' && data.sheetSpecs !== null
        ? data.sheetSpecs
        : { width: '', length: '' },
    coreType: data.coreType || '',
    paperDirection: data.paperDirection || '',
    rollWidth: data.rollWidth || '',
    paperEdge: data.paperEdge || '',
    standardUsage: data.standardUsage || '',
    jumpDistance: data.jumpDistance || '',
    processFlow1: data.processFlow1 || '',
    processFlow2: data.processFlow2 || '',
    firstJumpDistance: data.firstJumpDistance || '',
    sequences:
      Array.isArray(data.sequences) && data.sequences.length > 0
        ? data.sequences
        : Array.from({ length: 7 }, (_: unknown, i: number) => ({
            id: i + 1,
            color: '',
            inkCode: '',
            linCode: '',
            storageLocation: '',
            plateCode: '',
            mesh: '',
            plateStorage: '',
            printSide: '',
          })),
    filmManufacturer: data.filmManufacturer || '',
    filmCode: data.filmCode || '',
    filmSize: data.filmSize || '',
    stampingMethod: data.stampingMethod || '',
    moldCode: data.moldCode || '',
    layoutMethod: data.layoutMethod || '',
    layoutWay: data.layoutWay || '',
    jumpDistance2: data.jumpDistance2 || '',
    mylarMaterial: data.mylarMaterial || '',
    mylarSpecs: data.mylarSpecs || '',
    mylarLayout: data.mylarLayout || '',
    mylarJump: data.mylarJump || '',
    adhesiveType: data.adhesiveType || '',
    adhesiveManufacturer: data.adhesiveManufacturer || '',
    adhesiveCode: data.adhesiveCode || '',
    adhesiveSize: data.adhesiveSize || '',
    adhesiveSpecs: data.adhesiveSpecs || '',
    dashedKnife: data.dashedKnife || false,
    slicePerRow: data.slicePerRow || '',
    slicePerRoll: data.slicePerRoll || '',
    slicePerBundle: data.slicePerBundle || '',
    slicePerBag: data.slicePerBag || '',
    slicePerBox: data.slicePerBox || '',
    packingQty: data.packingQty || '',
    backKnifeMold: data.backKnifeMold || '',
    backMoldCode: data.backMoldCode || '',
    backMylarMold: data.backMylarMold || '',
    releasePaperCode: data.releasePaperCode || '',
    releasePaperType: data.releasePaperType || '',
    releasePaperCategory: data.releasePaperCategory || '',
    releasePaperSpecs: data.releasePaperSpecs || '',
    paddingMaterial: data.paddingMaterial || '',
    packingMaterial: data.packingMaterial || '',
    specialColor: data.specialColor || '',
    colorFormula: data.colorFormula || '',
    filePath: data.filePath || '',
    sampleInfo: data.sampleInfo || '',
    notes: data.notes || '',
    creator: data.creator || '',
    reviewer: data.reviewer || '',
    factoryManager: data.factoryManager || '',
    qualityManager: data.qualityManager || '',
    sales: data.sales || '',
    approver: data.approver || '',
    documentCode: data.documentCode || '',
    moldType: data.moldType || '',
    etchMold: data.etchMold || '',
    storageLocation: data.storageLocation || '',
    extraField: data.extraField || '',
  };

  const coreTypes = d.coreType?.split(',').filter(Boolean) || [];
  const printTypes = d.printType?.split(',').filter(Boolean) || [];
  const processMethods = d.processMethod?.split(',').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4 flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => router.push('/sample/standard-card')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          打印 / 保存PDF
        </Button>
      </div>

      <div
        ref={printRef}
        className="bg-white dark:bg-gray-800 mx-auto shadow-lg print:shadow-none flex flex-col"
        style={{
          width: '297mm',
          height: '210mm',
          padding: '3mm',
          boxSizing: 'border-box',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          table { height: 100%; width: 100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif; }
          table td { padding: 2px 4px !important; vertical-align: middle; text-align: center; border: 1px solid #333 !important; font-size: 12px !important; font-weight: normal !important; line-height: 1.4 !important; }
          .dark table td { border-color: rgba(255,255,255,0.2) !important; color: #e2e8f0 !important; }
          .border-none { border: none !important; }
          .border-bottom { border: none !important; border-bottom: 1px solid #000 !important; }
          .dark .border-bottom { border-bottom-color: rgba(255,255,255,0.3) !important; }
        `}} />

        <table className="w-full border-collapse text-xs flex-1" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td colSpan={16} className="text-center border-none">
                <h1 className="text-2xl font-bold text-[#1a3c7a] dark:text-blue-300">{companyName}</h1>
              </td>
              <td colSpan={3} className="py-1 border-none">
                <div className="flex items-center w-full h-full">
                  <span className="font-bold text-sm mr-1">NO:</span>
                  <div className="flex-1 min-w-[120px] h-6 text-base font-bold text-[#1a3c7a] dark:text-blue-300 text-center border-b border-black dark:border-gray-400">
                    {d.cardNo}
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td className="font-bold pr-2 border-none">客户：</td>
              <td colSpan={4} className="font-bold border-none">
                {d.customer}
              </td>
              <td className="font-bold px-2 border-none">版次:</td>
              <td className="font-bold border-none">
                {d.version}
              </td>
              <td colSpan={4} className="text-center text-xl font-bold border-none">
                标准卡（流程卡）
              </td>
              <td colSpan={4} className="text-center border-none">
                <span className="bg-[#1a3c7a] dark:bg-blue-700 text-white px-3 py-1 rounded font-bold">HSF</span>
              </td>
              <td colSpan={2} className="font-bold text-right px-2 border-none">日期：</td>
              <td colSpan={2} className="font-bold border-none">
                <div className="border-b border-black dark:border-gray-400">{d.date}</div>
              </td>
            </tr>

            <tr>
              <td colSpan={19} className="h-2 border-none"></td>
            </tr>

            <tr>
              <td className="border font-bold text-center w-[4%]">品名</td>
              <td colSpan={4} className="border font-bold">
                <InputCell value={d.productName} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center w-[8%]">客户料号</td>
              <td colSpan={3} className="border">
                <InputCell value={d.customerCode} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center w-[8%]">成品尺寸</td>
              <td colSpan={4} className="border">
                <InputCell value={d.finishedSize} />
              </td>
              <td className="border w-[4%]">m/m</td>
              <td colSpan={2} className="border font-bold">公差+</td>
              <td className="border">
                <InputCell value={d.tolerance} />
              </td>
              <td className="border w-[4%]">mm</td>
            </tr>

            <tr>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">材料名称</td>
              <td colSpan={4} className="border font-bold">
                <InputCell value={d.materialName} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">排版方式</td>
              <td className="border">
                <InputCell value={d.layoutType} />
              </td>
              <td rowSpan={2} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">间距</td>
              <td className="border">
                <InputCell value={d.spacing} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">片料规格</td>
              <td className="border">
                <InputCell value={d.sheetSpecs.width} />
              </td>
              <td colSpan={2} className="border">m/m宽x</td>
              <td className="border">
                <InputCell value={d.sheetSpecs.length} />
              </td>
              <td className="border">m/m长</td>
              <td colSpan={2} className="border font-bold">标准用量</td>
              <td className="border">
                <InputCell value={d.standardUsage} />
              </td>
              <td className="border w-[4%]">c㎡/PCS</td>
            </tr>

            <tr>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">纸芯类型</td>
              <td colSpan={4} className="border font-bold">
                <div className="flex justify-center gap-3">
                  {['3#', '2#', '1#'].map((num) => (
                    <label key={num} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={coreTypes.includes(num)}
                        readOnly
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{num}</span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">出纸方向</td>
              <td className="border">
                <InputCell value={d.paperDirection} />
              </td>
              <td className="border">
                <InputCell value={d.spacingValue} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">卷料宽度</td>
              <td className="border">
                <InputCell value={d.rollWidth} />
              </td>
              <td className="border">mm</td>
              <td className="border">纸边</td>
              <td className="border">
                <InputCell value={d.paperEdge} />
              </td>
              <td className="border">mm</td>
              <td colSpan={2} className="border font-bold">跳距</td>
              <td className="border">
                <InputCell value={d.jumpDistance} />
              </td>
              <td className="border">mm</td>
            </tr>

            <tr>
              <td rowSpan={2} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">工艺<br/>流程</td>
              <td colSpan={18} className="border">
                <InputCell value={d.processFlow1} />
              </td>
            </tr>
            <tr>
              <td colSpan={18} className="border">
                <InputCell value={d.processFlow2} />
              </td>
            </tr>

            <tr>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印刷方式</td>
              <td colSpan={6} className="border">
                <div className="flex justify-center gap-3">
                  {['胶印', '卷料丝印', '片料丝印', '轮转印'].map((type) => (
                    <label key={type} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={printTypes.includes(type)}
                        readOnly
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">第一跳距</td>
              <td className="border">
                <InputCell value={d.firstJumpDistance} />
              </td>
              <td colSpan={2} className="border font-bold text-center">覆 膜</td>
              <td colSpan={4} className="border font-bold text-center">成 型</td>
              <td colSpan={4} className="border font-bold text-center">MYLAR</td>
            </tr>

            <tr>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印序</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印色</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">油墨编号</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">菲林编号</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">存放位置</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印版编号</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">网目</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">存放位置</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印面</td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">种类</td>
              <td className="border">
                <InputCell value={d.moldType} />
              </td>
              <td colSpan={4} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">
                <div className="flex justify-center gap-3">
                  {['模切', '冲压'].map((type) => (
                    <label key={type} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={processMethods.includes(type)}
                        readOnly
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">材料</td>
              <td colSpan={3} className="border">
                <InputCell value={d.materialType} />
              </td>
            </tr>

            {d.sequences.map((seq, index) => (
              <tr key={seq.id} style={{ height: '28px' }}>
                <td className="border text-center font-bold">{seq.id}</td>
                <td className="border">
                  <InputCell value={seq.color} />
                </td>
                <td className="border">
                  <InputCell value={seq.inkCode} />
                </td>
                <td className="border">
                  <InputCell value={seq.linCode} />
                </td>
                <td className="border">
                  <InputCell value={seq.storageLocation} />
                </td>
                <td className="border">
                  <InputCell value={seq.plateCode} />
                </td>
                <td className="border">
                  <InputCell value={seq.mesh} />
                </td>
                <td className="border">
                  <InputCell value={seq.plateStorage} />
                </td>
                <td className="border">
                  <InputCell value={seq.printSide} />
                </td>
                {index === 0 ? (
                  <>
                    <td className="border">厂商</td>
                    <td className="border">
                      <InputCell value={d.filmManufacturer} />
                    </td>
                    <td colSpan={2} className="border">冲压方法</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.stampingMethod} />
                    </td>
                    <td className="border">规格</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.mylarSpecs} />
                    </td>
                    <td className="border">MM</td>
                  </>
                ) : index === 1 ? (
                  <>
                    <td className="border">编号</td>
                    <td className="border">
                      <InputCell value={d.moldCode} />
                    </td>
                    <td colSpan={2} className="border">模具编号</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.backMoldCode} />
                    </td>
                    <td className="border">排模</td>
                    <td colSpan={3} className="border">
                      <InputCell value={d.layoutMethod} />
                    </td>
                  </>
                ) : index === 2 ? (
                  <>
                    <td className="border">尺寸</td>
                    <td className="border">
                      <InputCell value={d.adhesiveSize} />
                    </td>
                    <td colSpan={2} className="border">排模方法</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.backMylarMold} />
                    </td>
                    <td className="border">跳距</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.jumpDistance2} />
                    </td>
                    <td className="border">MM</td>
                  </>
                ) : index === 3 ? (
                  <>
                    <td colSpan={2} className="border">背胶</td>
                    <td colSpan={2} className="border">加虚线刀</td>
                    <td colSpan={2} className="border">
                      <div className="flex justify-center gap-4">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" checked={d.dashedKnife === true} readOnly className="w-3 h-3" /> 是
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" checked={d.dashedKnife === false} readOnly className="w-3 h-3" /> 否
                        </label>
                      </div>
                    </td>
                    <td colSpan={4} className="border">包装</td>
                  </>
                ) : index === 4 ? (
                  <>
                    <td className="border">种类</td>
                    <td className="border">
                      <InputCell value={d.adhesiveType} />
                    </td>
                    <td rowSpan={3} colSpan={2} className="border font-bold">切片方式</td>
                    <td className="border">
                      <InputCell value={d.slicePerRow} />
                    </td>
                    <td className="border">PCS/排</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.slicePerRoll} />
                    </td>
                    <td colSpan={2} className="border">PCS/卷</td>
                  </>
                ) : index === 5 ? (
                  <>
                    <td className="border">厂商</td>
                    <td className="border">
                      <InputCell value={d.adhesiveManufacturer} />
                    </td>
                    <td className="border">
                      <InputCell value={d.slicePerBundle} />
                    </td>
                    <td className="border">PCS/袋</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.slicePerBag} />
                    </td>
                    <td colSpan={2} className="border">PCS/扎</td>
                  </>
                ) : (
                  <>
                    <td className="border">规格</td>
                    <td className="border">
                      <InputCell value={d.adhesiveSpecs} />
                    </td>
                    <td className="border">
                      <InputCell value={d.slicePerBox} />
                    </td>
                    <td className="border">PCS/箱</td>
                    <td colSpan={2} className="border">
                      <InputCell value={d.packingQty} />
                    </td>
                    <td colSpan={2} className="border">PCS/袋</td>
                  </>
                )}
              </tr>
            ))}

            {[8, 9, 10, 11, 12].map((rowNum) => (
              <tr key={`extra-${rowNum}`}>
                {rowNum === 8 ? (
                  <td rowSpan={3} className="border text-center font-bold">专色配比</td>
                ) : rowNum === 9 || rowNum === 10 ? null : rowNum === 11 ? (
                  <td colSpan={3} className="border">
                    <InputCell value="电脑图档存储路径" />
                  </td>
                ) : (
                  <td className="border text-center font-bold">样品</td>
                )}
                {rowNum === 8 ? (
                  <td rowSpan={3} colSpan={8} className="border">
                    <InputCell value={d.colorFormula} />
                  </td>
                ) : rowNum === 9 || rowNum === 10 ? null : rowNum === 11 ? (
                  <td colSpan={8} className="border">
                    <InputCell value={d.filePath} />
                  </td>
                ) : rowNum === 12 ? (
                  <td colSpan={10} className="border">
                    <InputCell value={d.sampleInfo} />
                  </td>
                ) : null}
                {rowNum === 8 || rowNum === 9 || rowNum === 10 ? (
                  <>
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border">离型纸</td>
                    ) : rowNum === 9 ? (
                      <td className="border">种类</td>
                    ) : (
                      <td className="border">规格</td>
                    )}
                    {rowNum === 8 ? null : (
                      <td className="border">
                        <InputCell value={rowNum === 9 ? d.releasePaperType : d.releasePaperSpecs} />
                      </td>
                    )}
                    <td colSpan={2} className="border">
                      {rowNum === 8 ? '背刀刀模' : rowNum === 9 ? '腐蚀刀模' : '腐蚀刀模'}
                    </td>
                    <td colSpan={2} className="border">
                      <InputCell
                        value={
                          rowNum === 8
                            ? d.backKnifeMold
                            : rowNum === 9
                              ? d.etchMold
                              : d.extraField
                        }
                      />
                    </td>
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border">
                        <InputCell value={d.releasePaperCategory} />
                      </td>
                    ) : (
                      <td colSpan={2} className="border">
                        {rowNum === 9 ? '垫纸材料' : '打包材料'}
                      </td>
                    )}
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border">PCS/箱</td>
                    ) : (
                      <td colSpan={2} className="border">
                        <InputCell
                          value={
                            rowNum === 9 ? d.paddingMaterial : d.packingMaterial
                          }
                        />
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    {rowNum === 11 ? (
                      <td rowSpan={2} colSpan={8} className="border align-top">
                        <InputCell value={`注意事项：${d.notes}`} />
                      </td>
                    ) : null}
                  </>
                )}
              </tr>
            ))}

            <tr>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">制表</td>
              <td colSpan={2} className="border font-bold text-center">
                <InputCell value={d.creator} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">审核</td>
              <td className="border">
                <InputCell value={d.reviewer} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">厂务</td>
              <td colSpan={2} className="border font-bold text-center">
                <InputCell value={d.factoryManager} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">品管</td>
              <td colSpan={2} className="border font-bold text-center">
                <InputCell value={d.qualityManager} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">业务</td>
              <td colSpan={3} className="border font-bold text-center">
                <InputCell value={d.sales} />
              </td>
              <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">核准</td>
              <td colSpan={3} className="border font-bold text-center">
                <InputCell value={d.approver} />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 flex items-center">
          <span className="font-bold text-sm mr-2">编号：</span>
          <InputCell
            value={d.documentCode}
            className="flex-1 border-b border-black dark:border-gray-400 min-w-[200px]"
          />
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PrintPageContent />
    </Suspense>
  );
}
