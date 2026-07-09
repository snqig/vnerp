'use client';

import { authFetch } from '@/lib/auth-fetch';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
  {
    value: 'draft',
    labelKey: 'draft',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
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
    category: tc('text_cr294'),
    name: tc('text_48n3vj'),
    code: 'RSG-0.3-32',
    spec: 'Ф32',
    unit: 'M',
    supplier: tc('text_eqf5w'),
    location: 'A01-01',
  },
  {
    id: 2,
    category: tc('text_cr294'),
    name: tc('text_2de4'),
    code: 'PE-25',
    spec: '25mm',
    unit: 'M',
    supplier: tc('text_eqf5w'),
    location: 'A01-02',
  },
  {
    id: 3,
    category: tc('text_cr294'),
    name: tc('text_496wgw'),
    code: 'RSG-0.2-22',
    spec: 'Ф22',
    unit: 'M',
    supplier: tc('text_eqf5w'),
    location: 'A01-03',
  },
  {
    id: 4,
    category: tc('text_cr294'),
    name: tc('text_oyth1k'),
    code: 'PVC-TAPE-20',
    spec: '20mm*20m',
    unit: tc('text_ghj'),
    supplier: tc('text_b3v5cl'),
    location: 'A02-01',
  },
  {
    id: 5,
    category: tc('text_cr294'),
    name: tc('text_mfuto'),
    code: 'CU-WIRE-1.5',
    spec: '1.5mm²',
    unit: 'M',
    supplier: tc('text_e0uo21'),
    location: 'A02-02',
  },
  {
    id: 6,
    category: tc('text_cr294'),
    name: tc('text_ts9aw1'),
    code: 'AL-FOIL-50',
    spec: '50mm*50m',
    unit: tc('text_ghj'),
    supplier: tc('text_b3v5cl'),
    location: 'A02-03',
  },
  {
    id: 7,
    category: tc('text_cr294'),
    name: tc('text_canmt1'),
    code: 'NYLON-TIE-4',
    spec: '4*200mm',
    unit: tc('text_ged'),
    supplier: tc('text_eqf5w'),
    location: 'A03-01',
  },
  {
    id: 8,
    category: tc('text_cr294'),
    name: tc('text_eq0ieb'),
    code: 'HOT-GLUE-11',
    spec: 'Ф11mm',
    unit: 'KG',
    supplier: tc('text_b3v5cl'),
    location: 'A03-02',
  },
];

// 出库记录数据
const initialOutboundRecords: OutboundRecord[] = [
  {
    id: 'CK20250303001',
    date: '2025-03-03',
    materialName: tc('text_48n3vj'),
    spec: 'Ф32',
    quantity: 500,
    unit: 'M',
    warehouse: tc('text_azbdez'),
    location: 'A-01-01',
    operator: tc('text_glwp'),
    status: 'completed',
    auditStatus: 'approved',
    type: tc('text_f3q2pt'),
    remark: tc('text_w3u36g'),
    isRawMaterial: true,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250303001',
  },
  {
    id: 'CK20250303002',
    date: '2025-03-03',
    materialName: tc('text_2de4'),
    spec: '25',
    quantity: 200,
    unit: 'M',
    warehouse: tc('text_azbdez'),
    location: 'A-01-02',
    operator: tc('text_glwp'),
    status: 'completed',
    auditStatus: 'approved',
    type: tc('text_f3q2pt'),
    remark: tc('text_w3u36g'),
    isRawMaterial: true,
    materialCode: 'PE-25',
    width: 25,
    batchNo: 'B20250303002',
  },
  {
    id: 'CK20250302001',
    date: '2025-03-02',
    materialName: tc('text_496wgw'),
    spec: '22',
    quantity: 300,
    unit: 'M',
    warehouse: tc('text_azbdez'),
    location: 'A-01-03',
    operator: tc('text_i1ql'),
    status: 'completed',
    auditStatus: 'approved',
    type: tc('text_j5fhqf'),
    remark: tc('text_1pzp4u'),
    isRawMaterial: true,
    materialCode: 'RSG-0.2-22',
    width: 22,
    batchNo: 'B20250302001',
  },
  {
    id: 'CK20250301001',
    date: '2025-03-01',
    materialName: tc('text_48n3vj'),
    spec: 'Ф32',
    quantity: 1000,
    unit: 'M',
    warehouse: tc('text_azbdez'),
    location: 'A-01-01',
    operator: tc('text_glwp'),
    status: 'pending',
    auditStatus: 'draft',
    type: tc('text_f3q2pt'),
    remark: tc('text_8x2lo9'),
    isRawMaterial: true,
    materialCode: 'RSG-0.3-32',
    width: 32,
    batchNo: 'B20250301001',
  },
];

