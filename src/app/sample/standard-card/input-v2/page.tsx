'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Printer,
  ArrowLeft,
  Sparkles,
  FileText,
  Palette,
  Settings,
  Package,
  CheckCircle2,
  Building2,
  ChevronDown,
} from 'lucide-react';

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

// 客户接口（来自 crm_customer 表）
interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  shortName: string;
  contactName: string;
  contactPhone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

interface FormData {
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
  printType: '胶印' | '卷料丝印' | '片料丝印' | '轮转印';
  firstJumpDistance: string;
  sequences: PrintSequence[];
  filmManufacturer: string;
  filmCode: string;
  filmSize: string;
  processMethod: '模切' | '冲压';
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
  glueType: '硬胶' | '软胶' | 'PU胶' | '其它胶';
  packingType: '包装' | 'PCS/卷' | 'PCS/扎' | 'PCS/袋' | 'PCS/箱';
  materialType: '硬胶' | '软胶';
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

function InputV2PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';
  const [activeTab, setActiveTab] = useState('basic');
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

  const [isSaving, setIsSaving] = useState(false);
  const [savedCardId, setSavedCardId] = useState<number | null>(null);
  
  // 客户列表数据
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // 加载客户列表
  useEffect(() => {
    fetchCustomers();
  }, []);

