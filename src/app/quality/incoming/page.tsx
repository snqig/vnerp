'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck,
  Search,
  Plus,
  Filter,
  Calendar,
  Building2,
  User,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Download,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
  Check,
  Edit,
  Trash2,
  Package,
  BarChart2,
  ClipboardList,
  Layers,
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
  { value: 'pass', label: '合格', color: 'bg-green-100 text-green-700' },
  { value: 'reject', label: '不合格', color: 'bg-red-100 text-red-700' },
  { value: 'pending', label: '待检验', color: 'bg-yellow-100 text-yellow-700' },
];

// 检验类型选项
const inspectionTypeOptions = [
  { value: 'full', label: '全检' },
  { value: 'sampling', label: '抽检' },
  { value: 'visual', label: '外观检查' },
  { value: 'functional', label: '功能测试' },
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

// 检验项目选项
const inspectionItems = [
  { name: '外观检查', standard: '无划痕、变形、色差' },
  { name: '尺寸检查', standard: '符合图纸要求' },
  { name: '材质检查', standard: '符合材质标准' },
  { name: '性能测试', standard: '符合性能要求' },
  { name: '包装检查', standard: '包装完好' },
];

// 进料检验记录数据
const initialIncomingInspections: any[] = [
  {
    id: 'IQC20250303001',
    date: '2025-03-03',
    supplier: '恒翌达',
    materialName: '厚0.3热缩套管',
    specification: 'Ф32',
    batchNo: 'B20250303001',
    quantity: 1000,
    unit: 'M',
    inspectionType: '抽检',
    result: 'pass',
    inspector: '张三',
    remark: '检验合格',
    items: [
      { itemName: '外观检查', standard: '无划痕、变形、色差', actualValue: '无划痕、无变形、无色差', result: 'pass', itemRemark: '' },
      { itemName: '尺寸检查', standard: 'Ф32±0.1mm', actualValue: 'Ф32.05mm', result: 'pass', itemRemark: '' },
      { itemName: '材质检查', standard: '符合材质标准', actualValue: '符合标准', result: 'pass', itemRemark: '' },
    ],
  },
  {
    id: 'IQC20250303002',
    date: '2025-03-03',
    supplier: '华通材料',
    materialName: 'PVC绝缘胶带',
    specification: '20mm*20m',
    batchNo: 'B20250303002',
    quantity: 500,
    unit: '卷',
    inspectionType: '全检',
    result: 'pass',
    inspector: '李四',
    remark: '检验合格',
    items: [
      { itemName: '外观检查', standard: '无破损、无异味', actualValue: '无破损、无异味', result: 'pass', itemRemark: '' },
      { itemName: '尺寸检查', standard: '20mm*20m', actualValue: '20mm*20.5m', result: 'pass', itemRemark: '长度略有盈余' },
      { itemName: '粘性测试', standard: '符合粘性要求', actualValue: '符合要求', result: 'pass', itemRemark: '' },
    ],
  },
  {
    id: 'IQC20250302001',
    date: '2025-03-02',
    supplier: '江南电缆',
    materialName: '铜芯线',
    specification: '1.5mm²',
    batchNo: 'B20250302001',
    quantity: 2000,
    unit: 'M',
    inspectionType: '抽检',
    result: 'reject',
    inspector: '张三',
    remark: '部分线材直径不达标',
    items: [
      { itemName: '外观检查', standard: '无破损、无氧化', actualValue: '无破损、无氧化', result: 'pass', itemRemark: '' },
      { itemName: '尺寸检查', standard: '1.5mm²±0.1mm²', actualValue: '1.3mm²', result: 'reject', itemRemark: '直径偏小' },
      { itemName: '电阻测试', standard: '符合电阻要求', actualValue: '符合要求', result: 'pass', itemRemark: '' },
    ],
  },
  {
    id: 'IQC20250301001',
    date: '2025-03-01',
    supplier: '恒翌达',
    materialName: 'PE管',
    specification: '25mm',
    batchNo: 'B20250301001',
    quantity: 1500,
    unit: 'M',
    inspectionType: '抽检',
    result: 'pending',
    inspector: '李四',
    remark: '待检验',
    items: [],
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pass: { label: '合格', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  reject: { label: '不合格', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  pending: { label: '待检验', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
};

export default function IncomingInspectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // 数据状态
  const [incomingInspections, setIncomingInspections] = useState(initialIncomingInspections);
  const [selectedInspections, setSelectedInspections] = useState<string[]>([]);
  
  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<any>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<{
    inspectionDate: string;
    supplierName: string;
    materialCode: string;
    materialName: string;
    specification: string;
    batchNo: string;
    quantity: string;
    unit: string;
    inspectionType: string;
    inspectionResult: string;
    inspectorName: string;
    remark: string;
    items: Array<{
      itemName: string;
      standard: string;
      actualValue: string;
      result: string;
      itemRemark: string;
    }>;
  }>({
    inspectionDate: '',
    supplierName: '',
    materialCode: '',
    materialName: '',
    specification: '',
    batchNo: '',
    quantity: '',
    unit: '',
    inspectionType: 'sampling',
    inspectionResult: 'pending',
    inspectorName: '',
    remark: '',
    items: [],
  });

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success('数据已刷新');
  }, []);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange('all');
    setSelectedInspections([]);
    toast.success('筛选条件已重置');
  }, []);

  // 筛选检验记录
  const filteredInspections = useMemo(() => {
    return incomingInspections.filter(inspection => {
      const matchesSearch = !searchQuery || 
        inspection.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.batchNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inspection.result === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [incomingInspections, searchQuery, statusFilter]);

  // 新增检验单
  const handleAdd = () => {
    setFormData({
      inspectionDate: new Date().toISOString().slice(0, 10),
      supplierName: '',
      materialCode: '',
      materialName: '',
      specification: '',
      batchNo: '',
      quantity: '',
      unit: '',
      inspectionType: 'sampling',
      inspectionResult: 'pending',
      inspectorName: '',
      remark: '',
      items: inspectionItems.map(item => ({
        itemName: item.name,
        standard: item.standard,
        actualValue: '',
        result: 'pending',
        itemRemark: '',
      })),
    });
    setIsAddDialogOpen(true);
  };

  // 编辑检验单
  const handleEdit = (inspection: any) => {
    setCurrentInspection(inspection);
    setFormData({
      inspectionDate: inspection.date,
      supplierName: inspection.supplier,
      materialCode: inspection.materialCode || '',
      materialName: inspection.materialName,
      specification: inspection.specification,
      batchNo: inspection.batchNo,
      quantity: inspection.quantity?.toString() || '',
      unit: inspection.unit,
      inspectionType: inspection.inspectionType === '抽检' ? 'sampling' : inspection.inspectionType === '全检' ? 'full' : inspection.inspectionType === '外观检查' ? 'visual' : 'functional',
      inspectionResult: inspection.result,
      inspectorName: inspection.inspector,
      remark: inspection.remark || '',
      items: inspection.items.length > 0 ? inspection.items.map((item: any) => ({
        itemName: item.itemName,
        standard: item.standard,
        actualValue: item.actualValue,
        result: item.result,
        itemRemark: item.itemRemark || '',
      })) : inspectionItems.map(item => ({
        itemName: item.name,
        standard: item.standard,
        actualValue: '',
        result: 'pending',
        itemRemark: '',
      })),
    });
    setIsEditDialogOpen(true);
  };

  // 保存检验单
  const handleSave = () => {
    const newInspection = {
      id: `IQC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(incomingInspections.length + 1).padStart(3, '0')}`,
      date: formData.inspectionDate,
      supplier: formData.supplierName,
      materialName: formData.materialName,
      specification: formData.specification,
      batchNo: formData.batchNo,
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit,
      inspectionType: formData.inspectionType === 'sampling' ? '抽检' : formData.inspectionType === 'full' ? '全检' : formData.inspectionType === 'visual' ? '外观检查' : '功能测试',
      result: formData.inspectionResult,
      inspector: formData.inspectorName,
      remark: formData.remark,
      items: formData.items,
    };
    
    setIncomingInspections([newInspection, ...incomingInspections]);
    setIsAddDialogOpen(false);
    toast.success('进料检验单保存成功');
  };

  // 更新检验单
  const handleUpdate = () => {
    if (!currentInspection) return;
    
    setIncomingInspections(incomingInspections.map(i => 
      i.id === currentInspection.id 
        ? { 
            ...i, 
            date: formData.inspectionDate,
            supplier: formData.supplierName,
            materialName: formData.materialName,
            specification: formData.specification,
            batchNo: formData.batchNo,
            quantity: parseFloat(formData.quantity) || 0,
            unit: formData.unit,
            inspectionType: formData.inspectionType === 'sampling' ? '抽检' : formData.inspectionType === 'full' ? '全检' : formData.inspectionType === 'visual' ? '外观检查' : '功能测试',
            result: formData.inspectionResult,
            inspector: formData.inspectorName,
            remark: formData.remark,
            items: formData.items,
          }
        : i
    ));
    setIsEditDialogOpen(false);
    toast.success('进料检验单更新成功');
  };

  // 删除检验单
  const handleDelete = (inspection: any) => {
    setCurrentInspection(inspection);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!currentInspection) return;
    setIncomingInspections(incomingInspections.filter(i => i.id !== currentInspection.id));
    setIsDeleteDialogOpen(false);
    toast.success('进料检验单删除成功');
  };

  // 打印
  const handlePrint = () => {
    if (selectedInspections.length === 0) {
      toast.error('请先选择要打印的记录');
      return;
    }
    const selectedData = filteredInspections.filter(i => selectedInspections.includes(i.id));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }
    const statusLabel = (r: string) => statusConfig[r]?.label || r;
    const rows = selectedData.map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.date}</td>
        <td>${i.supplier}</td>
        <td>${i.materialName}</td>
        <td>${i.specification}</td>
        <td>${i.batchNo}</td>
        <td>${i.quantity} ${i.unit}</td>
        <td>${i.inspectionType}</td>
        <td>${statusLabel(i.result)}</td>
        <td>${i.inspector}</td>
        <td>${i.remark || ''}</td>
      </tr>
    `).join('');
    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>进料检验记录打印</title>
<style>
  body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
  p.sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>进料检验记录</h1>
<p class="sub">打印时间：${new Date().toLocaleString()} | 共 ${selectedData.length} 条记录</p>
<table>
  <thead><tr><th>检验单号</th><th>日期</th><th>供应商</th><th>物料名称</th><th>规格</th><th>批次号</th><th>数量</th><th>检验类型</th><th>结果</th><th>检验员</th><th>备注</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    printWindow.document.close();
    toast.success('打印任务已发送');
  };

  // 选择记录
  const toggleSelectInspection = (inspectionId: string) => {
    setSelectedInspections(prev => 
      prev.includes(inspectionId) 
        ? prev.filter(id => id !== inspectionId)
        : [...prev, inspectionId]
    );
  };

  // 全选
  const toggleSelectAll = () => {
    if (selectedInspections.length === filteredInspections.length) {
      setSelectedInspections([]);
    } else {
      setSelectedInspections(filteredInspections.map(i => i.id));
    }
  };

  // 计算统计数据
  const totalInspectionsToday = incomingInspections
    .filter(i => i.date === new Date().toISOString().slice(0, 10))
    .length;
  
  const totalPassInspections = incomingInspections
    .filter(i => i.result === 'pass')
    .length;
  
  const totalRejectInspections = incomingInspections
    .filter(i => i.result === 'reject')
    .length;
  
  const passRate = incomingInspections.length > 0 
    ? Math.round((totalPassInspections / incomingInspections.length) * 100)
    : 0;

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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-200">
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">进料检验</h1>
                  <p className="text-slate-500">原材料进料检验管理与记录</p>
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
              <Button onClick={handleAdd} className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                打印
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
                  placeholder="搜索物料、供应商、批次号..."
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

              {selectedInspections.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  已选择 {selectedInspections.length} 条记录
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">今日检验</p>
                        <p className="text-3xl font-bold text-purple-600 mt-1">{totalInspectionsToday}</p>
                        <p className="text-xs text-slate-500 mt-1">笔检验记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-purple-600" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">合格数</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">{totalPassInspections}</p>
                        <p className="text-xs text-slate-500 mt-1">笔合格记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">不合格数</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">{totalRejectInspections}</p>
                        <p className="text-xs text-slate-500 mt-1">笔不合格记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">合格率</p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">{passRate}%</p>
                        <p className="text-xs text-slate-500 mt-1">检验合格率</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <BarChart2 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 检验记录表格 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <CardTitle>进料检验记录</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">共 {filteredInspections.length} 条记录</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedInspections.length === filteredInspections.length && filteredInspections.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>检验单号</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>供应商</TableHead>
                          <TableHead>物料名称</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>批次号</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>检验类型</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>检验员</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInspections.map((inspection) => {
                          const StatusIcon = statusConfig[inspection.result]?.icon || FileText;
                          return (
                            <TableRow key={inspection.id} className="hover:bg-slate-50">
                              <TableCell>
                                <Checkbox
                                  checked={selectedInspections.includes(inspection.id)}
                                  onCheckedChange={() => toggleSelectInspection(inspection.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{inspection.id}</TableCell>
                              <TableCell>{inspection.date}</TableCell>
                              <TableCell>{inspection.supplier}</TableCell>
                              <TableCell>{inspection.materialName}</TableCell>
                              <TableCell>{inspection.specification}</TableCell>
                              <TableCell>{inspection.batchNo}</TableCell>
                              <TableCell>{inspection.quantity} {inspection.unit}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {inspection.inspectionType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="w-4 h-4" />
                                  <span>{statusConfig[inspection.result]?.label || inspection.result}</span>
                                </div>
                              </TableCell>
                              <TableCell>{inspection.inspector}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(inspection)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(inspection)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
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
                  {filteredInspections.length === 0 && (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">暂无进料检验记录</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>

      {/* 新增检验单对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>新增进料检验单</DialogTitle>
            <DialogDescription>
              填写进料检验单信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">检验日期 *</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">供应商 *</Label>
                <Input
                  id="supplierName"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="请输入供应商名称"
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
                <Label htmlFor="materialName">物料名称 *</Label>
                <Input
                  id="materialName"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  placeholder="请输入物料名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specification">规格 *</Label>
                <Input
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="请输入规格"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchNo">批次号 *</Label>
                <Input
                  id="batchNo"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder="请输入批次号"
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
                <Label htmlFor="inspectionType">检验类型 *</Label>
                <Select value={formData.inspectionType} onValueChange={(value) => setFormData({ ...formData, inspectionType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择检验类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectionResult">检验结果 *</Label>
                <Select value={formData.inspectionResult} onValueChange={(value) => setFormData({ ...formData, inspectionResult: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择检验结果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待检验</SelectItem>
                    <SelectItem value="pass">合格</SelectItem>
                    <SelectItem value="reject">不合格</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectorName">检验员 *</Label>
                <Input
                  id="inspectorName"
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  placeholder="请输入检验员姓名"
                />
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
            </div>
            
            {/* 检验项目 */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">检验项目</Label>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`itemName-${index}`}>项目名称</Label>
                        <Input
                          id={`itemName-${index}`}
                          value={item.itemName}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].itemName = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`standard-${index}`}>标准要求</Label>
                        <Input
                          id={`standard-${index}`}
                          value={item.standard}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].standard = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`actualValue-${index}`}>实际值</Label>
                        <Input
                          id={`actualValue-${index}`}
                          value={item.actualValue}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].actualValue = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`result-${index}`}>结果</Label>
                        <Select value={item.result} onValueChange={(value) => {
                          const newItems = [...formData.items];
                          newItems[index].result = value;
                          setFormData({ ...formData, items: newItems });
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择结果" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待检验</SelectItem>
                            <SelectItem value="pass">合格</SelectItem>
                            <SelectItem value="reject">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 space-y-2">
                        <Label htmlFor={`itemRemark-${index}`}>备注</Label>
                        <Input
                          id={`itemRemark-${index}`}
                          value={item.itemRemark}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].itemRemark = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                          placeholder="请输入备注"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑检验单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>编辑进料检验单</DialogTitle>
            <DialogDescription>
              修改进料检验单信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">检验日期 *</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">供应商 *</Label>
                <Input
                  id="supplierName"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="请输入供应商名称"
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
                <Label htmlFor="materialName">物料名称 *</Label>
                <Input
                  id="materialName"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  placeholder="请输入物料名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specification">规格 *</Label>
                <Input
                  id="specification"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="请输入规格"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchNo">批次号 *</Label>
                <Input
                  id="batchNo"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder="请输入批次号"
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
                <Label htmlFor="inspectionType">检验类型 *</Label>
                <Select value={formData.inspectionType} onValueChange={(value) => setFormData({ ...formData, inspectionType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择检验类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectionResult">检验结果 *</Label>
                <Select value={formData.inspectionResult} onValueChange={(value) => setFormData({ ...formData, inspectionResult: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择检验结果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待检验</SelectItem>
                    <SelectItem value="pass">合格</SelectItem>
                    <SelectItem value="reject">不合格</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectorName">检验员 *</Label>
                <Input
                  id="inspectorName"
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  placeholder="请输入检验员姓名"
                />
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
            </div>
            
            {/* 检验项目 */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">检验项目</Label>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`itemName-${index}`}>项目名称</Label>
                        <Input
                          id={`itemName-${index}`}
                          value={item.itemName}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].itemName = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`standard-${index}`}>标准要求</Label>
                        <Input
                          id={`standard-${index}`}
                          value={item.standard}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].standard = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`actualValue-${index}`}>实际值</Label>
                        <Input
                          id={`actualValue-${index}`}
                          value={item.actualValue}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].actualValue = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`result-${index}`}>结果</Label>
                        <Select value={item.result} onValueChange={(value) => {
                          const newItems = [...formData.items];
                          newItems[index].result = value;
                          setFormData({ ...formData, items: newItems });
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择结果" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待检验</SelectItem>
                            <SelectItem value="pass">合格</SelectItem>
                            <SelectItem value="reject">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 space-y-2">
                        <Label htmlFor={`itemRemark-${index}`}>备注</Label>
                        <Input
                          id={`itemRemark-${index}`}
                          value={item.itemRemark}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].itemRemark = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                          placeholder="请输入备注"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} className="bg-purple-600 hover:bg-purple-700">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除检验单对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>删除进料检验单</DialogTitle>
            <DialogDescription>
              确定要删除检验单 {currentInspection?.id} 吗？此操作不可撤销。
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
    </div>
  );
}
