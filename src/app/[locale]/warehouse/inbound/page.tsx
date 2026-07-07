'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
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
  Scissors,
  Grid,
  Eye,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { LucideIcon } from 'lucide-react';
import { logger } from '@/lib/logger';


// 接口定义（符合 inv_production_inbound 表结构）
interface InboundItem {
  material_id: number;
  material_name: string;
  material_code: string;
  material_spec: string;
  specification: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  location: string;
  batch_no: string;
  remark: string;
}

interface InboundRecord {
  id: number;
  inbound_no: string;
  inbound_type: number;
  warehouse_id: number;
  warehouse_name: string;
  material_id: number;
  material_name: string;
  material_code: string;
  specification: string;
  quantity: number;
  unit: string;
  location: string;
  supplier_id: number;
  supplier_name: string;
  operator_id: number;
  operator_name: string;
  inbound_date: string;
  status: number | string;
  remark?: string;
  items?: InboundItem[];
  order_no?: string;
  create_time?: string;
  createTime?: string;
  total_quantity?: number;
}

interface Warehouse {
  id: number;
  warehouse_name: string;
  warehouse_code: string;
}

interface WarehouseCategory {
  id: number;
  category_name: string;
  category_code: string;
}

interface Supplier {
  id: number;
  supplier_name: string;
  supplier_code: string;
}

interface PurchaseOrder {
  id: number;
  order_no: string;
  supplier_name: string;
  total_amount: number;
  status: number;
}

interface PrintLabel {
  id: string;
  labelNo: string;
  materialName: string;
  materialSpec?: string;
  quantity?: number;
  unit?: string;
  batchNo?: string;
  material_name?: string;
  material_spec?: string;
  specification?: string;
  record?: any;
  item?: any;
  itemIdx?: number;
  order_no?: string;
  orderNo?: string;
  material_code?: string;
  supplier_name?: string;
  supplier?: string;
  batch_no?: string;
  unit_price?: number;
  unitPrice?: number;
  warehouse_name?: string;
  location?: string;
  status?: string;
  qrCode?: string;
  isRemainder?: boolean;
  sourceLabelNo?: string;
  inboundTime?: string;
  originalWidth?: number;
  cutWidths?: string;
  cutWidth?: number;
  operatorName?: string;
  createTime?: string;
}

interface LabelItem {
  id: string;
  labelNo: string;
  materialName: string;
  materialSpec?: string;
  quantity: number;
  unit: string;
}

interface ScanResult {
  id: string;
  materialName: string;
  materialCode: string;
  specification: string;
  supplier: string;
  inboundTime: string;
  status: 'IN' | 'OUT';
}

// 状态配置
const statusConfig: Record<string, { labelKey: string; color: string; icon: LucideIcon }> = {
  draft: {
    labelKey: 'draft',
    color:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
    icon: Clock,
  },
  pending: {
    labelKey: 'pending',
    color:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
    icon: AlertCircle,
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
  completed: {
    labelKey: 'completed',
    color:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800',
    icon: CheckCircle2,
  },
};

const CUTTABLE_MATERIALS = ['PET', 'PC', 'PVC', 'pet', 'pc', 'pvc'];

function isCuttableMaterial(materialName: string): boolean {
  if (!materialName) return false;
  const name = materialName.toUpperCase();
  return CUTTABLE_MATERIALS.some((m) => name.includes(m.toUpperCase()));
}

function parseSpecWidth(spec: string): number | null {
  if (!spec) return null;
  const match = spec.match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i);
  if (match) return parseFloat(match[1]);
  return null;
}

function calcCutSpec(originalSpec: string, cutWidth: number): string {
  if (!originalSpec) return `${cutWidth}mm`;
  const match = originalSpec.match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i);
  if (match) {
    const origLength = match[2];
    const unit = match[3] || 'mm';
    return `${cutWidth}×${origLength}${unit}`;
  }
  return `${cutWidth}mm`;
}

