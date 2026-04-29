'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  ArrowUpRight,
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
import { MainLayout } from '@/components/layout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// 状态类型
const statusOptions = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'draft', label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'pending', label: '待审核', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'approved', label: '已审核', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  { value: 'rejected', label: '已拒绝', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
  { value: 'completed', label: '已完成', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
];

// 出库类型选项
const outboundTypeOptions = [
  { value: 'production', label: '生产出库' },
  { value: 'sales', label: '销售出库' },
  { value: 'return', label: '退货出库' },
  { value: 'other', label: '其他出库' },
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

// 出库记录数据
const initialOutboundRecords: any[] = [
  {
    id: 'CK20250303001',
    date: '2025-03-03',
    materialName: '厚0.3热缩套管',
    spec: 'Ф32',
    quantity: 500,
    unit: 'M',
    warehouse: '原材料仓',
    location: 'A-01-01',
    operator: '张三',
    status: 'completed',
    auditStatus: 'approved',
    type: '生产出库',
    remark: '生产车间领用',
    isRawMaterial: true,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250303001',
  },
  {
    id: 'CK20250303002',
    date: '2025-03-03',
    materialName: 'PE管',
    spec: '25',
    quantity: 200,
    unit: 'M',
    warehouse: '原材料仓',
    location: 'A-01-02',
    operator: '张三',
    status: 'completed',
    auditStatus: 'approved',
    type: '生产出库',
    remark: '生产车间领用',
    isRawMaterial: true,
    materialCode: 'PE-25',
    width: 25,
    batchNo: 'B20250303002',
  },
  {
    id: 'CK20250302001',
    date: '2025-03-02',
    materialName: '厚0.2热缩套管',
    spec: '22',
    quantity: 300,
    unit: 'M',
    warehouse: '原材料仓',
    location: 'A-01-03',
    operator: '李四',
    status: 'completed',
    auditStatus: 'approved',
    type: '销售出库',
    remark: '客户订单发货',
    isRawMaterial: true,
    materialCode: 'RSG-0.2-22',
    width: 22,
    batchNo: 'B20250302001',
  },
  {
    id: 'CK20250301001',
    date: '2025-03-01',
    materialName: '厚0.3热缩套管',
    spec: 'Ф32',
    quantity: 1000,
    unit: 'M',
    warehouse: '原材料仓',
    location: 'A-01-01',
    operator: '张三',
    status: 'pending',
    auditStatus: 'draft',
    type: '生产出库',
    remark: '月度生产计划领用',
    isRawMaterial: true,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250301001',
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800', icon: CheckCircle2 },
  pending: { label: '待出库', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800', icon: Clock },
  in_transit: { label: '运输中', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800', icon: Truck },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600', icon: AlertCircle },
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600', icon: FileText },
  approved: { label: '已审核', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800', icon: CheckCircle2 },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800', icon: X },
};

export default function OutboundManagementPage() {
  const [activeTab, setActiveTab] = useState('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // 数据状态
  const [outboundRecords, setOutboundRecords] = useState(initialOutboundRecords);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<any[]>([]);
  
  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isFifoDialogOpen, setIsFifoDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  
  // FIFO分配状态
  const [fifoAllocation, setFifoAllocation] = useState<any>(null);
  const [fifoLoading, setFifoLoading] = useState(false);
  const [fifoConfirming, setFifoConfirming] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    specification: '',
    quantity: '',
    unit: '',
    warehouse: '',
    remark: '',
    outboundType: 'production',
    isRawMaterial: false,
    batchNo: '',
    width: '',
  });

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchOutboundRecords();
    setIsLoading(false);
    toast.success('数据已刷新');
  }, []);

  // 获取出库单列表
  const fetchOutboundRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('keyword', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('pageSize', '1000');
      
      const response = await fetch(`/api/warehouse/outbound?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setOutboundRecords(result.data?.list || result.data || []);
      }
    } catch (error) {
      console.error('获取出库单列表失败:', error);
    }
  }, [searchQuery, statusFilter]);

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

  // 筛选出库记录
  const filteredRecords = useMemo(() => {
    return outboundRecords.filter(record => {
      const matchesSearch = !searchQuery || 
        record.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.remark?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.auditStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [outboundRecords, searchQuery, statusFilter]);

  // 新增出库单
  const handleAdd = () => {
    setFormData({
      materialCode: '',
      materialName: '',
      specification: '',
      quantity: '',
      unit: '',
      warehouse: '',
      remark: '',
      outboundType: 'production',
      isRawMaterial: false,
      batchNo: '',
      width: '',
    });
    setIsAddDialogOpen(true);
  };

  // 编辑出库单
  const handleEdit = (record: any) => {
    setCurrentRecord(record);
    setFormData({
      materialCode: record.materialCode || '',
      materialName: record.materialName || '',
      specification: record.spec || '',
      quantity: record.quantity?.toString() || '',
      unit: record.unit || '',
      warehouse: record.warehouse || '',
      remark: record.remark || '',
      outboundType: record.type === '生产出库' ? 'production' : record.type === '销售出库' ? 'sales' : record.type === '退货出库' ? 'return' : 'other',
      isRawMaterial: record.isRawMaterial || false,
      batchNo: record.batchNo || '',
      width: record.width?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  // 保存出库单
  const handleSave = async () => {
    try {
      const warehouseData = warehouses.find(w => w.code === formData.warehouse || w.name === formData.warehouse);
      
      const apiData = {
        orderDate: new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || 0,
        warehouseCode: warehouseData?.code || formData.warehouse,
        warehouseName: warehouseData?.name || formData.warehouse,
        remark: formData.remark,
        items: [{
          materialId: 0,
          materialCode: formData.materialCode,
          materialName: formData.materialName,
          specification: formData.specification,
          width: parseFloat(formData.width) || 0,
          batchNo: formData.batchNo,
          qty: parseFloat(formData.quantity) || 0,
          unit: formData.unit,
          isRawMaterial: formData.isRawMaterial,
          unitPrice: 0,
          locationCode: '',
          remark: '',
        }],
        operatorId: 0,
        operatorName: '当前用户',
      };

      const response = await fetch('/api/warehouse/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('出库单保存成功');
        await fetchOutboundRecords();
        setIsAddDialogOpen(false);
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存出库单失败:', error);
      toast.error('保存失败');
    }
  };

  // 更新出库单
  const handleUpdate = async () => {
    if (!currentRecord) return;
    
    try {
      const warehouseData = warehouses.find(w => w.code === formData.warehouse || w.name === formData.warehouse);
      
      const apiData = {
        id: currentRecord.id,
        orderDate: currentRecord.orderDate || new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || 0,
        warehouseCode: warehouseData?.code || formData.warehouse,
        warehouseName: warehouseData?.name || formData.warehouse,
        remark: formData.remark,
        items: [{
          materialId: 0,
          materialCode: formData.materialCode,
          materialName: formData.materialName,
          specification: formData.specification,
          width: parseFloat(formData.width) || 0,
          batchNo: formData.batchNo,
          qty: parseFloat(formData.quantity) || 0,
          unit: formData.unit,
          isRawMaterial: formData.isRawMaterial,
          unitPrice: 0,
          locationCode: '',
          remark: '',
        }],
        operatorId: 0,
        operatorName: '当前用户',
      };

      const response = await fetch('/api/warehouse/outbound', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('出库单更新成功');
        await fetchOutboundRecords();
        setIsEditDialogOpen(false);
      } else {
        toast.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新出库单失败:', error);
      toast.error('更新失败');
    }
  };

  // 删除出库单
  const handleDelete = (record: any) => {
    setCurrentRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentRecord) return;
    
    try {
      const response = await fetch(`/api/warehouse/outbound?id=${currentRecord.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('出库单删除成功');
        await fetchOutboundRecords();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除出库单失败:', error);
      toast.error('删除失败');
    }
    setIsDeleteDialogOpen(false);
  };

  // 审核/撤审
  const handleAudit = (record: any, action: 'approve' | 'reject') => {
    setCurrentRecord({ ...record, auditAction: action });
    setIsAuditDialogOpen(true);
  };

  const confirmAudit = async () => {
    if (!currentRecord) return;
    
    try {
      const newStatus = currentRecord.auditAction === 'approve' ? 'approved' : 'pending';
      const response = await fetch('/api/warehouse/outbound', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentRecord.id,
          status: newStatus,
          auditStatus: newStatus,
          auditorName: '当前用户',
          auditTime: new Date().toISOString(),
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(currentRecord.auditAction === 'approve' ? '审核成功' : '撤审成功');
        await fetchOutboundRecords();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('审核出库单失败:', error);
      toast.error('操作失败');
    }
    setIsAuditDialogOpen(false);
  };

  // FIFO分配预览
  const handleFifoPreview = async (record: any) => {
    setCurrentRecord(record);
    setFifoLoading(true);
    setIsFifoDialogOpen(true);
    setFifoAllocation(null);
    
    try {
      const warehouseData = warehouses.find(w => w.name === record.warehouse);
      const warehouseId = warehouseData?.id || record.warehouseId;
      
      if (!warehouseId) {
        toast.error('无法确定仓库信息');
        setFifoLoading(false);
        return;
      }

      const response = await fetch(
        `/api/warehouse/outbound/fifo?materialId=${record.materialId || record.material_id || 0}&warehouseId=${warehouseId}&requiredQty=${record.quantity || record.qty || 0}`
      );
      const result = await response.json();
      
      if (result.success) {
        setFifoAllocation(result.data);
      } else {
        toast.error(result.message || '获取FIFO分配方案失败');
      }
    } catch (error) {
      console.error('获取FIFO分配方案失败:', error);
      toast.error('获取FIFO分配方案失败');
    }
    setFifoLoading(false);
  };

  // FIFO确认出库
  const handleFifoConfirm = async () => {
    if (!currentRecord) return;
    setFifoConfirming(true);
    
    try {
      const response = await fetch('/api/warehouse/outbound/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentRecord.id || currentRecord.orderId,
          operatorId: 1,
          operatorName: '当前用户',
          remark: 'FIFO先进先出出库',
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('FIFO出库确认成功，库存已按先进先出扣减');
        await fetchOutboundRecords();
        setIsFifoDialogOpen(false);
      } else {
        toast.error(result.message || 'FIFO出库确认失败');
      }
    } catch (error) {
      console.error('FIFO出库确认失败:', error);
      toast.error('FIFO出库确认失败');
    }
    setFifoConfirming(false);
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

  // 计算统计数据
  const totalOutboundToday = outboundRecords
    .filter(r => r.date === new Date().toISOString().slice(0, 10))
    .reduce((sum, r) => sum + r.quantity, 0);
  
  const totalOutboundMonth = outboundRecords
    .reduce((sum, r) => sum + r.quantity, 0);

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
            {/* 页面标题 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">出库管理</h1>
                  <p className="text-slate-500">原材料出库登记、查询与统计</p>
                </div>
              </div>
            </motion.div>

            {/* 功能按钮栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700"
            >
              <Button onClick={handleAdd} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                打印
              </Button>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2" />
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
              className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700"
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
                  placeholder="搜索品名、单号、备注..."
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">今日出库</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalOutboundToday.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">单位：件/M</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">本月累计出库</p>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalOutboundMonth.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">单位：件/M</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center">
                        <Boxes className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/40">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">待审核</p>
                        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                          {outboundRecords.filter(r => r.auditStatus === 'draft' || r.auditStatus === 'pending').length}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">笔待处理</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/60 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/40 dark:to-pink-900/40">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">出库单总数</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{outboundRecords.length}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">本月累计</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 出库记录表格 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border shadow-sm dark:border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between border-b dark:border-slate-700">
                  <CardTitle>出库记录</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">共 {filteredRecords.length} 条记录</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>出库单号</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>物料名称</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>单位</TableHead>
                          <TableHead>仓库</TableHead>
                          <TableHead>批次号</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作员</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => {
                          const StatusIcon = statusConfig[record.status]?.icon || FileText;
                          return (
                            <TableRow key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <TableCell>
                                <Checkbox
                                  checked={selectedRecords.includes(record.id)}
                                  onCheckedChange={() => toggleSelectRecord(record.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{record.id}</TableCell>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>{record.materialName}</TableCell>
                              <TableCell>{record.spec}</TableCell>
                              <TableCell>{record.quantity}</TableCell>
                              <TableCell>{record.unit}</TableCell>
                              <TableCell>{record.warehouse}</TableCell>
                              <TableCell className="font-mono text-xs">{record.batchNo || record.batch_no || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
                                  {record.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="w-4 h-4" />
                                  <span>{statusConfig[record.status]?.label || record.status}</span>
                                </div>
                              </TableCell>
                              <TableCell>{record.operator}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(record)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(record)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      删除
                                    </DropdownMenuItem>
                                    {record.auditStatus !== 'approved' && (
                                      <DropdownMenuItem onClick={() => handleAudit(record, 'approve')}>
                                        <Check className="mr-2 h-4 w-4" />
                                        审核
                                      </DropdownMenuItem>
                                    )}
                                    {record.auditStatus === 'approved' && (
                                      <DropdownMenuItem onClick={() => handleAudit(record, 'reject')}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        撤审
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleFifoPreview(record)}>
                                      <Layers className="mr-2 h-4 w-4" />
                                      FIFO分配
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
                  {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <List className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">暂无出库记录</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

      {/* 新增出库单对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>新增出库单</DialogTitle>
            <DialogDescription>
              填写出库单信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materialName">物料名称 *</Label>
              <Input
                id="materialName"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                placeholder="请输入物料名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCode">物料编码</Label>
              <Input
                id="materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                placeholder="请输入物料编码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">规格</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="请输入规格"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">宽度</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="请输入宽度"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNo">批号</Label>
              <Input
                id="batchNo"
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder="请输入批号"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">数量 *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="请输入数量"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">单位 *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择单位" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">仓库 *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData({ ...formData, warehouse: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择仓库" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.name}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundType">出库类型 *</Label>
              <Select value={formData.outboundType} onValueChange={(value) => setFormData({ ...formData, outboundType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择出库类型" />
                </SelectTrigger>
                <SelectContent>
                  {outboundTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="请输入备注"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRawMaterial"
                checked={formData.isRawMaterial}
                onCheckedChange={(checked) => setFormData({ ...formData, isRawMaterial: checked as boolean })}
              />
              <Label htmlFor="isRawMaterial">是否原材料</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑出库单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>编辑出库单</DialogTitle>
            <DialogDescription>
              修改出库单信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materialName">物料名称 *</Label>
              <Input
                id="materialName"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                placeholder="请输入物料名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCode">物料编码</Label>
              <Input
                id="materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                placeholder="请输入物料编码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">规格</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="请输入规格"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">宽度</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="请输入宽度"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNo">批号</Label>
              <Input
                id="batchNo"
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder="请输入批号"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">数量 *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="请输入数量"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">单位 *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择单位" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">仓库 *</Label>
              <Select value={formData.warehouse} onValueChange={(value) => setFormData({ ...formData, warehouse: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择仓库" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.name}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundType">出库类型 *</Label>
              <Select value={formData.outboundType} onValueChange={(value) => setFormData({ ...formData, outboundType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择出库类型" />
                </SelectTrigger>
                <SelectContent>
                  {outboundTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="请输入备注"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRawMaterial"
                checked={formData.isRawMaterial}
                onCheckedChange={(checked) => setFormData({ ...formData, isRawMaterial: checked as boolean })}
              />
              <Label htmlFor="isRawMaterial">是否原材料</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除出库单对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>删除出库单</DialogTitle>
            <DialogDescription>
              确定要删除出库单 {currentRecord?.id} 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核出库单对话框 */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>
              {currentRecord?.auditAction === 'approve' ? '审核出库单' : '撤审出库单'}
            </DialogTitle>
            <DialogDescription>
              {currentRecord?.auditAction === 'approve' 
                ? `确定要审核通过出库单 ${currentRecord?.id} 吗？`
                : `确定要撤销审核出库单 ${currentRecord?.id} 吗？`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmAudit} className={currentRecord?.auditAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}>
              {currentRecord?.auditAction === 'approve' ? '审核通过' : '撤销审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIFO先进先出分配对话框 */}
      <Dialog open={isFifoDialogOpen} onOpenChange={setIsFifoDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]" resizable>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              FIFO先进先出分配方案
            </DialogTitle>
            <DialogDescription>
              出库单 {currentRecord?.id} - {currentRecord?.materialName} | 需出库数量: {currentRecord?.quantity || currentRecord?.qty}
            </DialogDescription>
          </DialogHeader>
          
          {fifoLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-600">正在计算FIFO分配方案...</span>
            </div>
          ) : fifoAllocation ? (
            <div className="space-y-4">
              {/* 汇总信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600">需要出库</p>
                  <p className="text-xl font-bold text-blue-700">{fifoAllocation.required_qty || currentRecord?.quantity || currentRecord?.qty}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">可用库存</p>
                  <p className="text-xl font-bold text-green-700">{fifoAllocation.total_available?.toFixed(3) || '0'}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${fifoAllocation.shortage > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className={`text-xs ${fifoAllocation.shortage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fifoAllocation.shortage > 0 ? '缺少' : '状态'}
                  </p>
                  <p className={`text-xl font-bold ${fifoAllocation.shortage > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {fifoAllocation.shortage > 0 ? fifoAllocation.shortage.toFixed(3) : '充足'}
                  </p>
                </div>
              </div>

              {fifoAllocation.shortage > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700">
                    库存不足！缺少 {fifoAllocation.shortage.toFixed(3)} 件，无法完成出库。请先补货或减少出库数量。
                  </span>
                </div>
              )}

              {/* 分配明细表 */}
              {fifoAllocation.allocation_plan && fifoAllocation.allocation_plan.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">分配明细（按入库日期从早到晚）</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-slate-50">批次号</TableHead>
                          <TableHead className="bg-slate-50">入库日期</TableHead>
                          <TableHead className="bg-slate-50">可用数量</TableHead>
                          <TableHead className="bg-slate-50">分配数量</TableHead>
                          <TableHead className="bg-slate-50">单价</TableHead>
                          <TableHead className="bg-slate-50">分配金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fifoAllocation.allocation_plan.map((alloc: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{alloc.batch_no}</TableCell>
                            <TableCell>{alloc.inbound_date || '-'}</TableCell>
                            <TableCell>{alloc.available_qty_before?.toFixed(3)}</TableCell>
                            <TableCell className="font-semibold text-blue-700">{alloc.allocate_qty?.toFixed(3)}</TableCell>
                            <TableCell>{alloc.unit_cost?.toFixed(2)}</TableCell>
                            <TableCell>{(alloc.allocate_qty * alloc.unit_cost)?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 可用批次列表 */}
              {fifoAllocation.batches && fifoAllocation.batches.length > 0 && !fifoAllocation.allocation_plan?.length && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">可用批次（按入库日期排序）</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-slate-50">批次号</TableHead>
                          <TableHead className="bg-slate-50">入库日期</TableHead>
                          <TableHead className="bg-slate-50">总数量</TableHead>
                          <TableHead className="bg-slate-50">可用数量</TableHead>
                          <TableHead className="bg-slate-50">单价</TableHead>
                          <TableHead className="bg-slate-50">状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fifoAllocation.batches.map((batch: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{batch.batch_no}</TableCell>
                            <TableCell>{batch.inbound_date || '-'}</TableCell>
                            <TableCell>{parseFloat(batch.quantity)?.toFixed(3)}</TableCell>
                            <TableCell className="font-semibold text-green-700">{parseFloat(batch.available_qty)?.toFixed(3)}</TableCell>
                            <TableCell>{parseFloat(batch.unit_price)?.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                正常
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {(!fifoAllocation.batches || fifoAllocation.batches.length === 0) && 
               (!fifoAllocation.allocation_plan || fifoAllocation.allocation_plan.length === 0) && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-slate-600">该物料暂无可用批次库存</p>
                  <p className="text-sm text-slate-400 mt-1">请先进行入库操作</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">无法获取分配方案</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFifoDialogOpen(false)}>
              关闭
            </Button>
            {fifoAllocation && fifoAllocation.can_fulfill && currentRecord?.status !== 'completed' && (
              <Button 
                onClick={handleFifoConfirm} 
                disabled={fifoConfirming}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {fifoConfirming ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    确认中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    确认FIFO出库
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
