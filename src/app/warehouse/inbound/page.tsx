'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  Package,
  Search,
  Plus,
  Filter,
  Calendar,
  Building2,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  Barcode,
  MoreHorizontal,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Boxes,
  Warehouse,
  ChevronRight,
  AlertCircle,
  List,
  ArrowUpDown,
  History,
  Layers,
  Palette,
  Ruler,
  Weight,
  Edit,
  Trash2,
  RefreshCw,
  RotateCcw,
  X,
  Check,
  Settings,
  Beaker,
  QrCode,
  ScanLine,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// 状态类型
const statusOptions = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'draft', label: '草稿', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: '待审核', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'approved', label: '已审核', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '已拒绝', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: '已完成', color: 'bg-blue-100 text-blue-700' },
];

// 标签状态
const labelStatusOptions = [
  { value: 'generated', label: '已生成' },
  { value: 'split', label: '已分切' },
  { value: 'used', label: '已使用' },
  { value: 'scrapped', label: '已报废' },
];

// 常用单位选项
const unitOptions = [
  { value: 'M', label: 'M (米)' },
  { value: 'KG', label: 'KG (千克)' },
  { value: '卷', label: '卷' },
  { value: '支', label: '支' },
  { value: '张', label: '张' },
  { value: '桶', label: '桶' },
  { value: '箱', label: '箱' },
  { value: 'PCS', label: 'PCS (个)' },
  { value: '套', label: '套' },
  { value: '件', label: '件' },
];

// 基础信息数据（物料主数据）
const materials = [
  { id: 1, category: '原材料', name: '厚0.3热缩套管', code: 'RSG-0.3-32', spec: 'Ф32', unit: 'M', supplier: '恒翌达', location: 'A01-01' },
  { id: 2, category: '原材料', name: 'PE管', code: 'PE-25', spec: '25mm', unit: 'M', supplier: '恒翌达', location: 'A01-02' },
  { id: 3, category: '原材料', name: '厚0.2热缩套管', code: 'RSG-0.2-22', spec: 'Ф22', unit: 'M', supplier: '恒翌达', location: 'A01-03' },
  { id: 4, category: '原材料', name: 'PVC绝缘胶带', code: 'PVC-TAPE-20', spec: '20mm*20m', unit: '卷', supplier: '华通材料', location: 'A02-01' },
  { id: 5, category: '原材料', name: '铜芯线', code: 'CU-WIRE-1.5', spec: '1.5mm²', unit: 'M', supplier: '江南电缆', location: 'A02-02' },
  { id: 6, category: '原材料', name: '铝箔屏蔽带', code: 'AL-FOIL-50', spec: '50mm*50m', unit: '卷', supplier: '华通材料', location: 'A02-03' },
  { id: 7, category: '原材料', name: '尼龙扎带', code: 'NYLON-TIE-4', spec: '4*200mm', unit: '包', supplier: '恒翌达', location: 'A03-01' },
  { id: 8, category: '原材料', name: '热熔胶棒', code: 'HOT-GLUE-11', spec: 'Ф11mm', unit: 'KG', supplier: '华通材料', location: 'A03-02' },
];

// 入库记录数据
const initialInboundRecords: any[] = [
  {
    id: 'RK20250303001',
    date: '2025-03-03',
    materialName: '厚0.3热缩套管',
    spec: 'Ф32',
    quantity: 1000,
    unit: 'M',
    supplier: '恒翌达',
    warehouse: '原材料仓',
    location: 'A-01-01',
    operator: '张三',
    status: 'completed',
    auditStatus: 'approved',
    type: '采购入库',
    remark: '常规采购',
    purchaseOrderNo: 'PO20250301001',
    isMixed: false,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250303001',
    colorCode: '',
    mixedMaterialRemark: '',
    machineNo: '',
    isRawMaterial: true,
  },
  {
    id: 'RK20250303002',
    date: '2025-03-03',
    materialName: 'PE管',
    spec: '25',
    quantity: 500,
    unit: 'M',
    supplier: '恒翌达',
    warehouse: '原材料仓',
    location: 'A-01-02',
    operator: '张三',
    status: 'completed',
    auditStatus: 'approved',
    type: '采购入库',
    remark: '常规采购',
    purchaseOrderNo: 'PO20250301002',
    isMixed: false,
    materialCode: 'PE-25',
    width: 25,
    batchNo: 'B20250303002',
    colorCode: '',
    mixedMaterialRemark: '',
    machineNo: '',
    isRawMaterial: true,
  },
  {
    id: 'RK20250302001',
    date: '2025-03-02',
    materialName: '厚0.2热缩套管',
    spec: '22',
    quantity: 800,
    unit: 'M',
    supplier: '恒翌达',
    warehouse: '原材料仓',
    location: 'A-01-03',
    operator: '李四',
    status: 'completed',
    auditStatus: 'approved',
    type: '采购入库',
    remark: '紧急采购',
    purchaseOrderNo: 'PO20250301003',
    isMixed: false,
    materialCode: 'RSG-0.2-22',
    width: 22,
    batchNo: 'B20250302001',
    colorCode: '',
    mixedMaterialRemark: '',
    machineNo: '',
    isRawMaterial: true,
  },
  {
    id: 'RK20250301001',
    date: '2025-03-01',
    materialName: '厚0.3热缩套管',
    spec: 'Ф32',
    quantity: 2000,
    unit: 'M',
    supplier: '恒翌达',
    warehouse: '原材料仓',
    location: 'A-01-01',
    operator: '张三',
    status: 'pending',
    auditStatus: 'draft',
    type: '采购入库',
    remark: '月度采购',
    purchaseOrderNo: 'PO20250301004',
    isMixed: true,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250301001',
    colorCode: '',
    mixedMaterialRemark: '混合料备注',
    machineNo: '',
    isRawMaterial: true,
  },
];

