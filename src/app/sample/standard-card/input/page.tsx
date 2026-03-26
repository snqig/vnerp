'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Printer, ArrowLeft, Building2, Upload, FileText, Image as ImageIcon, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

interface Customer {
  id: number;
  code: string;
  name: string;
  shortName: string;
  contact: string;
  phone: string;
  address: string;
}

const customers: Customer[] = [];

interface FormData {
  id?: string;
  cardNo: string;
  customer: string;
  version: string;
  date: string;
  productName: string;
  customerCode: string;
  finishedSize: string;
  tolerance: string;
  materialName: string;
  layoutType: string;
  spacing: string;
  spacingValue: string;
  sheetSpecs: { width: string; length: string };
  coreType: string;
  paperDirection: string;
  rollWidth: string;
  paperEdge: string;
  standardUsage: string;
  jumpDistance: string;
  processFlow1: string;
  processFlow2: string;
  printType: string;
  firstJumpDistance: string;
  sequences: PrintSequence[];
  filmManufacturer: string;
  filmCode: string;
  filmSize: string;
  processMethod: string;
  stampingMethod: string;
  moldCode: string;
  layoutMethod: string;
  layoutWay: string;
  jumpDistance2: string;
  mylarMaterial: string;
  mylarSpecs: string;
  mylarLayout: string;
  mylarJump: string;
  adhesiveType: string;
  adhesiveManufacturer: string;
  adhesiveCode: string;
  adhesiveSize: string;
  dashedKnife: boolean;
  slicePerRow: string;
  slicePerRoll: string;
  slicePerBundle: string;
  slicePerBag: string;
  slicePerBox: string;
  backKnifeMold: string;
  backMylarMold: string;
  releasePaperCode: string;
  releasePaperType: string;
  releasePaperSpecs: string;
  paddingMaterial: string;
  packingMaterial: string;
  specialColor: string;
  colorFormula: string;
  filePath: string;
  sampleInfo: string;
  notes: string;
  creator: string;
  reviewer: string;
  factoryManager: string;
  qualityManager: string;
  sales: string;
  approver: string;
  documentCode: string;
  glueType: string;
  packingType: string;
  materialType: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'draft' | 'pending' | 'active' | 'archived';
}

const initialSequence: PrintSequence = {
  id: 1,
  color: '',
  inkCode: '',
  linCode: '',
  storageLocation: '',
  plateCode: '',
  mesh: '',
  plateStorage: '',
  printSide: '',
};

// 输入单元格组件
const InputCell = ({ 
  value, 
  onChange, 
  placeholder = '', 
  className = '',
  type = 'text'
}: { 
  value: string; 
  onChange?: (value: string) => void;
  placeholder?: string; 
  className?: string;
  type?: string;
}) => (
  <div className={`min-h-[20px] flex items-center justify-center text-xs ${value ? 'text-black' : 'text-gray-400'} ${className}`}>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="h-5 min-h-[20px] px-1 py-0 text-xs text-center border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
    />
  </div>
);

