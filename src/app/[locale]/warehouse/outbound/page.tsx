'use client';

import { authFetch } from '@/lib/auth-fetch';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Search,
  Plus,
  Filter,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  MoreHorizontal,
  Printer,
  TrendingDown,
  Boxes,
  AlertCircle,
  List,
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  RotateCcw,
  X,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface OutboundRecord {
  id: string;
  date: string;
  materialName: string;
  spec: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location: string;
  operator: string;
  status: string;
  auditStatus: string;
  type: string;
  remark: string;
  isRawMaterial: boolean;
  materialCode: string;
  width?: number;
  batchNo?: string;
  batch_no?: string;
  total_amount?: number;
  currency?: string;
  base_total_amount?: number;
  base_currency?: string;
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MainLayout } from '@/components/layout';
import { MoneyDisplay } from '@/components/ui/money-display';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

// 状态类型
const statusOptions = [
  {
    value: 'all',
    labelKey: 'all',
    color: 'bg-muted text-muted-foreground',
  },
  {
    value: 'draft',
    labelKey: 'draft',
    color: 'bg-muted text-muted-foreground',
  },
  {
    value: 'pending',
    labelKey: 'pending',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  },
  {
    value: 'approved',
    labelKey: 'approved',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  },
  {
    value: 'rejected',
    labelKey: 'rejected',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  },
  {
    value: 'completed',
    labelKey: 'completed',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  },
];

// 出库类型选项
const outboundTypeOptions = [
  { value: 'production', labelKey: 'productionOutbound' },
  { value: 'sales', labelKey: 'salesOutbound' },
  { value: 'return', labelKey: 'returnOutbound' },
  { value: 'other', labelKey: 'otherOutbound' },
];

// 常用单位选项 (将在组件内使用 useMemo 定义以支持国际化)
// 单位选项映射到 Warehouse 命名空间的翻译键

// 基础信息数据（物料主数据）
const _materials = [
  {
    id: 1,
    category: '原材料',
    name: '厚0.3热缩套管',
    code: 'RSG-0.3-32',
    spec: 'Ф32',
    unit: 'M',
    supplier: '恒翌达',
    location: 'A01-01',
  },
  {
    id: 2,
    category: '原材料',
    name: 'PE管',
    code: 'PE-25',
    spec: '25mm',
    unit: 'M',
    supplier: '恒翌达',
    location: 'A01-02',
  },
  {
    id: 3,
    category: '原材料',
    name: '厚0.2热缩套管',
    code: 'RSG-0.2-22',
    spec: 'Ф22',
    unit: 'M',
    supplier: '恒翌达',
    location: 'A01-03',
  },
  {
    id: 4,
    category: '原材料',
    name: 'PVC绝缘胶带',
    code: 'PVC-TAPE-20',
    spec: '20mm*20m',
    unit: '卷',
    supplier: '华通材料',
    location: 'A02-01',
  },
  {
    id: 5,
    category: '原材料',
    name: '铜芯线',
    code: 'CU-WIRE-1.5',
    spec: '1.5mm²',
    unit: 'M',
    supplier: '江南电缆',
    location: 'A02-02',
  },
  {
    id: 6,
    category: '原材料',
    name: '铝箔屏蔽带',
    code: 'AL-FOIL-50',
    spec: '50mm*50m',
    unit: '卷',
    supplier: '华通材料',
    location: 'A02-03',
  },
  {
    id: 7,
    category: '原材料',
    name: '尼龙扎带',
    code: 'NYLON-TIE-4',
    spec: '4*200mm',
    unit: '包',
    supplier: '恒翌达',
    location: 'A03-01',
  },
  {
    id: 8,
    category: '原材料',
    name: '热熔胶棒',
    code: 'HOT-GLUE-11',
    spec: 'Ф11mm',
    unit: 'KG',
    supplier: '华通材料',
    location: 'A03-02',
  },
];

const statusConfig: Record<
  string,
  { labelKey: string; color: string; icon: React.ComponentType<Loose> }
