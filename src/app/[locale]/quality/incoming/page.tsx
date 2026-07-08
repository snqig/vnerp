'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { mockQualityIncoming, USE_MOCK } from '@/lib/mock-data';
import {
  FileCheck,
  Search,
  Plus,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Edit,
  Trash2,
  BarChart2,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { toast } from 'sonner';

const getInspectionTypeOptions = (t: (key: string) => string) => [
  { value: 'full', label: t('fullInspection') },
  { value: 'sampling', label: t('samplingInspection') },
  { value: 'visual', label: t('visualInspection') },
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
      {
        itemName: '外观检查',
        standard: '无划痕、变形、色差',
        actualValue: '无划痕、无变形、无色差',
        result: 'pass',
        itemRemark: '',
      },
      {
        itemName: '尺寸检查',
        standard: 'Ф32±0.1mm',
        actualValue: 'Ф32.05mm',
        result: 'pass',
        itemRemark: '',
      },
      {
        itemName: '材质检查',
        standard: '符合材质标准',
        actualValue: '符合标准',
        result: 'pass',
        itemRemark: '',
      },
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
      {
        itemName: '外观检查',
        standard: '无破损、无异味',
        actualValue: '无破损、无异味',
        result: 'pass',
        itemRemark: '',
      },
      {
        itemName: '尺寸检查',
        standard: '20mm*20m',
        actualValue: '20mm*20.5m',
        result: 'pass',
        itemRemark: '长度略有盈余',
      },
      {
        itemName: '粘性测试',
        standard: '符合粘性要求',
        actualValue: '符合要求',
        result: 'pass',
        itemRemark: '',
      },
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
      {
        itemName: '外观检查',
        standard: '无破损、无氧化',
        actualValue: '无破损、无氧化',
        result: 'pass',
        itemRemark: '',
      },
      {
        itemName: '尺寸检查',
        standard: '1.5mm²±0.1mm²',
        actualValue: '1.3mm²',
        result: 'reject',
        itemRemark: '直径偏小',
      },
      {
        itemName: '电阻测试',
        standard: '符合电阻要求',
        actualValue: '符合要求',
        result: 'pass',
        itemRemark: '',
      },
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

const getStatusConfig = (t: (key: string) => string, tc: (key: string) => string): Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> => ({
  pass: { label: tc('qualified'), variant: 'default' },
  reject: { label: tc('unqualified'), variant: 'destructive' },
  pending: { label: t('pendingInspection'), variant: 'outline' },
});

export default function IncomingInspectionPage() {
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
    { value: 'reject', label: tc('unqualified') },
    { value: 'pending', label: t('pendingInspection') },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [incomingInspections, setIncomingInspections] = useState(() => {
    if (USE_MOCK) {
      const mapped = mockQualityIncoming.map((item: any) => ({
        id: item.inspect_no,
        date: item.inspect_time,
        supplier: item.supplier_name,
        materialName: item.material_name,
        specification: item.specification,
        batchNo: item.batch_no,
        quantity: item.inspect_qty,
        unit: 'pcs',
        inspectionType: item.inspection_type === 'sampling' ? '抽检' : item.inspection_type === 'full' ? '全检' : '抽检',
        result: item.result,
        inspector: item.inspector,
        remark: item.remark || '',
        items: [
          { itemName: '外观检查', standard: item.standard || '符合标准', actualValue: '合格', result: 'pass', itemRemark: '' },
          { itemName: '尺寸检查', standard: item.standard || '符合标准', actualValue: '合格', result: 'pass', itemRemark: '' },
        ],
      }));
      logger.info({ module: 'Quality', action: 'incoming' }, '使用 mock 来料检验数据', { count: mapped.length });
      return mapped;
    }
    return initialIncomingInspections;
  });
  const [selectedInspections, setSelectedInspections] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<any>(null);
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

  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(
    filteredInspections,
    'id'
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success(tc('dataRefreshed'));
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedInspections([]);
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
      inspectionType:
        inspection.inspectionType === t('samplingInspection')
          ? 'sampling'
          : inspection.inspectionType === t('fullInspection')
            ? 'full'
            : inspection.inspectionType === t('visualInspection')
              ? 'visual'
              : 'functional',
      inspectionResult: inspection.result,
      inspectorName: inspection.inspector,
      remark: inspection.remark || '',
      items:
        inspection.items.length > 0
          ? inspection.items.map((item: any) => ({
              itemName: item.itemName,
              standard: item.standard,
              actualValue: item.actualValue,
              result: item.result,
              itemRemark: item.itemRemark || '',
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
      inspectionType:
        formData.inspectionType === 'sampling'
          ? t('samplingInspection')
          : formData.inspectionType === 'full'
            ? t('fullInspection')
            : formData.inspectionType === 'visual'
              ? t('visualInspection')
              : t('functionalTest'),
      result: formData.inspectionResult,
      inspector: formData.inspectorName,
      remark: formData.remark,
      items: formData.items,
    };
    setIncomingInspections([newInspection, ...incomingInspections]);
    setIsAddDialogOpen(false);
    toast.success(t('incomingInspectionSaved'));
  };

  const handleUpdate = () => {
    if (!currentInspection) return;
    setIncomingInspections(
      incomingInspections.map((i) =>
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
              inspectionType:
                formData.inspectionType === 'sampling'
                  ? t('samplingInspection')
                  : formData.inspectionType === 'full'
                    ? t('fullInspection')
                    : formData.inspectionType === 'visual'
                      ? t('visualInspection')
                      : t('functionalTest'),
              result: formData.inspectionResult,
              inspector: formData.inspectorName,
              remark: formData.remark,
              items: formData.items,
            }
          : i
      )
    );
    setIsEditDialogOpen(false);
    toast.success(t('incomingInspectionUpdated'));
  };

  const handleDelete = (inspection: any) => {
    setCurrentInspection(inspection);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!currentInspection) return;
    setIncomingInspections(incomingInspections.filter((i) => i.id !== currentInspection.id));
    setIsDeleteDialogOpen(false);
    toast.success(t('inspectionDeleted'));
  };

  const toggleSelectInspection = (inspectionId: string) => {
    setSelectedInspections((prev) =>
      prev.includes(inspectionId)
        ? prev.filter((id) => id !== inspectionId)
        : [...prev, inspectionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInspections.length === sortedData.length) {
      setSelectedInspections([]);
    } else {
      setSelectedInspections(sortedData.map((i) => i.id));
    }
  };

  const totalInspectionsToday = incomingInspections.filter(
    (i) => i.date === new Date().toISOString().slice(0, 10)
  ).length;
  const totalPassInspections = incomingInspections.filter((i) => i.result === 'pass').length;
  const totalRejectInspections = incomingInspections.filter((i) => i.result === 'reject').length;
  const passRate =
    incomingInspections.length > 0
      ? Math.round((totalPassInspections / incomingInspections.length) * 100)
      : 0;

  const exportColumns = [
    { key: 'id', header: t('inspectionNo') },
    { key: 'date', header: tc('date') },
    { key: 'supplier', header: tc('supplier') },
    { key: 'materialName', header: tc('materialName') },
    { key: 'specification', header: tc('specification') },
    { key: 'batchNo', header: tc('batchNo') },
    { key: 'quantity', header: tc('quantity') },
    { key: 'inspectionType', header: t('inspectionType') },
    { key: 'result', header: t('inspectionResult') },
    { key: 'inspector', header: t('inspector') },
  ];

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
            placeholder={tc("enterSupplierName")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('materialCode')}</Label>
          <Input
            value={formData.materialCode}
            onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
            placeholder={tc("enterMaterialCode")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('materialName')} *</Label>
          <Input
            value={formData.materialName}
            onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
            placeholder={tc("enterMaterialName")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('specification')} *</Label>
          <Input
            value={formData.specification}
            onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
            placeholder={tc("enterSpecification")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('batchNo')} *</Label>
          <Input
            value={formData.batchNo}
            onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
            placeholder={tc("enterBatchNo")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('quantity')} *</Label>
          <Input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder={tc("enterQuantity")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc('unit')} *</Label>
          <Select
            value={formData.unit}
            onValueChange={(value) => setFormData({ ...formData, unit: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={tc("selectUnit")} />
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
              <SelectValue placeholder={t("selectInspectionType")} />
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
              <SelectValue placeholder={t("selectInspectionResult")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('pendingInspection')}</SelectItem>
              <SelectItem value="pass">{tc("qualified")}</SelectItem>
              <SelectItem value="reject">{tc("unqualified")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('inspector')} *</Label>
          <Input
            value={formData.inspectorName}
            onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
            placeholder={t("enterInspectorName")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tc("remark")}</Label>
          <Input
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder={tc("enterRemark")}
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
                      <SelectValue placeholder={t("selectResult")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('pendingInspection')}</SelectItem>
                      <SelectItem value="pass">{tc("qualified")}</SelectItem>
                      <SelectItem value="reject">{tc("unqualified")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 space-y-2">
                  <Label>{tc("remark")}</Label>
                  <Input
                    value={item.itemRemark}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].itemRemark = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                    placeholder={tc("enterRemark")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout title={t('incomingInspection')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchMaterialSupplierBatch')}
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={tc("selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {tc('refresh')}
            </Button>
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
            <GlobalExportToolbar
              filename="来料检验报告"
              title="来料检验报告"
              landscape
              columns={[
                { key: 'id', label: t('inspectionNo'), width: 18 },
                { key: 'date', label: tc('date'), width: 12 },
                { key: 'supplier', label: tc('supplier'), width: 15 },
                { key: 'materialName', label: tc('materialName'), width: 18 },
                { key: 'specification', label: tc('specification'), width: 12 },
                { key: 'batchNo', label: tc('batchNo'), width: 15 },
                { key: 'quantity', label: tc('quantity'), width: 10 },
                { key: 'inspectionType', label: t('inspectionType'), width: 10 },
                { key: 'result', label: t('inspectionResult'), width: 10, formatter: (v) => statusConfig[v]?.label || v },
                { key: 'inspector', label: t('inspector'), width: 10 },
              ]}
              data={selectedInspections.length > 0 ? sortedData.filter((i) => selectedInspections.includes(i.id)) : sortedData}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('todayInspection')}</p>
                  <p className="text-3xl font-bold mt-1">{totalInspectionsToday}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('inspectionRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('qualifiedCount')}</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{totalPassInspections}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('qualifiedRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('unqualifiedCount')}</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{totalRejectInspections}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('unqualifiedRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('passRate')}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{passRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('inspectionPassRate')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle>{t('incomingInspectionRecord')}</CardTitle>
            <span className="text-sm text-muted-foreground">{tc('totalRecords')}: {sortedData.length}</span>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedInspections.length === sortedData.length && sortedData.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center">{tc("serialNo")}</TableHead>
                  <SortableTableHeader
                    field="id"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('inspectionNo')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="date"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('date')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="supplier"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('supplier')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="materialName"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('materialName')}
                  </SortableTableHeader>
                  <TableHead>{tc("specification")}</TableHead>
                  <TableHead>{tc("batchNo")}</TableHead>
                  <TableHead>{tc("quantity")}</TableHead>
                  <TableHead>{t('inspectionType')}</TableHead>
                  <SortableTableHeader
                    field="result"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('status')}
                  </SortableTableHeader>
                  <TableHead>{t('inspector')}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((inspection, index) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInspections.includes(inspection.id)}
                        onCheckedChange={() => toggleSelectInspection(inspection.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{inspection.id}</TableCell>
                    <TableCell>{inspection.date}</TableCell>
                    <TableCell>{inspection.supplier}</TableCell>
                    <TableCell>{inspection.materialName}</TableCell>
                    <TableCell>{inspection.specification}</TableCell>
                    <TableCell>{inspection.batchNo}</TableCell>
                    <TableCell>
                      {inspection.quantity} {inspection.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inspection.inspectionType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[inspection.result]?.variant || 'outline'}>
                        {statusConfig[inspection.result]?.label || inspection.result}
                      </Badge>
                    </TableCell>
                    <TableCell>{inspection.inspector}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(inspection)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {tc('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(inspection)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tc('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {t('noIncomingInspectionRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
              <Button onClick={handleSave}>{tc("save")}</Button>
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
    </MainLayout>
  );
}
