'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
  printTable,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  FileText,
  Printer,
  QrCode,
  Clock,
  Shield,
  Award,
  Package,
  Percent,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { mockQualityFinal, USE_MOCK } from '@/lib/mock-data';

// 终检数据类型
interface FinalInspect {
  id: number;
  card_no: string;
  qr_code: string;
  work_order_no: string;
  product_code: string;
  product_name: string;
  material_spec: string;
  work_order_date: string;
  plan_qty: number;
  main_label_no: string;
  burdening_status: number;
  lock_status: number;
  create_user_name: string;
  create_time: string;
  update_time: string;
  customer_name?: string;
  customer_code?: string;
  process_flow1?: string;
  process_flow2?: string;
  print_type?: string;
  finished_size?: string;
  tolerance?: string;
  quality_manager?: string;
  packing_type?: string;
  slice_per_box?: string;
  slice_per_bundle?: string;
}

// 统计数据类型
interface FinalStats {
  pending: number;
  inspecting: number;
  passed: number;
  today: number;
  week: number;
  passRate: number;
}

// 终检项目
const getFinalInspectItems = (t: (key: string) => string) => [
  { id: 'appearance', name: t('appearanceCheck'), required: true },
  { id: 'size', name: t('sizeCheck'), required: true },
  { id: 'color', name: t('colorCheck'), required: true },
  { id: 'printing', name: t('printingQuality'), required: true },
  { id: 'packaging', name: t('packagingCheck'), required: true },
  { id: 'quantity', name: t('quantityCheck'), required: true },
  { id: 'label', name: t('labelCheck'), required: true },
];

