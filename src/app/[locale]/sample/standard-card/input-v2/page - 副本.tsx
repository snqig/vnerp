'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Printer, 
  ArrowLeft, 
  Building2, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useToast } from '@/hooks/use-toast';
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

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
}

interface Ink {
  id: number;
  ink_code: string;
  ink_name: string;
  color_name: string;
  brand: string;
}

interface ScreenPlate {
  id: number;
  plate_code: string;
  plate_name: string;
  mesh_count: string;
  storage_location: string;
}

interface Die {
  id: number;
  die_code: string;
  die_name: string;
  die_type: string;
  size_spec: string;
}

interface Employee {
  id: number;
  employee_no: string;
  name: string;
  dept_name: string;
  position: string;
}

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
  moldType: string;
  etchMold: string;
  storageLocation: string;
  extraField: string;
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
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-full text-xs text-center bg-transparent border-none outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 ${value ? 'text-black dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'} ${className}`}
      style={{ boxSizing: 'border-box', margin: '0', padding: '0', display: 'block' }}
    />
  );
};

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
          <span className="text-xs truncate flex-1 dark:text-gray-300" title={fileName}>{fileName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-accent/50 rounded"
          >
            <X className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Upload className="h-4 w-4" />
          <span>点击上传</span>
        </button>
      )}
    </div>
  );
};

function StandardCardInputContent() {
  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';
  
  const [isSaving, setIsSaving] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [materialList, setMaterialList] = useState<Material[]>([]);
  const [inkList, setInkList] = useState<Ink[]>([]);
  const [screenPlateList, setScreenPlateList] = useState<ScreenPlate[]>([]);
  const [dieList, setDieList] = useState<Die[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [inkPickerIdx, setInkPickerIdx] = useState<number | null>(null);
  const [platePickerIdx, setPlatePickerIdx] = useState<number | null>(null);
  const [diePickerField, setDiePickerField] = useState<string | null>(null);
  const [employeePickerField, setEmployeePickerField] = useState<string | null>(null);
  const [savedCardId, setSavedCardId] = useState<number | null>(null);
  
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
    materialType: '',
    moldType: '',
    etchMold: '',
    storageLocation: '',
    extraField: '',
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers?page=1&pageSize=100');
        const result = await response.json();
        if (result.success) {
          const dataArray = Array.isArray(result.data) ? result.data : (result.data?.list || []);
          const formattedCustomers: Customer[] = dataArray.map((item: any) => ({
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

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials?page=1&pageSize=500');
        const result = await response.json();
        if (result.success) {
          const data = result.data?.list || result.data || [];
          setMaterialList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('加载材料列表失败:', error);
      }
    };
    const fetchInks = async () => {
      try {
        const response = await fetch('/api/prepress/ink?page=1&pageSize=500');
        const result = await response.json();
        if (result.success) {
          const data = result.data?.list || result.data || [];
          setInkList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('加载油墨列表失败:', error);
      }
    };
    const fetchScreenPlates = async () => {
      try {
        const response = await fetch('/api/prepress/screen-plate?page=1&pageSize=500');
        const result = await response.json();
        if (result.success) {
          const data = result.data?.list || result.data || [];
          setScreenPlateList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('加载网版列表失败:', error);
      }
    };
    const fetchDies = async () => {
      try {
        const response = await fetch('/api/prepress/die?page=1&pageSize=500');
        const result = await response.json();
        if (result.success) {
          const data = result.data?.list || result.data || [];
          setDieList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('加载刀模列表失败:', error);
      }
    };
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/organization/employee?page=1&pageSize=500');
        const result = await response.json();
        if (result.success) {
          const data = result.data?.list || result.data || [];
          setEmployeeList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('加载员工列表失败:', error);
      }
    };
    fetchMaterials();
    fetchInks();
    fetchScreenPlates();
    fetchDies();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchCardData(parseInt(editId));
    }
  }, [isEditMode, editId]);

  const fetchCardData = async (id: number) => {
    try {
      const response = await fetch(`/api/standard-cards?id=${id}`);
      const result = await response.json();
      if (result.success && result.data) {
        const card = result.data;
        setFormData({
          id: card.id,
          cardNo: card.card_no || '',
          customer: card.customer_name || '',
          version: card.version || '',
          date: card.date ? card.date.split('T')[0] : new Date().toISOString().split('T')[0],
          productName: card.product_name || '',
          customerCode: card.customer_code || '',
          finishedSize: card.finished_size || '',
          tolerance: card.tolerance || '',
          materialName: card.material_name || '',
          layoutType: card.layout_type || '',
          spacing: card.spacing || '',
          spacingValue: card.spacing_value || '',
          sheetSpecs: { width: card.sheet_width || '', length: card.sheet_length || '' },
          coreType: card.core_type || '',
          paperDirection: card.paper_direction || '',
          rollWidth: card.roll_width || '',
          paperEdge: card.paper_edge || '',
          standardUsage: card.standard_usage || '',
          jumpDistance: card.jump_distance || '',
          processFlow1: card.process_flow1 || '',
          processFlow2: card.process_flow2 || '',
          printType: card.print_type || '卷料丝印',
          firstJumpDistance: card.first_jump_distance || '',
          sequences: card.sequences ? 
            (typeof card.sequences === 'string' ? JSON.parse(card.sequences) : card.sequences) 
            : Array.from({ length: 7 }, (_, i) => ({ ...initialSequence, id: i + 1 })),
          filmManufacturer: card.film_manufacturer || '',
          filmCode: card.film_code || '',
          filmSize: card.film_size || '',
          processMethod: card.process_method || '模切',
          stampingMethod: card.stamping_method || '',
          moldCode: card.mold_code || '',
          layoutMethod: card.layout_method || '',
          layoutWay: card.layout_way || '',
          jumpDistance2: card.jump_distance2 || '',
          mylarMaterial: card.mylar_material || '',
          mylarSpecs: card.mylar_specs || '',
          mylarLayout: card.mylar_layout || '',
          mylarJump: card.mylar_jump || '',
          adhesiveType: card.adhesive_type || '',
          adhesiveManufacturer: card.adhesive_manufacturer || '',
          adhesiveCode: card.adhesive_code || '',
          adhesiveSize: card.adhesive_size || '',
          dashedKnife: card.dashed_knife === 1,
          slicePerRow: card.slice_per_row || '',
          slicePerRoll: card.slice_per_roll || '',
          slicePerBundle: card.slice_per_bundle || '',
          slicePerBag: card.slice_per_bag || '',
          slicePerBox: card.slice_per_box || '',
          backKnifeMold: card.back_knife_mold || '',
          backMylarMold: card.back_mylar_mold || '',
          releasePaperCode: card.release_paper_code || '',
          releasePaperType: card.release_paper_type || '',
          releasePaperSpecs: card.release_paper_specs || '',
          paddingMaterial: card.padding_material || '',
          packingMaterial: card.packing_material || '',
          specialColor: card.special_color || '',
          colorFormula: card.color_formula || '',
          filePath: card.file_path || '',
          sampleInfo: card.sample_info || '',
          notes: card.notes || '',
          creator: card.creator || '',
          reviewer: card.reviewer || '',
          factoryManager: card.factory_manager || '',
          qualityManager: card.quality_manager || '',
          sales: card.sales || '',
          approver: card.approver || '',
          documentCode: card.document_code || '',
          glueType: card.glue_type || '硬胶',
          packingType: card.packing_type || '包装',
          materialType: card.material_type || '',
          moldType: card.mold_type || '',
          etchMold: card.etch_mold || '',
          storageLocation: card.storage_location || '',
          extraField: card.extra_field || '',
        });
      }
    } catch (error) {
      console.error('加载标准卡数据失败:', error);
      toast({ title: '加载数据失败', variant: 'destructive' });
    }
  };

  const buildSaveData = useCallback(() => ({
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
    mold_type: formData.moldType,
    etch_mold: formData.etchMold,
    storage_location: formData.storageLocation,
    extra_field: formData.extraField,
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
  }), [formData]);

  const saveToDatabase = async (): Promise<number | null> => {
    try {
      setIsSaving(true);
      const saveData = buildSaveData();
      
      const url = isEditMode && editId ? `/api/standard-cards?id=${editId}` : '/api/standard-cards';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const cardId = result.data?.id || parseInt(editId || '0');
        setSavedCardId(cardId);
        toast({ title: isEditMode ? '更新成功' : '保存成功' });
        return cardId;
      } else {
        toast({ title: '保存失败: ' + result.message, variant: 'destructive' });
        return null;
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast({ title: '保存失败，请检查网络连接', variant: 'destructive' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const cardId = await saveToDatabase();
    if (cardId) {
      router.push('/sample/standard-card');
    }
  };

  const handleSaveAndPreview = async () => {
    const cardId = await saveToDatabase();
    if (cardId) {
      router.push(`/sample/standard-card/print?id=${cardId}`);
    }
  };

  const handleSaveAndPrint = async () => {
    const cardId = await saveToDatabase();
    if (cardId) {
      window.open(`/sample/standard-card/print?id=${cardId}&autoPrint=true`, '_blank');
    }
  };

  const handlePreview = () => {
    if (savedCardId || editId) {
      window.open(`/sample/standard-card/print?id=${savedCardId || editId}`, '_blank');
    } else {
      toast({ title: '请先保存数据', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置表单吗？所有未保存的数据将丢失。')) {
      setFormData({
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
        materialType: '',
        moldType: '',
        etchMold: '',
        storageLocation: '',
        extraField: '',
      });
      setSavedCardId(null);
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
    <MainLayout title={`${isEditMode ? '编辑' : '新建'}标准卡`}>
      <form 
        className="space-y-4"
        noValidate
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
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
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
            <Button type="button" variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              预览
            </Button>
            <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveAndPreview} disabled={isSaving}>
              <Eye className="h-4 w-4 mr-2" />
              保存并预览
            </Button>
            <Button type="button" onClick={handleSaveAndPrint} disabled={isSaving}>
              <Printer className="h-4 w-4 mr-2" />
              保存并打印
            </Button>
          </div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 mx-auto shadow-lg flex flex-col"
          style={{
            width: '297mm',
            minHeight: '210mm',
            padding: '3mm',
            boxSizing: 'border-box',
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            table { height: 100%; width: 100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif; }
            table td { padding: 2px 4px !important; vertical-align: middle; text-align: center; border: 1px solid #333; font-size: 12px; font-weight: normal; line-height: 1.4; }
            table td input[type="text"],
            table td input[type="number"],
            table td input[type="date"],
            table td input:not([type]) { 
              text-align: center; 
              width: 100%; 
              height: 100%; 
              background: transparent;
              border: none;
              outline: none;
              box-shadow: none;
              font-size: 12px;
              padding: 0;
              margin: 0;
              display: block;
              box-sizing: border-box;
              color: inherit;
            }
            table td input:focus { 
              background: #eff6ff; 
              box-shadow: none;
              outline: none;
            }
            .dark table td { border-color: rgba(255,255,255,0.2); color: #e2e8f0; }
            .dark table td input:focus { background: rgba(59,130,246,0.15); }
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
                    <input
                      type="text"
                      value={formData.cardNo}
                      onChange={(e) => setFormData(p => ({ ...p, cardNo: e.target.value }))}
                      placeholder="编号"
                      className="flex-1 min-w-[120px] h-6 text-base font-bold text-[#1a3c7a] dark:text-blue-300 text-center bg-transparent border-0 border-b border-black dark:border-gray-400 outline-none px-0"
                    />
                  </div>
                </td>
              </tr>

              <tr>
                <td className="font-bold pr-2 border-none">客户：</td>
                <td colSpan={4} className="font-bold border-none">
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-center font-normal h-6 min-h-[24px] px-1 py-0 text-xs border-0 border-b border-black dark:border-gray-400 rounded-none bg-transparent hover:bg-transparent"
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
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))}
                    placeholder="版次"
                    className="h-6 w-full text-center bg-transparent border-0 border-b border-black dark:border-gray-400 outline-none px-0"
                  />
                </td>
                <td colSpan={4} className="text-center text-xl font-bold border-none">
                  标准卡（流程卡）
                </td>
                <td colSpan={4} className="text-center border-none">
                  <span className="bg-[#1a3c7a] dark:bg-blue-700 text-white px-3 py-1 rounded font-bold">HSF</span>
                </td>
                <td colSpan={2} className="font-bold text-right px-2 border-none">日期：</td>
                <td colSpan={2} className="font-bold border-none">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="h-6 w-full text-center bg-transparent border-0 border-b border-black dark:border-gray-400 outline-none px-0"
                  />
                </td>
              </tr>

              <tr>
                <td colSpan={19} className="h-2 border-none"></td>
              </tr>

              <tr>
                <td className="border font-bold text-center w-[4%]">品名</td>
                <td colSpan={4} className="border font-bold">
                  <InputCell 
                    value={formData.productName}
                    onChange={(v) => setFormData(p => ({ ...p, productName: v }))}
                  />
                </td>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center w-[8%]">客户料号</td>
                <td colSpan={3} className="border">
                  <InputCell 
                    value={formData.customerCode}
                    onChange={(v) => setFormData(p => ({ ...p, customerCode: v }))}
                  />
                </td>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center w-[8%]">成品尺寸</td>
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

              <tr>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">材料名称</td>
                <td colSpan={4} className="border font-bold">
                  <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer"
                      >
                        {formData.materialName || '选择材料...'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索材料..." />
                        <CommandList>
                          <CommandEmpty>未找到材料</CommandEmpty>
                          <CommandGroup>
                            {materialList.map((mat) => (
                              <CommandItem
                                key={mat.id}
                                value={mat.material_name}
                                onSelect={() => {
                                  setFormData(p => ({ ...p, materialName: mat.material_name }));
                                  setMaterialOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{mat.material_name}</span>
                                  <span className="text-xs text-muted-foreground">{mat.material_code} {mat.specification ? `| ${mat.specification}` : ''}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">排版方式</td>
                <td className="border">
                  <InputCell 
                    value={formData.layoutType}
                    onChange={(v) => setFormData(p => ({ ...p, layoutType: v }))}
                  />
                </td>
                <td rowSpan={2} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">间距</td>
                <td className="border">
                  <InputCell 
                    value={formData.spacing}
                    onChange={(v) => setFormData(p => ({ ...p, spacing: v }))}
                  />
                </td>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">片料规格</td>
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

              <tr>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">纸芯类型</td>
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
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">出纸方向</td>
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
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">卷料宽度</td>
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

              <tr>
                <td rowSpan={2} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">工艺<br/>流程</td>
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

              <tr>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">印刷方式</td>
                <td colSpan={6} className="border">
                  <div className="flex justify-center gap-3">
                    {['胶印', '卷料丝印', '片料丝印', '轮转印'].map((type) => (
                      <label key={type} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.printType?.includes(type)}
                          onChange={(e) => {
                            const currentTypes = formData.printType?.split(',').filter(Boolean) || [];
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
                            setFormData(p => ({ ...p, printType: newTypes.join(',') }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">第一跳距</td>
                <td className="border">
                  <InputCell 
                    value={formData.firstJumpDistance}
                    onChange={(v) => setFormData(p => ({ ...p, firstJumpDistance: v }))}
                  />
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
                  <InputCell 
                    value={formData.moldType}
                    onChange={(v) => setFormData(p => ({ ...p, moldType: v }))}
                  />
                </td>
                <td colSpan={4} className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">
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
                <td className="border bg-white dark:bg-gray-700 font-bold text-black dark:text-gray-100 text-center">材料</td>
                <td colSpan={3} className="border">
                  <InputCell 
                    value={formData.materialType}
                    onChange={(v) => setFormData(p => ({ ...p, materialType: v }))}
                  />
                </td>
              </tr>

              {formData.sequences.map((seq, index) => (
                <tr key={seq.id}>
                  <td className="border text-center font-bold">{seq.id}</td>
                  <td className="border">
                    <InputCell 
                      value={seq.color}
                      onChange={(v) => updateSequence(index, 'color', v)}
                    />
                  </td>
                  <td className="border relative">
                    <Popover open={inkPickerIdx === index} onOpenChange={(open) => setInkPickerIdx(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {seq.inkCode || ''}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="搜索油墨..." />
                          <CommandList>
                            <CommandEmpty>未找到油墨</CommandEmpty>
                            <CommandGroup>
                              {inkList.map((ink) => (
                                <CommandItem
                                  key={ink.id}
                                  value={`${ink.ink_code} ${ink.ink_name} ${ink.color_name || ''}`}
                                  onSelect={() => {
                                    updateSequence(index, 'inkCode', ink.ink_code);
                                    setInkPickerIdx(null);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span>{ink.ink_code}</span>
                                    <span className="text-xs text-muted-foreground">{ink.ink_name} {ink.color_name ? `| ${ink.color_name}` : ''}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  <td className="border relative">
                    <Popover open={platePickerIdx === index} onOpenChange={(open) => setPlatePickerIdx(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {seq.plateCode || ''}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="搜索网版..." />
                          <CommandList>
                            <CommandEmpty>未找到网版</CommandEmpty>
                            <CommandGroup>
                              {screenPlateList.map((plate) => (
                                <CommandItem
                                  key={plate.id}
                                  value={`${plate.plate_code} ${plate.plate_name || ''}`}
                                  onSelect={() => {
                                    updateSequence(index, 'plateCode', plate.plate_code);
                                    updateSequence(index, 'mesh', plate.mesh_count || '');
                                    updateSequence(index, 'plateStorage', plate.storage_location || '');
                                    setPlatePickerIdx(null);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span>{plate.plate_code}</span>
                                    <span className="text-xs text-muted-foreground">{plate.plate_name} {plate.mesh_count ? `| ${plate.mesh_count}目` : ''}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                      <td className="border">
                        <InputCell 
                          value={formData.filmManufacturer}
                          onChange={(v) => setFormData(p => ({ ...p, filmManufacturer: v }))}
                        />
                      </td>
                      <td colSpan={2} className="border">冲压方法</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.stampingMethod}
                          onChange={(v) => setFormData(p => ({ ...p, stampingMethod: v }))}
                        />
                      </td>
                      <td className="border">规格</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.stampingMethod}
                          onChange={(v) => setFormData(p => ({ ...p, stampingMethod: v }))}
                        />
                      </td>
                      <td className="border">MM</td>
                    </>
                  ) : index === 1 ? (
                    <>
                      <td className="border">编号</td>
                      <td className="border">
                        <Popover open={diePickerField === 'moldCode'} onOpenChange={(open) => setDiePickerField(open ? 'moldCode' : null)}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formData.moldCode || ''}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="搜索刀模..." />
                              <CommandList>
                                <CommandEmpty>未找到刀模</CommandEmpty>
                                <CommandGroup>
                                  {dieList.map((die) => (
                                    <CommandItem
                                      key={die.id}
                                      value={`${die.die_code} ${die.die_name || ''}`}
                                      onSelect={() => {
                                        setFormData(p => ({ ...p, moldCode: die.die_code }));
                                        setDiePickerField(null);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span>{die.die_code}</span>
                                        <span className="text-xs text-muted-foreground">{die.die_name} {die.die_type ? `| ${die.die_type}` : ''}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td colSpan={2} className="border">模具编号</td>
                      <td colSpan={2} className="border">
                        <Popover open={diePickerField === 'backKnifeMold'} onOpenChange={(open) => setDiePickerField(open ? 'backKnifeMold' : null)}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formData.backKnifeMold || ''}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="搜索刀模..." />
                              <CommandList>
                                <CommandEmpty>未找到刀模</CommandEmpty>
                                <CommandGroup>
                                  {dieList.map((die) => (
                                    <CommandItem
                                      key={die.id}
                                      value={`${die.die_code} ${die.die_name || ''}`}
                                      onSelect={() => {
                                        setFormData(p => ({ ...p, backKnifeMold: die.die_code }));
                                        setDiePickerField(null);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span>{die.die_code}</span>
                                        <span className="text-xs text-muted-foreground">{die.die_name} {die.die_type ? `| ${die.die_type}` : ''}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="border">排模</td>
                      <td colSpan={3} className="border">
                        <InputCell 
                          value={formData.layoutMethod}
                          onChange={(v) => setFormData(p => ({ ...p, layoutMethod: v }))}
                        />
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
                        <Popover open={diePickerField === 'backMylarMold'} onOpenChange={(open) => setDiePickerField(open ? 'backMylarMold' : null)}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formData.backMylarMold || ''}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="搜索刀模..." />
                              <CommandList>
                                <CommandEmpty>未找到刀模</CommandEmpty>
                                <CommandGroup>
                                  {dieList.map((die) => (
                                    <CommandItem
                                      key={die.id}
                                      value={`${die.die_code} ${die.die_name || ''}`}
                                      onSelect={() => {
                                        setFormData(p => ({ ...p, backMylarMold: die.die_code }));
                                        setDiePickerField(null);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span>{die.die_code}</span>
                                        <span className="text-xs text-muted-foreground">{die.die_name} {die.die_type ? `| ${die.die_type}` : ''}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="border">跳距</td>
                      <td colSpan={2} className="border">
                        <InputCell 
                          value={formData.jumpDistance2}
                          onChange={(v) => setFormData(p => ({ ...p, jumpDistance2: v }))}
                        />
                      </td>
                      <td className="border">MM</td>
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
                      <td className="border">
                        <InputCell 
                          value={formData.adhesiveManufacturer}
                          onChange={(v) => setFormData(p => ({ ...p, adhesiveManufacturer: v }))}
                        />
                      </td>
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
                      {rowNum === 8 ? null : <td className="border"><InputCell value={rowNum === 9 ? formData.storageLocation : formData.storageLocation} onChange={(v) => setFormData(p => ({ ...p, storageLocation: v }))} /></td>}
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? (
                          <div className="text-center">背刀刀模</div>
                        ) : rowNum === 9 ? (
                          <div className="text-center">腐蚀刀模</div>
                        ) : (
                          <div className="text-center">腐蚀刀模</div>
                        )}
                      </td>
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? (
                          <InputCell value={formData.backKnifeMold} onChange={(v) => setFormData(p => ({ ...p, backKnifeMold: v }))} />
                        ) : rowNum === 9 ? (
                          <InputCell value={formData.etchMold} onChange={(v) => setFormData(p => ({ ...p, etchMold: v }))} />
                        ) : (
                          <InputCell value={formData.extraField} onChange={(v) => setFormData(p => ({ ...p, extraField: v }))} />
                        )}
                      </td>
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? (
                          <InputCell 
                            value={formData.releasePaperType}
                            onChange={(v) => setFormData(p => ({ ...p, releasePaperType: v }))}
                          />
                        ) : rowNum === 9 ? (
                          "垫纸材料"
                        ) : (
                          "打包材料"
                        )}
                      </td>
                      <td colSpan={2} className="border">
                        {rowNum === 8 ? (
                          "PCS/箱"
                        ) : rowNum === 9 ? (
                          <InputCell 
                            value={formData.paddingMaterial}
                            onChange={(v) => setFormData(p => ({ ...p, paddingMaterial: v }))}
                          />
                        ) : (
                          <InputCell 
                            value={formData.packingMaterial}
                            onChange={(v) => setFormData(p => ({ ...p, packingMaterial: v }))}
                          />
                        )}
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

              <tr>
                <td className="border"> 制表 </td>
                <td colSpan={2} className="border font-bold text-center">
                  <Popover open={employeePickerField === 'creator'} onOpenChange={(open) => setEmployeePickerField(open ? 'creator' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.creator || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, creator: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border"> 审核</td>
                <td className="border">
                  <Popover open={employeePickerField === 'reviewer'} onOpenChange={(open) => setEmployeePickerField(open ? 'reviewer' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.reviewer || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, reviewer: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border"> 厂务</td>
                <td colSpan={2} className="border font-bold text-center">
                  <Popover open={employeePickerField === 'factoryManager'} onOpenChange={(open) => setEmployeePickerField(open ? 'factoryManager' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.factoryManager || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, factoryManager: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border"> 品管</td>
                <td colSpan={2} className="border font-bold text-center">
                  <Popover open={employeePickerField === 'qualityManager'} onOpenChange={(open) => setEmployeePickerField(open ? 'qualityManager' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.qualityManager || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, qualityManager: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border"> 业务</td>
                <td colSpan={3} className="border font-bold text-center">
                  <Popover open={employeePickerField === 'sales'} onOpenChange={(open) => setEmployeePickerField(open ? 'sales' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.sales || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, sales: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="border"> 核准</td>
                <td colSpan={3} className="border font-bold text-center">
                  <Popover open={employeePickerField === 'approver'} onOpenChange={(open) => setEmployeePickerField(open ? 'approver' : null)}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full text-xs text-center bg-transparent border-none outline-none cursor-pointer py-1" onClick={(e) => e.stopPropagation()}>
                        {formData.approver || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="搜索员工..." />
                        <CommandList>
                          <CommandEmpty>未找到员工</CommandEmpty>
                          <CommandGroup>
                            {employeeList.map((emp) => (
                              <CommandItem key={emp.id} value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                                onSelect={() => { setFormData(p => ({ ...p, approver: emp.name })); setEmployeePickerField(null); }}>
                                <div className="flex flex-col"><span>{emp.name}</span><span className="text-xs text-muted-foreground">{emp.dept_name} {emp.position ? `| ${emp.position}` : ''}</span></div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="mt-2 flex items-center">
            <span className="font-bold text-sm mr-2">编号：</span>
            <InputCell 
              value={formData.documentCode}
              onChange={(v) => setFormData(p => ({ ...p, documentCode: v }))}
              className="flex-1 border-b border-black dark:border-gray-400 min-w-[200px]"
            />
          </div>
        </div>
      </form>
    </MainLayout>
  );
}

function Loading() {
  return (
    <MainLayout title="加载中...">
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </MainLayout>
  );
}

export default function StandardCardInputPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StandardCardInputContent />
    </Suspense>
  );
}