// 文件上传组件
const FileUploadCell = ({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp',
  className = ''
}: {
  value: string;
  onChange?: (value: string) => void;
  accept?: string;
  className?: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState(value);

  useEffect(() => {
    setFileName(value);
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 只保存文件名（实际项目中这里应该上传文件到服务器）
      setFileName(file.name);
      onChange?.(file.name);
    }
  };

  const handleClear = () => {
    setFileName('');
    onChange?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!fileName) return <Upload className="h-4 w-4 text-gray-400" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className={`min-h-[24px] flex items-center justify-center gap-1 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {fileName ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {getFileIcon()}
          <span className="text-xs truncate flex-1" title={fileName}>{fileName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <Upload className="h-4 w-4" />
          <span>点击上传</span>
        </button>
      )}
    </div>
  );
};

export default function InputPage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    cardNo: '',
    customer: '',
    version: '',
    date: new Date().toISOString().split('T')[0],
    productName: '',
    customerCode: '',
    finishedSize: '',
    tolerance: '',
    materialName: '',
    layoutType: '',
    spacing: '',
    spacingValue: '',
    sheetSpecs: { width: '', length: '' },
    coreType: '',
    paperDirection: '',
    rollWidth: '',
    paperEdge: '',
    standardUsage: '',
    jumpDistance: '',
    processFlow1: '',
    processFlow2: '',
    printType: '卷料丝印',
    firstJumpDistance: '',
    sequences: Array.from({ length: 7 }, (_, i) => ({ ...initialSequence, id: i + 1 })),
    filmManufacturer: '',
    filmCode: '',
    filmSize: '',
    processMethod: '模切',
    stampingMethod: '',
    moldCode: '',
    layoutMethod: '',
    layoutWay: '',
    jumpDistance2: '',
    mylarMaterial: '',
    mylarSpecs: '',
    mylarLayout: '',
    mylarJump: '',
    adhesiveType: '',
    adhesiveManufacturer: '',
    adhesiveCode: '',
    adhesiveSize: '',
    dashedKnife: false,
    slicePerRow: '',
    slicePerRoll: '',
    slicePerBundle: '',
    slicePerBag: '',
    slicePerBox: '',
    backKnifeMold: '',
    backMylarMold: '',
    releasePaperCode: '',
    releasePaperType: '',
    releasePaperSpecs: '',
    paddingMaterial: '',
    packingMaterial: '',
    specialColor: '',
    colorFormula: '',
    filePath: '',
    sampleInfo: '',
    notes: '',
    creator: '',
    reviewer: '',
    factoryManager: '',
    qualityManager: '',
    sales: '',
    approver: '',
    documentCode: '',
    glueType: '硬胶',
    packingType: '包装',
    materialType: '硬胶',
  });

  useEffect(() => {
    const editMode = sessionStorage.getItem('editMode');
    const savedData = sessionStorage.getItem('standardCardData');
    if (editMode === 'true' && savedData) {
      setIsEditMode(true);
      const parsedData = JSON.parse(savedData);
      if (typeof parsedData.sequences === 'number') {
        parsedData.sequences = Array.from({ length: parsedData.sequences }, (_, i) => ({
          id: i + 1,
          color: '',
          inkCode: '',
          linCode: '',
          storageLocation: '',
          plateCode: '',
          mesh: '',
          plateStorage: '',
          printSide: '',
        }));
      }
      if (!parsedData.sheetSpecs || typeof parsedData.sheetSpecs !== 'object') {
        parsedData.sheetSpecs = { width: '', length: '' };
      }
      setFormData(parsedData);
      sessionStorage.removeItem('editMode');
    }
  }, []);

  // 加载客户列表
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers?page=1&pageSize=100');
        const result = await response.json();
        if (result.success) {
          const formattedCustomers: Customer[] = result.data.map((item: any) => ({
            id: item.id,
            code: item.customer_code,
            name: item.customer_name,
            shortName: item.short_name,
            contact: item.contact_name,
            phone: item.contact_phone,
            address: item.address,
          }));
          setCustomerList(formattedCustomers);
        }
      } catch (error) {
        console.error('加载客户列表失败:', error);
      }
    };
    fetchCustomers();
  }, []);

  const handleSaveAndPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    
    try {
      const saveData = {
        card_no: formData.cardNo || `SC${Date.now()}`,
        customer_name: formData.customer,
        customer_code: formData.customerCode,
        product_name: formData.productName,
        version: formData.version,
        date: formData.date,
        document_code: formData.documentCode,
        finished_size: formData.finishedSize,
        tolerance: formData.tolerance,
        material_name: formData.materialName,
        material_type: formData.materialType,
        layout_type: formData.layoutType,
        spacing: formData.spacing,
        spacing_value: formData.spacingValue,
        sheet_width: formData.sheetSpecs.width,
        sheet_length: formData.sheetSpecs.length,
        core_type: formData.coreType,
        paper_direction: formData.paperDirection,
        roll_width: formData.rollWidth,
        paper_edge: formData.paperEdge,
        standard_usage: formData.standardUsage,
        jump_distance: formData.jumpDistance,
        process_flow1: formData.processFlow1,
        process_flow2: formData.processFlow2,
        print_type: formData.printType,
        first_jump_distance: formData.firstJumpDistance,
        sequences: JSON.stringify(formData.sequences),
        film_manufacturer: formData.filmManufacturer,
        film_code: formData.filmCode,
        film_size: formData.filmSize,
        process_method: formData.processMethod,
        stamping_method: formData.stampingMethod,
        mold_code: formData.moldCode,
        layout_method: formData.layoutMethod,
        layout_way: formData.layoutWay,
        jump_distance2: formData.jumpDistance2,
        mylar_material: formData.mylarMaterial,
        mylar_specs: formData.mylarSpecs,
        mylar_layout: formData.mylarLayout,
        mylar_jump: formData.mylarJump,
        adhesive_type: formData.adhesiveType,
        adhesive_manufacturer: formData.adhesiveManufacturer,
        adhesive_code: formData.adhesiveCode,
        adhesive_size: formData.adhesiveSize,
        dashed_knife: formData.dashedKnife ? 1 : 0,
        slice_per_row: formData.slicePerRow,
        slice_per_roll: formData.slicePerRoll,
        slice_per_bundle: formData.slicePerBundle,
        slice_per_bag: formData.slicePerBag,
        slice_per_box: formData.slicePerBox,
        back_knife_mold: formData.backKnifeMold,
        back_mylar_mold: formData.backMylarMold,
        release_paper_code: formData.releasePaperCode,
        release_paper_type: formData.releasePaperType,
        release_paper_specs: formData.releasePaperSpecs,
        padding_material: formData.paddingMaterial,
        packing_material: formData.packingMaterial,
        glue_type: formData.glueType,
        packing_type: formData.packingType,
        special_color: formData.specialColor,
        color_formula: formData.colorFormula,
        file_path: formData.filePath,
        sample_info: formData.sampleInfo,
        notes: formData.notes,
        creator: formData.creator,
        reviewer: formData.reviewer,
        factory_manager: formData.factoryManager,
        quality_manager: formData.qualityManager,
        sales: formData.sales,
        approver: formData.approver,
        status: 1,
      };
      
      const response = await fetch('/api/standard-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 保存成功后跳转到预览页面
        router.push(`/sample/standard-card/print?id=${result.data.id}`);
      } else {
        alert('保存失败: ' + result.message);
        setIsNavigating(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查网络连接');
      setIsNavigating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    
    try {
      const saveData = {
        card_no: formData.cardNo || `SC${Date.now()}`,
        customer_name: formData.customer,
        customer_code: formData.customerCode,
        product_name: formData.productName,
        version: formData.version,
        date: formData.date,
        document_code: formData.documentCode,
        finished_size: formData.finishedSize,
        tolerance: formData.tolerance,
        material_name: formData.materialName,
        material_type: formData.materialType,
        layout_type: formData.layoutType,
        spacing: formData.spacing,
        spacing_value: formData.spacingValue,
        sheet_width: formData.sheetSpecs.width,
        sheet_length: formData.sheetSpecs.length,
        core_type: formData.coreType,
        paper_direction: formData.paperDirection,
        roll_width: formData.rollWidth,
        paper_edge: formData.paperEdge,
        standard_usage: formData.standardUsage,
        jump_distance: formData.jumpDistance,
        process_flow1: formData.processFlow1,
        process_flow2: formData.processFlow2,
        print_type: formData.printType,
        first_jump_distance: formData.firstJumpDistance,
        sequences: JSON.stringify(formData.sequences),
        film_manufacturer: formData.filmManufacturer,
        film_code: formData.filmCode,
        film_size: formData.filmSize,
        process_method: formData.processMethod,
        stamping_method: formData.stampingMethod,
        mold_code: formData.moldCode,
        layout_method: formData.layoutMethod,
        layout_way: formData.layoutWay,
        jump_distance2: formData.jumpDistance2,
        mylar_material: formData.mylarMaterial,
        mylar_specs: formData.mylarSpecs,
        mylar_layout: formData.mylarLayout,
        mylar_jump: formData.mylarJump,
        adhesive_type: formData.adhesiveType,
        adhesive_manufacturer: formData.adhesiveManufacturer,
        adhesive_code: formData.adhesiveCode,
        adhesive_size: formData.adhesiveSize,
        dashed_knife: formData.dashedKnife ? 1 : 0,
        slice_per_row: formData.slicePerRow,
        slice_per_roll: formData.slicePerRoll,
        slice_per_bundle: formData.slicePerBundle,
        slice_per_bag: formData.slicePerBag,
        slice_per_box: formData.slicePerBox,
        back_knife_mold: formData.backKnifeMold,
        back_mylar_mold: formData.backMylarMold,
        release_paper_code: formData.releasePaperCode,
        release_paper_type: formData.releasePaperType,
        release_paper_specs: formData.releasePaperSpecs,
        padding_material: formData.paddingMaterial,
        packing_material: formData.packingMaterial,
        special_color: formData.specialColor,
        color_formula: formData.colorFormula,
        file_path: formData.filePath,
        sample_info: formData.sampleInfo,
        notes: formData.notes,
        glue_type: formData.glueType,
        packing_type: formData.packingType,
        creator: formData.creator,
        reviewer: formData.reviewer,
        factory_manager: formData.factoryManager,
        quality_manager: formData.qualityManager,
        sales: formData.sales,
        approver: formData.approver,
        status: 1,
      };
      
      const response = await fetch('/api/standard-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('保存成功！');
        router.push('/sample/standard-card');
      } else {
        alert('保存失败: ' + result.message);
        setIsNavigating(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查网络连接');
      setIsNavigating(false);
    }
  };

  const updateSequence = (index: number, field: keyof PrintSequence, value: string) => {
    setFormData(prev => ({
      ...prev,
      sequences: prev.sequences.map((seq, i) => 
        i === index ? { ...seq, [field]: value } : seq
      ),
    }));
  };

  return (
    <MainLayout title="标准卡录入">
      <form onSubmit={handleSaveAndPrint} className="space-y-4">
        {/* 工具栏 */}
        <div className="flex justify-between items-center mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/sample/standard-card')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
            <Button type="submit">
              <Printer className="h-4 w-4 mr-2" />
              保存并预览
            </Button>
          </div>
        </div>

        {/* A4 横向录入区域 */}
        <div 
          className="bg-white mx-auto shadow-lg flex flex-col"
          style={{
            width: '297mm',
            minHeight: '210mm',
            padding: '3mm',
            boxSizing: 'border-box',
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            table { height: 100%; width: 100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif; }
            table td { padding: 4px !important; vertical-align: middle; text-align: center; border: 1px solid #000; font-size: 12px; font-weight: normal; }
            table td input { text-align: center; }
            .border-none { border: none !important; }
            .border-bottom { border: none !important; border-bottom: 1px solid #000 !important; }
          `}} />
          
          <table className="w-full border-collapse text-xs flex-1" style={{ tableLayout: 'fixed' }}>
            <tbody>
              {/* 表头：公司名称 */}
              <tr>
                <td colSpan={16} className="text-center border-none">
                  <h1 className="text-2xl font-bold text-[#1a3c7a]">苏州达昌印刷科技有限公司</h1>
                </td>
                <td colSpan={3} className="py-4 border-none">
                  <div className="flex items-center w-full h-full">
                    <span className="font-bold text-sm mr-1">NO:</span>
                    <Input
                      value={formData.cardNo}
                      onChange={(e) => setFormData(p => ({ ...p, cardNo: e.target.value }))}
                      placeholder="编号"
                      className="h-6 text-base font-bold text-[#1a3c7a] flex-1 min-w-[120px] border-0 border-b border-black rounded-none px-0 text-center"
                    />
                  </div>
                </td>
              </tr>

              {/* 第一行：客户信息 */}
              <tr>
                <td className="font-bold pr-2 border-none">客户：</td>
                <td colSpan={4} className="font-bold border-none">
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-center font-normal h-6 min-h-[24px] px-1 py-0 text-xs border-0 border-b border-black rounded-none bg-transparent hover:bg-transparent"
                      >
                        {formData.customer || "选择客户..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索客户..." />
                        <CommandList>
                          <CommandEmpty>未找到客户</CommandEmpty>
                          <CommandGroup>
                            {customerList.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => {
                                  setFormData(p => ({
                                    ...p,
                                    customer: customer.name,
                                    customerCode: customer.code
                                  }));
                                  setCustomerOpen(false);
                                }}
                              >
                                <Building2 className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">{customer.code}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="font-bold px-2 border-none">版次:</td>
                <td className="font-bold border-none">
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))}
                    placeholder="版次"
                    className="h-6 border-0 border-b border-black rounded-none px-0 text-center"
                  />
                </td>
                <td colSpan={4} className="text-center text-xl font-bold border-none">
                  标准卡（流程卡）
                </td>
                <td colSpan={4} className="text-center border-none">
                  <span className="bg-[#1a3c7a] text-white px-3 py-1 rounded font-bold">HSF</span>
                </td>
                <td colSpan={2} className="font-bold text-right px-2 border-none">日期：</td>
                <td colSpan={2} className="font-bold border-none">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="h-6 border-0 border-b border-black rounded-none px-0 text-center"
                  />
                </td>
              </tr>

              {/* 空行分隔 */}
              <tr>
                <td colSpan={19} className="h-2 border-none"></td>
              </tr>

              {/* 第三行：品名信息 */}
              <tr>
                <td className="border font-bold text-center w-[4%]">品名</td>
                <td colSpan={4} className="border font-bold">
                  <InputCell 
                    value={formData.productName}
                    onChange={(v) => setFormData(p => ({ ...p, productName: v }))}
                  />
                </td>
                <td className="border bg-white font-bold text-black text-center w-[8%]">客户料号</td>
                <td colSpan={3} className="border">
                  <InputCell 
                    value={formData.customerCode}
                    onChange={(v) => setFormData(p => ({ ...p, customerCode: v }))}
                  />
                </td>
                <td className="border bg-white font-bold text-black text-center w-[8%]">成品尺寸</td>
                <td colSpan={4} className="border">
                  <InputCell 
                    value={formData.finishedSize}
                    onChange={(v) => setFormData(p => ({ ...p, finishedSize: v }))}
                  />
                </td>
                <td className="border w-[4%]">m/m</td>
                <td colSpan={2} className="border font-bold">公差+</td>
                <td className="border">
                  <InputCell 
                    value={formData.tolerance}
                    onChange={(v) => setFormData(p => ({ ...p, tolerance: v }))}
                  />
                </td>
                <td className="border w-[4%]">mm</td>
              </tr>

              {/* 第四行：材料信息 */}
              <tr>
                <td className="border bg-white font-bold text-black text-center">材料名称</td>
                <td colSpan={4} className="border font-bold">
                  <InputCell 
                    value={formData.materialName}
                    onChange={(v) => setFormData(p => ({ ...p, materialName: v }))}
                  />
                </td>
                <td className="border bg-white font-bold text-black text-center">排版方式</td>
                <td className="border">
                  <InputCell 
                    value={formData.layoutType}
                    onChange={(v) => setFormData(p => ({ ...p, layoutType: v }))}
                  />
                </td>
                <td rowSpan={2} className="border bg-white font-bold text-black text-center">间距</td>
                <td className="border">
                  <InputCell 
                    value={formData.spacing}
                    onChange={(v) => setFormData(p => ({ ...p, spacing: v }))}
                  />
                </td>
                <td className="border bg-white font-bold text-black text-center">片料规格</td>
                <td className="border">
                  <InputCell 
                    value={formData.sheetSpecs.width}
                    onChange={(v) => setFormData(p => ({ ...p, sheetSpecs: { ...p.sheetSpecs, width: v } }))}
                  />
                </td>
                <td colSpan={2} className="border">m/m宽x</td>
                <td className="border">
                  <InputCell 
                    value={formData.sheetSpecs.length}
                    onChange={(v) => setFormData(p => ({ ...p, sheetSpecs: { ...p.sheetSpecs, length: v } }))}
                  />
                </td>
                <td className="border">m/m长</td>
                <td colSpan={2} className="border font-bold">标准用量</td>
                <td className="border">
                  <InputCell 
                    value={formData.standardUsage}
                    onChange={(v) => setFormData(p => ({ ...p, standardUsage: v }))}
                  />
                </td>
                <td className="border w-[4%]">c㎡/PCS</td>
              </tr>

              {/* 第五行：纸芯与卷料 */}
              <tr>
                <td className="border bg-white font-bold text-black text-center">纸芯类型</td>
                <td colSpan={4} className="border font-bold">
                  <div className="flex justify-center gap-3">
                    {['3#', '2#', '1#'].map((num) => (
                      <label key={num} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.coreType?.includes(num)}
                          onChange={(e) => {
                            const currentTypes = formData.coreType?.split(',').filter(Boolean) || [];
                            let newTypes;
                            if (e.target.checked) {
                              if (!currentTypes.includes(num)) {
                                newTypes = [...currentTypes, num];
                              } else {
                                newTypes = currentTypes;
                              }
                            } else {
                              newTypes = currentTypes.filter(t => t !== num);
                            }
                            setFormData(p => ({ ...p, coreType: newTypes.join(',') }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{num}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-white font-bold text-black text-center">出纸方向</td>
                <td className="border">
                  <InputCell 
                    value={formData.paperDirection}
                    onChange={(v) => setFormData(p => ({ ...p, paperDirection: v }))}
                  />
                </td>
                <td className="border">
                  <InputCell 
                    value={formData.spacingValue}
                    onChange={(v) => setFormData(p => ({ ...p, spacingValue: v }))}
                  />
                </td>
                <td className="border bg-white font-bold text-black text-center">卷料宽度</td>
                <td className="border">
                  <InputCell 
                    value={formData.rollWidth}
                    onChange={(v) => setFormData(p => ({ ...p, rollWidth: v }))}
                  />
                </td>
                <td className="border">mm</td>
                <td className="border">纸边</td>
                <td className="border">
                  <InputCell 
                    value={formData.paperEdge}
                    onChange={(v) => setFormData(p => ({ ...p, paperEdge: v }))}
                  />
                </td>
                <td className="border">mm</td>
                <td colSpan={2} className="border font-bold"> 跳距</td>
                <td className="border">
                  <InputCell 
                    value={formData.jumpDistance}
                    onChange={(v) => setFormData(p => ({ ...p, jumpDistance: v }))}
                  />
                </td>
                <td className="border">mm</td>
              </tr>

              {/* 工艺流程 */}
              <tr>
                <td rowSpan={2} className="border bg-white font-bold text-black text-center">工艺<br/>流程</td>
                <td colSpan={18} className="border">
                  <InputCell 
                    value={formData.processFlow1}
                    onChange={(v) => setFormData(p => ({ ...p, processFlow1: v }))}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={18} className="border">
                  <InputCell 
                    value={formData.processFlow2}
                    onChange={(v) => setFormData(p => ({ ...p, processFlow2: v }))}
                  />
                </td>
              </tr>

              {/* 表面处理 */}
              <tr>
                <td className="border bg-white font-bold text-black text-center">表面处理</td>
                <td colSpan={2} className="border">
                  <InputCell value="" />
                </td>
                <td colSpan={4} className="border">
                  <div className="flex justify-center gap-3">
                    {['3#', '2#', '1#'].map((num) => (
                      <label key={num} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.printType?.includes(num)}
                          onChange={(e) => {
                            const currentTypes = formData.printType?.split(',').filter(Boolean) || [];
                            let newTypes;
                            if (e.target.checked) {
                              if (!currentTypes.includes(num)) {
                                newTypes = [...currentTypes, num];
                              } else {
                                newTypes = currentTypes;
                              }
                            } else {
                              newTypes = currentTypes.filter(t => t !== num);
                            }
                            setFormData(p => ({ ...p, printType: newTypes.join(',') }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{num}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-white font-bold text-black text-center">第一跳距</td>
                <td className="border">
                  <InputCell 
                    value={formData.firstJumpDistance}
                    onChange={(v) => setFormData(p => ({ ...p, firstJumpDistance: v }))}
                  />
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
                <td className="border bg-white font-bold text-black text-center"></td>
                <td colSpan={4} className="border bg-white font-bold text-black text-center">
                  <div className="flex justify-center gap-3">
                    {['模切', '冲压'].map((type) => (
                      <label key={type} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.processMethod?.includes(type)}
                          onChange={(e) => {
                            const currentTypes = formData.processMethod?.split(',').filter(Boolean) || [];
                            let newTypes;
                            if (e.target.checked) {
                              if (!currentTypes.includes(type)) {
                                newTypes = [...currentTypes, type];
                              } else {
                                newTypes = currentTypes;
                              }
                            } else {
                              newTypes = currentTypes.filter(t => t !== type);
                            }
                            setFormData(p => ({ ...p, processMethod: newTypes.join(',') }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td colSpan={4} className="border bg-white font-bold text-black text-center">
                  <div className="flex justify-center">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="materialType"
                        value="硬胶"
                        checked={formData.materialType === '硬胶'}
                        onChange={(e) => setFormData(p => ({ ...p, materialType: e.target.value }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">硬胶</span>
                    </label>
                  </div>
                </td>
              </tr>

              {/* 印序数据 */}
              {formData.sequences.map((seq, index) => (
                <tr key={seq.id}>
                  <td className="border text-center font-bold">{seq.id}</td>
                  <td className="border">
                    <InputCell 
                      value={seq.color}
                      onChange={(v) => updateSequence(index, 'color', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.inkCode}
                      onChange={(v) => updateSequence(index, 'inkCode', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.linCode}
                      onChange={(v) => updateSequence(index, 'linCode', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.storageLocation}
                      onChange={(v) => updateSequence(index, 'storageLocation', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.plateCode}
                      onChange={(v) => updateSequence(index, 'plateCode', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.mesh}
                      onChange={(v) => updateSequence(index, 'mesh', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.plateStorage}
                      onChange={(v) => updateSequence(index, 'plateStorage', v)}
                    />
                  </td>
                  <td className="border">
                    <InputCell 
                      value={seq.printSide}
                      onChange={(v) => updateSequence(index, 'printSide', v)}
                    />
                  </td>
                  {index === 0 ? (
                    <>
                      <td className="border">厂商</td>
                      <td className="border"></td>
                      <td colSpan={2} className="border">冲压方法</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.stampingMethod}
                          onChange={(v) => setFormData(p => ({ ...p, stampingMethod: v }))}
                        />
                      </td>
                      <td colSpan={4} className="border">
                        <div className="flex justify-center">
                          <label className="flex items-center gap-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="glueType"
                              value="软胶"
                              checked={formData.glueType === '软胶'}
                              onChange={(e) => setFormData(p => ({ ...p, glueType: e.target.value }))}
                              className="w-4 h-4"
                            />
                            <span>软胶</span>
                          </label>
                        </div>
                      </td>
                    </>
                  ) : index === 1 ? (
                    <>
                      <td className="border">编号</td>
                      <td className="border">
                        <InputCell 
                          value={formData.moldCode}
                          onChange={(v) => setFormData(p => ({ ...p, moldCode: v }))}
                        />
                      </td>
                      <td colSpan={2} className="border">模具编号</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.backKnifeMold}
                          onChange={(v) => setFormData(p => ({ ...p, backKnifeMold: v }))}
                        />
                      </td>
                      <td colSpan={4} className="border">
                        <div className="flex justify-center gap-2">
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="glueType"
                              value="PU胶"
                              checked={formData.glueType === 'PU胶'}
                              onChange={(e) => setFormData(p => ({ ...p, glueType: e.target.value as any }))}
                              className="w-3 h-3"
                            />
                            <span>PU胶</span>
                          </label>
                        </div>
                      </td>
                    </>
                  ) : index === 2 ? (
                    <>
                      <td className="border">尺寸</td>
                      <td className="border">
                        <InputCell 
                          value={formData.adhesiveSize}
                          onChange={(v) => setFormData(p => ({ ...p, adhesiveSize: v }))}
                        />
                      </td>
                      <td colSpan={2} className="border">存放位置</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.backMylarMold}
                          onChange={(v) => setFormData(p => ({ ...p, backMylarMold: v }))}
                        />
                      </td>
                      <td colSpan={4} className="border">
                        <div className="flex justify-center gap-2">
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="glueType"
                              value="其它胶"
                              checked={formData.glueType === '其它胶'}
                              onChange={(e) => setFormData(p => ({ ...p, glueType: e.target.value as any }))}
                              className="w-3 h-3"
                            />
                            <span>其它胶</span>
                          </label>
                        </div>
                      </td>
                    </>
                  ) : index === 3 ? (
                    <>
                      <td colSpan={2} className="border">背胶</td>
                      <td colSpan={2} className="border">加虚线刀</td>
                      <td colSpan={2} className="border">
                        <div className="flex justify-center gap-4">
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="releasePaperCode"
                              value="是"
                              checked={formData.releasePaperCode === '是'}
                              onChange={(e) => setFormData(p => ({ ...p, releasePaperCode: e.target.value }))}
                              className="w-3 h-3"
                            />
                            <span>是</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="releasePaperCode"
                              value="否"
                              checked={formData.releasePaperCode === '否'}
                              onChange={(e) => setFormData(p => ({ ...p, releasePaperCode: e.target.value }))}
                              className="w-3 h-3"
                            />
                            <span>否</span>
                          </label>
                        </div>
                      </td>
                      <td colSpan={4} className="border">包装</td>
                    </>
                  ) : index === 4 ? (
                    <>
                      <td className="border">种类</td>
                      <td className="border">
                        <InputCell 
                          value={formData.adhesiveType}
                          onChange={(v) => setFormData(p => ({ ...p, adhesiveType: v }))}
                        />
                      </td>
                      <td rowSpan={3} colSpan={2} className="border font-bold">切片方式</td>
                      <td className="border">
                        <InputCell 
                          value={formData.slicePerRow}
                          onChange={(v) => setFormData(p => ({ ...p, slicePerRow: v }))}
                        />
                      </td>
                      <td className="border">PCS/排</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.slicePerRoll}
                          onChange={(v) => setFormData(p => ({ ...p, slicePerRoll: v }))}
                        />
                      </td>
                      <td colSpan={2} className="border">PCS/卷</td>
                    </>
                  ) : index === 5 ? (
                    <>
                      <td className="border">厂商</td>
                      <td className="border"></td>
                      <td className="border">
                        <InputCell 
                          value={formData.slicePerBundle}
                          onChange={(v) => setFormData(p => ({ ...p, slicePerBundle: v }))}
                        />
                      </td>
                      <td className="border">PCS/袋</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.slicePerBag}
                          onChange={(v) => setFormData(p => ({ ...p, slicePerBag: v }))}
                        />
                      </td>
                      <td colSpan={2} className="border">PCS/扎</td>
                    </>
                  ) : (
                    <>
                      <td className="border">规格</td>
                      <td className="border">
                        <InputCell 
                          value={formData.mylarSpecs}
                          onChange={(v) => setFormData(p => ({ ...p, mylarSpecs: v }))}
                        />
                      </td>
                      <td className="border">
                        <InputCell 
                          value={formData.slicePerBox}
                          onChange={(v) => setFormData(p => ({ ...p, slicePerBox: v }))}
                        />
                      </td>
                      <td className="border">PCS/箱</td>
                      <td colSpan={2} className="border"><InputCell value="" /></td>
                      <td colSpan={2} className="border">PCS/袋</td>
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
                    <td colSpan={3} className="border">
                      <InputCell 
                        value="电脑图档存储路径"
                        onChange={() => {}}
                      />
                    </td>
                  ) : (
                    <td className="border text-center font-bold">样品</td>
                  )}
                  {rowNum === 8 ? (
                    <td rowSpan={3} colSpan={8} className="border">
                      <InputCell 
                        value={formData.colorFormula}
                        onChange={(v) => setFormData(p => ({ ...p, colorFormula: v }))}
                      />
                    </td>
                  ) : rowNum === 9 || rowNum === 10 ? (
                    null
                  ) : rowNum === 11 ? (
                    <td colSpan={8} className="border">
                      <FileUploadCell 
                        value={formData.filePath}
                        onChange={(v) => setFormData(p => ({ ...p, filePath: v }))}
                      />
                    </td>
                  ) : rowNum === 12 ? (
                    <td colSpan={10} className="border">
                      <InputCell 
                        value={formData.sampleInfo}
                        onChange={(v) => setFormData(p => ({ ...p, sampleInfo: v }))}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                      <td className="border"><InputCell value="" /></td>
                    </>
                  )}
                  {rowNum === 8 || rowNum === 9 || rowNum === 10 ? (
                    <>
                      {rowNum === 8 ? (
                        <td colSpan={2} className="border">
                          <InputCell 
                            value="离型纸"
                            onChange={() => {}}
                          />
                        </td>
                      ) : rowNum === 9 ? (
                        <td className="border">
                          <InputCell 
                            value="种类"
                            onChange={() => {}}
                          />
                        </td>
                      ) : (
                        <td className="border">
                          <InputCell 
                            value="规格"
                            onChange={() => {}}
                          />
                        </td>
                      )}
                      {rowNum === 8 ? null : <td className="border"><InputCell value="" /></td>}
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? (
                          <div className="text-center">适配件</div>
                        ) : rowNum === 9 ? (
                          <div className="text-center">背胶刀模</div>
                        ) : (
                          <div className="text-center">存放位置</div>
                        )}
                      </td>
                      <td colSpan={2} className="border"><InputCell value="" /></td>
                      <td colSpan={2} className="border">
                        {rowNum === 9 ? "垫纸材料" : rowNum === 10 ? "打包材料" : ""}
                      </td>
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? "PCS/箱" : ""}
                      </td>
                    </>
                  ) : (
                    <>
                      {rowNum === 11 || rowNum === 12 ? null : (
                        <>
                          <td className="border"><InputCell value="" /></td>
                          <td className="border"><InputCell value="" /></td>
                        </>
                      )}
                      {rowNum === 11 ? (
                        <td rowSpan={2} colSpan={8} className="border align-top">
                          <InputCell 
                            value={formData.notes}
                            onChange={(v) => setFormData(p => ({ ...p, notes: v }))}
                            placeholder="注意事项："
                          />
                        </td>
                      ) : null}
                    </>
                  )}
                </tr>
              ))}

              {/* 底部签名区域 */}
              <tr>
                <td className="border"> 制表 </td>
                <td colSpan={2} className="border font-bold text-center">
                  <InputCell 
                    value={formData.creator}
                    onChange={(v) => setFormData(p => ({ ...p, creator: v }))}
                  />
                </td>
                <td className="border"> 审核</td>
                <td className="border">
                  <InputCell 
                    value={formData.reviewer}
                    onChange={(v) => setFormData(p => ({ ...p, reviewer: v }))}
                  />
                </td>
                <td className="border"> 厂务</td>
                <td colSpan={2} className="border font-bold text-center">
                  <InputCell 
                    value={formData.factoryManager}
                    onChange={(v) => setFormData(p => ({ ...p, factoryManager: v }))}
                  />
                </td>
                <td className="border"> 品管</td>
                <td colSpan={2} className="border font-bold text-center">
                  <InputCell 
                    value={formData.qualityManager}
                    onChange={(v) => setFormData(p => ({ ...p, qualityManager: v }))}
                  />
                </td>
                <td className="border"> 业务</td>
                <td colSpan={3} className="border font-bold text-center">
                  <InputCell 
                    value={formData.sales}
                    onChange={(v) => setFormData(p => ({ ...p, sales: v }))}
                  />
                </td>
                <td className="border"> 核准</td>
                <td colSpan={3} className="border font-bold text-center">
                  <InputCell 
                    value={formData.approver}
                    onChange={(v) => setFormData(p => ({ ...p, approver: v }))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* 编号输入框 */}
          <div className="mt-2 flex items-center">
            <span className="font-bold text-sm mr-2">编号：</span>
            <InputCell 
              value={formData.documentCode}
              onChange={(v) => setFormData(p => ({ ...p, documentCode: v }))}
              className="flex-1 border-b border-black min-w-[200px]"
            />
          </div>
        </div>
      </form>
    </MainLayout>
  );
}
