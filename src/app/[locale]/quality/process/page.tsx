'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useEmployeeOptions, employeeLabel } from '@/hooks/useEmployeeOptions';
import { MainLayout } from '@/components/layout';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, StandardTableColumn } from '@/components/common';
import { getQualityStatusBadge, getQualityStatusLabel } from '@/lib/quality-status';
import { QualityInspectDialog } from '@/components/quality/QualityInspectDialog';
import { QualityBatchBar } from '@/components/quality/QualityBatchBar';
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  Percent,
  FileText,
  Printer,
  QrCode,
  Clock,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

// 品质检验数据类型
interface QualityProcess {
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
}

// 统计数据类型
interface QualityStats {
  pending: number;
  inspecting: number;
  passed: number;
  today: number;
  week: number;
  /** 异常率(%):burdening_status 为 5(不合格)/6(返工) 的比例 */
  anomalyRate: number;
}

// 检验记录接口
interface InspectRecord {
  id: number;
  inspectNo: string;
  inspectType: string;
  result: string;
  inspector: string;
  inspectTime: string;
  remark?: string;
}

// 检验项目
const getInspectItems = (t: (key: string) => string) => [
  { id: 'size', name: t('sizeCheck'), required: true },
  { id: 'color', name: t('colorCheck'), required: true },
  { id: 'adhesion', name: t('adhesionCheck'), required: true },
  { id: 'appearance', name: t('appearanceCheck'), required: true },
  { id: 'printing', name: t('printingQuality'), required: true },
  { id: 'packaging', name: t('packagingCheck'), required: false },
];