const statusConfig: Record<
  string,
  { labelKey: string; color: string; icon: React.ComponentType<any> }
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

  // 获取仓库分类列表
  const fetchWarehouseCategories = useCallback(async () => {
    try {
      const response = await authFetch('/api/warehouse/categories');
      const result = await response.json();
      if (result.success) {
        setWarehouseCategories(result.data);
      }
    } catch {}
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
      const warehouseData = warehouses.find(
        (w) => w.code === formData.warehouse || w.name === formData.warehouse
      );

      const apiData = {
        orderDate: new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || 0,
        warehouseCode: warehouseData?.code || formData.warehouse,
        warehouseName: warehouseData?.name || formData.warehouse,
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
      const warehouseData = warehouses.find(
        (w) => w.code === formData.warehouse || w.name === formData.warehouse
      );

      const apiData = {
        id: currentRecord.id,
        orderDate: currentRecord.orderDate || new Date().toISOString().slice(0, 10),
        outboundType: formData.outboundType,
        warehouseId: warehouseData?.id || 0,
        warehouseCode: warehouseData?.code || formData.warehouse,
        warehouseName: warehouseData?.name || formData.warehouse,
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
  const handleDelete = (record: any) => {
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
  const handleAudit = (record: any, action: 'approve' | 'reject') => {
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
  const handleFifoPreview = async (record: any) => {
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
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#1677ff' }}
            >
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: '#1f2329' }}>
                {t('outboundManagement')}
              </h1>
              <p className="text-sm" style={{ color: '#86909c' }}>
                {t('outboundDesc')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 功能按钮栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-3 rounded-lg p-4 border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#eeeeee',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Button
            onClick={handleAdd}
            className="gap-2"
            style={{ backgroundColor: '#1677ff', borderColor: '#1677ff' }}
          >
            <Plus className="w-4 h-4" />
            {tc('add')}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2"
            style={{ color: '#4e5969', borderColor: '#dcdfe6' }}
          >
            <Printer className="w-4 h-4" />
            {tc('print')}
          </Button>
          <div className="w-px h-8 mx-2" style={{ backgroundColor: '#eeeeee' }} />
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2"
            disabled={isLoading}
            style={{ color: '#4e5969', borderColor: '#dcdfe6' }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2"
            style={{ color: '#4e5969', borderColor: '#dcdfe6' }}
          >
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </Button>
        </motion.div>

        {/* 查询筛选栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-4 rounded-lg p-4 border"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#eeeeee',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: '#86909c' }} />
            <span className="text-sm font-medium" style={{ color: '#4e5969' }}>
              {t('statusFilter')}：
            </span>
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
            <Search className="w-4 h-4" style={{ color: '#86909c' }} />
            <span className="text-sm font-medium" style={{ color: '#4e5969' }}>
              {tc('keyword')}：
            </span>
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#86909c' }} />
            <span className="text-sm font-medium" style={{ color: '#4e5969' }}>
              {tc('time')}：
            </span>
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
            <Card
              className="border rounded-lg"
              style={{
                borderColor: '#eeeeee',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: '#86909c' }}>
                      {t('todayOutbound')}
                    </p>
                    <p className="text-xl font-semibold mt-1" style={{ color: '#1677ff' }}>
                      {totalOutboundToday.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#86909c' }}>
                      {t('unitPiecesM')}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#f5f7fa' }}
                  >
                    <TrendingDown className="w-5 h-5" style={{ color: '#1677ff' }} />
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
            <Card
              className="border rounded-lg"
              style={{
                borderColor: '#eeeeee',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: '#86909c' }}>
                      {t('monthOutboundTotal')}
                    </p>
                    <p className="text-xl font-semibold mt-1" style={{ color: '#52c41a' }}>
                      {totalOutboundMonth.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#86909c' }}>
                      {t('unitPiecesM')}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#f5f7fa' }}
                  >
                    <Boxes className="w-5 h-5" style={{ color: '#52c41a' }} />
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
            <Card
              className="border rounded-lg"
              style={{
                borderColor: '#eeeeee',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: '#86909c' }}>
                      {tc('pending')}
                    </p>
                    <p className="text-xl font-semibold mt-1" style={{ color: '#faad14' }}>
                      {
                        outboundRecords.filter(
                          (r) => r.auditStatus === 'draft' || r.auditStatus === 'pending'
                        ).length
                      }
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#86909c' }}>
                      {t('pendingCount')}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#f5f7fa' }}
                  >
                    <Clock className="w-5 h-5" style={{ color: '#faad14' }} />
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
            <Card
              className="border rounded-lg"
              style={{
                borderColor: '#eeeeee',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: '#86909c' }}>
                      {t('outboundTotal')}
                    </p>
                    <p className="text-xl font-semibold mt-1" style={{ color: '#1f2329' }}>
                      {outboundRecords.length}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#86909c' }}>
                      {t('monthTotal')}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#f5f7fa' }}
                  >
                    <FileText className="w-5 h-5" style={{ color: '#4e5969' }} />
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
          <Card
            className="border rounded-lg"
            style={{
              borderColor: '#eeeeee',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <CardHeader
              className="flex flex-row items-center justify-between border-b"
              style={{ borderColor: '#eeeeee' }}
            >
              <CardTitle className="text-base font-semibold" style={{ color: '#1f2329' }}>
                {t('outboundRecords')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: '#86909c' }}>
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
                        <TableRow
                          key={record.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
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
                  <div
                    className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#f5f7fa' }}
                  >
                    <List className="w-8 h-8" style={{ color: '#86909c' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#86909c' }}>
                    {t('noOutboundRecords')}
                  </p>
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
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectWarehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.name}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
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
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectWarehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.name}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              onClick={handleUpdate}
              style={{ backgroundColor: '#1677ff', borderColor: '#1677ff' }}
            >
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
              style={
                currentRecord?.auditAction === 'approve'
                  ? { backgroundColor: '#52c41a', borderColor: '#52c41a' }
                  : { backgroundColor: '#faad14', borderColor: '#faad14' }
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
              <Layers className="w-5 h-5" style={{ color: '#1677ff' }} />
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
              <span className="ml-3" style={{ color: '#86909c' }}>
                {t('calculatingFifo')}
              </span>
            </div>
          ) : fifoAllocation ? (
            <div className="space-y-4">
              {/* 汇总信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs" style={{ color: '#1677ff' }}>
                    {t('requiredOutbound')}
                  </p>
                  <p className="text-xl font-bold text-blue-700">
                    {fifoAllocation.required_qty || currentRecord?.quantity || currentRecord?.qty}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs" style={{ color: '#52c41a' }}>
                    {t('availableStock')}
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {fifoAllocation.total_available?.toFixed(3) || '0'}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 text-center ${fifoAllocation.shortage > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}
                >
                  <p
                    className={`text-xs ${fifoAllocation.shortage > 0 ? 'text-red-600' : 'text-emerald-600'}`}
                  >
                    {fifoAllocation.shortage > 0 ? t('shortage') : tc('status')}
                  </p>
                  <p
                    className={`text-xl font-bold ${fifoAllocation.shortage > 0 ? 'text-red-700' : 'text-emerald-700'}`}
                  >
                    {fifoAllocation.shortage > 0
                      ? fifoAllocation.shortage.toFixed(3)
                      : t('sufficient')}
                  </p>
                </div>
              </div>

              {fifoAllocation.shortage > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm" style={{ color: '#f5222d' }}>
                    {t('stockInsufficient', { shortage: fifoAllocation.shortage.toFixed(3) })}
                  </span>
                </div>
              )}

              {/* 分配明细表 */}
              {fifoAllocation.allocation_plan && fifoAllocation.allocation_plan.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: '#4e5969' }}>
                    {t('allocationDetails')}
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {tc('batchNo')}
                          </TableHead>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {t('inboundDate')}
                          </TableHead>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {t('availableQty')}
                          </TableHead>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {t('allocatedQty')}
                          </TableHead>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {t('unitPrice')}
                          </TableHead>
                          <TableHead className="bg-slate-50 dark:bg-slate-800">
                            {t('allocatedAmount')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fifoAllocation.allocation_plan.map((alloc: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{alloc.batch_no}</TableCell>
                            <TableCell>{alloc.inbound_date || '-'}</TableCell>
                            <TableCell>{alloc.available_qty_before?.toFixed(3)}</TableCell>
                            <TableCell className="font-semibold text-blue-700">
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
                    <h4 className="text-sm font-medium mb-2" style={{ color: '#4e5969' }}>
                      {t('availableBatches')}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {tc('batchNo')}
                            </TableHead>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {t('inboundDate')}
                            </TableHead>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {tc('totalQuantity')}
                            </TableHead>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {t('availableQty')}
                            </TableHead>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {t('unitPrice')}
                            </TableHead>
                            <TableHead className="bg-slate-50 dark:bg-slate-800">
                              {tc('status')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fifoAllocation.batches.map((batch: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{batch.batch_no}</TableCell>
                              <TableCell>{batch.inbound_date || '-'}</TableCell>
                              <TableCell>{parseFloat(batch.quantity)?.toFixed(3)}</TableCell>
                              <TableCell className="font-semibold text-green-700">
                                {parseFloat(batch.available_qty)?.toFixed(3)}
                              </TableCell>
                              <TableCell>{parseFloat(batch.unit_price)?.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
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
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <p style={{ color: '#4e5969' }}>{t('noAvailableBatch')}</p>
                    <p className="text-sm mt-1" style={{ color: '#86909c' }}>
                      {t('pleaseInboundFirst')}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: '#86909c' }}>
                {t('cannotGetAllocation')}
              </p>
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
                  className="bg-blue-600 hover:bg-blue-700"
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
