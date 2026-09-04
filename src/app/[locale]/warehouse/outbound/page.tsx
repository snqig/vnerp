'use client';

import { authFetch } from '@/lib/auth-fetch';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DbRow } from '@/types/db';
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
  ScanLine,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface OutboundRecord {
  id: string;
  orderNo?: string;
  date: string;
  materialName: string;
  spec: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location?: string;
  operator: string;
  status: string;
  auditStatus: string;
  type: string;
  remark: string;
  isRawMaterial: boolean;
  materialId?: number;
  warehouseId?: number;
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
import { QRCodeScanner } from '@/components/qr-code';
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
  { value: 'transfer', labelKey: 'transferOutbound' },
  { value: 'other', labelKey: 'otherOutbound' },
];

// 列表接口返回的是「单据 + 明细数组」，表格按扁平字段渲染，这里做一次字段映射
function mapOutboundRow(o: DbRow, ts: (key: string) => string): OutboundRecord {
  const firstItem = Array.isArray((o as DbRow).items) ? (o as DbRow).items[0] : undefined;
  const typeLabel: Record<string, string> = {
    production: ts('k_g4v5tc'),
    sales: ts('k_270k8'),
    return: ts('k_1913pi7'),
    transfer: ts('k_x2noxr'),
    other: ts('k_le3tde'),
  };
  return {
    id: String(o.id),
    orderNo: o.orderNo,
    date: o.orderDate,
    materialName: firstItem?.materialName || '',
    spec: firstItem?.specification || '',
    quantity: firstItem?.qty ?? o.totalQty,
    unit: firstItem?.unit || '',
    total_amount: o.totalAmount,
    currency: o.currency,
    base_total_amount: o.baseTotalAmount,
    base_currency: o.baseCurrency,
    warehouse: o.warehouseName,
    batchNo: firstItem?.batchNo || '',
    batch_no: firstItem?.batchNo || '',
    type: typeLabel[o.outboundType] || o.outboundType || '',
    status: o.status,
    auditStatus: o.auditStatus,
    isRawMaterial: false,
    operator: o.operatorName,
    materialId: firstItem?.materialId,
    warehouseId: o.warehouseId,
    materialCode: firstItem?.materialCode || '',
    remark: o.remark,
  };
}

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
  { labelKey: string; color: string; icon: React.ComponentType<Record<string, unknown>> }
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
  const ts = useTranslations('Warehouse');
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 单位选项（支持国际化）
  const unitOptions = useMemo(
    () => [
      { value: 'M', label: t('unitM') },
      { value: 'KG', label: t('unitKG') },
      { value: ts('k_1v8rak6'), label: t('unitRoll') },
      { value: ts('k_btluu6'), label: t('unitPiece') },
      { value: ts('k_accfpb'), label: t('unitSheet') },
      { value: ts('k_1vl54uh'), label: t('unitBarrel') },
      { value: ts('k_1e2x02k'), label: t('unitBox') },
      { value: 'PCS', label: t('unitPCS') },
      { value: ts('k_1mchwba'), label: t('unitSet') },
      { value: ts('k_w0gthl'), label: t('unitItem') },
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
  const [warehouses, setWarehouses] = useState<DbRow[]>([]);

  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isFifoDialogOpen, setIsFifoDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DbRow | null>(null);

  // FIFO分配状态
  const [fifoAllocation, setFifoAllocation] = useState<DbRow | null>(null);
  const [fifoLoading, setFifoLoading] = useState(false);
  const [fifoConfirming, setFifoConfirming] = useState(false);

  // 扫码出库选择状态
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [scanMaterial, setScanMaterial] = useState<DbRow | null>(null);
  const [scanWarehouse, setScanWarehouse] = useState<string>('');
  const [scanAvailable, setScanAvailable] = useState<number | null>(null);
  const [scanQty, setScanQty] = useState<string>('');
  const [scanLoading, setScanLoading] = useState(false);

  // 新增出库单：输入物料编码自动查询库存信息
  const [invLoading, setInvLoading] = useState(false);
  const [invLookup, setInvLookup] = useState<DbRow | null>(null);

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
    logger.info({ module: 'Warehouse', action: 'fetchOutboundRecords' }, ts('k_ithmxu'));
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('keyword', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('pageSize', '1000');

      const response = await authFetch(`/api/warehouse/outbound?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        const raw = result.data?.list || result.data || [];
        const mapped = raw.map((o: Loose) => mapOutboundRow(o, ts));
        setOutboundRecords(mapped);
        logger.info({ module: 'Warehouse', action: 'fetchOutboundRecords' }, ts('k_1ui4vre'), {
          count: mapped.length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Warehouse', action: 'fetchOutboundRecords' }, ts('k_1shz4nj'), {
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
  // 输入物料编码 + 选择仓库后，自动查询该物料在当前仓库的可用库存
  const lookupInventory = useCallback(
    async (code: string, warehouseId: string) => {
      const trimmed = (code || '').trim();
      if (!trimmed || !warehouseId) {
        setInvLookup(null);
        return;
      }
      setInvLoading(true);
      try {
        const res = await authFetch(
          `/api/warehouse/outbound/fifo?materialCode=${encodeURIComponent(trimmed)}&warehouseId=${encodeURIComponent(warehouseId)}&requiredQty=0`
        );
        const result = await res.json();
        if (!result.success) {
          setInvLookup({ error: result.message || ts('k_vcrbxn') });
          return;
        }
        const d = result.data || {};
        const batches = Array.isArray(d.batches) ? d.batches : [];
        setInvLookup({
          material: d.material || null,
          batches,
          totalAvailable: d.total_available ?? 0,
          error: undefined,
        });
        // 物料主数据回填（仅当对应字段为空时，避免覆盖用户已输入内容）
        const mat = d.material;
        if (mat) {
          setFormData((prev) => ({
            ...prev,
            materialName: prev.materialName || mat.materialName || '',
            specification: prev.specification || mat.specification || '',
            unit: prev.unit || mat.unit || '',
          }));
        }
      } catch {
        setInvLookup({ error: ts('k_vcrbxn') });
      } finally {
        setInvLoading(false);
      }
    },
    []
  );

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
        record.type === ts('k_g4v5tc')
          ? 'production'
          : record.type === ts('k_270k8')
            ? 'sales'
            : record.type === ts('k_1913pi7')
              ? 'return'
              : record.type === ts('k_x2noxr')
                ? 'transfer'
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
        operatorName: ts('k_1aanl48'),
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
        operatorName: ts('k_1aanl48'),
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

  // 扫码出库：解析二维码（复用 dcprint/scan）→ 物料标签 + 标签可用量
  const handleScanOutbound = useCallback(
    async (rawQr: string) => {
      setScanLoading(true);
      try {
        // 归一化二维码内容：生成格式 labelNo@001:type:IN → 取 @ 前；或 JSON {ID}
        let qr = (rawQr || '').trim();
        if (qr.includes('@')) qr = qr.split('@')[0];
        try {
          const j = JSON.parse(qr);
          if (j && j.ID) qr = String(j.ID);
        } catch {
          /* 非 JSON，作为原始标签号处理 */
        }
        if (!qr) {
          toast.error(ts('k_pf21j6'));
          return;
        }

        const res = await authFetch('/api/dcprint/scan', {
          method: 'POST',
          body: JSON.stringify({ qrContent: qr, scanType: 'outbound' }),
        });
        const result = await res.json();
        if (!result.success) {
          toast.error(result.message || ts('k_187rh1w'));
          return;
        }
        const d = (result.data && result.data.data) || {};
        const material = {
          materialCode: d.materialCode,
          materialName: d.materialName,
          specification: d.specification,
          batchNo: d.batchNo,
          unit: d.unit,
          warehouseId: d.warehouseId,
          quantity: d.quantity,
        };
        setScanMaterial(material);
        const qty = d.quantity != null ? Number(d.quantity) : null;
        setScanAvailable(qty);
        setScanQty(qty != null ? String(qty) : '');
        const wh =
          d.warehouseId != null
            ? String(d.warehouseId)
            : formData.warehouse || (warehouses[0]?.id ? String(warehouses[0].id) : '');
        setScanWarehouse(wh);
      } catch {
        toast.error(ts('k_187rh1w'));
      } finally {
        setScanLoading(false);
      }
    },
    [formData.warehouse, warehouses]
  );

  const handleScanWarehouseChange = (value: string) => {
    setScanWarehouse(value);
  };

  const handleConfirmScanAdd = () => {
    if (!scanMaterial) return;
    const qty = parseFloat(scanQty);
    if (!scanQty || Number.isNaN(qty) || qty <= 0) {
      toast.error(ts('k_15mgojz'));
      return;
    }
    if (scanAvailable != null && qty > scanAvailable) {
      toast.error(`出库数量不能超过可用库存 ${scanAvailable}`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      materialCode: String(scanMaterial.materialCode ?? ''),
      materialName: scanMaterial.materialName || '',
      specification: scanMaterial.specification || '',
      batchNo: scanMaterial.batchNo || '',
      unit: scanMaterial.unit || '',
      quantity: scanQty,
      warehouse: scanWarehouse,
    }));
    setIsScanDialogOpen(false);
    setIsAddDialogOpen(true);
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
          auditorName: ts('k_1aanl48'),
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
          operatorName: ts('k_1aanl48'),
          remark: ts('k_1vshp9f'),
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
          <Button
            onClick={() => {
              setScanMaterial(null);
              setScanQty('');
              setScanAvailable(null);
              setIsScanDialogOpen(true);
            }}
            variant="outline"
            className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <ScanLine className="w-4 h-4" />
            {ts('k_1vlzpeu')}</Button>
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
                onBlur={(e) => lookupInventory(e.target.value, formData.warehouse)}
                placeholder={tc('enterMaterialCode')}
              />
            </div>
            {invLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {ts('k_n0wbre')}</div>
            )}
            {!invLoading && invLookup?.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {invLookup.error}
              </div>
            )}
            {!invLoading && invLookup && !invLookup.error && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{ts('k_1kki8nq')}</span>
                  <span className="font-medium text-green-700">
                    {ts('k_1e31cad')}{invLookup.totalAvailable}
                    {invLookup.batches?.[0]?.unit ? ` ${invLookup.batches[0].unit}` : ''}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {invLookup.material?.materialName || formData.materialName || '—'}
                  {invLookup.material?.specification ? `（${invLookup.material.specification}）` : ''}
                </div>
                {invLookup.batches && invLookup.batches.length > 0 ? (
                  <div className="max-h-28 overflow-y-auto rounded border bg-background">
                    <table className="w-full text-[11px]">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left font-normal">{tc('batch')}</th>
                          <th className="px-2 py-1 text-right font-normal">{ts('k_1jbjkjb')}</th>
                          <th className="px-2 py-1 text-right font-normal">{ts('k_wv7sht')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invLookup.batches.map((b: Loose) => (
                          <tr key={b.id} className="border-t">
                            <td className="px-2 py-1">{b.batch_no}</td>
                            <td className="px-2 py-1 text-right">{b.available_qty}</td>
                            <td className="px-2 py-1 text-right">{b.inbound_date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted-foreground">{ts('k_1wyrhzt')}</div>
                )}
              </div>
            )}
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
                onChange={(value) => {
                  setFormData({ ...formData, warehouse: value });
                  lookupInventory(formData.materialCode, value);
                }}
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

      {/* 扫码出库选择对话框 */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent className="sm:max-w-[560px]" resizable>
          <DialogHeader>
            <DialogTitle>{ts('k_hz9458')}</DialogTitle>
            <DialogDescription>
              {ts('k_7y2x08')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!scanMaterial ? (
              <QRCodeScanner
                scanMode="outbound"
                onScan={handleScanOutbound}
                disabled={scanLoading}
                autoFocus
                placeholder={ts('k_13fyew2')}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 space-y-2 bg-muted/40">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tc('materialName')}</span>
                    <span className="font-medium">{scanMaterial.materialName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tc('materialCode')}</span>
                    <span>{scanMaterial.materialCode || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{ts('k_1h40xod')}</span>
                    <span>{scanMaterial.specification || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tc('batch')}</span>
                    <span>{scanMaterial.batchNo || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{ts('k_1xadx6v')}</span>
                    <span>{scanMaterial.unit || '-'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{ts('k_1skdlyg')}</Label>
                  <WarehouseSelect
                    value={scanWarehouse}
                    onChange={handleScanWarehouseChange}
                    placeholder={ts('k_11qrtkd')}
                    showCategory={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{ts('k_t27giw')}</Label>
                  <div className="text-sm">
                    {scanAvailable == null ? (
                      <span className="text-muted-foreground">{ts('k_dvvwkd')}</span>
                    ) : (
                      <span className="font-medium text-green-700">
                        {scanAvailable} {scanMaterial.unit || ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{ts('k_mjioll')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={scanQty}
                    onChange={(e) => setScanQty(e.target.value)}
                    placeholder={ts('k_17dq27c')}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {scanMaterial ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScanMaterial(null);
                    setScanQty('');
                    setScanAvailable(null);
                  }}
                >
                  {ts('k_x723pu')}</Button>
                <Button onClick={handleConfirmScanAdd} className="bg-primary hover:bg-primary/90">
                  {ts('k_1getqpn')}</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsScanDialogOpen(false)}>
                {tc('cancel')}</Button>
            )}
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
                onBlur={(e) => lookupInventory(e.target.value, formData.warehouse)}
                placeholder={tc('enterMaterialCode')}
              />
            </div>
            {invLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {ts('k_n0wbre')}</div>
            )}
            {!invLoading && invLookup?.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {invLookup.error}
              </div>
            )}
            {!invLoading && invLookup && !invLookup.error && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{ts('k_1kki8nq')}</span>
                  <span className="font-medium text-green-700">
                    {ts('k_1e31cad')}{invLookup.totalAvailable}
                    {invLookup.batches?.[0]?.unit ? ` ${invLookup.batches[0].unit}` : ''}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {invLookup.material?.materialName || formData.materialName || '—'}
                  {invLookup.material?.specification ? `（${invLookup.material.specification}）` : ''}
                </div>
                {invLookup.batches && invLookup.batches.length > 0 ? (
                  <div className="max-h-28 overflow-y-auto rounded border bg-background">
                    <table className="w-full text-[11px]">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left font-normal">{tc('batch')}</th>
                          <th className="px-2 py-1 text-right font-normal">{ts('k_1jbjkjb')}</th>
                          <th className="px-2 py-1 text-right font-normal">{ts('k_wv7sht')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invLookup.batches.map((b: Loose) => (
                          <tr key={b.id} className="border-t">
                            <td className="px-2 py-1">{b.batch_no}</td>
                            <td className="px-2 py-1 text-right">{b.available_qty}</td>
                            <td className="px-2 py-1 text-right">{b.inbound_date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted-foreground">{ts('k_1wyrhzt')}</div>
                )}
              </div>
            )}
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
                onChange={(value) => {
                  setFormData({ ...formData, warehouse: value });
                  lookupInventory(formData.materialCode, value);
                }}
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
