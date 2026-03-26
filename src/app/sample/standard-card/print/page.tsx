'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download } from 'lucide-react';

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

// 与 prd_standard_card 表字段对应的数据接口
interface CardData {
  // 基础信息 (来自 prd_standard_card)
  cardNo: string;           // card_no
  customer: string;         // customer_name
  customerCode: string;     // customer_code
  productName: string;      // product_name
  version: string;          // version
  date: string;             // date
  finishedSize: string;     // finished_size
  tolerance: string;        // tolerance
  materialName: string;     // material_name
  materialType: string;     // material_type (硬胶/软胶)
  layoutType: string;       // layout_type
  printType: string;        // print_type (胶印/卷料丝印/片料丝印/轮转印)
  processMethod: string;    // process_method (模切/冲压)
  glueType: string;         // glue_type (硬胶/软胶/PU胶/其它胶)
  packingType: string;      // packing_type (包装/PCS/卷/PCS/扎/PCS/袋/PCS/箱)
  status?: number;          // status
  
  // 扩展字段 (用于打印页面的额外信息)
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
  dashedKnife?: boolean;
  slicePerRow?: string;
  slicePerRoll?: string;
  slicePerBundle?: string;
  slicePerBag?: string;
  slicePerBox?: string;
  backKnifeMold?: string;
  backMylarMold?: string;
  releasePaperCode?: string;
  releasePaperType?: string;
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
}

const InputCell = ({ value, placeholder = '', className = '' }: { value: string; placeholder?: string; className?: string }) => (
  <div className={`min-h-[20px] flex items-center justify-center text-xs ${value ? 'text-black' : 'text-gray-400'} ${className}`}>
    {value || placeholder}
  </div>
);