export default function InboundManagementPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // 数据状态
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<(string | number)[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [poSearchResults, setPoSearchResults] = useState<PurchaseOrder[]>([]);
  const [poSearchLoading, setPoSearchLoading] = useState(false);
  const [poDropdownVisible, setPoDropdownVisible] = useState(false);
  const poSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMixedAddDialogOpen, setIsMixedAddDialogOpen] = useState(false);
  const [isMixedEditDialogOpen, setIsMixedEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [labelSupplier, setLabelSupplier] = useState('');
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [isQRScanDialogOpen, setIsQRScanDialogOpen] = useState(false);
  const [isCuttingDialogOpen, setIsCuttingDialogOpen] = useState(false);
  const [isCuttingResultOpen, setIsCuttingResultOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printLabels, setPrintLabels] = useState<PrintLabel[]>([]);
  const [currentRecord, setCurrentRecord] = useState<InboundRecord | null>(null);
  const [currentLabel, setCurrentLabel] = useState<PrintLabel | null>(null);

  // 标签数据
  const [labelList, setLabelList] = useState<LabelItem[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  // 二维码状态
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeLabelId, setQrCodeLabelId] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // 分切状态
  const [cuttingForm, setCuttingForm] = useState({
    sourceLabelId: '',
    cutWidths: '',
    operatorId: user?.id || '',
    operatorName: user?.realName || user?.username || '',
    remark: '',
  });

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

  // 认证fetch函数
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, []);

  // 获取入库单列表
  const fetchInboundRecords = useCallback(async () => {
    logger.info({ module: 'Warehouse', action: 'fetchInboundRecords' }, '开始获取入库单列表', { searchQuery, statusFilter });
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('keyword', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('pageSize', '1000');

      console.log('[DEBUG] 正在获取入库记录...');
      const response = await authFetch(`/api/warehouse/inbound?${params.toString()}`);
      console.log('[DEBUG] 响应状态:', response.status);
      const result = await response.json();
      console.log('[DEBUG] API返回结果:', JSON.stringify(result).substring(0, 500));

      if (result.success) {
        const records = result.data?.list || result.data || [];
        logger.info({ module: 'Warehouse', action: 'fetchInboundRecords' }, '入库单列表获取成功', { count: records.length });
        setInboundRecords(records);
      } else {
        logger.warn({ module: 'Warehouse', action: 'fetchInboundRecords' }, 'API返回失败', { message: result.message });
      }
    } catch (error) {
      logger.error({ module: 'Warehouse', action: 'fetchInboundRecords' }, '获取入库单列表失败', { error: (error as Error).message });
    }
  }, [searchQuery, statusFilter, authFetch]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchInboundRecords();
    setIsLoading(false);
    toast.success(t('dataRefreshed'));
  }, [fetchInboundRecords]);

  // 获取仓库列表
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await authFetch('/api/warehouse?all=true');
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('获取仓库列表失败:', error);
    }
  }, [authFetch]);

  // 获取仓库分类列表
  const fetchWarehouseCategories = useCallback(async () => {
    try {
      const response = await authFetch('/api/organization/warehouse-category');
      const result = await response.json();
      if (result.success) {
        setWarehouseCategories(result.data || []);
      }
    } catch (error) {
      console.error('获取仓库分类列表失败:', error);
    }
  }, [authFetch]);

  // 获取供应商列表
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await authFetch('/api/purchase/suppliers?pageSize=1000');
      const result = await response.json();
      if (result.success) {
        const supplierList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setSuppliers(supplierList);
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error);
    }
  }, [authFetch]);

  // 采购单号模糊搜索
  const searchPurchaseOrders = useCallback(async (keyword: string) => {
    if (!keyword || keyword.trim().length < 1) {
      setPoSearchResults([]);
      setPoDropdownVisible(false);
      return;
    }
    setPoSearchLoading(true);
    try {
      const response = await authFetch(
        `/api/purchase/orders?keyword=${encodeURIComponent(keyword.trim())}&pageSize=20`
      );
      const result = await response.json();
      if (result.success) {
        const list = result.data?.list || result.data || [];
        setPoSearchResults(list);
        setPoDropdownVisible(list.length > 0);
      } else {
        setPoSearchResults([]);
        setPoDropdownVisible(false);
      }
    } catch (error) {
      console.error('搜索采购单失败:', error);
      setPoSearchResults([]);
      setPoDropdownVisible(false);
    } finally {
      setPoSearchLoading(false);
    }
  }, []);

  // 采购单号输入变化处理（防抖）
  const handlePoSearchChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, purchaseOrderNo: value }));
      if (poSearchTimerRef.current) {
        clearTimeout(poSearchTimerRef.current);
      }
      poSearchTimerRef.current = setTimeout(() => {
        searchPurchaseOrders(value);
      }, 300);
    },
    [searchPurchaseOrders]
  );

  // 选中采购单后自动补全
  const handlePoSelect = useCallback((po: any) => {
    const firstLine = po.lines?.[0] || {};
    setFormData((prev) => ({
      ...prev,
      purchaseOrderNo: po.po_no || '',
      supplier: po.supplier_name || prev.supplier,
      materialCode: firstLine.material_code || prev.materialCode,
      materialName: firstLine.material_name || prev.materialName,
      specification: firstLine.material_spec || prev.specification,
      quantity: firstLine.order_qty
        ? String(firstLine.order_qty - (firstLine.received_qty || 0))
        : prev.quantity,
      unit: firstLine.unit || prev.unit,
    }));
    setPoDropdownVisible(false);
    setPoSearchResults([]);
  }, []);

  // 获取标签列表
  const fetchLabels = useCallback(async () => {
    try {
      const response = await authFetch('/api/warehouse/inbound/labels?pageSize=1000');
      const result = await response.json();
      if (result.success) {
        setLabelList(result.data?.list || []);
      }
    } catch (error) {
      console.error('获取标签列表失败:', error);
    }
  }, []);

  // 生成二维码标签数据URL
  const generateQRCodeDataUrl = useCallback(async (content: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(content, { width: 120, margin: 1 });
    } catch {
      return '';
    }
  }, []);

  // 生成二维码
  const generateQRCode = useCallback(async (labelId: string, labelNo: string) => {
    try {
      // 按照用户要求的格式生成二维码内容
      const qrContent = `${labelNo}@001:type:IN`;
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 150,
        margin: 1,
      });
      setQrCodeDataUrl(dataUrl);
      setQrCodeLabelId(labelId);
      setIsQRCodeDialogOpen(true);
    } catch (error) {
      console.error('生成二维码失败:', error);
      toast.error(t('qrCodeGenerateFailed'));
    }
  }, [t]);

  const handleCutting = useCallback(async () => {
    if (!currentLabel) {
      toast.error(t('selectCutLabel'));
      return;
    }
    if (!isCuttableMaterial(currentLabel.materialName || '')) {
      toast.error(t('materialNotCuttable'));
      return;
    }
    if (!cuttingForm.cutWidths.trim()) {
      toast.error(t('inputCutWidth'));
      return;
    }

    try {
      const widths = cuttingForm.cutWidths.split('+').map(Number);
      const hasInvalid = widths.some((w) => isNaN(w) || w <= 0);

      const spec = currentLabel.specification || currentLabel.materialSpec || '';
      const specWidth = parseSpecWidth(spec);
      if (specWidth !== null) {
        const totalCutWidth = widths.reduce((sum, w) => sum + w, 0);
        if (totalCutWidth > specWidth) {
          toast.error(t('specParseFailed'));
          return;
        }
      }

      const materialName = currentLabel.materialName || currentLabel.material_name || currentLabel.item?.material_name || '';

      const recordId = currentLabel.record?.id || currentLabel.id;
      const itemIdx = currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0;
      const numericRecordId =
        typeof recordId === 'string' ? parseInt(recordId.split('-')[0], 10) : recordId;
      const operatorId = cuttingForm.operatorId || user?.id || '1';
      const operatorName =
        cuttingForm.operatorName || user?.realName || user?.username || '系统管理员';

      const response = await authFetch('/api/warehouse/inbound/cutting', {
        method: 'POST',
        body: JSON.stringify({
          sourceLabelId: numericRecordId || null,
          sourceLabelNo: `${currentLabel.order_no || currentLabel.labelNo}-${itemIdx + 1}`,
          cutWidthStr: cuttingForm.cutWidths,
          operatorId: operatorId,
          operatorName: operatorName,
          remark: cuttingForm.remark,
          materialCode: currentLabel.material_code || currentLabel.item?.material_code || '',
          materialName: materialName,
          specification: currentLabel.material_spec || currentLabel.specification || '',
          quantity: currentLabel.quantity || currentLabel.item?.quantity || 0,
          unit: currentLabel.unit || currentLabel.item?.unit || '',
          supplierName: currentLabel.supplier_name || currentLabel.supplier || '',
          batchNo: currentLabel.batch_no || currentLabel.item?.batch_no || '',
          orderNo: currentLabel.order_no || currentLabel.orderNo || '',
          originalWidth: specWidth,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(t('cutSuccess', { count: result.data?.newLabels?.length || 0 }));
        setIsCuttingDialogOpen(false);
        setCuttingForm((prev) => ({ ...prev, cutWidths: '', remark: '' }));
        await fetchInboundRecords();

        if (result.data?.newLabels && result.data.newLabels.length > 0) {
          const newPrintLabels = result.data.newLabels.map((nl: any, idx: number) => ({
            id: nl.id || `cut-${idx}`,
            labelNo:
              nl.labelNo ||
              nl.label_no ||
              `${currentLabel.order_no || currentLabel.labelNo}-C${idx + 1}`,
            orderNo: currentLabel.order_no || currentLabel.orderNo || currentLabel.labelNo || '',
            materialName: nl.isRemainder
              ? `${t('remainderMaterial')}${currentLabel.material_name || currentLabel.materialName || ''}`
              : currentLabel.material_name || currentLabel.materialName || '',
            specification:
              nl.newSpec ||
              nl.specification ||
              calcCutSpec(
                currentLabel.material_spec || currentLabel.specification || '',
                nl.cutWidth || nl.width || 0
              ),
            supplier: currentLabel.supplier_name || currentLabel.supplier || '',
            inboundTime: new Date().toISOString(),
            quantity: nl.cutQty || nl.quantity || 0,
            unit: currentLabel.unit || currentLabel.item?.unit || '',
            batchNo: currentLabel.batch_no || currentLabel.item?.batch_no || '',
            isCutLabel: true,
            cutWidth: nl.cutWidth || nl.width || 0,
            isRemainder: nl.isRemainder || false,
            sourceLabelNo: `${currentLabel.order_no || currentLabel.labelNo}-${(currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0) + 1}`,
          }));
          setPrintLabels(newPrintLabels);
          setIsCuttingResultOpen(true);
        }
      } else {
        toast.error(result.message || t('cutFailed'));
      }
    } catch (error) {
      console.error('分切失败:', error);
      toast.error(t('cutFailed'));
    }
  }, [currentLabel, cuttingForm, user, t]);

  const handleQRCodeView = useCallback(async (label: PrintLabel) => {
    if (!label.id) {
      toast.error(t('scanQueryFailed'));
      return;
    }
    try {
      const response = await authFetch(`/api/warehouse/inbound/labels/${label.id}/qrcode`);
      const result = await response.json();
      if (result.success) {
        setQrCodeDataUrl(result.data?.qrCode || '');
        setQrCodeLabelId(label.id);
        setIsQRCodeDialogOpen(true);
      } else {
        toast.error(t('scanQueryFailed'));
      }
    } catch (error) {
      console.error('扫码查询失败:', error);
      toast.error(t('scanQueryFailed'));
    }
  }, []);

  // 处理标签打印
  const handlePrintLabels = async () => {
    try {
      // 创建打印窗口
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t('printWindowBlocked'));
        return;
      }

      // 生成打印内容
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>{t('printPreview')}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .label-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              page-break-inside: avoid;
            }
            .label {
              border: 1px solid #000;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 120px;
            }
            .label h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
            }
            .label p {
              margin: 3px 0;
              font-size: 10px;
            }
            .qrcode {
              margin: 8px 0;
            }
            .qrcode img {
              width: 60px !important;
              height: 60px !important;
            }
            .status {
              display: inline-block;
              padding: 1px 6px;
              border-radius: 8px;
              font-size: 8px;
              font-weight: bold;
            }
            .status-in {
              background-color: #d1fae5;
              color: #065f46;
            }
            .status-out {
              background-color: #fef3c7;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 15px; font-size: 18px;">物料标签打印</h1>
          <div class="label-container">
            ${inboundRecords
              .filter((r) => r.status === 'approved' || r.status === 'completed')
              .flatMap((record) =>
                (record.items || []).map((item: any, idx: number) => ({
                  labelNo: `${record.order_no}-${idx + 1}`,
                  materialName: item.material_name,
                  specification: item.material_spec,
                  supplier: record.supplier_name,
                  inboundTime: record.create_time,
                  quantity: item.quantity,
                  unit: item.unit,
                }))
              )
              .map((label) => {
                const qrContent = `${label.labelNo}@001:type:IN`;
                const qrDataUrl = `data:image/png;base64,${btoa(qrContent)}`;

                return `
                <div class="label">
                  <h3>${label.labelNo}</h3>
                  <p>${label.materialName}</p>
                  <p>${label.specification || '-'}</p>
                  <p>数量: ${label.quantity} ${label.unit || ''}</p>
                  <p>供应商: ${label.supplier || '-'}</p>
                  <p>入库时间: ${label.inboundTime ? new Date(label.inboundTime).toLocaleString('zh-CN') : '-'}</p>
                  <div class="qrcode">
                    <img src="${qrDataUrl}" alt="QR Code" style="width: 80px; height: 80px;" />
                  </div>
                  <span class="status status-in">
                    已入库
                  </span>
                </div>
              `;
              })
              .join('')}
          </div>
        </body>
        </html>
      `;

      // 写入打印内容
      printWindow.document.write(printContent);
      printWindow.document.close();

      // 等待内容加载完成后打印
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error('打印失败:', error);
      toast.error(t('printFailed'));
    }
  };

  // 初始化
  useEffect(() => {
    fetchInboundRecords();
    fetchWarehouses();
    fetchWarehouseCategories();
    fetchSuppliers();
    fetchLabels();
  }, [fetchInboundRecords, fetchWarehouses, fetchWarehouseCategories, fetchSuppliers, fetchLabels]);

  // 计算统计数据
  const totalInboundToday = useMemo(() => {
    const today = new Date().toDateString();
    return inboundRecords.filter(
      (r) => new Date((r.create_time || r.createTime || '')).toDateString() === today
    ).length;
  }, [inboundRecords]);

  const totalInboundMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return inboundRecords.filter((r) => {
      const recordDate = new Date((r.create_time || r.createTime || ''));
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    }).length;
  }, [inboundRecords]);

  // 状态选项
  const statusOptions = [
    { value: 'all', label: tc('all') },
    { value: 'draft', label: tc('draft') },
    { value: 'pending', label: tc('pending') },
    { value: 'approved', label: tc('approved') },
    { value: 'rejected', label: tc('rejected') },
  ];

  // 日期范围选项
  const dateRangeOptions = [
    { value: 'all', label: tc('all') },
    { value: 'today', label: tc('today') },
    { value: 'week', label: tc('thisWeek') },
    { value: 'month', label: tc('thisMonth') },
  ];

  return (
    <MainLayout title={t('inboundManagement')}>
      <div className="space-y-6">
        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl shadow-sm border"
        >
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            {tc('add')}
          </Button>
          <Button onClick={() => setIsMixedAddDialogOpen(true)} variant="outline" className="gap-2">
            <Beaker className="w-4 h-4" />
            {t('mixedMaterialAdd')}
          </Button>
          <Button onClick={() => setIsGenerateDialogOpen(true)} variant="outline" className="gap-2">
            <Barcode className="w-4 h-4" />
            {t('generateLabel')}
          </Button>
          <Button onClick={() => setIsCuttingDialogOpen(true)} variant="outline" className="gap-2">
            <Scissors className="w-4 h-4" />
            {t('materialCutting')}
          </Button>
          <Button onClick={() => setIsQRScanDialogOpen(true)} variant="outline" className="gap-2">
            <ScanLine className="w-4 h-4" />
            {t('qrCodeQuery')}
          </Button>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2" />
          <Button
            onClick={() => {
              const approvedRecords = inboundRecords.filter(
                (r) => r.status === 'approved' || r.status === 'completed'
              );
              if (approvedRecords.length === 0) {
                toast.error(t('noApprovedForPrint'));
                return;
              }
              const labels = approvedRecords.flatMap((record) =>
                (record.items || []).map((item: any, idx: number) => ({
                  id: `${record.id}-${idx}`,
                  labelNo: `${record.order_no}-${idx + 1}`,
                  orderNo: record.order_no,
                  materialName: item.material_name,
                  specification: item.material_spec,
                  supplier: record.supplier_name,
                  inboundTime: record.create_time,
                  quantity: item.quantity,
                  unit: item.unit,
                  batchNo: item.batch_no,
                  record,
                  item,
                }))
              );
              if (selectedRecords.length > 0) {
                const selectedLabels = labels.filter((l) => selectedRecords.includes(l.record.id));
                setPrintLabels(selectedLabels.length > 0 ? selectedLabels : labels);
              } else {
                setPrintLabels(labels);
              }
              setIsPrintPreviewOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            {t('printQRCode')}
          </Button>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2" />
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </Button>
          <Button onClick={() => setSearchQuery('')} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {tc('reset')}
          </Button>
        </motion.div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('todayInbound')}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {totalInboundToday.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('unitOrders')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/60 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
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
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('monthInboundTotal')}</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {totalInboundMonth.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('unitOrders')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center">
                    <Boxes className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                    <p className="text-sm text-slate-600 dark:text-slate-300">{tc("pending")}</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {
                        inboundRecords.filter((r) => r.status === 'draft' || r.status === 'pending')
                          .length
                      }
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('unitOrders')}</p>
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
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('labelsGenerated')}</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {inboundRecords
                        .filter((r) => r.status === 'approved' || r.status === 'completed')
                        .reduce((sum, r) => sum + (r.items?.length || 0), 0)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('unitLabels')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 入库记录列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5" />
                  {t('inboundRecords')}
                </CardTitle>
                {selectedRecords.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('selectedCount', { count: selectedRecords.length })}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRecords([])}>
                      {t('cancelSelect')}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const selectedApproved = inboundRecords.filter(
                          (r) =>
                            selectedRecords.includes(r.id) &&
                            (r.status === 'approved' || r.status === 'completed')
                        );
                        if (selectedApproved.length === 0) {
                          toast.error(t('selectApprovedForPrint'));
                          return;
                        }
                        const labels = selectedApproved.flatMap((record) =>
                          (record.items || []).map((item: any, idx: number) => ({
                            id: `${record.id}-${idx}`,
                            labelNo: `${record.order_no}-${idx + 1}`,
                            orderNo: record.order_no,
                            materialName: item.material_name,
                            specification: item.material_spec,
                            supplier: record.supplier_name,
                            inboundTime: record.create_time,
                            quantity: item.quantity,
                            unit: item.unit,
                            batchNo: item.batch_no,
                            record,
                            item,
                          }))
                        );
                        setPrintLabels(labels);
                        setIsPrintPreviewOpen(true);
                      }}
                    >
                      <Printer className="w-3 h-3" />
                      {t('printSelectedQRCode')}
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription>{t('manageInboundRecords')}</CardDescription>
            </CardHeader>
            <CardContent>
              {inboundRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t('noInboundRecords')}</div>
              ) : (
                <div className="space-y-3">
                  {/* 全选行 */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Checkbox
                      checked={
                        selectedRecords.length === inboundRecords.length &&
                        inboundRecords.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecords(inboundRecords.map((r) => r.id));
                        } else {
                          setSelectedRecords([]);
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedRecords.length === inboundRecords.length && inboundRecords.length > 0
                        ? t('cancelSelectAll')
                        : t('selectAll')}
                    </span>
                  </div>
                  {inboundRecords.map((record) => {
                    const statusInfo = statusConfig[record.status] || statusConfig.draft;
                    const firstItem = record.items?.[0] || ({} as Partial<InboundItem>);
                    const materialSummary =
                      (record.items?.length || 0) > 1
                        ? `${firstItem.material_name} 等${record.items?.length}项`
                        : firstItem.material_name || '-';
                    const specQty = firstItem.material_spec
                      ? `${firstItem.material_spec} / ${firstItem.quantity || 0} ${firstItem.unit || ''}`
                      : `共 ${record.total_quantity || 0} 件`;
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 mr-4">
                          <Checkbox
                            checked={selectedRecords.includes(record.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecords((prev) => [...prev, record.id]);
                              } else {
                                setSelectedRecords((prev) => prev.filter((id) => id !== record.id));
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="text-xs text-gray-500">{t('inboundNo')}</p>
                            <p className="font-medium text-sm">{record.order_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{tc("material")}</p>
                            <p className="font-medium text-sm">{materialSummary}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{t('specQty')}</p>
                            <p className="text-sm">{specQty}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{tc("supplier")}</p>
                            <p className="text-sm">{record.supplier_name || '-'}</p>
                          </div>
                          <div>
                            <Badge className={statusInfo.color}>{tc(statusInfo.labelKey)}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {(record.status === 'approved' || record.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                const labels = (record.items || []).map(
                                  (item: any, idx: number) => ({
                                    id: `${record.id}-${idx}`,
                                    labelNo: `${record.order_no}-${idx + 1}`,
                                    orderNo: record.order_no,
                                    materialName: item.material_name,
                                    specification: item.material_spec,
                                    supplier: record.supplier_name,
                                    inboundTime: record.create_time,
                                    quantity: item.quantity,
                                    unit: item.unit,
                                    batchNo: item.batch_no,
                                    record,
                                    item,
                                  })
                                );
                                setPrintLabels(labels);
                                setIsPrintPreviewOpen(true);
                              }}
                            >
                              <QrCode className="w-3 h-3" />
                              {t('printQRCode')}
                            </Button>
                          )}
                          {(record.status === 'draft' || record.status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentRecord(record);
                                  setFormData({
                                    materialCode: String(firstItem.material_id || ''),
                                    materialName: firstItem.material_name || '',
                                    specification: firstItem.material_spec || '',
                                    quantity: String(firstItem.quantity || ''),
                                    unit: firstItem.unit || '',
                                    supplier: record.supplier_name || '',
                                    warehouse: String(record.warehouse_id || ''),
                                    purchaseOrderNo: '',
                                    batchNo: firstItem.batch_no || '',
                                    remark: record.remark || '',
                                    isMixed: false,
                                    mixedMaterialRemark: '',
                                    colorCode: '',
                                    machineNo: '',
                                    width: '',
                                    isRawMaterial: false,
                                  });
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                {tc('edit')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentRecord(record);
                                  setIsAuditDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {tc('audit')}
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!confirm(t('confirmDeleteInbound'))) return;
                              try {
                                const response = await authFetch(
                                  `/api/warehouse/inbound?id=${record.id}`,
                                  {
                                    method: 'DELETE',
                                  }
                                );
                                const result = await response.json();
                                if (result.success) {
                                  toast.success(t('deleteSuccess'));
                                  await fetchInboundRecords();
                                } else {
                                  toast.error(result.message || t('deleteFailed'));
                                }
                              } catch (err) {
                                toast.error(t('deleteFailed'));
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {tc('delete')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 标签管理 - 新增标签列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t('labelManagement')}
                  </CardTitle>
                  <CardDescription>
                    {t('labelManagementDesc')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLabels.size > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {t('selectedLabelsCount', { count: selectedLabels.size })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLabels(new Set())}
                      >
                        {t('cancelSelect')}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-blue-600 hover:bg-blue-700"
                        onClick={async () => {
                          const approvedRecords = inboundRecords.filter(
                            (r) => r.status === 'approved' || r.status === 'completed'
                          );
                          const allLabels = approvedRecords.flatMap((record) =>
                            (record.items || []).map((item: any, idx: number) => ({
                              id: `${record.id}-${idx}`,
                              labelNo: `${record.order_no}-${idx + 1}`,
                              orderNo: record.order_no,
                              materialName: item.material_name,
                              specification: item.material_spec,
                              supplier: record.supplier_name,
                              inboundTime: record.create_time,
                              quantity: item.quantity,
                              unit: item.unit,
                              batchNo: item.batch_no,
                              record,
                              item,
                            }))
                          );
                          const selected = allLabels.filter((l) => selectedLabels.has(l.id));
                          setPrintLabels(selected);
                          setIsPrintPreviewOpen(true);
                        }}
                      >
                        <Printer className="w-3 h-3" />
                        {t('printSelectedLabels')}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => handlePrintLabels()}>
                    <Printer className="w-4 h-4 mr-2" />
                    {t('printAllLabels')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inboundRecords.filter((r) => r.status === 'approved' || r.status === 'completed')
                .length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('noApprovedRecordsForLabels')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 全选标签 */}
                  {(() => {
                    const approvedRecords = inboundRecords.filter(
                      (r) => r.status === 'approved' || r.status === 'completed'
                    );
                    const allLabels = approvedRecords.flatMap((record) =>
                      (record.items || []).map((item: any, idx: number) => ({
                        id: `${record.id}-${idx}`,
                        labelNo: `${record.order_no}-${idx + 1}`,
                      }))
                    );
                    const allSelected =
                      allLabels.length > 0 && allLabels.every((l) => selectedLabels.has(l.id));
                    return (
                      <div className="col-span-full flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLabels(new Set(allLabels.map((l) => l.id)));
                            } else {
                              setSelectedLabels(new Set());
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {allSelected ? t('cancelSelectAllLabels') : t('selectAllLabels')}
                        </span>
                      </div>
                    );
                  })()}
                  {inboundRecords
                    .filter((r) => r.status === 'approved' || r.status === 'completed')
                    .flatMap((record) =>
                      (record.items || []).map((item: any, idx: number) => ({
                        id: `${record.id}-${idx}`,
                        labelNo: `${record.order_no}-${idx + 1}`,
                        orderNo: record.order_no,
                        materialName: item.material_name,
                        specification: item.material_spec,
                        supplier: record.supplier_name,
                        inboundTime: record.create_time,
                        status: 'IN',
                        qrCode: `${record.order_no}-${idx + 1}`,
                        record,
                        item,
                      }))
                    )
                    .map((label) => (
                      <motion.div
                        key={label.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${selectedLabels.has(label.id) ? 'border-blue-400 bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedLabels.has(label.id)}
                              onCheckedChange={(checked) => {
                                setSelectedLabels((prev) => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(label.id);
                                  } else {
                                    next.delete(label.id);
                                  }
                                  return next;
                                });
                              }}
                            />
                            <div>
                              <h3 className="font-medium text-lg">{label.labelNo}</h3>
                              <p className="text-sm text-gray-600">{label.materialName}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700">{tc("stockedIn")}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('inboundNo')}：</span>
                            <span className="font-medium">{label.orderNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{tc('specification')}：</span>
                            <span>{label.specification || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('qtyUnit')}：</span>
                            <span>
                              {label.item?.quantity || 0} {label.item?.unit || ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{tc('supplier')}：</span>
                            <span>{label.supplier || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('inboundTime')}：</span>
                            <span>
                              {label.inboundTime
                                ? new Date(label.inboundTime).toLocaleString('zh-CN')
                                : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateQRCode(label.id, label.labelNo)}
                            className="flex-1 min-w-[80px]"
                          >
                            <QrCode className="w-3 h-3 mr-1" />
                            {t('qrCode')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-w-[80px] text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              setPrintLabels([label]);
                              setIsPrintPreviewOpen(true);
                            }}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            {tc('print')}
                          </Button>
                          {isCuttableMaterial(label.materialName) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentLabel({
                                  ...label,
                                  material_name: label.materialName,
                                  material_spec: label.specification,
                                  supplier_name: label.supplier,
                                  order_no: label.orderNo,
                                  quantity: label.item?.quantity || 0,
                                  unit: label.item?.unit || '',
                                  batch_no: label.item?.batch_no || '',
                                  material_code: label.item?.material_code || '',
                                });
                                setCuttingForm((prev) => ({ ...prev, cutWidths: '', remark: '' }));
                                setIsCuttingDialogOpen(true);
                              }}
                              className="flex-1 min-w-[80px] text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Scissors className="w-3 h-3 mr-1" />
                              {t('cut')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQRCodeView(label)}
                            className="flex-1 min-w-[80px]"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {tc('details')}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 分切对话框 */}
        <Dialog open={isCuttingDialogOpen} onOpenChange={setIsCuttingDialogOpen}>
          <DialogContent className="sm:max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                {t('materialCutting')}
              </DialogTitle>
              <DialogDescription>
                {t('cuttingDesc')}
              </DialogDescription>
            </DialogHeader>
            {currentLabel &&
              (() => {
                const specWidth = parseSpecWidth(
                  currentLabel.material_spec || currentLabel.specification || ''
                );
                return (
                  <div className="space-y-4 py-4">
                    <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{t('sourceLabelInfo')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">{t('labelNo')}：</span>
                          <span className="font-medium">
                            {currentLabel.order_no || currentLabel.labelNo}-
                            {(currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0) + 1}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{tc('materialName')}：</span>
                          <span className="font-medium">
                            {currentLabel.material_name || currentLabel.materialName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('originalSpec')}：</span>
                          <span className="font-medium">
                            {currentLabel.material_spec || currentLabel.specification || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('originalWidth')}：</span>
                          <span className="font-medium">
                            {specWidth ? `${specWidth}mm` : t('notParsed')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{tc('quantity')}：</span>
                          <span className="font-medium">
                            {currentLabel.quantity || currentLabel.item?.quantity || 0}{' '}
                            {currentLabel.unit || currentLabel.item?.unit || ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{tc('supplier')}：</span>
                          <span className="font-medium">
                            {currentLabel.supplier_name || currentLabel.supplier || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('cutWidthMM')}</Label>
                      <Input
                        placeholder={t('cutWidthPlaceholder')}
                        value={cuttingForm.cutWidths}
                        onChange={(e) =>
                          setCuttingForm((prev) => ({ ...prev, cutWidths: e.target.value }))
                        }
                      />
                      <p className="text-xs text-gray-500">
                        {t('cutWidthHint')}
                      </p>
                    </div>

                    {cuttingForm.cutWidths &&
                      specWidth &&
                      (() => {
                        const widths = cuttingForm.cutWidths
                          .split('+')
                          .map((w) => parseFloat(w.trim()))
                          .filter((w) => !isNaN(w) && w > 0);
                        const totalWidth = widths.reduce((s, w) => s + w, 0);
                        const remainWidth = specWidth - totalWidth;
                        const isValid = totalWidth <= specWidth && widths.length > 0;
                        return (
                          <div
                            className={`rounded-lg p-4 space-y-3 ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{t('cutPreview')}</span>
                              {isValid ? (
                                <Badge className="bg-green-100 text-green-700">{tc('valid')}</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">{t('widthExceeded')}</Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              {widths.map((w, i) => {
                                const cutSpec = calcCutSpec(
                                  currentLabel.material_spec || currentLabel.specification || '',
                                  w
                                );
                                const cutQty =
                                  specWidth > 0
                                    ? Math.round(
                                        (currentLabel.quantity ||
                                          currentLabel.item?.quantity ||
                                          0) *
                                          (w / specWidth) *
                                          100
                                      ) / 100
                                    : 0;
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-sm bg-card rounded px-3 py-2"
                                  >
                                    <span>
                                      {t('cutNum', { num: i + 1 })}：{w}mm
                                    </span>
                                    <span className="text-gray-600">
                                      {tc('specification')}：{cutSpec} / {tc('quantity')}：{cutQty}{' '}
                                      {currentLabel.unit || currentLabel.item?.unit || ''}
                                    </span>
                                  </div>
                                );
                              })}
                              {remainWidth > 0 &&
                                (() => {
                                  const remSpec = calcCutSpec(
                                    currentLabel.material_spec || currentLabel.specification || '',
                                    remainWidth
                                  );
                                  const remQty =
                                    specWidth > 0
                                      ? Math.round(
                                          (currentLabel.quantity ||
                                            currentLabel.item?.quantity ||
                                            0) *
                                            (remainWidth / specWidth) *
                                            100
                                        ) / 100
                                      : 0;
                                  return (
                                    <div className="flex items-center justify-between text-sm bg-yellow-50 rounded px-3 py-2 border border-yellow-200">
                                      <span>{t('remainderMaterial')}：{remainWidth}mm</span>
                                      <span className="text-yellow-700">
                                        {tc('specification')}：{remSpec} / {tc('quantity')}：{remQty}{' '}
                                        {currentLabel.unit || currentLabel.item?.unit || ''}
                                      </span>
                                    </div>
                                  );
                                })()}
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>{t('originalWidth')}：{specWidth}mm</span>
                              <span>
                                {t('cutTotal')}：{totalWidth}mm{' '}
                                {remainWidth >= 0
                                  ? `| ${t('remainderMaterial')}：${remainWidth}mm`
                                  : `| ${t('exceeded')}：${Math.abs(remainWidth)}mm`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                    <div className="space-y-2">
                      <Label>{t('operator')}</Label>
                      <Input value={cuttingForm.operatorName} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc("remark")}</Label>
                      <Textarea
                        placeholder={t('cuttingRemarkPlaceholder')}
                        value={cuttingForm.remark}
                        onChange={(e) =>
                          setCuttingForm((prev) => ({ ...prev, remark: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                );
              })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCuttingDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCutting} className="bg-blue-600 hover:bg-blue-700">
                <Scissors className="w-4 h-4 mr-1" />
                {t('confirmCut')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 分切结果 - 二维码标签预览/打印对话框 */}
        <Dialog open={isCuttingResultOpen} onOpenChange={setIsCuttingResultOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-orange-600" />
                {t('cuttingComplete')} - {t('qrCodeLabel')}
              </DialogTitle>
              <DialogDescription>
                {t('cuttingSuccessDesc', { count: printLabels.length })}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {printLabels.map((label, index) => {
                  const qrContent = `${label.labelNo}@001:type:CUT`;
                  const isRemainder = label.isRemainder;
                  return (
                    <div
                      key={label.id || index}
                      className={`border-2 rounded-lg p-3 ${isRemainder ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/30'}`}
                      style={{ minHeight: '200px' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {label.labelNo}
                          </h3>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                            {label.materialName}
                          </p>
                        </div>
                        <Badge
                          className={`${isRemainder ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'} text-xs shrink-0 ml-2`}
                        >
                          {isRemainder ? t('remainderMaterial') : t('cut')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>{t('sourceLabel')}：</span>
                          <span className="font-medium">{label.sourceLabelNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('inboundNo')}：</span>
                          <span className="font-medium">{label.orderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isRemainder ? t('remainderWidth') : t('cutWidth')}：</span>
                          <span
                            className={`font-medium ${isRemainder ? 'text-yellow-700' : 'text-orange-700'}`}
                          >
                            {label.cutWidth}mm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{tc('specification')}：</span>
                          <span>{label.specification || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('qtyUnit')}：</span>
                          <span className="font-medium">
                            {label.quantity} {label.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{tc('supplier')}：</span>
                          <span>{label.supplier || '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCuttingResultOpen(false)}>
                {tc('close')}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={async () => {
                  const previewWindow = window.open('', '_blank', 'width=900,height=700');
                  if (!previewWindow) {
                    toast.error(t('printWindowBlocked'));
                    return;
                  }

                  const labelsHtml = await Promise.all(
                    printLabels.map(async (label, index) => {
                      const qrContent = `${label.labelNo}@001:type:CUT`;
                      let qrDataUrl = '';
                      try {
                        qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
                      } catch {}
                      const isRem = label.isRemainder;

                      return `
                    <div class="label-card" style="border-color: ${isRem ? '#eab308' : '#ea580c'};">
                      <div class="label-header">
                        <div class="label-title">
                          <div class="label-no">${label.labelNo}</div>
                          <div class="material-name">${label.materialName}</div>
                        </div>
                        <div class="status-badge" style="background:${isRem ? '#fef9c3' : '#ffedd5'};color:${isRem ? '#854d0e' : '#9a3412'};">${isRem ? '余料' : '分切'}</div>
                      </div>
                      <div class="label-info">
                        <div class="info-row"><span class="info-label">源标签：</span><span class="info-value">${label.sourceLabelNo}</span></div>
                        <div class="info-row"><span class="info-label">入库单号：</span><span class="info-value">${label.orderNo}</span></div>
                        <div class="info-row"><span class="info-label">${isRem ? '余料宽幅：' : '分切宽幅：'}</span><span class="info-value" style="color:${isRem ? '#eab308' : '#ea580c'};font-weight:600;">${label.cutWidth}mm</span></div>
                        <div class="info-row"><span class="info-label">规格：</span><span class="info-value">${label.specification || '-'}</span></div>
                        <div class="info-row"><span class="info-label">数量/单位：</span><span class="info-value">${label.quantity} ${label.unit}</span></div>
                        <div class="info-row"><span class="info-label">供应商：</span><span class="info-value">${label.supplier || '-'}</span></div>
                      </div>
                      <div class="qr-area">
                        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;" />` : ''}
                      </div>
                    </div>
                  `;
                    })
                  );

                  const html = `<!DOCTYPE html>
<html>
<head>
  <title>分切标签预览</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 10mm; background: #f5f5f5; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 10mm; color: #333; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #ea580c; border-radius: 6px; padding: 4mm; background: #fff;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge { font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm; }
    .label-info { flex: 1; }
    .info-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin: 0.5mm 0; }
    .info-label { color: #888; }
    .info-value { font-weight: 500; color: #333; }
    .qr-area { text-align: center; margin-top: 2mm; }
  </style>
</head>
<body>
  <h1>分切标签预览</h1>
  <div class="label-grid">
    ${labelsHtml.join('')}
  </div>
</body>
</html>`;
                  previewWindow.document.write(html);
                  previewWindow.document.close();
                }}
              >
                <Eye className="w-4 h-4" />
                {tc('preview')}
              </Button>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) {
                    toast.error(t('printWindowBlocked'));
                    return;
                  }

                  const labelsHtml = await Promise.all(
                    printLabels.map(async (label, index) => {
                      const qrContent = `${label.labelNo}@001:type:CUT`;
                      let qrDataUrl = '';
                      try {
                        qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
                      } catch {}
                      const isRem = label.isRemainder;

                      return `
                    <div class="label-card" style="border-color: ${isRem ? '#eab308' : '#ea580c'};">
                      <div class="label-header">
                        <div class="label-title">
                          <div class="label-no">${label.labelNo}</div>
                          <div class="material-name">${label.materialName}</div>
                        </div>
                        <div class="status-badge" style="background:${isRem ? '#fef9c3' : '#ffedd5'};color:${isRem ? '#854d0e' : '#9a3412'};">${isRem ? '余料' : '分切'}</div>
                      </div>
                      <div class="label-info">
                        <div class="info-row"><span class="info-label">源标签：</span><span class="info-value">${label.sourceLabelNo}</span></div>
                        <div class="info-row"><span class="info-label">入库单号：</span><span class="info-value">${label.orderNo}</span></div>
                        <div class="info-row"><span class="info-label">${isRem ? '余料宽幅：' : '分切宽幅：'}</span><span class="info-value" style="color:${isRem ? '#eab308' : '#ea580c'};font-weight:600;">${label.cutWidth}mm</span></div>
                        <div class="info-row"><span class="info-label">规格：</span><span class="info-value">${label.specification || '-'}</span></div>
                        <div class="info-row"><span class="info-label">数量/单位：</span><span class="info-value">${label.quantity} ${label.unit}</span></div>
                        <div class="info-row"><span class="info-label">供应商：</span><span class="info-value">${label.supplier || '-'}</span></div>
                      </div>
                      <div class="qr-area">
                        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;" />` : ''}
                      </div>
                    </div>
                  `;
                    })
                  );

                  const html = `<!DOCTYPE html>
<html>
<head>
  <title>分切标签打印</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 0; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #ea580c; border-radius: 6px; padding: 4mm; background: #fff;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge { font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm; }
    .label-info { flex: 1; }
    .info-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin: 0.5mm 0; }
    .info-label { color: #888; }
    .info-value { font-weight: 500; color: #333; }
    .qr-area { text-align: center; margin-top: 2mm; }
  </style>
</head>
<body>
  <div class="label-grid">
    ${labelsHtml.join('')}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                }}
              >
                <Printer className="w-4 h-4" />
                {tc('print')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 二维码查看对话框 */}
        <Dialog open={isQRCodeDialogOpen} onOpenChange={setIsQRCodeDialogOpen}>
          <DialogContent className="sm:max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('qrCodeLabel')}</DialogTitle>
              <DialogDescription>{t('scanQRCodeDesc')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center">
              {qrCodeDataUrl && (
                <div className="mb-4 p-2 bg-card border rounded">
                  <img src={qrCodeDataUrl} alt="QR Code" />
                </div>
              )}
              <p className="text-center text-sm text-gray-600">{t('scanQRCodeDetail')}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsQRCodeDialogOpen(false)}>{tc("close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 打印预览对话框 */}
        <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                {t('qrCodeLabelPrintPreview')}
              </DialogTitle>
              <DialogDescription>{t('labelsToPrint', { count: printLabels.length })}</DialogDescription>
            </DialogHeader>
            <div id="print-area" className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {printLabels.map((label, index) => {
                  const qrContent = `${label.labelNo || label.orderNo}@001:type:IN`;
                  return (
                    <div
                      key={label.id || index}
                      className="border-2 border-gray-800 rounded-lg p-3 print-label-card"
                      style={{ minHeight: '180px' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                            {label.labelNo}
                          </h3>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
                            {label.materialName}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs shrink-0 ml-2">
                          {tc('stockedIn')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>{t('inboundNo')}：</span>
                          <span className="font-medium">{label.orderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{tc('specification')}：</span>
                          <span>{label.specification || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('qtyUnit')}：</span>
                          <span className="font-medium">
                            {label.quantity || label.item?.quantity || 0}{' '}
                            {label.unit || label.item?.unit || ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{tc('supplier')}：</span>
                          <span>{label.supplier || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('inboundTime')}：</span>
                          <span>
                            {label.inboundTime
                              ? new Date(label.inboundTime).toLocaleString('zh-CN')
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) {
                    toast.error(t('printWindowBlocked'));
                    return;
                  }

                  const labelsHtml = await Promise.all(
                    printLabels.map(async (label, index) => {
                      const qrContent = `${label.labelNo || label.orderNo}@001:type:IN`;
                      let qrDataUrl = '';
                      try {
                        qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
                      } catch {}

                      return `
                    <div class="label-card">
                      <div class="label-header">
                        <div class="label-title">
                          <div class="label-no">${label.labelNo}</div>
                          <div class="material-name">${label.materialName}</div>
                        </div>
                        <div class="status-badge">{tc("stockedIn")}</div>
                      </div>
                      <div class="label-info">
                        <div class="info-row"><span class="info-label">入库单号：</span><span class="info-value">${label.orderNo}</span></div>
                        <div class="info-row"><span class="info-label">规格：</span><span class="info-value">${label.specification || '-'}</span></div>
                        <div class="info-row"><span class="info-label">数量/单位：</span><span class="info-value">${label.quantity || label.item?.quantity || 0} ${label.unit || label.item?.unit || ''}</span></div>
                        <div class="info-row"><span class="info-label">供应商：</span><span class="info-value">${label.supplier || '-'}</span></div>
                        <div class="info-row"><span class="info-label">入库时间：</span><span class="info-value">${label.inboundTime ? new Date(label.inboundTime).toLocaleString('zh-CN') : '-'}</span></div>
                      </div>
                      <div class="qr-area">
                        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;" />` : ''}
                      </div>
                    </div>
                  `;
                    })
                  );

                  const html = `<!DOCTYPE html>
<html>
<head>
  <title>二维码标签打印</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 0; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #333; border-radius: 6px; padding: 4mm;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge {
      background: #d1fae5; color: #065f46; font-size: 8px; font-weight: bold;
      padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm;
    }
    .label-info { flex: 1; }
    .info-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin: 0.5mm 0; }
    .info-label { color: #888; }
    .info-value { font-weight: 500; color: #333; }
    .qr-area { text-align: center; margin-top: 2mm; }
  </style>
</head>
<body>
  <div class="label-grid">
    ${labelsHtml.join('')}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                }}
              >
                <Printer className="w-4 h-4" />
                {tc('print')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 扫码查询对话框 */}
        <Dialog open={isQRScanDialogOpen} onOpenChange={setIsQRScanDialogOpen}>
          <DialogContent className="sm:max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('scanQueryResult')}</DialogTitle>
              <DialogDescription>{t('materialDetailInfo')}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {scanResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{scanResult.materialName}</h3>
                      <p className="text-sm text-gray-600">{scanResult.materialCode}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{tc('specification')}：</span>
                      <span>{scanResult.specification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{tc('supplier')}：</span>
                      <span>{scanResult.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('inboundTime')}：</span>
                      <span>{scanResult.inboundTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{tc('status')}：</span>
                      <Badge
                        className={
                          scanResult.status === 'IN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }
                      >
                        {scanResult.status === 'IN' ? tc('stockedIn') : tc('stockedOut')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('pleaseScanQuery')}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsQRScanDialogOpen(false)}>{tc("close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 生成标签对话框 */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="sm:max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('generateLabel')}</DialogTitle>
              <DialogDescription>{t('generateLabelDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="labelMaterialName">{tc('materialName')}</Label>
                <Input id="labelMaterialName" placeholder={t('enterMaterialName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelSpecification">{tc("specification")}</Label>
                <Input id="labelSpecification" placeholder={t('specExample')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelSupplier">{tc("supplier")}</Label>
                <Select value={labelSupplier} onValueChange={setLabelSupplier}>
                  <SelectTrigger id="labelSupplier">
                    <SelectValue placeholder={t('selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((s: any) => s.status !== 0 && s.status !== 'inactive')
                      .map((s: any) => (
                        <SelectItem key={s.id} value={s.name || s.supplier_name}>
                          {s.name || s.supplier_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={() => setIsGenerateDialogOpen(false)}>{t('generate')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新增入库单对话框 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('addInboundOrder')}</DialogTitle>
              <DialogDescription>{t('enterInboundInfo')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-materialCode">{tc('materialCode')}</Label>
                  <Input
                    id="add-materialCode"
                    value={formData.materialCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialCode: e.target.value }))
                    }
                    placeholder={t('enterMaterialCode')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-materialName">{tc('materialName')}</Label>
                  <Input
                    id="add-materialName"
                    value={formData.materialName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialName: e.target.value }))
                    }
                    placeholder={t('enterMaterialName')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-specification">{tc("specification")}</Label>
                  <Input
                    id="add-specification"
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specification: e.target.value }))
                    }
                    placeholder={t('specExample2')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-quantity">{tc("quantity")}</Label>
                  <Input
                    id="add-quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder={t('enterQuantity')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-unit">{tc("unit")}</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger id="add-unit">
                      <SelectValue placeholder={t('selectUnit')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="卷">{t('unitRoll')}</SelectItem>
                      <SelectItem value="张">{t('unitSheet')}</SelectItem>
                      <SelectItem value="个">{t('unitPiece')}</SelectItem>
                      <SelectItem value="箱">{t('unitBox')}</SelectItem>
                      <SelectItem value="kg">{t('unitKg')}</SelectItem>
                      <SelectItem value="㎡">{t('unitSqm')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-supplier">{tc("supplier")}</Label>
                  <Select
                    value={formData.supplier}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
                  >
                    <SelectTrigger id="add-supplier">
                      <SelectValue placeholder={t('selectSupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers
                        .filter((s: any) => s.status !== 0 && s.status !== 'inactive')
                        .map((s: any) => (
                          <SelectItem key={s.id} value={s.name || s.supplier_name}>
                            {s.name || s.supplier_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-warehouse">{tc("warehouse")}</Label>
                  <Select
                    value={formData.warehouse}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, warehouse: value }))
                    }
                  >
                    <SelectTrigger id="add-warehouse">
                      <SelectValue placeholder={t('selectWarehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseCategories
                        .filter((wh: any) => wh.status !== 0)
                        .map((wh: any) => (
                          <SelectItem key={wh.id} value={wh.name}>
                            {wh.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-purchaseOrderNo">{t('purchaseOrderNo')}</Label>
                  <div className="relative">
                    <Input
                      id="add-purchaseOrderNo"
                      value={formData.purchaseOrderNo}
                      onChange={(e) => handlePoSearchChange(e.target.value)}
                      onFocus={() => {
                        if (poSearchResults.length > 0) setPoDropdownVisible(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setPoDropdownVisible(false), 200);
                      }}
                      placeholder={t('searchPurchaseOrderNo')}
                      autoComplete="off"
                    />
                    {poSearchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {poDropdownVisible && poSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {poSearchResults.map((po: any) => (
                          <div
                            key={po.id}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-b-0 transition-colors dark:border-slate-700"
                            onMouseDown={() => handlePoSelect(po)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium text-blue-600">
                                {po.po_no}
                              </span>
                              <span className="text-xs text-gray-400">{po.order_date || ''}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                {tc('supplier')}: {po.supplier_name || '-'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {tc('quantity')}: {po.total_quantity || 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                {tc('amount')}: ¥{Number(po.grand_total || 0).toFixed(2)}
                              </span>
                            </div>
                            {po.lines && po.lines.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">
                                {po.lines.slice(0, 2).map((line: any, idx: number) => (
                                  <span key={idx} className="mr-2">
                                    {line.material_name || line.material_code}
                                    {line.order_qty ? ` ×${line.order_qty}${line.unit || ''}` : ''}
                                  </span>
                                ))}
                                {po.lines.length > 2 && <span>{t('andMoreItems', { count: po.lines.length })}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-batchNo">{tc("batchNo")}</Label>
                  <Input
                    id="add-batchNo"
                    value={formData.batchNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, batchNo: e.target.value }))}
                    placeholder={t('enterBatchNo')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-remark">{tc("remark")}</Label>
                  <Input
                    id="add-remark"
                    value={formData.remark}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                    placeholder={t('remarkPlaceholder')}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
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
                }}
              >
                {tc('cancel')}
              </Button>
              <Button
                onClick={async () => {
                  if (!formData.materialName || !formData.quantity) {
                    toast.error(t('materialNameRequired'));
                    return;
                  }
                  try {
                    const response = await authFetch('/api/warehouse/inbound', {
                      method: 'POST',
                      body: JSON.stringify({
                        warehouse_id: formData.warehouse || null,
                        supplier_name: formData.supplier,
                        inbound_date: new Date().toISOString().split('T')[0],
                        remark: formData.remark,
                        items: [
                          {
                            material_id: formData.materialCode || 0,
                            material_name: formData.materialName,
                            material_spec: formData.specification,
                            batch_no: formData.batchNo,
                            quantity: parseFloat(formData.quantity),
                            unit: formData.unit || '卷',
                            unit_price: 0,
                          },
                        ],
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('inboundOrderCreated'));
                      setIsAddDialogOpen(false);
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
                      fetchInboundRecords();
                    } else {
                      toast.error(result.message || t('createInboundFailed'));
                    }
                  } catch (err) {
                    toast.error(t('createInboundFailed'));
                  }
                }}
              >
                {t('confirmInbound')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 混合料新增对话框 */}
        <Dialog open={isMixedAddDialogOpen} onOpenChange={setIsMixedAddDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('mixedMaterialAdd')}</DialogTitle>
              <DialogDescription>{t('enterMixedInboundInfo')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mixed-materialCode">{tc('materialCode')}</Label>
                  <Input
                    id="mixed-materialCode"
                    value={formData.materialCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialCode: e.target.value }))
                    }
                    placeholder={t('enterMaterialCode')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixed-materialName">{tc('materialName')}</Label>
                  <Input
                    id="mixed-materialName"
                    value={formData.materialName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialName: e.target.value }))
                    }
                    placeholder={t('enterMaterialName')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mixed-specification">{tc("specification")}</Label>
                  <Input
                    id="mixed-specification"
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specification: e.target.value }))
                    }
                    placeholder={t('specExample2')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixed-quantity">{tc("quantity")}</Label>
                  <Input
                    id="mixed-quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder={t('enterQuantity')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mixed-colorCode">{t('colorCode')}</Label>
                  <Input
                    id="mixed-colorCode"
                    value={formData.colorCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, colorCode: e.target.value }))
                    }
                    placeholder={t('enterColorCode')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixed-machineNo">{t('machineNo')}</Label>
                  <Input
                    id="mixed-machineNo"
                    value={formData.machineNo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, machineNo: e.target.value }))
                    }
                    placeholder={t('enterMachineNo')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mixed-width">{t('width')}</Label>
                  <Input
                    id="mixed-width"
                    value={formData.width}
                    onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
                    placeholder={t('enterWidth')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixed-warehouse">{tc("warehouse")}</Label>
                  <Select
                    value={formData.warehouse}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, warehouse: value }))
                    }
                  >
                    <SelectTrigger id="mixed-warehouse">
                      <SelectValue placeholder={t('selectWarehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseCategories
                        .filter((wh: any) => wh.status !== 0)
                        .map((wh: any) => (
                          <SelectItem key={wh.id} value={wh.name}>
                            {wh.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mixed-mixedMaterialRemark">{t('mixedMaterialRemark')}</Label>
                <Textarea
                  id="mixed-mixedMaterialRemark"
                  value={formData.mixedMaterialRemark}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mixedMaterialRemark: e.target.value }))
                  }
                  placeholder={t('mixedMaterialRemarkPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mixed-remark">{tc("remark")}</Label>
                <Input
                  id="mixed-remark"
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={t('remarkPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsMixedAddDialogOpen(false);
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
                }}
              >
                {tc('cancel')}
              </Button>
              <Button
                onClick={async () => {
                  if (!formData.materialName || !formData.quantity) {
                    toast.error(t('materialNameRequired'));
                    return;
                  }
                  try {
                    const response = await authFetch('/api/warehouse/inbound', {
                      method: 'POST',
                      body: JSON.stringify({
                        warehouse_id: formData.warehouse || null,
                        supplier_name: formData.supplier,
                        inbound_date: new Date().toISOString().split('T')[0],
                        remark: formData.remark,
                        items: [
                          {
                            material_id: formData.materialCode || 0,
                            material_name: formData.materialName,
                            material_spec: formData.specification,
                            batch_no: formData.batchNo,
                            quantity: parseFloat(formData.quantity),
                            unit: formData.unit || '卷',
                            unit_price: 0,
                            warehouse_location: '',
                            color_code: formData.colorCode,
                            machine_no: formData.machineNo,
                            width: formData.width,
                            mixed_material_remark: formData.mixedMaterialRemark,
                          },
                        ],
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('mixedInboundCreated'));
                      setIsMixedAddDialogOpen(false);
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
                      fetchInboundRecords();
                    } else {
                      toast.error(result.message || t('createMixedInboundFailed'));
                    }
                  } catch (err) {
                    toast.error(t('createMixedInboundFailed'));
                  }
                }}
              >
                {t('confirmInbound')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 审核对话框 */}
        <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
          <DialogContent className="sm:max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('auditInboundOrder')}</DialogTitle>
              <DialogDescription>{t('confirmAuditOrder', { orderNo: currentRecord?.order_no || '' })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {currentRecord && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{tc('material')}：</span>
                    <span>{currentRecord.items?.[0]?.material_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{tc('specification')}：</span>
                    <span>{currentRecord.items?.[0]?.material_spec || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{tc('quantity')}：</span>
                    <span>{currentRecord.total_quantity} {t('pieces')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{tc('supplier')}：</span>
                    <span>{currentRecord.supplier_name}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAuditDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!currentRecord) return;
                  try {
                    const response = await authFetch('/api/warehouse/inbound', {
                      method: 'PUT',
                      body: JSON.stringify({ id: currentRecord.id, status: 'rejected' }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('auditRejected'));
                      setIsAuditDialogOpen(false);
                      fetchInboundRecords();
                    } else {
                      toast.error(result.message || tc('error'));
                    }
                  } catch (error) {
                    toast.error(tc('error'));
                  }
                }}
              >
                {tc('reject')}
              </Button>
              <Button
                onClick={async () => {
                  if (!currentRecord) return;
                  try {
                    const response = await authFetch('/api/warehouse/inbound', {
                      method: 'PUT',
                      body: JSON.stringify({ id: currentRecord.id, status: 'approved' }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('auditApproved'));
                      setIsAuditDialogOpen(false);
                      fetchInboundRecords();
                    } else {
                      toast.error(result.message || tc('error'));
                    }
                  } catch (error) {
                    toast.error(tc('error'));
                  }
                }}
              >
                {tc('approve')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑入库单对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('editInboundOrder')}</DialogTitle>
              <DialogDescription>{t('editInboundOrderDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc('materialCode')}</Label>
                  <Input
                    value={formData.materialCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialCode: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc('materialName')}</Label>
                  <Input
                    value={formData.materialName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, materialName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc("specification")}</Label>
                  <Input
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specification: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc("quantity")}</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc("supplier")}</Label>
                  <Select
                    value={formData.supplier}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectSupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers
                        .filter((s: any) => s.status !== 0 && s.status !== 'inactive')
                        .map((s: any) => (
                          <SelectItem key={s.id} value={s.name || s.supplier_name}>
                            {s.name || s.supplier_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tc("warehouse")}</Label>
                  <Select
                    value={formData.warehouse}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, warehouse: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectWarehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseCategories
                        .filter((wh: any) => wh.status !== 0)
                        .map((wh: any) => (
                          <SelectItem key={wh.id} value={wh.name}>
                            {wh.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tc("remark")}</Label>
                <Input
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={async () => {
                  if (!currentRecord) return;
                  try {
                    const response = await authFetch('/api/warehouse/inbound', {
                      method: 'PUT',
                      body: JSON.stringify({
                        id: currentRecord.id,
                        status: currentRecord.status,
                        remark: formData.remark,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('updateSuccess'));
                      setIsEditDialogOpen(false);
                      fetchInboundRecords();
                    } else {
                      toast.error(result.message || t('updateFailed'));
                    }
                  } catch (err) {
                    toast.error(t('updateFailed'));
                  }
                }}
              >
                {tc('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
