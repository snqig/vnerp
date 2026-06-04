'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  RotateCcw,
  Plus,
  Trash2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

// 接口定义（与原代码保持一致）
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
  adhesiveSpecs: string;
  dashedKnife: boolean;
  slicePerRow: string;
  slicePerRoll: string;
  slicePerBundle: string;
  slicePerBag: string;
  slicePerBox: string;
  packingQty: string;
  backKnifeMold: string;
  backMoldCode: string;
  backMylarMold: string;
  releasePaperCode: string;
  releasePaperType: string;
  releasePaperCategory: string;
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

// 通用组件
const FormField = ({ 
  label, 
  children, 
  className = '' 
}: { 
  label: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    <Label className="text-sm font-medium">{label}</Label>
    {children}
  </div>
);

const FileUpload = ({
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
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {fileName ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
          {getFileIcon()}
          <span className="text-sm truncate flex-1" title={fileName}>{fileName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-2 border border-dashed rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span className="text-sm">点击上传文件</span>
        </button>
      )}
    </div>
  );
};

// 智能选择器组件
const CustomerSelector = ({ 
  value, 
  onChange, 
  customerList,
  onCustomerSelect 
}: { 
  value: string; 
  onChange: (value: string) => void;
  customerList: Customer[];
  onCustomerSelect: (customer: Customer) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value || "选择客户..."}
          <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索客户名称或代码..." />
          <CommandList>
            <CommandEmpty>未找到客户</CommandEmpty>
            <CommandGroup>
              {customerList.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.name} ${customer.code}`}
                  onSelect={() => {
                    onCustomerSelect(customer);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {customer.code} | {customer.contact || '无联系人'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const MaterialSelector = ({ 
  value, 
  onChange, 
  materialList 
}: { 
  value: string; 
  onChange: (value: string) => void;
  materialList: Material[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value || "选择材料..."}
          <span className="ml-2 h-4 w-4 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索材料名称或代码..." />
          <CommandList>
            <CommandEmpty>未找到材料</CommandEmpty>
            <CommandGroup>
              {materialList.map((mat) => (
                <CommandItem
                  key={mat.id}
                  value={`${mat.material_name} ${mat.material_code} ${mat.specification || ''}`}
                  onSelect={() => {
                    onChange(mat.material_name);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{mat.material_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {mat.material_code} {mat.specification ? `| ${mat.specification}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const InkSelector = ({ 
  value, 
  onChange, 
  inkList 
}: { 
  value: string; 
  onChange: (value: string) => void;
  inkList: Ink[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-8 text-xs"
        >
          {value || "选择油墨..."}
          <span className="ml-1 h-3 w-3 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索油墨编号..." />
          <CommandList>
            <CommandEmpty>未找到油墨</CommandEmpty>
            <CommandGroup>
              {inkList.map((ink) => (
                <CommandItem
                  key={ink.id}
                  value={`${ink.ink_code} ${ink.ink_name} ${ink.color_name || ''}`}
                  onSelect={() => {
                    onChange(ink.ink_code);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{ink.ink_code}</span>
                    <span className="text-xs text-muted-foreground">
                      {ink.ink_name} {ink.color_name ? `| ${ink.color_name}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const PlateSelector = ({ 
  value, 
  onChange, 
  onPlateSelect,
  plateList 
}: { 
  value: string; 
  onChange: (value: string) => void;
  onPlateSelect: (plate: ScreenPlate) => void;
  plateList: ScreenPlate[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-8 text-xs"
        >
          {value || "选择网版..."}
          <span className="ml-1 h-3 w-3 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索网版编号..." />
          <CommandList>
            <CommandEmpty>未找到网版</CommandEmpty>
            <CommandGroup>
              {plateList.map((plate) => (
                <CommandItem
                  key={plate.id}
                  value={`${plate.plate_code} ${plate.plate_name || ''}`}
                  onSelect={() => {
                    onPlateSelect(plate);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{plate.plate_code}</span>
                    <span className="text-xs text-muted-foreground">
                      {plate.plate_name} {plate.mesh_count ? `| ${plate.mesh_count}目` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const DieSelector = ({ 
  value, 
  onChange, 
  dieList,
  placeholder = "选择刀模..."
}: { 
  value: string; 
  onChange: (value: string) => void;
  dieList: Die[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-8 text-xs"
        >
          {value || placeholder}
          <span className="ml-1 h-3 w-3 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索刀模编号..." />
          <CommandList>
            <CommandEmpty>未找到刀模</CommandEmpty>
            <CommandGroup>
              {dieList.map((die) => (
                <CommandItem
                  key={die.id}
                  value={`${die.die_code} ${die.die_name || ''}`}
                  onSelect={() => {
                    onChange(die.die_code);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{die.die_code}</span>
                    <span className="text-xs text-muted-foreground">
                      {die.die_name} {die.die_type ? `| ${die.die_type}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const EmployeeSelector = ({ 
  value, 
  onChange, 
  employeeList,
  placeholder = "选择员工..."
}: { 
  value: string; 
  onChange: (value: string) => void;
  employeeList: Employee[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <span className="ml-2 h-4 w-4 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索员工姓名或工号..." />
          <CommandList>
            <CommandEmpty>未找到员工</CommandEmpty>
            <CommandGroup>
              {employeeList.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.name} ${emp.employee_no} ${emp.dept_name || ''}`}
                  onSelect={() => {
                    onChange(emp.name);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {emp.dept_name} {emp.position ? `| ${emp.position}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// 主页面内容
function StandardCardInputContent() {
  const tc = useTranslations('Common');
  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';
  
  const [isSaving, setIsSaving] = useState(false);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [materialList, setMaterialList] = useState<Material[]>([]);
  const [inkList, setInkList] = useState<Ink[]>([]);
  const [screenPlateList, setScreenPlateList] = useState<ScreenPlate[]>([]);
  const [dieList, setDieList] = useState<Die[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [savedCardId, setSavedCardId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<FormData>({
    cardNo: '',
    customer: '',
    version: '1.0',
    date: new Date().toISOString().split('T')[0],
    productName: '',
    customerCode: '',
    finishedSize: '',
    tolerance: '±0.1',
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
    adhesiveSpecs: '',
    dashedKnife: false,
    slicePerRow: '',
    slicePerRoll: '',
    slicePerBundle: '',
    slicePerBag: '',
    slicePerBox: '',
    packingQty: '',
    backKnifeMold: '',
    backMoldCode: '',
    backMylarMold: '',
    releasePaperCode: '',
    releasePaperType: '',
    releasePaperCategory: '',
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

  // 数据加载
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers?page=1&pageSize=1000');
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
        const response = await fetch('/api/materials?page=1&pageSize=1000');
        const result = await response.json();
        if (result.success) {
          setMaterialList(result.data?.list || result.data || []);
        }
      } catch (error) {
        console.error('加载材料列表失败:', error);
      }
    };
    const fetchInks = async () => {
      try {
        const response = await fetch('/api/prepress/ink?page=1&pageSize=1000');
        const result = await response.json();
        if (result.success) {
          setInkList(result.data?.list || result.data || []);
        }
      } catch (error) {
        console.error('加载油墨列表失败:', error);
      }
    };
    const fetchScreenPlates = async () => {
      try {
        const response = await fetch('/api/prepress/screen-plate?page=1&pageSize=1000');
        const result = await response.json();
        if (result.success) {
          setScreenPlateList(result.data?.list || result.data || []);
        }
      } catch (error) {
        console.error('加载网版列表失败:', error);
      }
    };
    const fetchDies = async () => {
      try {
        const response = await fetch('/api/prepress/die?page=1&pageSize=1000');
        const result = await response.json();
        if (result.success) {
          setDieList(result.data?.list || result.data || []);
        }
      } catch (error) {
        console.error('加载刀模列表失败:', error);
      }
    };
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/organization/employee?page=1&pageSize=1000');
        const result = await response.json();
        if (result.success) {
          setEmployeeList(result.data?.list || result.data || []);
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
          version: card.version || '1.0',
          date: card.date ? card.date.split('T')[0] : new Date().toISOString().split('T')[0],
          productName: card.product_name || '',
          customerCode: card.customer_code || '',
          finishedSize: card.finished_size || '',
          tolerance: card.tolerance || '±0.1',
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
          adhesiveSpecs: card.adhesive_specs || '',
          dashedKnife: card.dashed_knife === 1,
          slicePerRow: card.slice_per_row || '',
          slicePerRoll: card.slice_per_roll || '',
          slicePerBundle: card.slice_per_bundle || '',
          slicePerBag: card.slice_per_bag || '',
          slicePerBox: card.slice_per_box || '',
          packingQty: card.packing_qty || '',
          backKnifeMold: card.back_knife_mold || '',
          backMoldCode: card.back_mold_code || '',
          backMylarMold: card.back_mylar_mold || '',
          releasePaperCode: card.release_paper_code || '',
          releasePaperType: card.release_paper_type || '',
          releasePaperCategory: card.release_paper_category || '',
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

  // 表单处理
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
    adhesive_specs: formData.adhesiveSpecs,
    dashed_knife: formData.dashedKnife ? 1 : 0,
    slice_per_row: formData.slicePerRow,
    slice_per_roll: formData.slicePerRoll,
    slice_per_bundle: formData.slicePerBundle,
    slice_per_bag: formData.slicePerBag,
    slice_per_box: formData.slicePerBox,
    packing_qty: formData.packingQty,
    back_knife_mold: formData.backKnifeMold,
    back_mold_code: formData.backMoldCode,
    back_mylar_mold: formData.backMylarMold,
    release_paper_code: formData.releasePaperCode,
    release_paper_type: formData.releasePaperType,
    release_paper_category: formData.releasePaperCategory,
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
      
      if (isEditMode && editId) {
        (saveData as any).id = parseInt(editId);
      }
      
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

  const handlePreview = async () => {
    if (savedCardId || editId) {
      window.open(`/sample/standard-card/print?id=${savedCardId || editId}`, '_blank');
    } else {
      const cardId = await saveToDatabase();
      if (cardId) {
        window.open(`/sample/standard-card/print?id=${cardId}`, '_blank');
      }
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置表单吗？所有未保存的数据将丢失。')) {
      setFormData({
        cardNo: '',
        customer: '',
        version: '1.0',
        date: new Date().toISOString().split('T')[0],
        productName: '',
        customerCode: '',
        finishedSize: '',
        tolerance: '±0.1',
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
        adhesiveSpecs: '',
        dashedKnife: false,
        slicePerRow: '',
        slicePerRoll: '',
        slicePerBundle: '',
        slicePerBag: '',
        slicePerBox: '',
        packingQty: '',
        backKnifeMold: '',
        backMoldCode: '',
        backMylarMold: '',
        releasePaperCode: '',
        releasePaperType: '',
        releasePaperCategory: '',
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

  const addSequence = () => {
    setFormData(prev => ({
      ...prev,
      sequences: [...prev.sequences, { ...initialSequence, id: prev.sequences.length + 1 }]
    }));
  };

  const removeSequence = (index: number) => {
    if (formData.sequences.length <= 1) {
      toast({ title: '至少保留一条印刷工序', variant: 'destructive' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      sequences: prev.sequences.filter((_, i) => i !== index).map((seq, i) => ({ ...seq, id: i + 1 }))
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(p => ({
      ...p,
      customer: customer.name,
      customerCode: customer.code
    }));
  };

  const handlePlateSelect = (index: number, plate: ScreenPlate) => {
    updateSequence(index, 'plateCode', plate.plate_code);
    updateSequence(index, 'mesh', plate.mesh_count || '');
    updateSequence(index, 'plateStorage', plate.storage_location || '');
  };

  // 渲染
  return (
    <MainLayout title={`${isEditMode ? tc('edit') : '新建'}标准卡`}>
      <style dangerouslySetInnerHTML={{ __html: `
        table td, table th { border-color: #333 !important; }
        .dark table td, .dark table th { border-color: rgba(255,255,255,0.2) !important; color: #e2e8f0 !important; }
      `}} />
      <div className="container mx-auto py-6 space-y-6">
        {/* 顶部操作栏 */}
        <div className="flex justify-between items-center">
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
              {isSaving ? '保存中...' : tc('save')}
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

        {/* 表单主体 - 选项卡式布局 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="material">材料与排版</TabsTrigger>
            <TabsTrigger value="printing">印刷工序</TabsTrigger>
            <TabsTrigger value="processing">后道加工</TabsTrigger>
            <TabsTrigger value="approval">审批与附件</TabsTrigger>
          </TabsList>

          {/* 基本信息选项卡 */}
          <TabsContent value="basic" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  标准卡基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField label="标准卡编号">
                    <Input 
                      value={formData.cardNo}
                      onChange={(e) => setFormData(p => ({ ...p, cardNo: e.target.value }))}
                      placeholder="自动生成或手动输入"
                    />
                  </FormField>
                  
                  <FormField label="客户">
                    <CustomerSelector 
                      value={formData.customer}
                      onChange={(v) => setFormData(p => ({ ...p, customer: v }))}
                      customerList={customerList}
                      onCustomerSelect={handleCustomerSelect}
                    />
                  </FormField>
                  
                  <FormField label="客户料号">
                    <Input 
                      value={formData.customerCode}
                      onChange={(e) => setFormData(p => ({ ...p, customerCode: e.target.value }))}
                      placeholder="客户产品编号"
                    />
                  </FormField>
                  
                  <FormField label="产品名称">
                    <Input 
                      value={formData.productName}
                      onChange={(e) => setFormData(p => ({ ...p, productName: e.target.value }))}
                      placeholder="产品全称"
                    />
                  </FormField>
                  
                  <FormField label="版本号">
                    <Input 
                      value={formData.version}
                      onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))}
                      placeholder="例如: 1.0"
                    />
                  </FormField>
                  
                  <FormField label="创建日期">
                    <Input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    />
                  </FormField>
                  
                  <FormField label="成品尺寸 (mm)">
                    <Input 
                      value={formData.finishedSize}
                      onChange={(e) => setFormData(p => ({ ...p, finishedSize: e.target.value }))}
                      placeholder="例如: 100x50"
                    />
                  </FormField>
                  
                  <FormField label="公差">
                    <Input 
                      value={formData.tolerance}
                      onChange={(e) => setFormData(p => ({ ...p, tolerance: e.target.value }))}
                      placeholder="例如: ±0.1"
                    />
                  </FormField>
                  
                  <FormField label="文档编号">
                    <Input 
                      value={formData.documentCode}
                      onChange={(e) => setFormData(p => ({ ...p, documentCode: e.target.value }))}
                      placeholder="内部文档编号"
                    />
                  </FormField>
                </div>

                <Separator />

                <FormField label="工艺流程">
                  <div className="space-y-2">
                    <Input 
                      value={formData.processFlow1}
                      onChange={(e) => setFormData(p => ({ ...p, processFlow1: e.target.value }))}
                      placeholder="第一行工艺流程"
                    />
                    <Input 
                      value={formData.processFlow2}
                      onChange={(e) => setFormData(p => ({ ...p, processFlow2: e.target.value }))}
                      placeholder="第二行工艺流程（可选）"
                    />
                  </div>
                </FormField>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 材料与排版选项卡 */}
          <TabsContent value="material" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">材料与排版信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField label="材料名称">
                    <MaterialSelector 
                      value={formData.materialName}
                      onChange={(v) => setFormData(p => ({ ...p, materialName: v }))}
                      materialList={materialList}
                    />
                  </FormField>
                  
                  <FormField label="材料类型">
                    <Input 
                      value={formData.materialType}
                      onChange={(e) => setFormData(p => ({ ...p, materialType: e.target.value }))}
                      placeholder="例如: PET、PVC"
                    />
                  </FormField>
                  
                  <FormField label="排版方式">
                    <Input 
                      value={formData.layoutType}
                      onChange={(e) => setFormData(p => ({ ...p, layoutType: e.target.value }))}
                      placeholder="例如: 1x10"
                    />
                  </FormField>
                  
                  <FormField label="间距类型">
                    <Input 
                      value={formData.spacing}
                      onChange={(e) => setFormData(p => ({ ...p, spacing: e.target.value }))}
                      placeholder="例如: 刀线间距"
                    />
                  </FormField>
                  
                  <FormField label="间距值 (mm)">
                    <Input 
                      value={formData.spacingValue}
                      onChange={(e) => setFormData(p => ({ ...p, spacingValue: e.target.value }))}
                      placeholder="例如: 2"
                    />
                  </FormField>
                  
                  <FormField label="标准用量 (c㎡/PCS)">
                    <Input 
                      value={formData.standardUsage}
                      onChange={(e) => setFormData(p => ({ ...p, standardUsage: e.target.value }))}
                      placeholder="自动计算或手动输入"
                    />
                  </FormField>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">片料规格</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="宽度 (mm)">
                          <Input 
                            value={formData.sheetSpecs.width}
                            onChange={(v) => setFormData(p => ({ ...p, sheetSpecs: { ...p.sheetSpecs, width: v.target.value } }))}
                          />
                        </FormField>
                        <FormField label="长度 (mm)">
                          <Input 
                            value={formData.sheetSpecs.length}
                            onChange={(v) => setFormData(p => ({ ...p, sheetSpecs: { ...p.sheetSpecs, length: v.target.value } }))}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="纸芯类型">
                          <div className="flex gap-4 pt-2">
                            {['3#', '2#', '1#'].map((num) => (
                              <label key={num} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.coreType?.includes(num)}
                                  onChange={(e) => {
                                    const currentTypes = formData.coreType?.split(',').filter(Boolean) || [];
                                    let newTypes;
                                    if (e.target.checked) {
                                      newTypes = currentTypes.includes(num) ? currentTypes : [...currentTypes, num];
                                    } else {
                                      newTypes = currentTypes.filter(t => t !== num);
                                    }
                                    setFormData(p => ({ ...p, coreType: newTypes.join(',') }));
                                  }}
                                  className="w-4 h-4"
                                />
                                <span>{num}</span>
                              </label>
                            ))}
                          </div>
                        </FormField>
                        <FormField label="出纸方向">
                          <Input 
                            value={formData.paperDirection}
                            onChange={(e) => setFormData(p => ({ ...p, paperDirection: e.target.value }))}
                            placeholder="例如: 纵向"
                          />
                        </FormField>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">卷料规格</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="卷料宽度 (mm)">
                          <Input 
                            value={formData.rollWidth}
                            onChange={(e) => setFormData(p => ({ ...p, rollWidth: e.target.value }))}
                          />
                        </FormField>
                        <FormField label="纸边 (mm)">
                          <Input 
                            value={formData.paperEdge}
                            onChange={(e) => setFormData(p => ({ ...p, paperEdge: e.target.value }))}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="跳距 (mm)">
                          <Input 
                            value={formData.jumpDistance}
                            onChange={(e) => setFormData(p => ({ ...p, jumpDistance: e.target.value }))}
                          />
                        </FormField>
                        <FormField label="第一跳距 (mm)">
                          <Input 
                            value={formData.firstJumpDistance}
                            onChange={(e) => setFormData(p => ({ ...p, firstJumpDistance: e.target.value }))}
                          />
                        </FormField>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 印刷工序选项卡 */}
          <TabsContent value="printing" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">印刷工序设置</CardTitle>
                <Button onClick={addSequence} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加工序
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <FormField label="印刷方式">
                    <div className="flex flex-wrap gap-4 pt-2">
                      {['胶印', '卷料丝印', '片料丝印', '轮转印'].map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.printType?.includes(type)}
                            onChange={(e) => {
                              const currentTypes = formData.printType?.split(',').filter(Boolean) || [];
                              let newTypes;
                              if (e.target.checked) {
                                newTypes = currentTypes.includes(type) ? currentTypes : [...currentTypes, type];
                              } else {
                                newTypes = currentTypes.filter(t => t !== type);
                              }
                              setFormData(p => ({ ...p, printType: newTypes.join(',') }));
                            }}
                            className="w-4 h-4"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>

                {/* 印刷工序表格 */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border p-2 text-center font-medium w-12">印序</th>
                        <th className="border p-2 text-center font-medium">印色</th>
                        <th className="border p-2 text-center font-medium">油墨编号</th>
                        <th className="border p-2 text-center font-medium">菲林编号</th>
                        <th className="border p-2 text-center font-medium">存放位置</th>
                        <th className="border p-2 text-center font-medium">印版编号</th>
                        <th className="border p-2 text-center font-medium">网目</th>
                        <th className="border p-2 text-center font-medium">印版存放</th>
                        <th className="border p-2 text-center font-medium">印面</th>
                        <th className="border p-2 text-center font-medium w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.sequences.map((seq, index) => (
                        <tr key={seq.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="border p-2 text-center font-medium">{seq.id}</td>
                          <td className="border p-1">
                            <Input 
                              value={seq.color}
                              onChange={(v) => updateSequence(index, 'color', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="印色"
                            />
                          </td>
                          <td className="border p-1">
                            <InkSelector 
                              value={seq.inkCode}
                              onChange={(v) => updateSequence(index, 'inkCode', v)}
                              inkList={inkList}
                            />
                          </td>
                          <td className="border p-1">
                            <Input 
                              value={seq.linCode}
                              onChange={(v) => updateSequence(index, 'linCode', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="菲林编号"
                            />
                          </td>
                          <td className="border p-1">
                            <Input 
                              value={seq.storageLocation}
                              onChange={(v) => updateSequence(index, 'storageLocation', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="存放位置"
                            />
                          </td>
                          <td className="border p-1">
                            <PlateSelector 
                              value={seq.plateCode}
                              onChange={(v) => updateSequence(index, 'plateCode', v)}
                              onPlateSelect={(plate) => handlePlateSelect(index, plate)}
                              plateList={screenPlateList}
                            />
                          </td>
                          <td className="border p-1">
                            <Input 
                              value={seq.mesh}
                              onChange={(v) => updateSequence(index, 'mesh', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="网目"
                            />
                          </td>
                          <td className="border p-1">
                            <Input 
                              value={seq.plateStorage}
                              onChange={(v) => updateSequence(index, 'plateStorage', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="印版存放"
                            />
                          </td>
                          <td className="border p-1">
                            <Input 
                              value={seq.printSide}
                              onChange={(v) => updateSequence(index, 'printSide', v.target.value)}
                              className="h-8 text-xs"
                              placeholder="印面"
                            />
                          </td>
                          <td className="border p-1 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => removeSequence(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="专色配比">
                    <textarea 
                      value={formData.colorFormula}
                      onChange={(e) => setFormData(p => ({ ...p, colorFormula: e.target.value }))}
                      className="w-full min-h-[100px] p-2 border rounded-md resize-y"
                      placeholder="输入专色配比信息..."
                    />
                  </FormField>
                  
                  <FormField label="特殊颜色说明">
                    <textarea 
                      value={formData.specialColor}
                      onChange={(e) => setFormData(p => ({ ...p, specialColor: e.target.value }))}
                      className="w-full min-h-[100px] p-2 border rounded-md resize-y"
                      placeholder="特殊颜色说明..."
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 后道加工选项卡 */}
          <TabsContent value="processing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">后道加工与包装</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">覆膜信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="厂商">
                        <Input 
                          value={formData.filmManufacturer}
                          onChange={(e) => setFormData(p => ({ ...p, filmManufacturer: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="编号">
                        <Input 
                          value={formData.filmCode}
                          onChange={(e) => setFormData(p => ({ ...p, filmCode: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="尺寸 (mm)">
                        <Input 
                          value={formData.filmSize}
                          onChange={(e) => setFormData(p => ({ ...p, filmSize: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">成型信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="加工方式">
                        <div className="flex gap-4 pt-2">
                          {['模切', '冲压'].map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.processMethod?.includes(type)}
                                onChange={(e) => {
                                  const currentTypes = formData.processMethod?.split(',').filter(Boolean) || [];
                                  let newTypes;
                                  if (e.target.checked) {
                                    newTypes = currentTypes.includes(type) ? currentTypes : [...currentTypes, type];
                                  } else {
                                    newTypes = currentTypes.filter(t => t !== type);
                                  }
                                  setFormData(p => ({ ...p, processMethod: newTypes.join(',') }));
                                }}
                                className="w-4 h-4"
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </FormField>
                      <FormField label="模具类型">
                        <Input 
                          value={formData.moldType}
                          onChange={(e) => setFormData(p => ({ ...p, moldType: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="主刀模编号">
                        <DieSelector 
                          value={formData.moldCode}
                          onChange={(v) => setFormData(p => ({ ...p, moldCode: v }))}
                          dieList={dieList}
                          placeholder="选择主刀模"
                        />
                      </FormField>
                      <FormField label="冲压方法">
                        <Input 
                          value={formData.stampingMethod}
                          onChange={(e) => setFormData(p => ({ ...p, stampingMethod: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">MYLAR信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="材料">
                        <Input 
                          value={formData.mylarMaterial}
                          onChange={(e) => setFormData(p => ({ ...p, mylarMaterial: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="规格">
                        <Input 
                          value={formData.mylarSpecs}
                          onChange={(e) => setFormData(p => ({ ...p, mylarSpecs: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="排模">
                        <Input 
                          value={formData.layoutMethod}
                          onChange={(e) => setFormData(p => ({ ...p, layoutMethod: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="跳距 (mm)">
                        <Input 
                          value={formData.jumpDistance2}
                          onChange={(e) => setFormData(p => ({ ...p, jumpDistance2: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">背胶信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="种类">
                        <Input 
                          value={formData.adhesiveType}
                          onChange={(e) => setFormData(p => ({ ...p, adhesiveType: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="厂商">
                        <Input 
                          value={formData.adhesiveManufacturer}
                          onChange={(e) => setFormData(p => ({ ...p, adhesiveManufacturer: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="编号">
                        <Input 
                          value={formData.adhesiveCode}
                          onChange={(e) => setFormData(p => ({ ...p, adhesiveCode: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="尺寸 (mm)">
                        <Input 
                          value={formData.adhesiveSize}
                          onChange={(e) => setFormData(p => ({ ...p, adhesiveSize: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="规格">
                        <Input 
                          value={formData.adhesiveSpecs}
                          onChange={(e) => setFormData(p => ({ ...p, adhesiveSpecs: e.target.value }))}
                        />
                      </FormField>
                      <div className="flex items-center justify-between pt-2">
                        <Label>加虚线刀</Label>
                        <Switch 
                          checked={formData.dashedKnife}
                          onCheckedChange={(checked) => setFormData(p => ({ ...p, dashedKnife: checked }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">其他模具</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="模具编号">
                        <DieSelector 
                          value={formData.backMoldCode}
                          onChange={(v) => setFormData(p => ({ ...p, backMoldCode: v }))}
                          dieList={dieList}
                          placeholder="选择模具编号"
                        />
                      </FormField>
                      <FormField label="背刀刀模">
                        <DieSelector 
                          value={formData.backKnifeMold}
                          onChange={(v) => setFormData(p => ({ ...p, backKnifeMold: v }))}
                          dieList={dieList}
                          placeholder="选择背刀刀模"
                        />
                      </FormField>
                      <FormField label="背MYLAR刀模">
                        <DieSelector 
                          value={formData.backMylarMold}
                          onChange={(v) => setFormData(p => ({ ...p, backMylarMold: v }))}
                          dieList={dieList}
                          placeholder="选择背MYLAR刀模"
                        />
                      </FormField>
                      <FormField label="腐蚀刀模">
                        <Input 
                          value={formData.etchMold}
                          onChange={(e) => setFormData(p => ({ ...p, etchMold: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="存放位置">
                        <Input 
                          value={formData.storageLocation}
                          onChange={(e) => setFormData(p => ({ ...p, storageLocation: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">包装信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="每排数量">
                        <Input 
                          value={formData.slicePerRow}
                          onChange={(e) => setFormData(p => ({ ...p, slicePerRow: e.target.value }))}
                          placeholder="PCS/排"
                        />
                      </FormField>
                      <FormField label="每卷数量">
                        <Input 
                          value={formData.slicePerRoll}
                          onChange={(e) => setFormData(p => ({ ...p, slicePerRoll: e.target.value }))}
                          placeholder="PCS/卷"
                        />
                      </FormField>
                      <FormField label="每袋数量">
                        <Input 
                          value={formData.slicePerBag}
                          onChange={(e) => setFormData(p => ({ ...p, slicePerBag: e.target.value }))}
                          placeholder="PCS/袋"
                        />
                      </FormField>
                      <FormField label="每扎数量">
                        <Input 
                          value={formData.slicePerBundle}
                          onChange={(e) => setFormData(p => ({ ...p, slicePerBundle: e.target.value }))}
                          placeholder="PCS/扎"
                        />
                      </FormField>
                      <FormField label="每箱数量">
                        <Input 
                          value={formData.slicePerBox}
                          onChange={(e) => setFormData(p => ({ ...p, slicePerBox: e.target.value }))}
                          placeholder="PCS/箱"
                        />
                      </FormField>
                      <FormField label="包装数量">
                        <Input 
                          value={formData.packingQty}
                          onChange={(e) => setFormData(p => ({ ...p, packingQty: e.target.value }))}
                          placeholder="PCS/袋"
                        />
                      </FormField>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">离型纸信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label=tc("type")>
                        <Input 
                          value={formData.releasePaperType}
                          onChange={(e) => setFormData(p => ({ ...p, releasePaperType: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="类别">
                        <Input 
                          value={formData.releasePaperCategory}
                          onChange={(e) => setFormData(p => ({ ...p, releasePaperCategory: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="规格">
                        <Input 
                          value={formData.releasePaperSpecs}
                          onChange={(e) => setFormData(p => ({ ...p, releasePaperSpecs: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">包装材料</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="垫纸材料">
                        <Input 
                          value={formData.paddingMaterial}
                          onChange={(e) => setFormData(p => ({ ...p, paddingMaterial: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="打包材料">
                        <Input 
                          value={formData.packingMaterial}
                          onChange={(e) => setFormData(p => ({ ...p, packingMaterial: e.target.value }))}
                        />
                      </FormField>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 审批与附件选项卡 */}
          <TabsContent value="approval" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">审批流程与附件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField label="制表人">
                    <EmployeeSelector 
                      value={formData.creator}
                      onChange={(v) => setFormData(p => ({ ...p, creator: v }))}
                      employeeList={employeeList}
                      placeholder="选择制表人"
                    />
                  </FormField>
                  
                  <FormField label="审核人">
                    <EmployeeSelector 
                      value={formData.reviewer}
                      onChange={(v) => setFormData(p => ({ ...p, reviewer: v }))}
                      employeeList={employeeList}
                      placeholder="选择审核人"
                    />
                  </FormField>
                  
                  <FormField label="厂务">
                    <EmployeeSelector 
                      value={formData.factoryManager}
                      onChange={(v) => setFormData(p => ({ ...p, factoryManager: v }))}
                      employeeList={employeeList}
                      placeholder="选择厂务"
                    />
                  </FormField>
                  
                  <FormField label="品管">
                    <EmployeeSelector 
                      value={formData.qualityManager}
                      onChange={(v) => setFormData(p => ({ ...p, qualityManager: v }))}
                      employeeList={employeeList}
                      placeholder="选择品管"
                    />
                  </FormField>
                  
                  <FormField label="业务">
                    <EmployeeSelector 
                      value={formData.sales}
                      onChange={(v) => setFormData(p => ({ ...p, sales: v }))}
                      employeeList={employeeList}
                      placeholder="选择业务"
                    />
                  </FormField>
                  
                  <FormField label="核准人">
                    <EmployeeSelector 
                      value={formData.approver}
                      onChange={(v) => setFormData(p => ({ ...p, approver: v }))}
                      employeeList={employeeList}
                      placeholder="选择核准人"
                    />
                  </FormField>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="电脑图档存储路径">
                    <Input 
                      value={formData.filePath}
                      onChange={(e) => setFormData(p => ({ ...p, filePath: e.target.value }))}
                      placeholder="输入文件路径或上传文件"
                    />
                  </FormField>
                  
                  <FormField label="上传附件">
                    <FileUpload 
                      value={formData.filePath}
                      onChange={(v) => setFormData(p => ({ ...p, filePath: v }))}
                    />
                  </FormField>
                </div>

                <FormField label="样品信息">
                  <textarea 
                    value={formData.sampleInfo}
                    onChange={(e) => setFormData(p => ({ ...p, sampleInfo: e.target.value }))}
                    className="w-full min-h-[80px] p-2 border rounded-md resize-y"
                    placeholder="样品相关说明..."
                  />
                </FormField>

                <FormField label=tc("remark")>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    className="w-full min-h-[120px] p-2 border rounded-md resize-y"
                    placeholder="其他注意事项..."
                  />
                </FormField>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 底部操作栏 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
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
            {isSaving ? '保存中...' : tc('save')}
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
    </MainLayout>
  );
}

function Loading() {
  const tc = useTranslations('Common');
  return (
    <MainLayout title=tc("loading")>
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