export default function QualityProcessPage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const inspectItems = getInspectItems(t);

  // 获取状态标签
  const getStatusBadge = (status: number) =>
    getQualityStatusBadge(status, 'process', t, tc);

  const [processes, setProcesses] = useState<QualityProcess[]>([]);
  const [stats, setStats] = useState<QualityStats>({
    pending: 0,
    inspecting: 0,
    passed: 0,
    today: 0,
    week: 0,
    anomalyRate: 0,
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<QualityProcess | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProcesses = async () => {
    logger.info({ module: 'Quality', action: 'fetchProcesses' }, ts('k_1e3gk2g'));
    try {
      setLoading(true);

      const res = await authFetch('/api/quality/process');
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
        }));
        setProcesses(list);
        const anomalyCount = list.filter(
          (p: QualityProcess) => p.burdening_status === 5 || p.burdening_status === 6,
        ).length;
        setStats({
          pending: list.filter((p: QualityProcess) => p.burdening_status === 1).length,
          inspecting: list.filter((p: QualityProcess) => p.burdening_status === 2).length,
          passed: list.filter((p: QualityProcess) => p.burdening_status === 3).length,
          today: list.length,
          week: list.length,
          anomalyRate: list.length > 0 ? Math.round((anomalyCount / list.length) * 100) : 0,
        });
        logger.info({ module: 'Quality', action: 'fetchProcesses' }, ts('k_s0muv8'), {
          count: list.length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Quality', action: 'fetchProcesses' }, ts('k_xsfonz'), {
        error: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  // 检验表单状态
  const [inspectForm, setInspectForm] = useState({
    result: 'pass',
    qualifiedQty: 0,
    defectQty: 0,
    defectType: '',
    inspector: '',
    remark: '',
    checkedItems: [] as string[],
  });
  // 检验员下拉：库内在职真实人员（禁手输，回退见表单区）
  const employeeOptions = useEmployeeOptions();

  // 新增状态
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [inspectRecords, setInspectRecords] = useState<InspectRecord[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // 模拟检验记录数据
  const mockInspectRecords: InspectRecord[] = [
    {
      id: 1,
      inspectNo: 'QI20240318001',
      inspectType: ts('k_91d8n7'),
      result: ts('k_109sg5t'),
      inspector: ts('k_9zg2wy'),
      inspectTime: '2024-03-18 10:30:00',
      remark: ts('k_1u1vobi'),
    },
    {
      id: 2,
      inspectNo: 'QI20240318002',
      inspectType: ts('k_7qnq7b'),
      result: ts('k_109sg5t'),
      inspector: ts('k_153eri6'),
      inspectTime: '2024-03-18 11:00:00',
      remark: ts('k_1c2ekhs'),
    },
    {
      id: 3,
      inspectNo: 'QI20240319001',
      inspectType: ts('k_17nj8fx'),
      result: ts('k_109sg5t'),
      inspector: ts('k_1i8i0ai'),
      inspectTime: '2024-03-19 09:30:00',
      remark: ts('k_16u9ylg'),
    },
  ];

  // 筛选流程
  const filteredProcesses = processes.filter((process) => {
    if (activeTab !== 'all') {
      const statusMap: Record<string, number> = {
        pending: 1,
        inspecting: 2,
        passed: 3,
      };
      if (process.burdening_status !== statusMap[activeTab]) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        process.card_no.toLowerCase().includes(query) ||
        process.work_order_no.toLowerCase().includes(query) ||
        process.product_name.toLowerCase().includes(query) ||
        process.customer_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const sortedProcesses = useMemo(() => filteredProcesses, [filteredProcesses]);
  const [selectedRows, setSelectedRows] = useState<QualityProcess[]>([]);

  // 查看详情
  const handleViewDetail = (process: QualityProcess) => {
    setSelectedProcess(process);
    setIsDetailOpen(true);
  };

  // 开始检验
  const handleStartInspect = (process: QualityProcess) => {
    setSelectedProcess(process);
    setInspectForm({
      result: 'pass',
      qualifiedQty: process.plan_qty,
      defectQty: 0,
      defectType: '',
      inspector: '',
      remark: '',
      checkedItems: [],
    });
    setIsInspectOpen(true);
  };

  // 提交检验
  const handleSubmitInspect = async () => {
    if (!selectedProcess) return;
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 更新本地数据
      setProcesses(
        processes.map((p) => (p.id === selectedProcess.id ? { ...p, burdening_status: 3 } : p))
      );

      setIsInspectOpen(false);
      alert(ts('k_st0wtk'));
    } catch {
      alert(ts('k_f66edb'));
    } finally {
      setLoading(false);
    }
  };

  // 查看二维码
  const handleViewQRCode = async (process: QualityProcess) => {
    setSelectedProcess(process);
    try {
      const dataUrl = await QRCode.toDataURL(process.qr_code || `DCERP:PC:${process.card_no}`, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setIsQRCodeOpen(true);
    } catch {}
  };

  // 查看检验记录
  const handleViewRecords = (process: QualityProcess) => {
    setSelectedProcess(process);
    setInspectRecords(mockInspectRecords);
    setIsRecordsOpen(true);
  };

  // 生成检验报告
  const handleGenerateReport = () => {
    setIsReportOpen(true);
  };

  // 打印功能
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      const printContent = printRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>${tc('printInspectionReportTitle')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              h1 { text-align: center; }
              .header { margin-bottom: 20px; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
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
    if (qrCodeDataUrl && selectedProcess) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qrcode-${selectedProcess.card_no}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <MainLayout title={t('processInspection')}>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <StatsCards
          configs={[
            { key: 'pending', label: t('pendingInspection'), icon: Clock, ...StatsTheme.blue },
            { key: 'inspecting', label: t('inspecting'), icon: ClipboardCheck, ...StatsTheme.orange },
            { key: 'passed', label: t('inspected'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'today', label: t('todayInspection'), icon: Calendar, ...StatsTheme.purple },
            { key: 'week', label: t('weekInspection'), icon: TrendingUp, ...StatsTheme.cyan },
            { key: 'anomalyRate', label: t('anomalyRate'), icon: Percent, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'inspecting', count: stats.inspecting },
            { key: 'passed', count: stats.passed },
            { key: 'today', count: stats.today },
            { key: 'week', count: stats.week },
            { key: 'anomalyRate', count: stats.anomalyRate, suffix: '%' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 6 }}
        />


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
                  {t('inspectionReport')}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                </Button>
                <GlobalExportToolbar
                  filename={ts('k_1ebuor4')}
                  title={ts('k_1ebuor4')}
                  landscape
                  columns={[
                    { key: 'card_no', label: t('cardNo'), width: 18 },
                    { key: 'product_name', label: tc('productName'), width: 25 },
                    { key: 'product_code', label: tc('productCode'), width: 15 },
                    { key: 'material_spec', label: tc('specification'), width: 15 },
                    { key: 'plan_qty', label: tc('quantity'), width: 10 },
                    {
                      key: 'burdening_status',
                      label: tc('status'),
                      width: 12,
                      formatter: (v) => getQualityStatusLabel(Number(v), 'process', t, tc),
                    },
                  ]}
                  data={
                    selectedRows.length > 0
                      ? filteredProcesses.filter((p) => selectedRows.some((sr) => sr.id === p.id))
                      : filteredProcesses
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 检验列表 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {tc('all')} ({processes.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t('pendingInspection')} ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="inspecting">
              {t('inspecting')} ({stats.inspecting})
            </TabsTrigger>
            <TabsTrigger value="passed">
              {t('inspected')} ({stats.passed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <StandardTable<QualityProcess>
                  rowSelectable
                  selectedRows={selectedRows}
                  onRowSelectedChange={(rows) => setSelectedRows(rows)}
                  dataSource={sortedProcesses}
                  columns={[
                    {
                      key: 'serialNo',
                      title: tc('serialNo'),
                      width: 48,
                      align: 'center',
                      render: (_row, index) => (
                        <span className="text-muted-foreground">{index + 1}</span>
                      ),
                    },
                    {
                      key: 'card_no',
                      title: t('cardNo'),
                      sortable: true,
                      render: (process) => (
                        <div className="flex flex-col">
                          <span className="font-medium">{process.card_no}</span>
                          <span className="text-xs text-muted-foreground">
                            {process.work_order_no}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'product_name',
                      title: t('productInfo'),
                      sortable: true,
                      render: (process) => (
                        <div className="flex flex-col">
                          <span className="font-medium">{process.product_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {process.material_spec}
                          </span>
                          <span className="text-xs text-muted-foreground">{process.print_type}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'customer',
                      title: tc('customer'),
                      render: (process) => (
                        <div className="flex flex-col">
                          <span>{process.customer_name}</span>
                          <span className="text-xs text-muted-foreground">{process.customer_code}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'specification',
                      title: t('specificationRequirement'),
                      render: (process) => (
                        <div className="flex flex-col text-sm">
                          <span>
                            {t('size')}: {process.finished_size}
                          </span>
                          <span>
                            {t('tolerance')}: {process.tolerance}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'quantity',
                      title: tc('quantity'),
                      render: (process) =>
                        process.plan_qty ? process.plan_qty.toLocaleString() : '-',
                    },
                    {
                      key: 'quality_manager',
                      title: t('qualityManager'),
                      render: (process) => process.quality_manager,
                    },
                    {
                      key: 'status',
                      title: tc('status'),
                      sortable: true,
                      render: (process) => getStatusBadge(process.burdening_status),
                    },
                    {
                      key: 'actions',
                      title: tc('actions'),
                      render: (process) => (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(process)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(process.burdening_status === 1 || process.burdening_status === 2) && (
                            <Button size="sm" onClick={() => handleStartInspect(process)}>
                              <ClipboardCheck className="h-4 w-4 mr-1" />
                              {t('inspect')}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(process)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('viewDetail')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewQRCode(process)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                {t('viewQRCode')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewRecords(process)}>
                                <FileText className="h-4 w-4 mr-2" />
                                {t('inspectionRecords')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ),
                    },
                  ]}
                />
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 批量操作底栏(统一) */}
          <QualityBatchBar<QualityProcess>
            selectedRows={selectedRows}
            allRows={sortedProcesses}
            onSelectedRowsChange={setSelectedRows}
            labels={{
              selectedCount: tc('selectedItems', { count: selectedRows.length }),
              clearSelection: tc('clearSelection'),
              batchPrint: t('batchPrint'),
            }}
          />

        {/* 详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            {selectedProcess && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('processInspectionDetail')}: {selectedProcess.card_no}
                    {getStatusBadge(selectedProcess.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>{t('viewProcessInspectionDetail')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('processInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('cardNo')}:</span>
                        <span>{selectedProcess.card_no}</span>
                        <span className="text-muted-foreground">{t('workOrderNo')}:</span>
                        <span>{selectedProcess.work_order_no}</span>
                        <span className="text-muted-foreground">{t('mainLabelNo')}:</span>
                        <span>{selectedProcess.main_label_no}</span>
                        <span className="text-muted-foreground">{t('workOrderDate')}:</span>
                        <span>{selectedProcess.work_order_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('productInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{tc('productName')}:</span>
                        <span>{selectedProcess.product_name}</span>
                        <span className="text-muted-foreground">{t('materialSpec')}:</span>
                        <span>{selectedProcess.material_spec}</span>
                        <span className="text-muted-foreground">{t('printType')}:</span>
                        <span>{selectedProcess.print_type}</span>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span>{(selectedProcess.plan_qty ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 规格要求 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('specificationRequirement')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('finishedSize')}:</span>
                        <span>{selectedProcess.finished_size}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('toleranceRequirement')}:</span>
                        <span>{selectedProcess.tolerance}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">{t('qualityManager')}:</span>
                        <span>{selectedProcess.quality_manager}</span>
                      </div>
                    </div>
                  </div>

                  {/* 工艺流程 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('processFlow')}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProcess.process_flow1?.split('-').map((step, index, _arr) => (
                        <div key={index} className="flex items-center">
                          <Badge variant="outline">{step}</Badge>
                          {index < _arr.length - 1 && (
                            <span className="mx-1 text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                      {selectedProcess.process_flow2?.split('-').map((step, index, _arr) => (
                        <div key={`2-${index}`} className="flex items-center">
                          <span className="mx-1 text-muted-foreground">→</span>
                          <Badge variant="outline">{step}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {(selectedProcess.burdening_status === 1 ||
                      selectedProcess.burdening_status === 2) && (
                      <Button
                        onClick={() => {
                          setIsDetailOpen(false);
                          handleStartInspect(selectedProcess);
                        }}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        {t('startInspection')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 检验对话框（共用组件） */}
        <QualityInspectDialog
          open={isInspectOpen}
          onOpenChange={setIsInspectOpen}
          type="process"
          title={`${t('processInspection')}: ${selectedProcess?.card_no}`}
          description={t('recordInspectionResult')}
          card={selectedProcess}
          items={inspectItems}
          form={inspectForm}
          onChange={(patch) => setInspectForm((prev) => ({ ...prev, ...patch }))}
          defectFieldName="defectType"
          defectOptions={[
            { value: 'size', label: t('sizeDefect') },
            { value: 'color', label: t('colorDefect') },
            { value: 'adhesion', label: t('adhesionDefect') },
            { value: 'appearance', label: t('appearanceDefect') },
            { value: 'printing', label: t('printingDefect') },
            { value: 'other', label: tc('other') },
          ]}
          employeeOptions={employeeOptions}
          employeeLabel={employeeLabel}
          onSubmit={handleSubmitInspect}
          loading={loading}
          t={t}
          tc={tc}
        />

        {/* 检验报告对话框 */}
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('processInspectionReport')}
              </DialogTitle>
              <DialogDescription>{t('viewProcessInspectionSummary')}</DialogDescription>
            </DialogHeader>

            <div ref={printRef} className="space-y-6 py-4">
              {/* 报告标题 */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">{t('processInspectionReport')}</h1>
                <p className="text-muted-foreground mt-2">
                  {t('generatedTime')}: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>

              {/* 统计概览 */}
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">{t('pendingInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.inspecting}</div>
                    <div className="text-sm text-muted-foreground">{t('inspecting')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.passed}</div>
                    <div className="text-sm text-muted-foreground">{t('inspected')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.today}</div>
                    <div className="text-sm text-muted-foreground">{t('todayInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.week}</div>
                    <div className="text-sm text-muted-foreground">{t('weekInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.anomalyRate}%</div>
                    <div className="text-sm text-muted-foreground">{t('anomalyRate')}</div>
                  </CardContent>
                </Card>
              </div>

              {/* 检验列表 */}
              <div>
                <h3 className="font-semibold mb-4">{t('inspectionDetails')}</h3>
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
                    {filteredProcesses.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell>{process.card_no}</TableCell>
                        <TableCell>{process.product_name}</TableCell>
                        <TableCell>{process.customer_name}</TableCell>
                        <TableCell>{process.finished_size}</TableCell>
                        <TableCell>{(process.plan_qty ?? 0).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(process.burdening_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t mt-8">
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">{t('inspectorSignature')}</div>
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

            {selectedProcess && (
              <div className="space-y-6 py-4">
                {/* 二维码图片 */}
                <div className="flex justify-center">
                  {qrCodeDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-64 h-64 border rounded-lg p-2"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">{t('generating')}</span>
                    </div>
                  )}
                </div>

                {/* 流程卡信息 */}
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cardNo')}:</span>
                    <span className="font-medium">{selectedProcess.card_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('productName')}:</span>
                    <span>{selectedProcess.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('customer')}:</span>
                    <span>{selectedProcess.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tc('quantity')}:</span>
                    <span>{(selectedProcess.plan_qty ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setIsQRCodeOpen(false)}>
                    {tc('close')}
                  </Button>
                  <Button onClick={handleDownloadQRCode}>
                    <Printer className="h-4 w-4 mr-2" />
                    {t('downloadQRCode')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 检验记录对话框 */}
        <Dialog open={isRecordsOpen} onOpenChange={setIsRecordsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                {t('inspectionRecords')}
              </DialogTitle>
              <DialogDescription>
                {selectedProcess && `${selectedProcess.card_no} - ${selectedProcess.product_name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* 检验记录列表 */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inspectionNo')}</TableHead>
                    <TableHead>{t('inspectionType')}</TableHead>
                    <TableHead>{t('inspectionResult')}</TableHead>
                    <TableHead>{t('inspector')}</TableHead>
                    <TableHead>{t('inspectionTime')}</TableHead>
                    <TableHead>{tc('remark')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspectRecords.length > 0 ? (
                    inspectRecords.map((record: Loose) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.inspectNo || record.inspection_no}
                        </TableCell>
                        <TableCell>{record.inspectType}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.result === ts('k_109sg5t')
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : record.result === ts('k_1ujsxic')
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }
                          >
                            {record.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.inspector}</TableCell>
                        <TableCell>{record.inspectTime || record.inspection_date}</TableCell>
                        <TableCell>{record.remark}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t('noInspectionRecords')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* 统计信息 */}
              {inspectRecords.length > 0 && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {inspectRecords.filter((r) => r.result === tc('qualified')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('qualifiedItems')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {inspectRecords.filter((r) => r.result === tc('unqualified')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('unqualifiedItems')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {inspectRecords.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('totalInspectionItems')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRecordsOpen(false)}>
                {tc('close')}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('printRecords')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
