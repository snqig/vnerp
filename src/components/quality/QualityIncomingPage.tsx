'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { authFetch } from '@/lib/auth-fetch';
import { formatDate } from '@/lib/date-utils';
import { Search, Plus, Calendar, CheckCircle2, AlertCircle, RefreshCw, RotateCcw, Edit, Trash2, BarChart2, BarChart3, ClipboardList, ClipboardCheck, CheckCircle, Clock, AlertTriangle, Loader, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, StandardTableColumn } from '@/components/common';
import { toast } from 'sonner';
import {
  buildQualityFormMessages,
  buildIncomingSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';

const getInspectionTypeOptions = (t: (key: string) => string) => [
  { value: 'full', label: t('fullInspection') },
  { value: 'sampling', label: t('samplingInspection') },
  { value: 'visual', label: t('visualInspection') },
  { value: 'appearance', label: t('appearanceInspection') },
  { value: 'functional', label: t('functionalTest') },
];

const getUnitOptions = (tc: (key: string) => string) => [
  { value: 'M', label: tc('unitM') },
  { value: 'KG', label: tc('unitKG') },
  { value: 'roll', label: tc('unitRoll') },
  { value: 'piece', label: tc('unitPiece') },
  { value: 'sheet', label: tc('unitSheet') },
  { value: 'bucket', label: tc('unitBucket') },
  { value: 'box', label: tc('unitBox') },
  { value: 'PCS', label: tc('unitPCS') },
  { value: 'set', label: tc('unitSet') },
  { value: 'item', label: tc('unitItem') },
];

const getInspectionItems = (t: (key: string) => string) => [
  { name: t('appearanceCheck'), standard: t('appearanceStandard') },
  { name: t('sizeCheck'), standard: t('sizeStandard') },
  { name: t('materialCheck'), standard: t('materialStandard') },
  { name: t('performanceTest'), standard: t('performanceStandard') },
  { name: t('packagingCheck'), standard: t('packagingStandard') },
];

const getStatusConfig = (
  t: (key: string) => string,
  tc: (key: string) => string
): Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> => ({
  pass: { label: tc('qualified'), variant: 'default' },
  fail: { label: tc('unqualified'), variant: 'destructive' },
  pending: { label: t('pendingInspection'), variant: 'outline' },
});

// 将 API 返回的字段映射为页面内部格式。
// ④ 命名统一过渡期：API 的 SQL 别名已由 camelCase 改为 snake_case，
// 此处对每个来自响应行的字段做「snake ?? camel」双读，使改动前后都能正常取值。
function mapApiToInternal(item: Loose): Loose {
  return {
    dbId: item.id,
    id: item.inspection_no ?? item.inspectionNo,
    date: item.inspection_date ?? item.inspectionDate,
    supplier: item.supplier_name ?? item.supplierName,
    materialCode: item.material_code ?? item.materialCode,
    materialName: item.material_name ?? item.materialName,
    // 暴露已建未使用字段（报告合法 P1）：下游可做精确筛选 + 合格率统计
    supplierId: item.supplier_id ?? null,
    materialId: item.material_id ?? null,
    qualifiedQty: item.qualified_qty != null ? parseFloat(item.qualified_qty) : null,
    unqualifiedQty: item.unqualified_qty != null ? parseFloat(item.unqualified_qty) : null,
    specification: item.specification,
    batchNo: item.batch_no ?? item.batchNo,
    quantity: parseFloat(item.quantity) || 0,
    unit: item.unit,
    inspectionType: (item.inspection_type ?? item.inspectionType) || 'sampling',
    inspectionTypeRaw: (item.inspection_type ?? item.inspectionType) || 'sampling',
    result: item.inspection_result ?? item.inspectionResult,
    inspector: item.inspector_name ?? item.inspectorName,
    remark: item.remark || '',
    items: Array.isArray(item.items) ? item.items : [],
  };
}

/**
 * 来料检验主体。
 *
 * 同时被两处使用：
 *   1. 本文件默认导出 —— 独立路由 /quality/incoming（自带 MainLayout）
 *   2. 质量检验中心 /quality/center 的「来料检验」tab（embedded=true，宿主已提供布局层）
 *
 * 因此必须像 QualityProcessPage / QualityFinalPage 一样支持 embedded，
 * 否则并入 center 后会嵌出第二套 Sidebar+Header（MainLayout 是
 * h-screen overflow-hidden 的完整壳，表现为两个侧边栏堆叠）。
 */
export function QualityIncomingPage({ embedded = false }: { embedded?: boolean }) {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const inspectionTypeOptions = getInspectionTypeOptions(t);
  const unitOptions = getUnitOptions(t);
  const inspectionItems = getInspectionItems(t);
  const statusConfig = getStatusConfig(t, tc);

  const statusOptions = [
    { value: 'all', label: tc('all') },
    { value: 'pass', label: tc('qualified') },
    { value: 'fail', label: tc('unqualified') },
    { value: 'pending', label: t('pendingInspection') },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [incomingInspections, setIncomingInspections] = useState<Loose[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    inspecting: 0,
    passed: 0,
    failed: 0,
    monthlyCount: 0,
    qualifiedRate: 0,
  });
  // 检验员下拉数据源：sys_employee 在职人员（检验员必须是库内真实人员，禁手输）
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ employee_no: string; name: string; dept_name?: string; position?: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/hr/employees?status=1&page=1&pageSize=200');
        const result = await res.json();
        if (!cancelled && result.success) {
          const list = Array.isArray(result.data) ? result.data : result.data?.list || [];
          setEmployeeOptions(list);
        }
      } catch {
        // 拉取失败时保留空列表，表单回退手输入框
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 从 API 获取来料检验数据
  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/quality/incoming?page=1&pageSize=100');
      const result = await res.json();
      if (result.success && result.data) {
        const list = Array.isArray(result.data.list) ? result.data.list : [];
        setIncomingInspections(list.map(mapApiToInternal));
      }
    } catch {
      toast.error(tc('fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [tc]);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/incoming/stats');
      const data = await res.json();
      if (data.success) {
        // 逐字段兜底而非整体覆盖：后端少返一个字段就会把该卡片变成 undefined，
        // 表现为数字消失或显示 NaN，且不报错、极难定位。
        setStats((prev) => ({
          pending: data.data?.pending ?? prev.pending,
          inspecting: data.data?.inspecting ?? prev.inspecting,
          passed: data.data?.passed ?? prev.passed,
          failed: data.data?.failed ?? prev.failed,
          monthlyCount: data.data?.monthlyCount ?? prev.monthlyCount,
          qualifiedRate: data.data?.qualifiedRate ?? prev.qualifiedRate,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchInspections();
    fetchStats();
  }, [fetchInspections]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<Loose>(null);
  const [selectedRows, setSelectedRows] = useState<Loose[]>([]);
  const [pageSize] = useState(20);
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

  const filteredInspections = useMemo(() => {
    return incomingInspections.filter((inspection) => {
      const matchesSearch =
        !searchQuery ||
        inspection.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.batchNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inspection.result === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [incomingInspections, searchQuery, statusFilter]);

  const sortedList = useMemo(() => filteredInspections, [filteredInspections]);

  const handleRefresh = useCallback(async () => {
    await fetchInspections();
    toast.success(tc('dataRefreshed'));
  }, [fetchInspections, tc]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedRows([]);
    toast.success(tc('filterReset'));
  }, []);

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
      items: inspectionItems.map((item) => ({
        itemName: item.name,
        standard: item.standard,
        actualValue: '',
        result: 'pending',
        itemRemark: '',
      })),
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (inspection: Loose) => {
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
      inspectionType: inspection.inspectionTypeRaw || 'sampling',
      inspectionResult: inspection.result,
      inspectorName: inspection.inspector,
      remark: inspection.remark || '',
      items:
        inspection.items.length > 0
          ? inspection.items.map((item: Loose) => ({
              itemName: item.item_name ?? item.itemName,
              standard: item.standard,
              actualValue: item.actual_value ?? item.actualValue,
              result: item.result,
              itemRemark: item.item_remark ?? item.itemRemark ?? '',
            }))
          : inspectionItems.map((item) => ({
              itemName: item.name,
              standard: item.standard,
              actualValue: '',
              result: 'pending',
              itemRemark: '',
            })),
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    const parsed = buildIncomingSchema(buildQualityFormMessages((k) => tc(k))).safeParse(formData);
    if (!parsed.success) {
      toast.error(firstZodMessage(parsed.error));
      return;
    }
    try {
      const res = await authFetch('/api/quality/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result = await res.json();
      if (result.success) {
        setIsAddDialogOpen(false);
        toast.success(t('incomingInspectionSaved'));
        fetchInspections();
      } else {
        toast.error(result.message || tc('fetchFailed'));
      }
    } catch {
      toast.error(tc('fetchFailed'));
    }
  };

  const handleUpdate = async () => {
    if (!currentInspection) return;
    const parsed = buildIncomingSchema(buildQualityFormMessages((k) => tc(k))).safeParse(formData);
    if (!parsed.success) {
      toast.error(firstZodMessage(parsed.error));
      return;
    }
    try {
      const res = await authFetch('/api/quality/incoming', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentInspection.dbId,
          inspectionNo: currentInspection.id,
          ...parsed.data,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setIsEditDialogOpen(false);
        toast.success(t('incomingInspectionUpdated'));
        fetchInspections();
      } else {
        toast.error(result.message || tc('fetchFailed'));
      }
    } catch {
      toast.error(tc('fetchFailed'));
    }
  };

  const handleDelete = (inspection: Loose) => {
    setCurrentInspection(inspection);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentInspection) return;
    try {
      const res = await authFetch(`/api/quality/incoming?id=${currentInspection.dbId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setIsDeleteDialogOpen(false);
        toast.success(t('inspectionDeleted'));
        fetchInspections();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const totalInspectionsToday = incomingInspections.filter(
    (i) => i.date === new Date().toISOString().slice(0, 10)
  ).length;
  const totalPassInspections = incomingInspections.filter((i) => i.result === 'pass').length;
  const totalRejectInspections = incomingInspections.filter((i) => i.result === 'fail').length;
  const passRate =
    incomingInspections.length > 0
      ? Math.round((totalPassInspections / incomingInspections.length) * 100)
      : 0;

  const renderFormItems = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('inspectionDate')} *</Label>
          <Input
            type="date"
            value={formData.inspectionDate}
            onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('supplier')} *</Label>
          <Input
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            placeholder={tc('enterSupplierName')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('materialCode')}</Label>
          <Input
            value={formData.materialCode}
            onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
            placeholder={tc('enterMaterialCode')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('materialName')} *</Label>
          <Input
            value={formData.materialName}
            onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
            placeholder={tc('enterMaterialName')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('specification')} *</Label>
          <Input
            value={formData.specification}
            onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
            placeholder={tc('enterSpecification')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('batchNo')} *</Label>
          <Input
            value={formData.batchNo}
            onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
            placeholder={tc('enterBatchNo')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('quantity')} *</Label>
          <Input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder={tc('enterQuantity')}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('unit')} *</Label>
          <Select
            value={formData.unit}
            onValueChange={(value) => setFormData({ ...formData, unit: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={tc('selectUnit')} />
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
          <Label>{t('inspectionType')} *</Label>
          <Select
            value={formData.inspectionType}
            onValueChange={(value) => setFormData({ ...formData, inspectionType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectInspectionType')} />
            </SelectTrigger>
            <SelectContent>
              {inspectionTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('inspectionResult')} *</Label>
          <Select
            value={formData.inspectionResult}
            onValueChange={(value) => setFormData({ ...formData, inspectionResult: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectInspectionResult')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('pendingInspection')}</SelectItem>
              <SelectItem value="pass">{tc('qualified')}</SelectItem>
              <SelectItem value="fail">{tc('unqualified')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('inspector')} *</Label>
          {employeeOptions.length > 0 ? (
            <Select
              value={formData.inspectorName}
              onValueChange={(value) => setFormData({ ...formData, inspectorName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('select')} />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((emp) => (
                  <SelectItem key={emp.employee_no} value={emp.name}>
                    {emp.name}
                    {emp.dept_name ? `（${emp.dept_name}${emp.position ? '·' + emp.position : ''}）` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={formData.inspectorName}
              onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
              placeholder={t('enterInspectorName')}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>{tc('remark')}</Label>
          <Input
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder={tc('enterRemark')}
          />
        </div>
      </div>
      <div className="space-y-4">
        <Label className="text-lg font-medium">{t('inspectionItems')}</Label>
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t('itemName')}</Label>
                  <Input
                    value={item.itemName}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].itemName = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('standardRequirement')}</Label>
                  <Input
                    value={item.standard}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].standard = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('actualValue')}</Label>
                  <Input
                    value={item.actualValue}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].actualValue = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('itemResult')}</Label>
                  <Select
                    value={item.result}
                    onValueChange={(value) => {
                      const newItems = [...formData.items];
                      newItems[index].result = value;
                      setFormData({ ...formData, items: newItems });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectResult')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('pendingInspection')}</SelectItem>
                      <SelectItem value="pass">{tc('qualified')}</SelectItem>
                      <SelectItem value="fail">{tc('unqualified')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 space-y-2">
                  <Label>{tc('remark')}</Label>
                  <Input
                    value={item.itemRemark}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].itemRemark = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                    placeholder={tc('enterRemark')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="p-6 space-y-6">
        {/* 统计卡片：与过程检验/成品终检对齐（蓝色起步的 6 张、顺序一致） */}
        <StatsCards
          configs={[
            { key: 'pending', label: t('pendingInspection'), icon: Clock, ...StatsTheme.blue },
            { key: 'inspecting', label: t('inspecting'), icon: ClipboardCheck, ...StatsTheme.orange },
            { key: 'passed', label: t('inspected'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'failed', label: t('unqualifiedInspection'), icon: XCircle, ...StatsTheme.purple },
            { key: 'monthlyCount', label: t('monthlyInspectionCount'), icon: Calendar, ...StatsTheme.cyan },
            { key: 'qualifiedRate', label: t('qualifiedRate'), icon: TrendingUp, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'inspecting', count: stats.inspecting },
            { key: 'passed', count: stats.passed },
            { key: 'failed', count: stats.failed },
            { key: 'monthlyCount', count: stats.monthlyCount },
            { key: 'qualifiedRate', count: stats.qualifiedRate, suffix: '%' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 6 }}
        />

        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchMaterialSupplierBatch')}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={tc('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {tc('reset')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {tc('add')}
                </Button>
                <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {tc('refresh')}
                </Button>
                <GlobalExportToolbar
              filename={t('incomingInspectionReport')}
              title={t('incomingInspectionReport')}
              landscape
              columns={[
                { key: 'id', label: t('inspectionNo'), width: 18 },
                { key: 'date', label: tc('date'), width: 12 },
                { key: 'supplier', label: tc('supplier'), width: 15 },
                { key: 'materialName', label: tc('materialName'), width: 18 },
                { key: 'specification', label: tc('specification'), width: 12 },
                { key: 'batchNo', label: tc('batchNo'), width: 15 },
                { key: 'quantity', label: tc('quantity'), width: 10 },
                {
                  key: 'inspectionType',
                  label: t('inspectionType'),
                  width: 10,
                  formatter: (v) => inspectionTypeOptions.find((o) => o.value === v)?.label || v,
                },
                {
                  key: 'result',
                  label: t('inspectionResult'),
                  width: 10,
                  formatter: (v) => statusConfig[v]?.label || v,
                },
                { key: 'inspector', label: t('inspector'), width: 10 },
              ]}
              data={
                selectedRows.length > 0
                  ? incomingInspections.filter((i) => selectedRows.some((sr) => sr.id === i.id))
                  : incomingInspections
              }
            />
            </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle>{t('incomingInspectionRecord')}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {tc('totalRecords', { count: sortedList.length })}
            </span>
          </CardHeader>
          <CardContent>
            <StandardTable<Loose>
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={(rows) => setSelectedRows(rows)}
              dataSource={sortedList}
              columns={[
                {
                  key: 'serialNo',
                  title: tc('serialNo'),
                  width: 60,
                  align: 'center',
                  render: (_row, index) => <span className="text-muted-foreground">{index + 1}</span>,
                },
                { key: 'id', title: t('inspectionNo') },
                {
                  key: 'date',
                  title: tc('date'),
                  // DATE 列经 API 序列化为 UTC ISO 串，按本地日历日格式化（勿裸显/勿 toISOString）
                  render: (row) => formatDate(row.date),
                },
                { key: 'supplier', title: tc('supplier') },
                { key: 'materialName', title: tc('materialName') },
                { key: 'specification', title: tc('specification') },
                { key: 'batchNo', title: tc('batchNo') },
                { key: 'quantity', title: tc('quantity'), render: (row) => `${row.quantity} ${row.unit}` },
                {
                  key: 'inspectionType',
                  title: t('inspectionType'),
                  render: (row) => (
                    <Badge variant="outline">
                      {inspectionTypeOptions.find((o) => o.value === row.inspectionTypeRaw)?.label || row.inspectionTypeRaw}
                    </Badge>
                  ),
                },
                {
                  key: 'result',
                  title: tc('status'),
                  render: (row) => (
                    <Badge variant={statusConfig[row.result]?.variant || 'outline'}>
                      {statusConfig[row.result]?.label || row.result}
                    </Badge>
                  ),
                },
                { key: 'inspector', title: t('inspector') },
                {
                  key: 'actions',
                  title: tc('actions'),
                  width: 80,
                  align: 'right',
                  render: (row) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {tc('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(row)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tc('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                },
              ]}
              emptyText={t('noIncomingInspectionRecords')}
            />
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('addIncomingInspection')}</DialogTitle>
              <DialogDescription>{t('fillInspectionFormRequired')}</DialogDescription>
            </DialogHeader>
            <div className="py-4">{renderFormItems()}</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('editIncomingInspection')}</DialogTitle>
              <DialogDescription>{t('modifyInspectionFormRequired')}</DialogDescription>
            </DialogHeader>
            <div className="py-4">{renderFormItems()}</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleUpdate}>{tc('update')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('deleteIncomingInspection')}</DialogTitle>
              <DialogDescription>
                {t('confirmDeleteInspection')} {currentInspection?.id}? {tc('cannotUndo')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {tc('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );

  // embedded=true：宿主页面（quality/center）已提供布局层，直接输出内容，
  // 避免嵌出第二套 Sidebar/Header（MainLayout 是 h-screen overflow-hidden 的完整壳）。
  if (embedded) return content;

  return <MainLayout title={t('incomingInspection')}>{content}</MainLayout>;
}