export default function QualityFinalPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const finalInspectItems = getFinalInspectItems(t);

  // 获取状态标签
  const getStatusBadge = (status: number) => {
    const statusMap: Record<number, { label: string; className: string }> = {
      0: {
        label: t('pendingProduction'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      },
      1: {
        label: t('scheduled'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      2: {
        label: t('pendingFinalInspection'),
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      },
      3: {
        label: t('finalInspectionCompleted'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
    };
    const config = statusMap[status] || {
      label: tc('unknown'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const [stats, setStats] = useState({
    pending: 0,
    inspecting: 0,
    passed: 0,
    today: 0,
    week: 0,
    passRate: 0,
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFinalOpen, setIsFinalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [selectedFinal, setSelectedFinal] = useState<FinalInspect | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [finals, setFinals] = useState<FinalInspect[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const fetchFinals = async () => {
    logger.info({ module: 'Quality', action: 'fetchFinals' }, '开始获取终检数据');
    try {
      setLoading(true);

      if (USE_MOCK) {
        logger.info({ module: 'Quality', action: 'fetchFinals' }, '使用 mock 数据');
        setFinals(mockQualityFinal);
        const pendingCount = mockQualityFinal.filter(
          (f: FinalInspect) => f.burdening_status === 1
        ).length;
        const inspectingCount = mockQualityFinal.filter(
          (f: FinalInspect) => f.burdening_status === 2
        ).length;
        const passedCount = mockQualityFinal.filter(
          (f: FinalInspect) => f.burdening_status === 3
        ).length;
        setStats({
          pending: pendingCount,
          inspecting: inspectingCount,
          passed: passedCount,
          today: mockQualityFinal.length,
          week: mockQualityFinal.length,
          passRate:
            mockQualityFinal.length > 0
              ? Math.round((passedCount / mockQualityFinal.length) * 100)
              : 0,
        });
        return;
      }

      const res = await authFetch('/api/quality/final');
      const data = await res.json();
      if (data.success) {
        const rawData = data.data;
        const rawList = Array.isArray(rawData) ? rawData : rawData?.list || [];
        const list = rawList.map((item: Loose) => ({
          id: item.id,
          card_no: item.cardNo || item.card_no,
          qr_code: item.qrCode || item.qr_code,
          work_order_no: item.workOrderNo || item.work_order_no,
          product_code: item.productCode || item.product_code,
          product_name: item.productName || item.product_name,
          material_spec: item.materialSpec || item.material_spec,
          work_order_date: item.workOrderDate || item.work_order_date,
          plan_qty: item.planQty || item.plan_qty,
          main_label_no: item.mainLabelNo || item.main_label_no,
          burdening_status: item.burdeningStatus || item.burdening_status || 0,
          lock_status: item.lockStatus || item.lock_status || 0,
          create_user_name: item.createUserName || item.create_user_name,
          create_time: item.createTime || item.create_time,
          update_time: item.updateTime || item.update_time,
          customer_name: item.customerName || item.customer_name,
          customer_code: item.customerCode || item.customer_code,
          process_flow1: item.processFlow1 || item.process_flow1,
          process_flow2: item.processFlow2 || item.process_flow2,
          print_type: item.printType || item.print_type,
          finished_size: item.finishedSize || item.finished_size,
          tolerance: item.tolerance,
          quality_manager: item.qualityManager || item.quality_manager,
          packing_type: item.packingType || item.packing_type,
          slice_per_box: item.slicePerBox || item.slice_per_box,
          slice_per_bundle: item.slicePerBundle || item.slice_per_bundle,
        }));
        setFinals(list);
        const pendingCount = list.filter((f: FinalInspect) => f.burdening_status === 1).length;
        const inspectingCount = list.filter((f: FinalInspect) => f.burdening_status === 2).length;
        const passedCount = list.filter((f: FinalInspect) => f.burdening_status === 3).length;
        setStats({
          pending: pendingCount,
          inspecting: inspectingCount,
          passed: passedCount,
          today: list.length,
          week: list.length,
          passRate: list.length > 0 ? Math.round((passedCount / list.length) * 100) : 0,
        });
        logger.info({ module: 'Quality', action: 'fetchFinals' }, '终检数据获取成功', {
          count: list.length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Quality', action: 'fetchFinals' }, '获取终检数据失败', {
        error: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinals();
  }, []);
  const printRef = useRef<HTMLDivElement>(null);

  // 终检表单状态
  const [finalForm, setFinalForm] = useState({
    result: 'pass',
    qualifiedQty: 0,
    defectQty: 0,
    defectReason: '',
    inspector: '',
    packMethod: '',
    remark: '',
    checkedItems: [] as string[],
  });

  // 筛选终检
  const filteredFinals = finals.filter((final) => {
    if (activeTab !== 'all') {
      const statusMap: Record<string, number> = {
        pending: 2,
        passed: 3,
      };
      if (final.burdening_status !== statusMap[activeTab]) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        final.card_no.toLowerCase().includes(query) ||
        final.work_order_no.toLowerCase().includes(query) ||
        final.product_name.toLowerCase().includes(query) ||
        final.customer_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const {
    sortField,
    sortDirection,
    handleSort,
    sortedData: sortedFinalInspects,
  } = useTableSort(filteredFinals, 'id');

  // 查看详情
  const handleViewDetail = (final: FinalInspect) => {
    setSelectedFinal(final);
    setIsDetailOpen(true);
  };

  // 开始终检
  const handleStartFinal = (final: FinalInspect) => {
    setSelectedFinal(final);
    setFinalForm({
      result: 'pass',
      qualifiedQty: final.plan_qty,
      defectQty: 0,
      defectReason: '',
      inspector: '',
      packMethod: final.packing_type || '',
      remark: '',
      checkedItems: [],
    });
    setIsFinalOpen(true);
  };

  // 提交终检
  const handleSubmitFinal = async () => {
    if (!selectedFinal) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFinals(
        finals.map((f: FinalInspect) =>
          f.id === selectedFinal.id ? { ...f, burdening_status: 3 } : f
        )
      );

      setIsFinalOpen(false);
      alert(t('finalInspectionSubmitted'));
    } catch {
      alert(t('submissionFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 切换检验项目
  const toggleInspectItem = (itemId: string) => {
    setFinalForm((prev) => ({
      ...prev,
      checkedItems: prev.checkedItems.includes(itemId)
        ? prev.checkedItems.filter((id) => id !== itemId)
        : [...prev.checkedItems, itemId],
    }));
  };

  // 查看二维码
  const handleViewQRCode = async (final: FinalInspect) => {
    setSelectedFinal(final);
    try {
      const dataUrl = await QRCode.toDataURL(final.qr_code || `DCERP:PC:${final.card_no}`, {
        width: 256,
        margin: 2,
      });
      setQrCodeDataUrl(dataUrl);
      setIsQRCodeOpen(true);
    } catch {}
  };

  // 生成报告
  const handleGenerateReport = () => {
    setIsReportOpen(true);
  };

  // 打印
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      const printContent = printRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('finalInspectionReport')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              h1 { text-align: center; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // 下载二维码
  const handleDownloadQRCode = () => {
    if (qrCodeDataUrl && selectedFinal) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qrcode-${selectedFinal.card_no}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <MainLayout title={t('finalInspection')}>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingFinalInspection')}</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('finalInspecting')}</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inspecting}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('finalInspectionCompleted')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayFinalInspection')}</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('weekFinalInspection')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.week}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('passRate')}</CardTitle>
              <Percent className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchCardNoWorkOrderProduct')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('finalInspectionReport')}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                </Button>
                <GlobalExportToolbar
                  filename="成品检验报告"
                  title="成品检验报告"
                  landscape
                  columns={[
                    { key: 'card_no', label: tc('processCardNo'), width: 18 },
                    { key: 'product_name', label: tc('productName'), width: 25 },
                    { key: 'product_code', label: tc('productCode'), width: 15 },
                    { key: 'material_spec', label: tc('specification'), width: 15 },
                    { key: 'plan_qty', label: tc('quantity'), width: 10 },
                    {
                      key: 'burdening_status',
                      label: tc('status'),
                      width: 12,
                      formatter: (v) => {
                        const m: Record<number, string> = {
                          0: t('pendingProduction'),
                          1: t('scheduled'),
                          2: t('pendingFinalInspection'),
                          3: t('finalInspectionCompleted'),
                        };
                        return m[v] || tc('unknown');
                      },
                    },
                  ]}
                  data={
                    selectedIds.length > 0
                      ? filteredFinals.filter((f) => selectedIds.includes(f.id))
                      : filteredFinals
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 终检列表 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {tc('all')} ({finals.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t('pendingFinalInspection')} ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="passed">
              {t('finalInspectionCompleted')} ({stats.passed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedIds.length === filteredFinals.length &&
                            filteredFinals.length > 0
                          }
                          onCheckedChange={() => {
                            if (selectedIds.length === filteredFinals.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(filteredFinals.map((f: FinalInspect) => f.id));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-12 text-center">{tc('serialNo')}</TableHead>
                      <SortableTableHeader
                        field="card_no"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        {t('cardNo')}
                      </SortableTableHeader>
                      <SortableTableHeader
                        field="product_name"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        {t('productInfo')}
                      </SortableTableHeader>
                      <TableHead>{tc('customer')}</TableHead>
                      <TableHead>{t('specificationRequirement')}</TableHead>
                      <TableHead>{tc('quantity')}</TableHead>
                      <TableHead>{t('packagingMethod')}</TableHead>
                      <SortableTableHeader
                        field="status"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        {tc('status')}
                      </SortableTableHeader>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFinals.map((final: FinalInspect, index: number) => (
                      <TableRow key={final.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(final.id)}
                            onCheckedChange={() =>
                              setSelectedIds((prev: number[]) =>
                                prev.includes(final.id)
                                  ? prev.filter((i: number) => i !== final.id)
                                  : [...prev, final.id]
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{final.card_no}</span>
                            <span className="text-xs text-muted-foreground">
                              {final.work_order_no}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{final.product_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {final.material_spec}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {final.print_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{final.customer_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {final.customer_code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>
                              {t('size')}: {final.finished_size}
                            </span>
                            <span>
                              {t('tolerance')}: {final.tolerance}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{(final.plan_qty ?? 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{final.packing_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {final.slice_per_box}
                              {t('slicePerBox')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(final.burdening_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(final)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {final.burdening_status === 2 && (
                              <Button size="sm" onClick={() => handleStartFinal(final)}>
                                <ClipboardCheck className="h-4 w-4 mr-1" />
                                {t('finalInspect')}
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(final)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewDetail')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewQRCode(final)}>
                                  <QrCode className="h-4 w-4 mr-2" />
                                  {t('viewQRCode')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewDetail(final)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('finalInspectionRecords')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            {selectedFinal && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('finalInspectionDetail')}: {selectedFinal.card_no}
                    {getStatusBadge(selectedFinal.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>{t('viewFinalInspectionDetail')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('processInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('cardNo')}:</span>
                        <span>{selectedFinal.card_no}</span>
                        <span className="text-muted-foreground">{t('workOrderNo')}:</span>
                        <span>{selectedFinal.work_order_no}</span>
                        <span className="text-muted-foreground">{t('mainLabelNo')}:</span>
                        <span>{selectedFinal.main_label_no}</span>
                        <span className="text-muted-foreground">{t('workOrderDate')}:</span>
                        <span>{selectedFinal.work_order_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('productInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{tc('productName')}:</span>
                        <span>{selectedFinal.product_name}</span>
                        <span className="text-muted-foreground">{t('materialSpec')}:</span>
                        <span>{selectedFinal.material_spec}</span>
                        <span className="text-muted-foreground">{t('printType')}:</span>
                        <span>{selectedFinal.print_type}</span>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span>{(selectedFinal.plan_qty ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('specificationAndPackaging')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('finishedSize')}:</span>
                        <span>{selectedFinal.finished_size}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('toleranceRequirement')}:</span>
                        <span>{selectedFinal.tolerance}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('packagingMethod')}:</span>
                        <span>{selectedFinal.packing_type}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('packingSpec')}:</span>
                        <span>
                          {selectedFinal.slice_per_box}
                          {t('slicePerBox')} × {selectedFinal.slice_per_bundle}
                          {t('slicePerBundle')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('processFlow')}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedFinal.process_flow1
                        ?.split('-')
                        .map((step: string, index: number, arr: string[]) => (
                          <div key={index} className="flex items-center">
                            <Badge variant="outline">{step}</Badge>
                            {index < arr.length - 1 && (
                              <span className="mx-1 text-muted-foreground">→</span>
                            )}
                          </div>
                        ))}
                      {selectedFinal.process_flow2
                        ?.split('-')
                        .map((step: string, index: number, arr: string[]) => (
                          <div key={`2-${index}`} className="flex items-center">
                            <span className="mx-1 text-muted-foreground">→</span>
                            <Badge variant="outline">{step}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {selectedFinal.burdening_status === 2 && (
                      <Button
                        onClick={() => {
                          setIsDetailOpen(false);
                          handleStartFinal(selectedFinal);
                        }}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        {t('startFinalInspection')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 终检对话框 */}
        <Dialog open={isFinalOpen} onOpenChange={setIsFinalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            {selectedFinal && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {t('finalInspection')}: {selectedFinal.card_no}
                  </DialogTitle>
                  <DialogDescription>{t('recordFinalInspectionResult')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{tc('product')}:</span>
                        <span className="ml-2 font-medium">{selectedFinal.product_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('customer')}:</span>
                        <span className="ml-2">{selectedFinal.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('specification')}:</span>
                        <span className="ml-2">
                          {selectedFinal.finished_size} ({selectedFinal.tolerance})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span className="ml-2">
                          {(selectedFinal.plan_qty ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>
                      {t('finalInspectionItems')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {finalInspectItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={finalForm.checkedItems.includes(item.id)}
                            onCheckedChange={() => toggleInspectItem(item.id)}
                          />
                          <label
                            htmlFor={item.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('finalInspectionResult')}</Label>
                    <Select
                      value={finalForm.result}
                      onValueChange={(value) => setFinalForm({ ...finalForm, result: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectFinalInspectionResult')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            {t('qualifiedInbound')}
                          </div>
                        </SelectItem>
                        <SelectItem value="fail">
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            {t('unqualifiedRework')}
                          </div>
                        </SelectItem>
                        <SelectItem value="concession">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                            {t('concessionAccept')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>{t('qualifiedQty')}</Label>
                      <Input
                        type="number"
                        value={finalForm.qualifiedQty}
                        onChange={(e) =>
                          setFinalForm({
                            ...finalForm,
                            qualifiedQty: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>{t('defectQty')}</Label>
                      <Input
                        type="number"
                        value={finalForm.defectQty}
                        onChange={(e) =>
                          setFinalForm({ ...finalForm, defectQty: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {finalForm.defectQty > 0 && (
                    <div className="space-y-3">
                      <Label>{t('defectReason')}</Label>
                      <Select
                        value={finalForm.defectReason}
                        onValueChange={(value) =>
                          setFinalForm({ ...finalForm, defectReason: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectDefectReason')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="size">{t('sizeDefect')}</SelectItem>
                          <SelectItem value="color">{t('colorDefect')}</SelectItem>
                          <SelectItem value="appearance">{t('appearanceDefect')}</SelectItem>
                          <SelectItem value="printing">{t('printingDefect')}</SelectItem>
                          <SelectItem value="packaging">{t('packagingDefect')}</SelectItem>
                          <SelectItem value="quantity">{t('quantityMismatch')}</SelectItem>
                          <SelectItem value="other">{tc('other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>{t('packagingMethodConfirm')}</Label>
                    <Input
                      value={finalForm.packMethod}
                      onChange={(e) => setFinalForm({ ...finalForm, packMethod: e.target.value })}
                      placeholder={t('confirmPackagingMethod')}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>{t('finalInspector')}</Label>
                    <Input
                      placeholder={t('enterFinalInspectorName')}
                      value={finalForm.inspector}
                      onChange={(e) => setFinalForm({ ...finalForm, inspector: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>{tc('remark')}</Label>
                    <Textarea
                      placeholder={t('enterFinalInspectionRemark')}
                      value={finalForm.remark}
                      onChange={(e) => setFinalForm({ ...finalForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsFinalOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button onClick={handleSubmitFinal} disabled={loading}>
                      {loading ? tc('submitting') : t('submitFinalInspection')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 报告对话框 */}
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('finalInspectionReport')}
              </DialogTitle>
              <DialogDescription>{t('viewFinalInspectionSummary')}</DialogDescription>
            </DialogHeader>

            <div ref={printRef} className="space-y-6 py-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">{t('finalInspectionReport')}</h1>
                <p className="text-muted-foreground mt-2">
                  {t('generatedTime')}: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>

              <div className="grid grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('pendingFinalInspection')}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.inspecting}</div>
                    <div className="text-sm text-muted-foreground">{t('finalInspecting')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('finalInspectionCompleted')}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
                    <div className="text-sm text-muted-foreground">{t('todayFinalInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{stats.week}</div>
                    <div className="text-sm text-muted-foreground">{t('weekFinalInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-pink-600">{stats.passRate}%</div>
                    <div className="text-sm text-muted-foreground">{t('passRate')}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-4">{t('finalInspectionDetails')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('cardNo')}</TableHead>
                      <TableHead>{tc('productName')}</TableHead>
                      <TableHead>{tc('customer')}</TableHead>
                      <TableHead>{tc('specification')}</TableHead>
                      <TableHead>{tc('quantity')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFinals.map((final) => (
                      <TableRow key={final.id}>
                        <TableCell>{final.card_no}</TableCell>
                        <TableCell>{final.product_name}</TableCell>
                        <TableCell>{final.customer_name}</TableCell>
                        <TableCell>{final.finished_size}</TableCell>
                        <TableCell>{(final.plan_qty ?? 0).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(final.burdening_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t mt-8">
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">
                    {t('finalInspectorSignature')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">
                    {t('qualityManagerSignature')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">{t('auditorSignature')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                {tc('close')}
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('printReport')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 二维码对话框 */}
        <Dialog open={isQRCodeOpen} onOpenChange={setIsQRCodeOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t('cardQRCode')}
              </DialogTitle>
              <DialogDescription>{t('scanQRCodeToViewCard')}</DialogDescription>
            </DialogHeader>

            {selectedFinal && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  {qrCodeDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-64 h-64 border rounded-lg p-2"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">{t('generating')}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cardNo')}:</span>
                    <span className="font-medium">{selectedFinal.card_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('productName')}:</span>
                    <span>{selectedFinal.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('customer')}:</span>
                    <span>{selectedFinal.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('quantity')}:</span>
                    <span>{(selectedFinal.plan_qty ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setIsQRCodeOpen(false)}>
                    {tc('close')}
                  </Button>
                  <Button onClick={handleDownloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('downloadQRCode')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