// 物料标签数据
const initialLabels = [
  {
    id: '20181221000001',
    purchaseOrderNo: 'PO181002',
    supplierName: '锦悦电子',
    inboundDate: '2018-12-21',
    warehouseCode: 'O01',
    materialCode: 'MA01-01',
    materialName: '保护膜',
    specification: '50*20',
    width: 0,
    batchNo: '201812',
    qty: 1,
    unit: '支',
    isRawMaterial: true,
    packageQty: 0,
    labelQty: 1,
    labelStatus: 'used',
    auditStatus: 'approved',
    operatorName: '测试管理员',
    createTime: '2018-12-21 20:59:54',
    updateTime: '2018-12-24 20:34:47',
    remark: '',
    colorCode: '',
    mixedMaterialRemark: '',
    machineNo: '',
  },
  {
    id: '20181221000002',
    purchaseOrderNo: 'PO181002',
    supplierName: '锦悦电子',
    inboundDate: '2018-12-21',
    warehouseCode: 'O01',
    materialCode: 'MA01-02',
    materialName: '保护膜',
    specification: '60*30',
    width: 0,
    batchNo: '201812',
    qty: 2,
    unit: '支',
    isRawMaterial: true,
    packageQty: 0,
    labelQty: 2,
    labelStatus: 'generated',
    auditStatus: 'approved',
    operatorName: '测试管理员',
    createTime: '2018-12-21 20:59:54',
    updateTime: '2018-12-24 20:34:47',
    remark: '',
    colorCode: '',
    mixedMaterialRemark: '',
    machineNo: '',
  },
];