  // 加载编辑数据
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
        // 将加载的数据填充到表单
        setFormData({
          ...formData,
          cardNo: card.card_no || '',
          customer: card.customer_name || '',
          version: card.version || '',
          date: card.date ? card.date.split('T')[0] : new Date().toISOString().split('T')[0],
          productName: card.product_name || '',
          customerCode: card.customer_code || '',
          finishedSize: card.finished_size || '',
          tolerance: card.tolerance || '',
          materialName: card.material_name || '',
          materialType: card.material_type || '硬胶',
          printType: card.print_type || '卷料丝印',
          processMethod: card.process_method || '模切',
          stampingMethod: card.stamping_method || '',
          layoutMethod: card.layout_method || '',
          layoutWay: card.layout_way || '',
          filmManufacturer: card.film_manufacturer || '',
          filmCode: card.film_code || '',
          filmSize: card.film_size || '',
          moldCode: card.mold_code || '',
          glueType: card.glue_type || '硬胶',
          creator: card.creator || '',
          reviewer: card.reviewer || '',
          factoryManager: card.factory_manager || '',
          qualityManager: card.quality_manager || '',
          sales: card.sales || '',
          approver: card.approver || '',
          documentCode: card.document_code || '',
        });
      } else {
        toast.error('加载标准卡数据失败');
      }
    } catch (error) {
      console.error('加载标准卡数据失败:', error);
      toast.error('加载标准卡数据失败');
    }
  };

  // 点击外部关闭客户下拉列表
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

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?page=1&pageSize=100');
      const result = await response.json();
      if (result.success) {
        const formattedCustomers: Customer[] = result.data.map((item: any) => ({
          id: item.id,
          customerCode: item.customer_code,
          customerName: item.customer_name,
          shortName: item.short_name,
          contactName: item.contact_name,
          contactPhone: item.contact_phone,
          province: item.province,
          city: item.city,
          district: item.district,
          address: item.address,
        }));
        setCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    }
  };

  // 筛选客户
  const filteredCustomers = customers.filter(c => 
    c.customerName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.customerCode.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // 选择客户
  const handleSelectCustomer = (customer: Customer) => {
    updateField('customer', customer.customerName);
    updateField('customerCode', customer.customerCode);
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
  };

  // 保存到数据库
  const saveToDatabase = async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      
      // 转换 formData 为 API 期望的字段格式
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
      
      const url = '/api/standard-cards';
      const method = isEditMode && editId ? 'PUT' : 'POST';
      const body = isEditMode && editId 
        ? JSON.stringify({ ...saveData, id: parseInt(editId) })
        : JSON.stringify(saveData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '保存失败');
        return false;
      }

      setSavedCardId(result.data?.id || parseInt(editId || '0'));
      toast.success(isEditMode ? '标准卡更新成功！' : '标准卡保存成功！');
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败，请检查网络连接');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const success = await saveToDatabase();
    if (success) {
      // 同时保存到 sessionStorage 用于预览
      sessionStorage.setItem('standardCardData', JSON.stringify(formData));
    }
  };

  const handleSaveAndPreview = async () => {
    const success = await saveToDatabase();
    if (success && savedCardId) {
      router.push(`/sample/standard-card/print?id=${savedCardId}`);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <MainLayout>
      <div className="container mx-auto py-6 max-w-7xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-500" />
                {isEditMode ? '编辑标准卡' : '新建标准卡（现代化录入）'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? `编辑标准卡 ID: ${editId}` : '使用分步式界面录入标准卡信息'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {savedCardId && (
              <Badge variant="secondary" className="mr-2">
                已保存 ID: {savedCardId}
              </Badge>
            )}
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? (isEditMode ? '更新中...' : '保存中...') : (isEditMode ? '更新' : '保存')}
            </Button>
            <Button onClick={handleSaveAndPreview} disabled={isSaving}>
              <Printer className="h-4 w-4 mr-2" />
              {isSaving ? (isEditMode ? '更新中...' : '保存中...') : (isEditMode ? '更新并预览' : '保存并预览')}
            </Button>
          </div>
        </div>

        {/* 进度指示器 */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'basic', label: '基本信息', icon: FileText },
            { id: 'material', label: '材料规格', icon: Package },
            { id: 'print', label: '印刷信息', icon: Palette },
            { id: 'process', label: '工艺流程', icon: Settings },
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;
            const isCompleted = ['basic', 'material', 'print'].indexOf(activeTab) > ['basic', 'material', 'print'].indexOf(step.id);
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setActiveTab(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {step.label}
                </button>
                {index < 3 && (
                  <div className="w-8 h-px bg-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* 表单内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* 基本信息 */}
          <TabsContent value="basic" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>标准卡编号</Label>
                    <Input
                      value={formData.cardNo}
                      onChange={(e) => updateField('cardNo', e.target.value)}
                      placeholder="自动生成或手动输入"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>日期</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateField('date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>版本</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => updateField('version', e.target.value)}
                      placeholder="如：A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>文件编号</Label>
                    <Input
                      value={formData.documentCode}
                      onChange={(e) => updateField('documentCode', e.target.value)}
                      placeholder="如：DOC-001"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        客户信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 relative customer-dropdown-container">
                        <Label>客户名称</Label>
                        <div className="relative">
                          <Input
                            value={formData.customer}
                            onChange={(e) => {
                              updateField('customer', e.target.value);
                              setCustomerSearchTerm(e.target.value);
                              setShowCustomerDropdown(true);
                            }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            placeholder="输入或选择客户名称"
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {/* 客户下拉列表 */}
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredCustomers.map((customer) => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleSelectCustomer(customer)}
                              >
                                <div className="font-medium">{customer.customerName}</div>
                                <div className="text-xs text-muted-foreground">
                                  编码: {customer.customerCode} | 联系人: {customer.contactName || '-'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>客户代码</Label>
                        <Input
                          value={formData.customerCode}
                          onChange={(e) => updateField('customerCode', e.target.value)}
                          placeholder="选择客户后自动填充"
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        产品信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>产品名称</Label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => updateField('productName', e.target.value)}
                          placeholder="输入产品名称"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>成品尺寸</Label>
                        <Input
                          value={formData.finishedSize}
                          onChange={(e) => updateField('finishedSize', e.target.value)}
                          placeholder="如：100×150mm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>公差</Label>
                        <Input
                          value={formData.tolerance}
                          onChange={(e) => updateField('tolerance', e.target.value)}
                          placeholder="如：±0.1mm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('material')}>
                    下一步：材料规格
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 材料规格 */}
          <TabsContent value="material" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  材料规格
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>材料名称</Label>
                    <Input
                      value={formData.materialName}
                      onChange={(e) => updateField('materialName', e.target.value)}
                      placeholder="输入材料名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>材料类型</Label>
                    <Select
                      value={formData.materialType}
                      onValueChange={(value) => updateField('materialType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择材料类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="硬胶">硬胶</SelectItem>
                        <SelectItem value="软胶">软胶</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>排版方式</Label>
                    <Input
                      value={formData.layoutType}
                      onChange={(e) => updateField('layoutType', e.target.value)}
                      placeholder="输入排版方式"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>片材规格</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.sheetSpecs.width}
                        onChange={(e) => updateField('sheetSpecs', { ...formData.sheetSpecs, width: e.target.value })}
                        placeholder="宽(mm)"
                      />
                      <span className="flex items-center">×</span>
                      <Input
                        value={formData.sheetSpecs.length}
                        onChange={(e) => updateField('sheetSpecs', { ...formData.sheetSpecs, length: e.target.value })}
                        placeholder="长(mm)"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>芯型</Label>
                    <div className="flex gap-2">
                      {['3#', '2#', '1#'].map((num) => (
                        <Input
                          key={num}
                          value={formData.coreType?.includes(num) ? num : ''}
                          onChange={(e) => {
                            const currentTypes = formData.coreType?.split(',').filter(Boolean) || [];
                            let newTypes;
                            if (e.target.value) {
                              if (!currentTypes.includes(num)) {
                                newTypes = [...currentTypes, num];
                              } else {
                                newTypes = currentTypes;
                              }
                            } else {
                              newTypes = currentTypes.filter(t => t !== num);
                            }
                            updateField('coreType', newTypes.join(','));
                          }}
                          placeholder={num}
                          className="text-center"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>纸向</Label>
                    <Input
                      value={formData.paperDirection}
                      onChange={(e) => updateField('paperDirection', e.target.value)}
                      placeholder="输入纸向"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>料宽</Label>
                    <Input
                      value={formData.rollWidth}
                      onChange={(e) => updateField('rollWidth', e.target.value)}
                      placeholder="输入料宽"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>纸边</Label>
                    <Input
                      value={formData.paperEdge}
                      onChange={(e) => updateField('paperEdge', e.target.value)}
                      placeholder="输入纸边"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('basic')}>
                    上一步
                  </Button>
                  <Button onClick={() => setActiveTab('print')}>
                    下一步：印刷信息
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 印刷信息 */}
          <TabsContent value="print" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  印刷信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>印刷类型</Label>
                    <Select
                      value={formData.printType}
                      onValueChange={(value) => updateField('printType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择印刷类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="胶印">胶印</SelectItem>
                        <SelectItem value="卷料丝印">卷料丝印</SelectItem>
                        <SelectItem value="片料丝印">片料丝印</SelectItem>
                        <SelectItem value="轮转印">轮转印</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>首跳距</Label>
                    <Input
                      value={formData.firstJumpDistance}
                      onChange={(e) => updateField('firstJumpDistance', e.target.value)}
                      placeholder="输入首跳距"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>标准用量</Label>
                    <Input
                      value={formData.standardUsage}
                      onChange={(e) => updateField('standardUsage', e.target.value)}
                      placeholder="输入标准用量"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="mb-3 block">印序信息</Label>
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-4 space-y-3">
                      {formData.sequences.map((seq, index) => (
                        <Card key={seq.id} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary">序{index + 1}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Input
                                placeholder="颜色"
                                value={seq.color}
                                onChange={(e) => updateSequence(index, 'color', e.target.value)}
                              />
                              <Input
                                placeholder="油墨编号"
                                value={seq.inkCode}
                                onChange={(e) => updateSequence(index, 'inkCode', e.target.value)}
                              />
                              <Input
                                placeholder="网版编号"
                                value={seq.plateCode}
                                onChange={(e) => updateSequence(index, 'plateCode', e.target.value)}
                              />
                              <Input
                                placeholder="网目"
                                value={seq.mesh}
                                onChange={(e) => updateSequence(index, 'mesh', e.target.value)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('material')}>
                    上一步
                  </Button>
                  <Button onClick={() => setActiveTab('process')}>
                    下一步：工艺流程
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 工艺流程 */}
          <TabsContent value="process" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  工艺流程
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>工艺流程1</Label>
                    <Input
                      value={formData.processFlow1}
                      onChange={(e) => updateField('processFlow1', e.target.value)}
                      placeholder="输入工艺流程1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>工艺流程2</Label>
                    <Input
                      value={formData.processFlow2}
                      onChange={(e) => updateField('processFlow2', e.target.value)}
                      placeholder="输入工艺流程2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>加工方式</Label>
                    <Select
                      value={formData.processMethod}
                      onValueChange={(value) => updateField('processMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择加工方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="模切">模切</SelectItem>
                        <SelectItem value="冲压">冲压</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>模具编号</Label>
                    <Input
                      value={formData.moldCode}
                      onChange={(e) => updateField('moldCode', e.target.value)}
                      placeholder="输入模具编号"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>滴胶类型</Label>
                    <Select
                      value={formData.glueType}
                      onValueChange={(value) => updateField('glueType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择滴胶类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="硬胶">硬胶</SelectItem>
                        <SelectItem value="软胶">软胶</SelectItem>
                        <SelectItem value="PU胶">PU胶</SelectItem>
                        <SelectItem value="其它胶">其它胶</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>包装类型</Label>
                    <Select
                      value={formData.packingType}
                      onValueChange={(value) => updateField('packingType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择包装类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="包装">包装</SelectItem>
                        <SelectItem value="PCS/卷">PCS/卷</SelectItem>
                        <SelectItem value="PCS/扎">PCS/扎</SelectItem>
                        <SelectItem value="PCS/袋">PCS/袋</SelectItem>
                        <SelectItem value="PCS/箱">PCS/箱</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>每排片数</Label>
                    <Input
                      value={formData.slicePerRow}
                      onChange={(e) => updateField('slicePerRow', e.target.value)}
                      placeholder="输入每排片数"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>每卷片数</Label>
                    <Input
                      value={formData.slicePerRoll}
                      onChange={(e) => updateField('slicePerRoll', e.target.value)}
                      placeholder="输入每卷片数"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>每箱片数</Label>
                    <Input
                      value={formData.slicePerBox}
                      onChange={(e) => updateField('slicePerBox', e.target.value)}
                      placeholder="输入每箱片数"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="输入备注信息"
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('print')}>
                    上一步
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                    <Button onClick={handleSaveAndPreview}>
                      <Printer className="h-4 w-4 mr-2" />
                      保存并预览
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

export default function InputV2Page() {
  return (
    <Suspense fallback={<Loading />}>
      <InputV2PageContent />
    </Suspense>
  );
}