function PrintPageContent() {
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
              sequences: item.sequences ? (typeof item.sequences === 'string' ? JSON.parse(item.sequences) : item.sequences) : [],
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
              dashedKnife: item.dashed_knife === 1,
              slicePerRow: item.slice_per_row || '',
              slicePerRoll: item.slice_per_roll || '',
              slicePerBundle: item.slice_per_bundle || '',
              slicePerBag: item.slice_per_bag || '',
              slicePerBox: item.slice_per_box || '',
              backKnifeMold: item.back_knife_mold || '',
              backMylarMold: item.back_mylar_mold || '',
              releasePaperCode: item.release_paper_code || '',
              releasePaperType: item.release_paper_type || '',
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

  // 自动打印功能
  useEffect(() => {
    const autoPrint = searchParams.get('autoPrint');
    if (autoPrint === 'true' && !autoPrintTriggered.current && !loading && data) {
      autoPrintTriggered.current = true;
      // 延迟执行打印，确保页面完全渲染
      setTimeout(() => {
        handlePrint();
      }, 800);
    }
  }, [searchParams, loading, data]);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // 创建打印窗口
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>标准卡打印</title>
          <style>
            @page { size: A4 landscape; margin: 3mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            table td { padding: 2px; vertical-align: middle; border: 1px solid #000; }
            .border { border: 1px solid #000; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .min-h-\[20px\] { min-height: 20px; }
            .flex { display: flex; }
            .items-end { align-items: flex-end; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .flex-1 { flex: 1; }
            .mt-2 { margin-top: 8px; }
            .mr-1 { margin-right: 4px; }
            .mr-2 { margin-right: 8px; }
            .py-4 { padding-top: 16px; padding-bottom: 16px; }
            .text-2xl { font-size: 24px; }
            .text-base { font-size: 16px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-black { color: #000; }
            .text-gray-400 { color: #9ca3af; }
            .text-\[\#1a3c7a\] { color: #1a3c7a; }
            .border-b { border-bottom: 1px solid #000; }
            .border-black { border-color: #000; }
            .min-w-\[120px\] { min-width: 120px; }
            .min-w-\[200px\] { min-width: 200px; }
            .h-full { height: 100%; }
            .w-full { width: 100%; }
            .col-span-2 { grid-column: span 2; }
            .row-span-2 { grid-row: span 2; }
            .align-top { vertical-align: top; }
            * { box-sizing: border-box; }
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
    
    // 等待内容加载完成后打印
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <MainLayout title="标准卡预览">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="标准卡预览">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-red-600">加载错误: {error}</p>
          <Button onClick={() => router.push('/sample/standard-card/input')}>
            重新录入
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout title="标准卡预览">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-slate-600">暂无数据，请先录入</p>
          <Button onClick={() => router.push('/sample/standard-card/input')}>
            前往录入
          </Button>
        </div>
      </MainLayout>
    );
  }

  // 处理数据，确保所有字段都有默认值，兼容 prd_standard_card 表结构
  const processedData = {
    // 基础字段 (来自 prd_standard_card)
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
    
    // 扩展字段 (可选)
    spacing: data.spacing || '',
    spacingValue: data.spacingValue || '',
    sheetSpecs: typeof data.sheetSpecs === 'object' && data.sheetSpecs !== null
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
    sequences: Array.isArray(data.sequences) && data.sequences.length > 0
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
    dashedKnife: data.dashedKnife || false,
    slicePerRow: data.slicePerRow || '',
    slicePerRoll: data.slicePerRoll || '',
    slicePerBundle: data.slicePerBundle || '',
    slicePerBag: data.slicePerBag || '',
    slicePerBox: data.slicePerBox || '',
    backKnifeMold: data.backKnifeMold || '',
    backMylarMold: data.backMylarMold || '',
    releasePaperCode: data.releasePaperCode || '',
    releasePaperType: data.releasePaperType || '',
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
  };

  return (
    <MainLayout title="标准卡预览">
      {/* 工具栏 - 打印时隐藏 */}
      <div className="mb-4 flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => router.push('/sample/standard-card/input')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回编辑
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          打印 / 保存PDF
        </Button>
      </div>

      {/* A4 横向打印区域 */}
      <div 
        ref={printRef}
        className="bg-white mx-auto shadow-lg print:shadow-none flex flex-col"
        style={{
          width: '297mm',
          height: '210mm',
          padding: '3mm',
          boxSizing: 'border-box',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
          table { 
            height: 100%; 
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            font-family: Arial, sans-serif;
          }
          table td { 
            padding: 4px !important; 
            vertical-align: middle; 
            text-align: center;
            border: 1px solid #000;
            font-size: 12px;
            font-weight: normal;
          }
          table th {
            padding: 4px !important;
            vertical-align: middle;
            text-align: center;
            border: 1px solid #000;
            font-size: 12px;
            font-weight: bold;
            background-color: #f5f5f5;
          }
          table tr { height: auto; }
          table tbody { height: 100%; }
          .border { border: 1px solid #000; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
        `}} />
        
        <table className="w-full border-collapse text-xs flex-1" style={{ tableLayout: 'fixed' }}>
          <tbody>
            {/* 表头：公司名称 */}
            <tr>
              <td colSpan={16} className="text-center" style={{ border: 'none' }}>
                <h1 className="text-2xl font-bold text-[#1a3c7a]">苏州达昌印刷科技有限公司</h1>
              </td>
              <td colSpan={3} className="py-4" style={{ border: 'none' }}>
                <div className="flex items-center w-full h-full">
                  <span className="font-bold text-sm mr-1">NO:</span>
                  <InputCell value={processedData.cardNo} className="flex-1 min-w-[120px] h-full flex items-center border-b border-black" />
                </div>
              </td>
            </tr>

            {/* 第一行：客户信息 */}
            <tr>
              <td className="font-bold pr-2" style={{ border: 'none' }}>客户：</td>
              <td colSpan={4} style={{ border: 'none' }}>
                <InputCell value={processedData.customer} />
              </td>
              <td className="font-bold px-2" style={{ border: 'none' }}>版次:</td>
              <td style={{ border: 'none' }}>
                <InputCell value={processedData.version} />
              </td>
              <td colSpan={4} className="text-center text-xl font-bold" style={{ border: 'none' }}>
                标准卡（流程卡）
              </td>
              <td colSpan={4} className="text-center" style={{ border: 'none' }}>
                <span className="bg-[#1a3c7a] text-white px-3 py-1 rounded font-bold">HSF</span>
              </td>
              <td colSpan={2} className="font-bold text-right px-2" style={{ border: 'none' }}>日期：</td>
              <td colSpan={2} style={{ border: 'none' }}>
                <InputCell value={processedData.date} className="border-b border-black" />
              </td>
            </tr>

            {/* 空行分隔 */}
            <tr>
              <td colSpan={19} className="h-2" style={{ border: 'none' }}></td>
            </tr>

            {/* 第三行：品名信息 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center w-[4%]">品名</td>
              <td colSpan={4} className="border">
                <InputCell value={processedData.productName} />
              </td>
              <td className="border bg-white font-bold text-black text-center w-[8%]">客户料号</td>
              <td colSpan={3} className="border">
                <InputCell value={processedData.customerCode} />
              </td>
              <td className="border bg-white font-bold text-black text-center w-[8%]">成品尺寸</td>
              <td colSpan={4} className="border">
                <InputCell value={processedData.finishedSize} />
              </td>
              <td className="border w-[4%]">m/m</td>
              <td colSpan={2} className="border font-bold">公差+</td>
              <td className="border">
                <InputCell value={processedData.tolerance} />
              </td>
              <td className="border w-[4%]">mm</td>
            </tr>

            {/* 第四行：材料信息 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center">材料名称</td>
              <td colSpan={4} className="border">
                <InputCell value={processedData.materialName} />
              </td>
              <td className="border bg-white font-bold text-black text-center">排版方式</td>
              <td className="border">
                <InputCell value={processedData.layoutType} />
              </td>
              <td rowSpan={2} className="border bg-white font-bold text-black text-center">间距</td>
              <td className="border">
                <InputCell value={processedData.spacing} />
              </td>
              <td className="border bg-white font-bold text-black text-center">片料规格</td>
              <td className="border">
                <InputCell value={processedData.sheetSpecs.width} />
              </td>
              <td colSpan={2} className="border">m/m宽x</td>
              <td className="border">
                <InputCell value={processedData.sheetSpecs.length} />
              </td>
              <td className="border">m/m长</td>
              <td colSpan={2} className="border font-bold">标准用量</td>
              <td className="border">
                <InputCell value={processedData.standardUsage} />
              </td>
              <td className="border w-[4%]">c㎡/PCS</td>
            </tr>

            {/* 第五行：纸芯与卷料 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center">纸芯类型</td>
              <td colSpan={4} className="border">
                <div className="flex justify-center gap-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.coreType === '1#'} readOnly className="mr-1" /> 1#
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.coreType === '2#'} readOnly className="mr-1" /> 2#
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.coreType === '3#'} readOnly className="mr-1" /> 3#
                  </label>
                </div>
              </td>
              <td className="border bg-white font-bold text-black text-center">出纸方向</td>
              <td className="border">
                <InputCell value={processedData.paperDirection} />
              </td>
              <td className="border">
                <InputCell value={processedData.spacingValue} />
              </td>
              <td className="border bg-white font-bold text-black text-center">卷料宽度</td>
              <td className="border">
                <InputCell value={processedData.rollWidth} />
              </td>
              <td className="border">mm</td>
              <td className="border">纸边</td>
              <td className="border">
                <InputCell value={processedData.paperEdge} />
              </td>
              <td className="border">mm</td>
              <td colSpan={2} className="border font-bold"> 跳距</td>
              <td className="border">
                <InputCell value={processedData.jumpDistance} />
              </td>
              <td className="border">mm</td>
            </tr>

            {/* 工艺流程 */}
            <tr>
              <td rowSpan={2} className="border bg-white font-bold text-black text-center">工艺<br/>流程</td>
              <td colSpan={18} className="border">
                <InputCell value={processedData.processFlow1} />
              </td>
            </tr>
            <tr>
              <td colSpan={18} className="border">
                <InputCell value={processedData.processFlow2} />
              </td>
            </tr>

            {/* 表面处理 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center">表面处理</td>
              <td colSpan={2} className="border">
                <InputCell value={processedData.processFlow1} />
              </td>
              <td colSpan={4} className="border">
                <span className="mr-4">
                  <input type="radio" checked={processedData.printType === '胶印'} readOnly className="mr-1" /> 胶印
                </span>
                <span className="mr-4">
                  <input type="radio" checked={processedData.printType === '卷料丝印'} readOnly className="mr-1" /> 卷料丝印
                </span>
                <span>
                  <input type="radio" checked={processedData.printType === '片料丝印'} readOnly className="mr-1" /> 片料丝印
                </span>
              </td>
              <td className="border bg-white font-bold text-black text-center">第一跳距</td>
              <td className="border">
                <InputCell value={processedData.firstJumpDistance} />
              </td>
              <td colSpan={2} className="border font-bold text-center">覆 膜</td>
              <td colSpan={4} className="border font-bold text-center">成 型</td>
              <td colSpan={4} className="border font-bold text-center">滴胶</td>
            </tr>

            {/* 印序表头 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center">印序</td>
              <td className="border bg-white font-bold text-black text-center">印色</td>
              <td className="border bg-white font-bold text-black text-center">油墨编号</td>
              <td className="border bg-white font-bold text-black text-center">林编号</td>
              <td className="border bg-white font-bold text-black text-center">存放位置</td>
              <td className="border bg-white font-bold text-black text-center">印版编号</td>
              <td className="border bg-white font-bold text-black text-center">网目</td>
              <td className="border bg-white font-bold text-black text-center">存放位置</td>
              <td className="border bg-white font-bold text-black text-center">印面</td>
              <td className="border bg-white font-bold text-black text-center">种类</td>
              <td className="border"><InputCell value={processedData.moldCode} /></td>
              <td colSpan={2} className="border">
                <div className="flex justify-center gap-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.processMethod === '模切'} readOnly className="mr-1" /> 模切
                  </label>
                </div>
              </td>
              <td colSpan={2} className="border">
                <div className="flex justify-center gap-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.processMethod === '冲压'} readOnly className="mr-1" /> 冲压
                  </label>
                </div>
              </td>
              <td colSpan={4} className="border">
                <div className="flex justify-center gap-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={processedData.materialType === '硬胶'} readOnly className="mr-1" /> 硬胶
                  </label>
                </div>
              </td>
            </tr>

            {/* 印序数据 */}
            {processedData.sequences.map((seq, index) => (
              <tr key={seq.id}>
                <td className="border text-center font-bold">{seq.id}</td>
                <td className="border"><InputCell value={seq.color} /></td>
                <td className="border"><InputCell value={seq.inkCode} /></td>
                <td className="border"><InputCell value={seq.linCode} /></td>
                <td className="border"><InputCell value={seq.storageLocation} /></td>
                <td className="border"><InputCell value={seq.plateCode} /></td>
                <td className="border"><InputCell value={seq.mesh} /></td>
                <td className="border"><InputCell value={seq.plateStorage} /></td>
                <td className="border"><InputCell value={seq.printSide} /></td>
                {index === 0 ? (
                  <>
                    <td className="border bg-white font-bold text-black text-center">厂商</td>
                    <td className="border"><InputCell value={processedData.filmManufacturer} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">冲压方法</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.stampingMethod} /></td>
                    <td colSpan={4} className="border"><input type="radio" checked={processedData.glueType === '软胶'} readOnly className="mr-1" /> 软胶</td>
                  </>
                ) : index === 1 ? (
                  <>
                    <td className="border bg-white font-bold text-black text-center">编号</td>
                    <td className="border"><InputCell value={processedData.moldCode} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">模具编号</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.backKnifeMold} /></td>
                    <td colSpan={4} className="border"><input type="radio" checked={processedData.glueType === 'PU胶'} readOnly className="mr-1" /> PU胶</td>
                  </>
                ) : index === 2 ? (
                  <>
                    <td className="border bg-white font-bold text-black text-center">尺寸</td>
                    <td className="border"><InputCell value={processedData.adhesiveSize} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">存放位置</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.backMylarMold} /></td>
                    <td colSpan={4} className="border"><input type="radio" checked={processedData.glueType === '其它'} readOnly className="mr-1" /> 其它</td>
                  </>
                ) : index === 3 ? (
                  <>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">背胶</td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">加虚线刀</td>
                    <td colSpan={2} className="border">
                      <div className="flex justify-center gap-4">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" checked={processedData.dashedKnife === true} readOnly className="mr-1" /> 是
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="radio" checked={processedData.dashedKnife === false} readOnly className="mr-1" /> 否
                        </label>
                      </div>
                    </td>
                    <td colSpan={4} className="border bg-white font-bold text-black text-center">包装</td>
                  </>
                ) : index === 4 ? (
                  <>
                    <td className="border bg-white font-bold text-black text-center">种类</td>
                    <td className="border"><InputCell value={processedData.adhesiveType} /></td>
                    <td rowSpan={3} colSpan={2} className="border bg-white font-bold text-black text-center">切片方式</td>
                    <td className="border"><InputCell value={processedData.slicePerRow} /></td>
                    <td className="border bg-white font-bold text-black text-center">PCS/排</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.slicePerRoll} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">PCS/卷</td>
                  </>
                ) : index === 5 ? (
                  <>
                    <td className="border bg-white font-bold text-black text-center">厂商</td>
                    <td className="border"><InputCell value={processedData.adhesiveManufacturer} /></td>
                    <td className="border"><InputCell value={processedData.slicePerBundle} /></td>
                    <td className="border bg-white font-bold text-black text-center">PCS/袋</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.slicePerBag} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">PCS/扎</td>
                  </>
                ) : (
                  <>
                    <td className="border bg-white font-bold text-black text-center">规格</td>
                    <td className="border"><InputCell value={processedData.mylarSpecs} /></td>
                    <td className="border"><InputCell value={processedData.slicePerBox} /></td>
                    <td className="border bg-white font-bold text-black text-center">PCS/箱</td>
                    <td colSpan={2} className="border"><InputCell value={processedData.packingMaterial} /></td>
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">PCS/袋</td>
                  </>
                )}
              </tr>
            ))}

            {/* 印序7下面添加5行 */}
            {[8, 9, 10, 11, 12].map((rowNum) => (
              <tr key={`extra-${rowNum}`}>
                {rowNum === 8 ? (
                  <td rowSpan={3} className="border text-center font-bold">专色配比</td>
                ) : rowNum === 9 || rowNum === 10 ? (
                  null
                ) : rowNum === 11 ? (
                  <td colSpan={3} className="border bg-white font-bold text-black text-center">电脑图档存储路径</td>
                ) : rowNum === 12 ? (
                  <td className="border text-center font-bold">样品</td>
                ) : (
                  <td className="border text-center font-bold">{rowNum}</td>
                )}
                {rowNum === 8 ? (
                  <td rowSpan={3} colSpan={8} className="border"><InputCell value={processedData.colorFormula} /></td>
                ) : rowNum === 9 || rowNum === 10 ? (
                  null
                ) : rowNum === 11 ? (
                  <td colSpan={8} className="border"><InputCell value={processedData.filePath} /></td>
                ) : rowNum === 12 ? (
                  <td colSpan={10} className="border"><InputCell value={processedData.sampleInfo} /></td>
                ) : (
                  <>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.slicePerRow : rowNum === 5 ? processedData.slicePerBundle : rowNum === 6 ? processedData.slicePerBox : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? 'PCS/排' : rowNum === 5 ? 'PCS/扎' : rowNum === 6 ? 'PCS/箱' : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.slicePerRoll : rowNum === 5 ? processedData.slicePerBag : rowNum === 6 ? processedData.packingMaterial : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? 'PCS/卷' : rowNum === 5 ? 'PCS/袋' : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.glueType : rowNum === 5 ? processedData.materialType : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.printType : rowNum === 5 ? processedData.processMethod : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.layoutType : rowNum === 5 ? processedData.spacing : ''} /></td>
                    <td className="border"><InputCell value={rowNum === 4 ? processedData.spacingValue : rowNum === 5 ? processedData.standardUsage : ''} /></td>
                  </>
                )}
                {rowNum === 8 || rowNum === 9 || rowNum === 10 ? (
                  <>
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border bg-white font-bold text-black text-center">离型纸</td>
                    ) : rowNum === 9 ? (
                      <td className="border bg-white font-bold text-black text-center">种类</td>
                    ) : (
                      <td className="border bg-white font-bold text-black text-center">规格</td>
                    )}
                    {rowNum === 8 ? null : <td className="border"><InputCell value={rowNum === 9 ? processedData.releasePaperType : processedData.releasePaperSpecs} /></td>}
                    <td colSpan={2} className="border bg-white font-bold text-black text-center">{rowNum === 8 ? '适配件' : rowNum === 9 ? '背胶刀模' : '存放位置'}</td>
                    <td colSpan={2} className="border"><InputCell value={rowNum === 8 ? processedData.moldCode : rowNum === 9 ? processedData.backKnifeMold : processedData.backMylarMold} /></td>
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border"><InputCell value={processedData.slicePerBox} /></td>
                    ) : (
                      <td colSpan={2} className="border bg-white font-bold text-black text-center">{rowNum === 9 ? '垫纸材料' : '打包材料'}</td>
                    )}
                    {rowNum === 8 ? (
                      <td colSpan={2} className="border bg-white font-bold text-black text-center">PCS/箱</td>
                    ) : (
                      <td colSpan={2} className="border"><InputCell value={rowNum === 9 ? processedData.slicePerBundle : processedData.slicePerBox} /></td>
                    )}
                  </>
                ) : (
                  <>
                    {rowNum === 11 || rowNum === 12 ? null : (
                      <>
                        <td className="border"><InputCell value={rowNum === 4 ? processedData.paperDirection : rowNum === 5 ? processedData.rollWidth : rowNum === 6 ? processedData.paperEdge : ''} /></td>
                        <td className="border"><InputCell value={rowNum === 4 ? '出纸方向' : rowNum === 5 ? '卷宽' : rowNum === 6 ? '纸边' : ''} /></td>
                      </>
                    )}
                    {rowNum === 11 ? (
                      <td rowSpan={2} colSpan={8} className="border align-top"><InputCell value={`注意事项：${processedData.notes}`} /></td>
                    ) : null}
                  </>
                )}
              </tr>
            ))}

            {/* 底部签名区域 */}
            <tr>
              <td className="border bg-white font-bold text-black text-center">制表</td>
              <td colSpan={2} className="border">
                <InputCell value={processedData.creator} />
              </td>
              <td className="border bg-white font-bold text-black text-center">审核</td>
              <td className="border">
                <InputCell value={processedData.reviewer} />
              </td>
              <td className="border bg-white font-bold text-black text-center">厂务</td>
              <td colSpan={2} className="border">
                <InputCell value={processedData.factoryManager} />
              </td>
              <td className="border bg-white font-bold text-black text-center">品管</td>
              <td colSpan={2} className="border">
                <InputCell value={processedData.qualityManager} />
              </td>
              <td className="border bg-white font-bold text-black text-center">业务</td>
              <td colSpan={3} className="border">
                <InputCell value={processedData.sales} />
              </td>
              <td className="border bg-white font-bold text-black text-center">核准</td>
              <td colSpan={3} className="border">
                <InputCell value={processedData.approver} />
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* 编号输入框 */}
        <div className="mt-2 flex items-center">
          <span className="bg-white font-bold text-black text-center px-2 py-1 mr-2">编号：</span>
          <InputCell value={processedData.documentCode} className="flex-1 border-b border-black min-w-[200px]" />
        </div>
      </div>
    </MainLayout>
  );
}

function Loading() {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PrintPageContent />
    </Suspense>
  );
}