> = {
  completed: {
    labelKey: 'completed',
    color:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
  pending: {
    labelKey: 'pending',
    color:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
    icon: Clock,
  },
  in_transit: {
    labelKey: 'inTransit',
    color:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
    icon: Truck,
  },
  cancelled: {
    labelKey: 'cancelled',
    color:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    icon: AlertCircle,
  },
  draft: {
    labelKey: 'draft',
    color:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    icon: FileText,
  },
  approved: {
    labelKey: 'approved',
    color:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
  rejected: {
    labelKey: 'rejected',
    color:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
    icon: X,
  },
};

export default function OutboundManagementPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 单位选项（支持国际化）
  const unitOptions = useMemo(
    () => [
      { value: 'M', label: t('unitM') },
      { value: 'KG', label: t('unitKG') },
      { value: '卷', label: t('unitRoll') },
      { value: '支', label: t('unitPiece') },
      { value: '张', label: t('unitSheet') },
      { value: '桶', label: t('unitBarrel') },
      { value: '箱', label: t('unitBox') },
      { value: 'PCS', label: t('unitPCS') },
      { value: '套', label: t('unitSet') },
      { value: '件', label: t('unitItem') },
    ],
    [t]
  );

  const [_activeTab, _setActiveTab] = useState('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // 数据状态
  const [outboundRecords, setOutboundRecords] = useState<OutboundRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<Loose[]>([]);

  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isFifoDialogOpen, setIsFifoDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Loose>(null);

  // FIFO分配状态
  const [fifoAllocation, setFifoAllocation] = useState<Loose>(null);
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
    toast.success(t('dataRefreshed'));
  }, []);

  // 获取出库单列表
  const fetchOutboundRecords = useCallback(async () => {
    logger.info({ module: 'Warehouse', action: 'fetchOutboundRecords' }, '开始获取出库单列表');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('keyword', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('pageSize', '1000');

      const response = await authFetch(`/api/warehouse/outbound?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setOutboundRecords(result.data?.list || result.data || []);
        logger.info({ module: 'Warehouse', action: 'fetchOutboundRecords' }, '出库单列表获取成功', {
          count: (result.data?.list || result.data || []).length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Warehouse', action: 'fetchOutboundRecords' }, '获取出库单列表失败', {
        error: (error as Error).message,
      });
    }
  }, [searchQuery, statusFilter]);

  // 获取仓库列表
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await authFetch('/api/warehouse?all=true');
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch {}
  }, []);

  // 初始加载仓库和出库数据
  useEffect(() => {
    fetchWarehouses();
    fetchOutboundRecords();
  }, [fetchWarehouses, fetchOutboundRecords]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange('all');
    setSelectedRecords([]);
    toast.success(t('filterReset'));
  }, []);

  // 筛选出库记录
  const filteredRecords = useMemo(() => {
    return outboundRecords.filter((record) => {
      const matchesSearch =
        !searchQuery ||
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
  const handleEdit = (record: Loose) => {
    setCurrentRecord(record);
    setFormData({
      materialCode: record.materialCode || '',
      materialName: record.materialName || '',
      specification: record.spec || '',
      quantity: record.quantity?.toString() || '',
      unit: record.unit || '',
      warehouse: record.warehouseId ? String(record.warehouseId) : '',
      remark: record.remark || '',
      outboundType:
        record.type === '生产出库'
          ? 'production'
          : record.type === '销售出库'
            ? 'sales'
            : record.type === '退货出库'
              ? 'return'
              : 'other',
      isRawMaterial: record.isRawMaterial || false,
      batchNo: record.batchNo || '',
      width: record.width?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  // 保存出库单
  const handleSave = async () => {
    try {
      const warehouseData = warehouses.find((w) => String(w.id) === formData.warehouse);

      const apiData = {
        orderDate: new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || Number(formData.warehouse) || 0,
        warehouseCode: warehouseData?.code || '',
        warehouseName: warehouseData?.name || '',
        remark: formData.remark,
        items: [
          {
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
          },
        ],
        operatorId: 0,
        operatorName: '当前用户',
      };

      const response = await authFetch('/api/warehouse/outbound', {
        method: 'POST',
        body: JSON.stringify(apiData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(t('saveSuccess'));
        setIsAddDialogOpen(false);
        fetchOutboundRecords();
      } else {
        toast.error(result.message || t('saveFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  // 更新出库单
  const handleUpdate = async () => {
    if (!currentRecord) return;

    try {
      const warehouseData = warehouses.find((w) => String(w.id) === formData.warehouse);

      const apiData = {
        id: currentRecord.id,
        orderDate: currentRecord.orderDate || new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || Number(formData.warehouse) || 0,
        warehouseCode: warehouseData?.code || '',
        warehouseName: warehouseData?.name || '',
        remark: formData.remark,
        items: [
          {
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
          },
        ],
        operatorId: 0,
        operatorName: '当前用户',
      };

      const response = await authFetch('/api/warehouse/outbound', {
        method: 'PUT',
        body: JSON.stringify(apiData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(t('updateOutboundSuccess'));
        setIsEditDialogOpen(false);
        fetchOutboundRecords();
      } else {
        toast.error(result.message || t('updateFailed'));
      }
    } catch {
      toast.error(t('updateFailed'));
    }
  };

  // 删除出库单
  const handleDelete = (record: Loose) => {
    setCurrentRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentRecord) return;

    try {
      const response = await authFetch(`/api/warehouse/outbound?id=${currentRecord.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success(t('deleteOutboundSuccess'));
        setIsDeleteDialogOpen(false);
        fetchOutboundRecords();
      } else {
        toast.error(result.message || t('deleteFailed'));
      }
    } catch {
      toast.error(t('deleteFailed'));
    }
    setIsDeleteDialogOpen(false);
  };

  // 审核/撤审
  const handleAudit = (record: Loose, action: 'approve' | 'reject') => {
    setCurrentRecord({ ...record, auditAction: action });
    setIsAuditDialogOpen(true);
  };

  const confirmAudit = async () => {
    if (!currentRecord) return;

    try {
      const newStatus = currentRecord.auditAction === 'approve' ? 'approved' : 'pending';
      const response = await authFetch('/api/warehouse/outbound', {
        method: 'PUT',
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
        toast.success(
          currentRecord.auditAction === 'approve' ? t('auditSuccess') : t('unauditSuccess')
        );
        await fetchOutboundRecords();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
    setIsAuditDialogOpen(false);
  };

  // FIFO分配预览
  const handleFifoPreview = async (record: Loose) => {
    setCurrentRecord(record);
    setFifoLoading(true);
    setIsFifoDialogOpen(true);
    setFifoAllocation(null);

    try {
      const warehouseData = warehouses.find((w) => w.name === record.warehouse);
      const warehouseId = warehouseData?.id || record.warehouseId;

      if (!warehouseId) {
        toast.error(tc('fetchFailed'));
        setFifoLoading(false);
        return;
      }

      const response = await authFetch(
        `/api/warehouse/outbound/fifo?materialId=${record.materialId || record.material_id || 0}&warehouseId=${warehouseId}&requiredQty=${record.quantity || record.qty || 0}`
      );
      const result = await response.json();

      if (result.success) {
        setFifoAllocation(result.data);
      } else {
        toast.error(t('fifoFetchFailed'));
      }
    } catch {
      toast.error(t('fifoFetchFailed'));
    }
    setFifoLoading(false);
  };

  // FIFO确认出库
  const handleFifoConfirm = async () => {
    if (!currentRecord) return;
    setFifoConfirming(true);

    try {
      const response = await authFetch('/api/warehouse/outbound/confirm', {
        method: 'POST',
        body: JSON.stringify({
          id: currentRecord.id || currentRecord.orderId,
          operatorId: 1,
          operatorName: '当前用户',
          remark: 'FIFO先进先出出库',
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(t('fifoConfirmSuccess'));
        setIsFifoDialogOpen(false);
        fetchOutboundRecords();
      } else {
        toast.error(result.message || t('fifoConfirmFailed'));
      }
    } catch {
      toast.error(t('fifoConfirmFailed'));
    }
    setFifoConfirming(false);
  };

  // 打印
  const handlePrint = () => {
    if (selectedRecords.length === 0) {
      toast.error(t('printFirst'));
    }
    toast.success(t('printSent'));
  };

  // 选择记录
  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  // 全选
  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map((r) => r.id));
    }
  };

  // 计算统计数据
  const totalOutboundToday = outboundRecords
    .filter((r) => r.date === new Date().toISOString().slice(0, 10))
    .reduce((sum, r) => sum + r.quantity, 0);

  const totalOutboundMonth = outboundRecords.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary">
              <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t('outboundManagement')}</h1>
              <p className="text-sm text-muted-foreground">{t('outboundDesc')}</p>
            </div>
          </div>
        </motion.div>

        {/* 功能按钮栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-3 rounded-lg p-4 border bg-background border-border shadow-sm"
        >
          <Button onClick={handleAdd} className="gap-2 bg-primary border-blue-600">
            <Plus className="w-4 h-4" />
            {tc('add')}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            {tc('print')}
          </Button>
          <div className="w-px h-8 mx-2 bg-border" />
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </Button>
        </motion.div>

        {/* 查询筛选栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-4 rounded-lg p-4 border bg-background border-border shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('statusFilter')}：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {tc(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{tc('keyword')}：</span>
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{tc('time')}：</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('timeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="today">{tc('today')}</SelectItem>
                <SelectItem value="week">{tc('thisWeek')}</SelectItem>
                <SelectItem value="month">{tc('thisMonth')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRecords.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {t('selectedRecordsCount', { count: selectedRecords.length })}
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
            <Card className="border rounded-lg border-border bg-background shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('todayOutbound')}</p>
                    <p className="text-xl font-semibold mt-1 text-blue-500">
                      {totalOutboundToday.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">{t('unitPiecesM')}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                    <TrendingDown className="w-5 h-5 text-blue-500" />
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
            <Card className="border rounded-lg border-border bg-background shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('monthOutboundTotal')}</p>
                    <p className="text-xl font-semibold mt-1 text-green-500">
                      {totalOutboundMonth.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">{t('unitPiecesM')}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                    <Boxes className="w-5 h-5 text-green-500" />
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
            <Card className="border rounded-lg border-border bg-background shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tc('pending')}</p>
                    <p className="text-xl font-semibold mt-1 text-yellow-500">
                      {
                        outboundRecords.filter(
                          (r) => r.auditStatus === 'draft' || r.auditStatus === 'pending'
                        ).length
                      }
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">{t('pendingCount')}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                    <Clock className="w-5 h-5 text-yellow-500" />
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
            <Card className="border rounded-lg border-border bg-background shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('outboundTotal')}</p>
                    <p className="text-xl font-semibold mt-1 text-foreground">
                      {outboundRecords.length}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">{t('monthTotal')}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                    <FileText className="w-5 h-5 text-muted-foreground" />
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
          <Card className="border rounded-lg border-border bg-background shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground">
                {t('outboundRecords')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('totalRecordsCount', { count: filteredRecords.length })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedRecords.length === filteredRecords.length &&
                            filteredRecords.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>{t('outboundNo')}</TableHead>
                      <TableHead>{tc('date')}</TableHead>
                      <TableHead>{tc('materialName')}</TableHead>
                      <TableHead>{tc('specification')}</TableHead>
                      <TableHead>{tc('quantity')}</TableHead>
                      <TableHead>{tc('unit')}</TableHead>
                      <TableHead>{tc('amount')}</TableHead>
                      <TableHead>{tc('currency')}</TableHead>
                      <TableHead>{tc('warehouse')}</TableHead>
                      <TableHead>{tc('batchNo')}</TableHead>
                      <TableHead>{tc('type')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead>{t('operator')}</TableHead>
                      <TableHead className="text-right">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const StatusIcon = statusConfig[record.status]?.icon || FileText;
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/50">
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
                          <TableCell>
                            {record.total_amount != null ? (
                              <MoneyDisplay
                                amount={record.total_amount}
                                currency={record.currency || 'CNY'}
                                baseAmount={record.base_total_amount}
                                baseCurrency={record.base_currency}
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.currency || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{record.warehouse}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {record.batchNo || record.batch_no || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800"
                            >
                              {record.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <StatusIcon className="w-4 h-4" />
                              <span>
                                {tc(statusConfig[record.status]?.labelKey || 'unknown') ||
                                  record.status}
                              </span>
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
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(record)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                                {record.auditStatus !== 'approved' && (
                                  <DropdownMenuItem onClick={() => handleAudit(record, 'approve')}>
                                    <Check className="mr-2 h-4 w-4" />
                                    {t('audit')}
                                  </DropdownMenuItem>
                                )}
                                {record.auditStatus === 'approved' && (
                                  <DropdownMenuItem onClick={() => handleAudit(record, 'reject')}>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    {t('unaudit')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleFifoPreview(record)}>
                                  <Layers className="mr-2 h-4 w-4" />
                                  {t('fifoAllocation')}
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
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-muted">
                    <List className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('noOutboundRecords')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 新增出库单对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[650px]" resizable>
          <DialogHeader>
            <DialogTitle>{t('addOutboundOrder')}</DialogTitle>
            <DialogDescription>{t('fillOutboundInfo')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materialName">{t('materialName')} *</Label>
              <Input
                id="materialName"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                placeholder={tc('enterMaterialName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCode">{t('materialCode')}</Label>
              <Input
                id="materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                placeholder={tc('enterMaterialCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">{tc('specification')}</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder={t('enterSpec')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">{t('width')}</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder={t('enterWidth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNo">{t('batchNo')}</Label>
              <Input
                id="batchNo"
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder={t('enterBatchNo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('quantity')} *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder={tc('enterQuantity')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit')} *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUnit')} />
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
              <Label htmlFor="warehouse">{t('warehouse')} *</Label>
              <WarehouseSelect
                value={formData.warehouse}
                onChange={(value) => setFormData({ ...formData, warehouse: value })}
                placeholder={t('selectWarehouse')}
                showCategory={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundType">{t('outboundType')}</Label>
              <Select
                value={formData.outboundType}
                onValueChange={(value) => setFormData({ ...formData, outboundType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOutboundType')} />
                </SelectTrigger>
                <SelectContent>
                  {outboundTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {tc(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">{tc('remark')}</Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder={tc('enterRemark')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRawMaterial"
                checked={formData.isRawMaterial}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRawMaterial: checked as boolean })
                }
              />
              <Label htmlFor="isRawMaterial">{t('isRawMaterial')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑出库单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[650px]" resizable>
          <DialogHeader>
            <DialogTitle>{t('editOutboundOrder')}</DialogTitle>
            <DialogDescription>{t('modifyOutboundInfo')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materialName">{t('materialName')} *</Label>
              <Input
                id="materialName"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                placeholder={tc('enterMaterialName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCode">{t('materialCode')}</Label>
              <Input
                id="materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                placeholder={tc('enterMaterialCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">{tc('specification')}</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder={t('enterSpec')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">{t('width')}</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder={t('enterWidth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNo">{t('batchNo')}</Label>
              <Input
                id="batchNo"
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder={t('enterBatchNo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('quantity')} *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder={tc('enterQuantity')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit')} *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUnit')} />
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
              <Label htmlFor="warehouse">{t('warehouse')} *</Label>
              <WarehouseSelect
                value={formData.warehouse}
                onChange={(value) => setFormData({ ...formData, warehouse: value })}
                placeholder={t('selectWarehouse')}
                showCategory={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundType">{t('outboundType')}</Label>
              <Select
                value={formData.outboundType}
                onValueChange={(value) => setFormData({ ...formData, outboundType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectOutboundType')} />
                </SelectTrigger>
                <SelectContent>
                  {outboundTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {tc(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">{tc('remark')}</Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder={tc('enterRemark')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRawMaterial"
                checked={formData.isRawMaterial}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRawMaterial: checked as boolean })
                }
              />
              <Label htmlFor="isRawMaterial">{t('isRawMaterial')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleUpdate} className="bg-primary border-blue-600">
              {tc('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除出库单对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[650px]" resizable>
          <DialogHeader>
            <DialogTitle>{t('deleteOutboundOrder')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteOutbound', { id: currentRecord?.id })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核出库单对话框 */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="sm:max-w-[650px]" resizable>
          <DialogHeader>
            <DialogTitle>
              {currentRecord?.auditAction === 'approve'
                ? t('auditOutboundOrder')
                : t('unauditOutboundOrder')}
            </DialogTitle>
            <DialogDescription>
              {currentRecord?.auditAction === 'approve'
                ? t('confirmApproveOutbound', { id: currentRecord?.id })
                : t('confirmUnauditOutbound', { id: currentRecord?.id })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={confirmAudit}
              className={
                currentRecord?.auditAction === 'approve'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-yellow-500 hover:bg-yellow-600'
              }
            >
              {currentRecord?.auditAction === 'approve' ? t('auditApprove') : t('auditReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIFO先进先出分配对话框 */}
      <Dialog open={isFifoDialogOpen} onOpenChange={setIsFifoDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]" resizable>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              {t('fifoAllocationTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('fifoAllocationDesc', {
                id: currentRecord?.id,
                materialName: currentRecord?.materialName,
                quantity: currentRecord?.quantity || currentRecord?.qty,
              })}
            </DialogDescription>
          </DialogHeader>

          {fifoLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-muted-foreground">{t('calculatingFifo')}</span>
            </div>
          ) : fifoAllocation ? (
            <div className="space-y-4">
              {/* 汇总信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-500">{t('requiredOutbound')}</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {fifoAllocation.required_qty || currentRecord?.quantity || currentRecord?.qty}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-500">{t('availableStock')}</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    {fifoAllocation.total_available?.toFixed(3) || '0'}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 text-center ${fifoAllocation.shortage > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}
                >
                  <p
                    className={`text-xs ${fifoAllocation.shortage > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {fifoAllocation.shortage > 0 ? t('shortage') : tc('status')}
                  </p>
                  <p
                    className={`text-xl font-bold ${fifoAllocation.shortage > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}
                  >
                    {fifoAllocation.shortage > 0
                      ? fifoAllocation.shortage.toFixed(3)
                      : t('sufficient')}
                  </p>
                </div>
              </div>

              {fifoAllocation.shortage > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {t('stockInsufficient', { shortage: fifoAllocation.shortage.toFixed(3) })}
                  </span>
                </div>
              )}

              {/* 分配明细表 */}
              {fifoAllocation.allocation_plan && fifoAllocation.allocation_plan.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    {t('allocationDetails')}
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-muted">{tc('batchNo')}</TableHead>
                          <TableHead className="bg-muted">{t('inboundDate')}</TableHead>
                          <TableHead className="bg-muted">{t('availableQty')}</TableHead>
                          <TableHead className="bg-muted">{t('allocatedQty')}</TableHead>
                          <TableHead className="bg-muted">{t('unitPrice')}</TableHead>
                          <TableHead className="bg-muted">{t('allocatedAmount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fifoAllocation.allocation_plan.map((alloc: Loose, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{alloc.batch_no}</TableCell>
                            <TableCell>{alloc.inbound_date || '-'}</TableCell>
                            <TableCell>{alloc.available_qty_before?.toFixed(3)}</TableCell>
                            <TableCell className="font-semibold text-blue-700 dark:text-blue-300">
                              {alloc.allocate_qty?.toFixed(3)}
                            </TableCell>
                            <TableCell>{alloc.unit_cost?.toFixed(2)}</TableCell>
                            <TableCell>
                              {(alloc.allocate_qty * alloc.unit_cost)?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 可用批次列表 */}
              {fifoAllocation.batches &&
                fifoAllocation.batches.length > 0 &&
                !fifoAllocation.allocation_plan?.length && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      {t('availableBatches')}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="bg-muted">{tc('batchNo')}</TableHead>
                            <TableHead className="bg-muted">{t('inboundDate')}</TableHead>
                            <TableHead className="bg-muted">{tc('totalQuantity')}</TableHead>
                            <TableHead className="bg-muted">{t('availableQty')}</TableHead>
                            <TableHead className="bg-muted">{t('unitPrice')}</TableHead>
                            <TableHead className="bg-muted">{tc('status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fifoAllocation.batches.map((batch: Loose, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{batch.batch_no}</TableCell>
                              <TableCell>{batch.inbound_date || '-'}</TableCell>
                              <TableCell>{parseFloat(batch.quantity)?.toFixed(3)}</TableCell>
                              <TableCell className="font-semibold text-green-700 dark:text-green-300">
                                {parseFloat(batch.available_qty)?.toFixed(3)}
                              </TableCell>
                              <TableCell>{parseFloat(batch.unit_price)?.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                                >
                                  {tc('normal')}
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
                (!fifoAllocation.allocation_plan ||
                  fifoAllocation.allocation_plan.length === 0) && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('noAvailableBatch')}</p>
                    <p className="text-sm mt-1 text-muted-foreground">{t('pleaseInboundFirst')}</p>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{t('cannotGetAllocation')}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFifoDialogOpen(false)}>
              {tc('close')}
            </Button>
            {fifoAllocation &&
              fifoAllocation.can_fulfill &&
              currentRecord?.status !== 'completed' && (
                <Button
                  onClick={handleFifoConfirm}
                  disabled={fifoConfirming}
                  className="bg-primary hover:bg-primary/90"
                >
                  {fifoConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('confirming')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('confirmFifoOutbound')}
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