const statusConfig = {
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  pending: { label: '待入库', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  in_transit: { label: '运输中', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle },
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText },
  approved: { label: '已审核', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700 border-red-200', icon: X },
};

export default function InboundManagementPage() {
  const [activeTab, setActiveTab] = useState('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // 数据状态
  const [inboundRecords, setInboundRecords] = useState(initialInboundRecords);
  const [labels, setLabels] = useState(initialLabels);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<any[]>([]);
  
  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMixedAddDialogOpen, setIsMixedAddDialogOpen] = useState(false);
  const [isMixedEditDialogOpen, setIsMixedEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [isQRScanDialogOpen, setIsQRScanDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [currentLabel, setCurrentLabel] = useState<any>(null);
  
  // 二维码状态
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeLabelId, setQrCodeLabelId] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    specification: '',
    quantity: '',
    unit: '',
    supplier: '',
    warehouse: '',
    purchaseOrderNo: '',
    batchNo: '',
    remark: '',
    isMixed: false,
    mixedMaterialRemark: '',
    colorCode: '',
    machineNo: '',
    width: '',
    isRawMaterial: false,
  });

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success('数据已刷新');
  }, []);

  // 获取仓库列表
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse');
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('获取仓库列表失败:', error);
    }
  }, []);

  // 获取仓库分类列表
  const fetchWarehouseCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse/categories');
      const result = await response.json();
      if (result.success) {
        setWarehouseCategories(result.data);
      }
    } catch (error) {
      console.error('获取仓库分类列表失败:', error);
    }
  }, []);

  // 初始加载仓库数据
  useEffect(() => {
    fetchWarehouses();
    fetchWarehouseCategories();
  }, [fetchWarehouses, fetchWarehouseCategories]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange('all');
    setSelectedRecords([]);
    toast.success('筛选条件已重置');
  }, []);

  // 筛选入库记录
  const filteredRecords = useMemo(() => {
    return inboundRecords.filter(record => {
      const matchesSearch = !searchQuery || 
        record.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.purchaseOrderNo?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.auditStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [inboundRecords, searchQuery, statusFilter]);

  // 新增入库单
  const handleAdd = () => {
    setFormData({
      materialCode: '',
      materialName: '',
      specification: '',
      quantity: '',
      unit: '',
      supplier: '',
      warehouse: '',
      purchaseOrderNo: '',
      batchNo: '',
      remark: '',
      isMixed: false,
      mixedMaterialRemark: '',
      colorCode: '',
      machineNo: '',
      width: '',
      isRawMaterial: false,
    });
    setIsAddDialogOpen(true);
  };

  // 编辑入库单
  const handleEdit = (record: any) => {
    setCurrentRecord(record);
    setFormData({
      materialCode: record.materialCode || '',
      materialName: record.materialName || '',
      specification: record.spec || '',
      quantity: record.quantity?.toString() || '',
      unit: record.unit || '',
      supplier: record.supplier || '',
      warehouse: record.warehouse || '',
      purchaseOrderNo: record.purchaseOrderNo || '',
      batchNo: record.batchNo || '',
      remark: record.remark || '',
      isMixed: record.isMixed || false,
      mixedMaterialRemark: record.mixedMaterialRemark || '',
      colorCode: record.colorCode || '',
      machineNo: record.machineNo || '',
      width: record.width?.toString() || '',
      isRawMaterial: record.isRawMaterial || false,
    });
    setIsEditDialogOpen(true);
  };

  // 混合料新增
  const handleMixedAdd = () => {
    setFormData({
      materialCode: '',
      materialName: '',
      specification: '',
      quantity: '',
      unit: '',
      supplier: '',
      warehouse: '',
      purchaseOrderNo: '',
      batchNo: '',
      remark: '',
      isMixed: true,
      mixedMaterialRemark: '',
      colorCode: '',
      machineNo: '',
      width: '',
      isRawMaterial: false,
    });
    setIsMixedAddDialogOpen(true);
  };

  // 混合料编辑
  const handleMixedEdit = (record: any) => {
    setCurrentRecord(record);
    setFormData({
      materialCode: record.materialCode || '',
      materialName: record.materialName || '',
      specification: record.spec || '',
      quantity: record.quantity?.toString() || '',
      unit: record.unit || '',
      supplier: record.supplier || '',
      warehouse: record.warehouse || '',
      purchaseOrderNo: record.purchaseOrderNo || '',
      batchNo: record.batchNo || '',
      remark: record.remark || '',
      isMixed: true,
      mixedMaterialRemark: record.mixedMaterialRemark || '',
      colorCode: record.colorCode || '',
      machineNo: record.machineNo || '',
      width: record.width?.toString() || '',
      isRawMaterial: record.isRawMaterial || false,
    });
    setIsMixedEditDialogOpen(true);
  };

  // 保存入库单
  const handleSave = () => {
    const newRecord = {
      id: `RK${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(inboundRecords.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      materialName: formData.materialName,
      spec: formData.specification,
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit,
      supplier: formData.supplier,
      warehouse: formData.warehouse,
      location: '',
      operator: '当前用户',
      status: 'pending',
      auditStatus: 'draft',
      type: formData.isMixed ? '混合料入库' : '采购入库',
      remark: formData.remark,
      purchaseOrderNo: formData.purchaseOrderNo,
      isMixed: formData.isMixed,
      mixedMaterialRemark: formData.mixedMaterialRemark,
      colorCode: formData.colorCode,
      machineNo: formData.machineNo,
      width: parseFloat(formData.width) || 0,
    };
    
    setInboundRecords([newRecord, ...inboundRecords]);
    setIsAddDialogOpen(false);
    setIsMixedAddDialogOpen(false);
    toast.success('入库单保存成功');
  };

  // 更新入库单
  const handleUpdate = () => {
    if (!currentRecord) return;
    
    setInboundRecords(inboundRecords.map(r => 
      r.id === currentRecord.id 
        ? { 
            ...r, 
            materialName: formData.materialName,
            spec: formData.specification,
            quantity: parseFloat(formData.quantity) || 0,
            unit: formData.unit,
            supplier: formData.supplier,
            warehouse: formData.warehouse,
            remark: formData.remark,
            purchaseOrderNo: formData.purchaseOrderNo,
            mixedMaterialRemark: formData.mixedMaterialRemark,
            colorCode: formData.colorCode,
            machineNo: formData.machineNo,
            width: parseFloat(formData.width) || 0,
          }
        : r
    ));
    setIsEditDialogOpen(false);
    setIsMixedEditDialogOpen(false);
    toast.success('入库单更新成功');
  };

  // 删除入库单
  const handleDelete = (record: any) => {
    setCurrentRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!currentRecord) return;
    setInboundRecords(inboundRecords.filter(r => r.id !== currentRecord.id));
    setIsDeleteDialogOpen(false);
    toast.success('入库单删除成功');
  };

  // 审核/撤审
  const handleAudit = (record: any, action: 'approve' | 'reject') => {
    setCurrentRecord({ ...record, auditAction: action });
    setIsAuditDialogOpen(true);
  };

  const confirmAudit = () => {
    if (!currentRecord) return;
    
    const newStatus = currentRecord.auditAction === 'approve' ? 'approved' : 'draft';
    const newAuditStatus = currentRecord.auditAction === 'approve' ? 'approved' : 'rejected';
    
    setInboundRecords(inboundRecords.map(r => 
      r.id === currentRecord.id 
        ? { ...r, status: newStatus, auditStatus: newAuditStatus }
        : r
    ));
    setIsAuditDialogOpen(false);
    toast.success(currentRecord.auditAction === 'approve' ? '审核成功' : '撤审成功');
  };

  // 生成标签
  const handleGenerate = () => {
    if (selectedRecords.length === 0) {
      toast.error('请先选择要生成标签的记录');
      return;
    }
    setIsGenerateDialogOpen(true);
  };

  const confirmGenerate = async () => {
    // 生成标签并为每个标签生成二维码
    const newLabels = selectedRecords.map((recordId, index) => {
      const record = inboundRecords.find(r => r.id === recordId);
      return {
        id: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(labels.length + index + 1).padStart(5, '0')}`,
        purchaseOrderNo: record?.purchaseOrderNo || '',
        supplierName: record?.supplier || '',
        inboundDate: new Date().toISOString().slice(0, 10),
        warehouseCode: 'O01',
        materialCode: record?.materialCode || 'MA01-01',
        materialName: record?.materialName || '',
        specification: record?.spec || '',
        width: record?.width || 0,
        batchNo: record?.batchNo || '',
        qty: record?.quantity || 0,
        unit: record?.unit || '',
        isRawMaterial: true,
        packageQty: 0,
        labelQty: 1,
        labelStatus: 'generated',
        auditStatus: 'approved',
        operatorName: '当前用户',
        createTime: new Date().toLocaleString('zh-CN'),
        updateTime: new Date().toLocaleString('zh-CN'),
        remark: record?.remark || '',
        colorCode: record?.colorCode || '',
        mixedMaterialRemark: record?.mixedMaterialRemark || '',
        machineNo: record?.machineNo || '',
      };
    });
    
    // 为每个新标签生成二维码
    const labelsWithQR = await Promise.all(
      newLabels.map(async (label) => {
        try {
          const qrData = JSON.stringify({
            labelId: label.id,
            materialCode: label.materialCode,
            materialName: label.materialName,
            specification: label.specification,
            batchNo: label.batchNo,
            qty: label.qty,
            unit: label.unit,
            supplierName: label.supplierName,
            inboundDate: label.inboundDate,
          });
          const qrCodeUrl = await QRCode.toDataURL(qrData, {
            width: 150,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          return { ...label, qrCodeUrl };
        } catch (error) {
          return { ...label, qrCodeUrl: '' };
        }
      })
    );
    
    setLabels([...labelsWithQR, ...labels]);
    setIsGenerateDialogOpen(false);
    setSelectedRecords([]);
    toast.success(`成功生成 ${newLabels.length} 个标签及二维码`);
    
    // 自动打开打印预览
    setTimeout(() => {
      printGeneratedLabels(labelsWithQR);
    }, 500);
  };

  // 打印单个标签
  const printSingleLabel = async (label: any) => {
    // 如果标签没有二维码，先生成
    let labelWithQR = label;
    if (!label.qrCodeUrl) {
      try {
        const qrData = JSON.stringify({
          labelId: label.id,
          materialCode: label.materialCode,
          materialName: label.materialName,
          specification: label.specification,
          batchNo: label.batchNo,
          qty: label.qty,
          unit: label.unit,
          supplierName: label.supplierName,
          inboundDate: label.inboundDate,
        });
        const qrCodeUrl = await QRCode.toDataURL(qrData, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        labelWithQR = { ...label, qrCodeUrl };
      } catch (error) {
        toast.error('二维码生成失败');
        return;
      }
    }
    printGeneratedLabels([labelWithQR]);
  };

  // 打印生成的标签（带二维码）
  const printGeneratedLabels = (labelsToPrint: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹出窗口以打印标签');
      return;
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>物料标签打印</title>
        <style>
          @media print {
            body { margin: 0; padding: 10mm; }
            .label-page { page-break-after: always; }
            .label-page:last-child { page-break-after: auto; }
          }
          body { 
            font-family: 'Microsoft YaHei', Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
          }
          .label-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .label-card {
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            width: 350px;
            height: 220px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .label-id {
            font-size: 12px;
            color: #666;
            font-family: monospace;
          }
          .label-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
          }
          .label-body {
            display: flex;
            gap: 15px;
            flex: 1;
          }
          .label-info {
            flex: 1;
            font-size: 12px;
            line-height: 1.6;
          }
          .label-info-row {
            display: flex;
            margin-bottom: 4px;
          }
          .label-info-label {
            color: #666;
            width: 60px;
            flex-shrink: 0;
          }
          .label-info-value {
            color: #333;
            font-weight: 500;
          }
          .label-qr {
            width: 100px;
            height: 100px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .label-qr img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .label-footer {
            border-top: 1px solid #ddd;
            padding-top: 8px;
            margin-top: auto;
            font-size: 11px;
            color: #999;
            display: flex;
            justify-content: space-between;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-btn:hover {
            background: #40a9ff;
          }
          @media print {
            .print-btn { display: none; }
            body { background: white; padding: 0; }
            .label-container { gap: 10px; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">打印标签</button>
        <div class="label-container">
          ${labelsToPrint.map(label => `
            <div class="label-card">
              <div class="label-header">
                <span class="label-title">物料标签</span>
                <span class="label-id">${label.id}</span>
              </div>
              <div class="label-body">
                <div class="label-info">
                  <div class="label-info-row">
                    <span class="label-info-label">物料:</span>
                    <span class="label-info-value">${label.materialName}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">代号:</span>
                    <span class="label-info-value">${label.materialCode}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">规格:</span>
                    <span class="label-info-value">${label.specification || '-'}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">数量:</span>
                    <span class="label-info-value">${label.qty} ${label.unit}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">批号:</span>
                    <span class="label-info-value">${label.batchNo || '-'}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">供应商:</span>
                    <span class="label-info-value">${label.supplierName}</span>
                  </div>
                  <div class="label-info-row">
                    <span class="label-info-label">日期:</span>
                    <span class="label-info-value">${label.inboundDate}</span>
                  </div>
                </div>
                <div class="label-qr">
                  ${label.qrCodeUrl ? `<img src="${label.qrCodeUrl}" alt="QR Code" />` : '<span style="color:#999;font-size:12px;">无二维码</span>'}
                </div>
              </div>
              <div class="label-footer">
                <span>录入: ${label.operatorName}</span>
                <span>${label.createTime}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    toast.success('标签打印预览已打开');
  };

  // 打印
  const handlePrint = () => {
    if (selectedRecords.length === 0) {
      toast.error('请先选择要打印的记录');
      return;
    }
    window.print();
    toast.success('打印任务已发送');
  };

  // 选择记录
  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 全选
  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  // 生成二维码
  const generateQRCode = async (label: any) => {
    try {
      const qrData = JSON.stringify({
        labelId: label.id,
        materialCode: label.materialCode,
        materialName: label.materialName,
        specification: label.specification,
        batchNo: label.batchNo,
        qty: label.qty,
        unit: label.unit,
        supplierName: label.supplierName,
        inboundDate: label.inboundDate,
      });
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setQrCodeLabelId(label.id);
      setIsQRCodeDialogOpen(true);
    } catch (error) {
      toast.error('二维码生成失败');
    }
  };

  // 查询二维码
  const handleQRScan = () => {
    setScanResult(null);
    setIsQRScanDialogOpen(true);
  };

  // 模拟扫描二维码
  const simulateQRScan = () => {
    // 模拟扫描结果 - 随机选择一个标签
    const randomLabel = labels[Math.floor(Math.random() * labels.length)];
    setScanResult(randomLabel);
    toast.success('二维码扫描成功');
  };

  // 计算统计数据
  const totalInboundToday = inboundRecords
    .filter(r => r.date === new Date().toISOString().slice(0, 10))
    .reduce((sum, r) => sum + r.quantity, 0);
  
  const totalInboundMonth = inboundRecords
    .reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* 页面标题 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
                  <ArrowDownLeft className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">入库管理</h1>
                  <p className="text-slate-500">原材料入库登记、查询与统计</p>
                </div>
              </div>
            </motion.div>

            {/* 功能按钮栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border"
            >
              <Button onClick={handleAdd} className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button onClick={handleMixedAdd} variant="outline" className="gap-2">
                <Beaker className="w-4 h-4" />
                混合料新增
              </Button>
              <Button onClick={handleGenerate} variant="outline" className="gap-2">
                <Barcode className="w-4 h-4" />
                生成标签
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                打印
              </Button>
              <Button onClick={handleQRScan} variant="outline" className="gap-2">
                <ScanLine className="w-4 h-4" />
                二维码查询
              </Button>
              <div className="w-px h-8 bg-slate-200 mx-2" />
              <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
            </motion.div>

            {/* 查询筛选栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">状态：</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">关键字：</span>
                <Input
                  placeholder="搜索品名、单号、供应商..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">时间：</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="today">今日</SelectItem>
                    <SelectItem value="week">本周</SelectItem>
                    <SelectItem value="month">本月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRecords.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  已选择 {selectedRecords.length} 条记录
                </Badge>
              )}
            </motion.div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">今日入库</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">{totalInboundToday.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">单位：件/M</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">本月累计入库</p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">{totalInboundMonth.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">单位：件/M</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Boxes className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">待审核</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">
                          {inboundRecords.filter(r => r.auditStatus === 'draft' || r.auditStatus === 'pending').length}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">笔待处理</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">入库单总数</p>
                        <p className="text-3xl font-bold text-purple-600 mt-1">{inboundRecords.length}</p>
                        <p className="text-xs text-slate-500 mt-1">本月累计</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 入库记录表格 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">入库记录</CardTitle>
                    <Badge variant="secondary" className="ml-2">{filteredRecords.length}</Badge>
                  </div>
                  <CardDescription>原材料入库登记记录</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-10">
                            <Checkbox 
                              checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>入库单号</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>物料信息</TableHead>
                          <TableHead>入库数量</TableHead>
                          <TableHead>供应商</TableHead>
                          <TableHead>采购单号</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>审核状态</TableHead>
                          <TableHead>操作人</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => {
                          const StatusIcon = statusConfig[record.auditStatus as keyof typeof statusConfig]?.icon || FileText;
                          return (
                            <TableRow key={record.id} className="hover:bg-slate-50">
                              <TableCell>
                                <Checkbox 
                                  checked={selectedRecords.includes(record.id)}
                                  onCheckedChange={() => toggleSelectRecord(record.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{record.id}</TableCell>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{record.materialName}</div>
                                  <div className="text-sm text-slate-500">{record.spec}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-green-600">+{record.quantity.toLocaleString()}</span>
                                <span className="text-sm text-slate-500 ml-1">{record.unit}</span>
                              </TableCell>
                              <TableCell>{record.supplier}</TableCell>
                              <TableCell className="font-mono text-sm">{record.purchaseOrderNo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={record.isMixed ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                                  {record.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={statusConfig[record.auditStatus as keyof typeof statusConfig]?.color}
                                >
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig[record.auditStatus as keyof typeof statusConfig]?.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-slate-400" />
                                  {record.operator}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(record)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      编辑
                                    </DropdownMenuItem>
                                    {record.isMixed && (
                                      <DropdownMenuItem onClick={() => handleMixedEdit(record)}>
                                        <Beaker className="w-4 h-4 mr-2" />
                                        混合料编辑
                                      </DropdownMenuItem>
                                    )}
                                    {(record.auditStatus === 'draft' || record.auditStatus === 'pending') && (
                                      <DropdownMenuItem onClick={() => handleAudit(record, 'approve')}>
                                        <Check className="w-4 h-4 mr-2" />
                                        审核
                                      </DropdownMenuItem>
                                    )}
                                    {record.auditStatus === 'approved' && (
                                      <DropdownMenuItem onClick={() => handleAudit(record, 'reject')}>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        撤审
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleDelete(record)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 物料标签表格 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-lg">物料标签</CardTitle>
                    <Badge variant="secondary" className="ml-2">{labels.length}</Badge>
                  </div>
                  <CardDescription>已生成的物料标签列表</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>标签ID</TableHead>
                          <TableHead>采购单号</TableHead>
                          <TableHead>供应商</TableHead>
                          <TableHead>进料日期</TableHead>
                          <TableHead>物料代号</TableHead>
                          <TableHead>品名</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>标签状态</TableHead>
                          <TableHead>审核状态</TableHead>
                          <TableHead>录入人</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labels.map((label) => (
                          <TableRow key={label.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-sm">{label.id}</TableCell>
                            <TableCell className="font-mono text-sm">{label.purchaseOrderNo}</TableCell>
                            <TableCell>{label.supplierName}</TableCell>
                            <TableCell>{label.inboundDate}</TableCell>
                            <TableCell className="font-mono text-sm">{label.materialCode}</TableCell>
                            <TableCell className="font-medium">{label.materialName}</TableCell>
                            <TableCell>{label.specification}</TableCell>
                            <TableCell>{label.qty} {label.unit}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {labelStatusOptions.find(o => o.value === label.labelStatus)?.label || label.labelStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={label.auditStatus === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}
                              >
                                {label.auditStatus === 'approved' ? '已审核' : '未审核'}
                              </Badge>
                            </TableCell>
                            <TableCell>{label.operatorName}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => generateQRCode(label)}
                                  className="gap-1"
                                >
                                  <QrCode className="w-4 h-4" />
                                  二维码
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => printSingleLabel(label)}
                                  className="gap-1"
                                >
                                  <Printer className="w-4 h-4" />
                                  打印
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 新增入库对话框 */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  新增入库
                </DialogTitle>
                <DialogDescription>
                  填写入库信息，完成原材料入库登记
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="space-y-2">
                  <Label>物料名称 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialName} 
                    onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                    placeholder="请输入物料名称" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>物料代号 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialCode} 
                    onChange={(e) => setFormData({...formData, materialCode: e.target.value})}
                    placeholder="请输入物料代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>规格</Label>
                  <Input 
                    value={formData.specification} 
                    onChange={(e) => setFormData({...formData, specification: e.target.value})}
                    placeholder="请输入规格" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>入库数量 <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="请输入数量" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({...formData, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>宽幅</Label>
                  <Input 
                    type="number" 
                    value={formData.width} 
                    onChange={(e) => setFormData({...formData, width: e.target.value})}
                    placeholder="请输入宽幅" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>供应商</Label>
                  <Input 
                    value={formData.supplier} 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="请输入供应商" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>仓库分类</Label>
                  <Select 
                    value={formData.warehouse} 
                    onValueChange={(value) => setFormData({...formData, warehouse: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择仓库分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.code}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>采购单号</Label>
                  <Input 
                    value={formData.purchaseOrderNo} 
                    onChange={(e) => setFormData({...formData, purchaseOrderNo: e.target.value})}
                    placeholder="请输入采购单号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>批号</Label>
                  <Input 
                    value={formData.batchNo} 
                    onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                    placeholder="请输入批号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>颜色代号</Label>
                  <Input 
                    value={formData.colorCode} 
                    onChange={(e) => setFormData({...formData, colorCode: e.target.value})}
                    placeholder="请输入颜色代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>机台</Label>
                  <Input 
                    value={formData.machineNo} 
                    onChange={(e) => setFormData({...formData, machineNo: e.target.value})}
                    placeholder="请输入机台号" 
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isRawMaterial"
                      checked={formData.isRawMaterial}
                      onChange={(e) => setFormData({...formData, isRawMaterial: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isRawMaterial" className="cursor-pointer">是否母材</Label>
                  </div>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>混合料备注</Label>
                  <Input 
                    value={formData.mixedMaterialRemark} 
                    onChange={(e) => setFormData({...formData, mixedMaterialRemark: e.target.value})}
                    placeholder="请输入混合料备注" 
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>备注</Label>
                  <Input 
                    value={formData.remark} 
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    placeholder="可选填" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 编辑入库对话框 */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  编辑入库
                </DialogTitle>
                <DialogDescription>
                  修改入库单信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="space-y-2">
                  <Label>物料名称 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialName} 
                    onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                    placeholder="请输入物料名称" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>物料代号 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialCode} 
                    onChange={(e) => setFormData({...formData, materialCode: e.target.value})}
                    placeholder="请输入物料代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>规格</Label>
                  <Input 
                    value={formData.specification} 
                    onChange={(e) => setFormData({...formData, specification: e.target.value})}
                    placeholder="请输入规格" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>入库数量 <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="请输入数量" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({...formData, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>宽幅</Label>
                  <Input 
                    type="number" 
                    value={formData.width} 
                    onChange={(e) => setFormData({...formData, width: e.target.value})}
                    placeholder="请输入宽幅" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>供应商</Label>
                  <Input 
                    value={formData.supplier} 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="请输入供应商" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>仓库分类</Label>
                  <Select 
                    value={formData.warehouse} 
                    onValueChange={(value) => setFormData({...formData, warehouse: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择仓库分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.code}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>采购单号</Label>
                  <Input 
                    value={formData.purchaseOrderNo} 
                    onChange={(e) => setFormData({...formData, purchaseOrderNo: e.target.value})}
                    placeholder="请输入采购单号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>批号</Label>
                  <Input 
                    value={formData.batchNo} 
                    onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                    placeholder="请输入批号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>颜色代号</Label>
                  <Input 
                    value={formData.colorCode} 
                    onChange={(e) => setFormData({...formData, colorCode: e.target.value})}
                    placeholder="请输入颜色代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>机台</Label>
                  <Input 
                    value={formData.machineNo} 
                    onChange={(e) => setFormData({...formData, machineNo: e.target.value})}
                    placeholder="请输入机台号" 
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="editIsRawMaterial"
                      checked={formData.isRawMaterial}
                      onChange={(e) => setFormData({...formData, isRawMaterial: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="editIsRawMaterial" className="cursor-pointer">是否母材</Label>
                  </div>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>混合料备注</Label>
                  <Input 
                    value={formData.mixedMaterialRemark} 
                    onChange={(e) => setFormData({...formData, mixedMaterialRemark: e.target.value})}
                    placeholder="请输入混合料备注" 
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>备注</Label>
                  <Input 
                    value={formData.remark} 
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    placeholder="可选填" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleUpdate}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 混合料新增对话框 */}
          <Dialog open={isMixedAddDialogOpen} onOpenChange={setIsMixedAddDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-purple-600" />
                  混合料新增
                </DialogTitle>
                <DialogDescription>
                  填写混合料入库信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>物料名称 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialName} 
                    onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                    placeholder="请输入物料名称" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>规格</Label>
                  <Input 
                    value={formData.specification} 
                    onChange={(e) => setFormData({...formData, specification: e.target.value})}
                    placeholder="请输入规格" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>入库数量 <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="请输入数量" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({...formData, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>宽幅</Label>
                  <Input 
                    type="number" 
                    value={formData.width} 
                    onChange={(e) => setFormData({...formData, width: e.target.value})}
                    placeholder="请输入宽幅" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>颜色代号</Label>
                  <Input 
                    value={formData.colorCode} 
                    onChange={(e) => setFormData({...formData, colorCode: e.target.value})}
                    placeholder="请输入颜色代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>机台</Label>
                  <Input 
                    value={formData.machineNo} 
                    onChange={(e) => setFormData({...formData, machineNo: e.target.value})}
                    placeholder="请输入机台号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>供应商</Label>
                  <Input 
                    value={formData.supplier} 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="请输入供应商" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>混合料备注</Label>
                  <Input 
                    value={formData.mixedMaterialRemark} 
                    onChange={(e) => setFormData({...formData, mixedMaterialRemark: e.target.value})}
                    placeholder="请输入混合料备注" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>备注</Label>
                  <Input 
                    value={formData.remark} 
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    placeholder="可选填" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMixedAddDialogOpen(false)}>
                  取消
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 混合料编辑对话框 */}
          <Dialog open={isMixedEditDialogOpen} onOpenChange={setIsMixedEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-purple-600" />
                  混合料编辑
                </DialogTitle>
                <DialogDescription>
                  修改混合料入库信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>物料名称 <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.materialName} 
                    onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                    placeholder="请输入物料名称" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>规格</Label>
                  <Input 
                    value={formData.specification} 
                    onChange={(e) => setFormData({...formData, specification: e.target.value})}
                    placeholder="请输入规格" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>入库数量 <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="请输入数量" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({...formData, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>宽幅</Label>
                  <Input 
                    type="number" 
                    value={formData.width} 
                    onChange={(e) => setFormData({...formData, width: e.target.value})}
                    placeholder="请输入宽幅" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>颜色代号</Label>
                  <Input 
                    value={formData.colorCode} 
                    onChange={(e) => setFormData({...formData, colorCode: e.target.value})}
                    placeholder="请输入颜色代号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>机台</Label>
                  <Input 
                    value={formData.machineNo} 
                    onChange={(e) => setFormData({...formData, machineNo: e.target.value})}
                    placeholder="请输入机台号" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>供应商</Label>
                  <Input 
                    value={formData.supplier} 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="请输入供应商" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>混合料备注</Label>
                  <Input 
                    value={formData.mixedMaterialRemark} 
                    onChange={(e) => setFormData({...formData, mixedMaterialRemark: e.target.value})}
                    placeholder="请输入混合料备注" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>备注</Label>
                  <Input 
                    value={formData.remark} 
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    placeholder="可选填" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMixedEditDialogOpen(false)}>
                  取消
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleUpdate}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 删除确认对话框 */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  确认删除
                </DialogTitle>
                <DialogDescription>
                  确定要删除入库单 <span className="font-mono font-medium">{currentRecord?.id}</span> 吗？
                  此操作不可撤销。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  取消
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  确认删除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 审核/撤审确认对话框 */}
          <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {currentRecord?.auditAction === 'approve' ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      确认审核
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5 text-yellow-600" />
                      确认撤审
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  确定要{currentRecord?.auditAction === 'approve' ? '审核' : '撤审'}入库单 <span className="font-mono font-medium">{currentRecord?.id}</span> 吗？
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAuditDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  className={currentRecord?.auditAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                  onClick={confirmAudit}
                >
                  {currentRecord?.auditAction === 'approve' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      确认审核
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      确认撤审
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 生成标签确认对话框 */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-blue-600" />
                  确认生成标签
                </DialogTitle>
                <DialogDescription>
                  确定为选中的 <span className="font-medium">{selectedRecords.length}</span> 条记录生成物料标签及二维码吗？
                  <br />
                  <span className="text-xs text-slate-500">生成后将自动打开打印预览</span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  取消
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={confirmGenerate}>
                  <Barcode className="w-4 h-4 mr-2" />
                  确认生成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 二维码展示对话框 */}
          <Dialog open={isQRCodeDialogOpen} onOpenChange={setIsQRCodeDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  物料标签二维码
                </DialogTitle>
                <DialogDescription>
                  标签ID: <span className="font-mono font-medium">{qrCodeLabelId}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                {qrCodeDataUrl && (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 border-2 border-slate-200 rounded-lg"
                  />
                )}
                <p className="text-sm text-slate-500 mt-4 text-center">
                  扫描二维码可查看物料详细信息
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQRCodeDialogOpen(false)}>
                  关闭
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCodeDataUrl;
                    link.download = `qrcode-${qrCodeLabelId}.png`;
                    link.click();
                    toast.success('二维码已下载');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 二维码查询对话框 */}
          <Dialog open={isQRScanDialogOpen} onOpenChange={setIsQRScanDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-green-600" />
                  二维码查询
                </DialogTitle>
                <DialogDescription>
                  扫描二维码查询物料标签信息
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {!scanResult ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                      <QrCode className="w-16 h-16 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 text-center">
                      请将二维码对准扫描区域
                    </p>
                    <Button onClick={simulateQRScan} className="gap-2">
                      <ScanLine className="w-4 h-4" />
                      模拟扫描
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">扫描成功</span>
                      </div>
                      <p className="text-sm text-green-600">已找到物料标签信息</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">标签ID:</span>
                        <span className="font-mono font-medium">{scanResult.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">物料代号:</span>
                        <span className="font-mono">{scanResult.materialCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">品名:</span>
                        <span className="font-medium">{scanResult.materialName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">规格:</span>
                        <span>{scanResult.specification}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">数量:</span>
                        <span>{scanResult.qty} {scanResult.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">供应商:</span>
                        <span>{scanResult.supplierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">进料日期:</span>
                        <span>{scanResult.inboundDate}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQRScanDialogOpen(false)}>
                  关闭
                </Button>
                {scanResult && (
                  <Button 
                    variant="outline" 
                    onClick={() => setScanResult(null)}
                    className="gap-2"
                  >
                    <ScanLine className="w-4 h-4" />
                    继续扫描
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
