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
import { Progress } from '@/components/ui/progress';
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
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { USE_MOCK } from '@/lib/mock-data';

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
}

// 检验记录接口
interface InspectRecord {
  id: number;
  inspectNo: string;
  inspectType: string;
  // eslint-disable-next-line i18n/no-chinese-hardcode
  result: '合格' | '不合格';
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

// 模拟品质检验数据
const mockQualityProcesses: QualityProcess[] = [
  {
    id: 1,
    card_no: 'SC20240318001',
    qr_code: 'DCERP:PC:SC20240318001',
    work_order_no: 'WO202403001',
    product_code: 'PROD-A001',
    product_name: '透明包装膜A款',
    material_spec: 'PET透明膜 0.1mm',
    work_order_date: '2024-03-18',
    plan_qty: 5000,
    main_label_no: 'LBL202403001',
    burdening_status: 2,
    create_user_name: '张三',
    create_time: '2024-03-18 08:00:00',
    update_time: '2024-03-18 10:00:00',
    customer_name: '深圳科技有限公司',
    customer_code: 'CUST20240001',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '丝网印刷',
    finished_size: '100mm x 50mm',
    tolerance: '±0.5mm',
    quality_manager: '质量主管A',
  },
  {
    id: 2,
    card_no: 'SC20240319002',
    qr_code: 'DCERP:PC:SC20240319002',
    work_order_no: 'WO202403002',
    product_code: 'PROD-B002',
    product_name: '防静电膜B款',
    material_spec: '防静电膜 0.08mm',
    work_order_date: '2024-03-19',
    plan_qty: 3000,
    main_label_no: 'LBL202403002',
    burdening_status: 2,
    create_user_name: '李四',
    create_time: '2024-03-19 08:00:00',
    update_time: '2024-03-19 10:00:00',
    customer_name: '广州贸易发展有限公司',
    customer_code: 'CUST20240002',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '胶印',
    finished_size: '80mm x 40mm',
    tolerance: '±0.3mm',
    quality_manager: '质量主管B',
  },
  {
    id: 3,
    card_no: 'SC20240320003',
    qr_code: 'DCERP:PC:SC20240320003',
    work_order_no: 'WO202403003',
    product_code: 'PROD-C003',
    product_name: '标签贴纸C款',
    material_spec: '不干胶纸 80g',
    work_order_date: '2024-03-20',
    plan_qty: 8000,
    main_label_no: 'LBL202403003',
    burdening_status: 1,
    create_user_name: '王五',
    create_time: '2024-03-20 08:00:00',
    update_time: '2024-03-20 08:00:00',
    customer_name: '东莞制造有限公司',
    customer_code: 'CUST20240003',
    process_flow1: '切料-印刷-模切',
    process_flow2: '检验-包装',
    print_type: '数码印刷',
    finished_size: '60mm x 30mm',
    tolerance: '±0.2mm',
    quality_manager: '质量主管A',
  },
  {
    id: 4,
    card_no: 'SC20240317004',
    qr_code: 'DCERP:PC:SC20240317004',
    work_order_no: 'WO202403004',
    product_code: 'PROD-D004',
    product_name: '彩印膜D款',
    material_spec: 'BOPP彩印膜 0.12mm',
    work_order_date: '2024-03-17',
    plan_qty: 6000,
    main_label_no: 'LBL202403004',
    burdening_status: 3,
    create_user_name: '赵六',
    create_time: '2024-03-17 08:00:00',
    update_time: '2024-03-17 16:00:00',
    customer_name: '佛山实业集团有限公司',
    customer_code: 'CUST20240004',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '凹印',
    finished_size: '120mm x 60mm',
    tolerance: '±0.5mm',
    quality_manager: '质量主管C',
  },
  {
    id: 5,
    card_no: 'SC20240321005',
    qr_code: 'DCERP:PC:SC20240321005',
    work_order_no: 'WO202403005',
    product_code: 'PROD-E005',
    product_name: '热收缩膜E款',
    material_spec: 'POF热收缩膜 0.15mm',
    work_order_date: '2024-03-21',
    plan_qty: 4500,
    main_label_no: 'LBL202403005',
    burdening_status: 1,
    create_user_name: '孙七',
    create_time: '2024-03-21 08:00:00',
    update_time: '2024-03-21 08:00:00',
    customer_name: '中山电子科技有限公司',
    customer_code: 'CUST20240005',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '柔印',
    finished_size: '90mm x 45mm',
    tolerance: '±0.4mm',
    quality_manager: '质量主管B',
  },
  {
    id: 6,
    card_no: 'SC20240322006',
    qr_code: 'DCERP:PC:SC20240322006',
    work_order_no: 'WO202403006',
    product_code: 'PROD-F006',
    product_name: '保护膜F款',
    material_spec: 'PE保护膜 0.05mm',
    work_order_date: '2024-03-22',
    plan_qty: 3500,
    main_label_no: 'LBL202403006',
    burdening_status: 3,
    create_user_name: '周八',
    create_time: '2024-03-22 08:00:00',
    update_time: '2024-03-22 08:00:00',
    customer_name: '惠州包装材料有限公司',
    customer_code: 'CUST20240006',
    process_flow1: '切料-印刷-模切',
    process_flow2: '检验-包装',
    print_type: '丝网印刷',
    finished_size: '70mm x 35mm',
    tolerance: '±0.3mm',
    quality_manager: '质量主管A',
  },
  {
    id: 7,
    card_no: 'SC20240323007',
    qr_code: 'DCERP:PC:SC20240323007',
    work_order_no: 'WO202403007',
    product_code: 'PROD-G007',
    product_name: '复合膜G款',
    material_spec: '复合膜材料 0.2mm',
    work_order_date: '2024-03-23',
    plan_qty: 5500,
    main_label_no: 'LBL202403007',
    burdening_status: 2,
    create_user_name: '吴九',
    create_time: '2024-03-23 08:00:00',
    update_time: '2024-03-23 08:00:00',
    customer_name: '珠海进出口贸易有限公司',
    customer_code: 'CUST20240007',
    process_flow1: '切料-复合-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '胶印',
    finished_size: '110mm x 55mm',
    tolerance: '±0.5mm',
    quality_manager: '质量主管C',
  },
  {
    id: 8,
    card_no: 'SC20240324008',
    qr_code: 'DCERP:PC:SC20240324008',
    work_order_no: 'WO202403008',
    product_code: 'PROD-H008',
    product_name: '印刷膜H款',
    material_spec: '印刷专用膜 0.1mm',
    work_order_date: '2024-03-24',
    plan_qty: 4000,
    main_label_no: 'LBL202403008',
    burdening_status: 1,
    create_user_name: '郑十',
    create_time: '2024-03-24 08:00:00',
    update_time: '2024-03-24 08:00:00',
    customer_name: '江门印刷包装有限公司',
    customer_code: 'CUST20240008',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '数码印刷',
    finished_size: '85mm x 42mm',
    tolerance: '±0.3mm',
    quality_manager: '质量主管A',
  },
  {
    id: 9,
    card_no: 'SC20240325009',
    qr_code: 'DCERP:PC:SC20240325009',
    work_order_no: 'WO202403009',
    product_code: 'PROD-I009',
    product_name: '新材料I款',
    material_spec: '生物降解膜 0.1mm',
    work_order_date: '2024-03-25',
    plan_qty: 2500,
    main_label_no: 'LBL202403009',
    burdening_status: 3,
    create_user_name: '钱十一',
    create_time: '2024-03-25 08:00:00',
    update_time: '2024-03-25 08:00:00',
    customer_name: '肇庆新材料科技有限公司',
    customer_code: 'CUST20240009',
    process_flow1: '切料-磨切-印刷',
    process_flow2: '模切-检验-包装',
    print_type: '柔印',
    finished_size: '75mm x 38mm',
    tolerance: '±0.2mm',
    quality_manager: '质量主管B',
  },
  {
    id: 10,
    card_no: 'SC20240326010',
    qr_code: 'DCERP:PC:SC20240326010',
    work_order_no: 'WO202403010',
    product_code: 'PROD-J010',
    product_name: '塑料膜J款',
    material_spec: 'PVC塑料膜 0.12mm',
    work_order_date: '2024-03-26',
    plan_qty: 6000,
    main_label_no: 'LBL202403010',
    burdening_status: 2,
    create_user_name: '冯十二',
    create_time: '2024-03-26 08:00:00',
    update_time: '2024-03-26 08:00:00',
    customer_name: '汕头塑料制品有限公司',
    customer_code: 'CUST20240010',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '凹印',
    finished_size: '95mm x 48mm',
    tolerance: '±0.4mm',
    quality_manager: '质量主管C',
  },
];

export default function QualityProcessPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const inspectItems = getInspectItems(t);

  // 获取状态标签
  const getStatusBadge = (status: number) => {
    const statusMap: Record<number, { label: string; className: string }> = {
      0: {
        label: t('pendingProduction'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      },
      1: {
        label: t('pendingInspection'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      2: {
        label: t('inspecting'),
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      },
      3: {
        label: t('inspected'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
    };
    const config = statusMap[status] || {
      label: tc('unknown'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const [processes, setProcesses] = useState<QualityProcess[]>([]);
  const [stats, setStats] = useState<QualityStats>({
    pending: 0,
    inspecting: 0,
    passed: 0,
    today: 0,
    week: 0,
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<QualityProcess | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchProcesses = async () => {
    logger.info({ module: 'Quality', action: 'fetchProcesses' }, '开始获取品质过程检验数据');
    try {
      setLoading(true);

      if (USE_MOCK) {
        logger.info({ module: 'Quality', action: 'fetchProcesses' }, '使用 mock 数据');
        setProcesses(mockQualityProcesses);
        setStats({
          pending: mockQualityProcesses.filter((p) => p.burdening_status === 1).length,
          inspecting: mockQualityProcesses.filter((p) => p.burdening_status === 2).length,
          passed: mockQualityProcesses.filter((p) => p.burdening_status === 3).length,
          today: mockQualityProcesses.length,
          week: mockQualityProcesses.length,
        });
        return;
      }

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
        setStats({
          pending: list.filter((p: QualityProcess) => p.burdening_status === 1).length,
          inspecting: list.filter((p: QualityProcess) => p.burdening_status === 2).length,
          passed: list.filter((p: QualityProcess) => p.burdening_status === 3).length,
          today: list.length,
          week: list.length,
        });
        logger.info({ module: 'Quality', action: 'fetchProcesses' }, '品质过程检验数据获取成功', {
          count: list.length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Quality', action: 'fetchProcesses' }, '获取品质过程检验数据失败', {
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
      inspectType: '尺寸检验',
      result: '合格',
      inspector: '张三',
      inspectTime: '2024-03-18 10:30:00',
      remark: '尺寸符合要求',
    },
    {
      id: 2,
      inspectNo: 'QI20240318002',
      inspectType: '颜色检验',
      result: '合格',
      inspector: '李四',
      inspectTime: '2024-03-18 11:00:00',
      remark: '颜色正常',
    },
    {
      id: 3,
      inspectNo: 'QI20240319001',
      inspectType: '外观检验',
      result: '合格',
      inspector: '王五',
      inspectTime: '2024-03-19 09:30:00',
      remark: '外观无缺陷',
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

  const {
    sortField,
    sortDirection,
    handleSort,
    sortedData: sortedProcesses,
  } = useTableSort(filteredProcesses, 'id');

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
      alert('检验提交成功');
    } catch {
      alert('提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换检验项目
  const toggleInspectItem = (itemId: string) => {
    setInspectForm((prev) => ({
      ...prev,
      checkedItems: prev.checkedItems.includes(itemId)
        ? prev.checkedItems.filter((id) => id !== itemId)
        : [...prev.checkedItems, itemId],
    }));
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
            <title>品质检验报告</title>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingInspection')}</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inspecting')}</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inspecting}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inspected')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayInspection')}</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('weekInspection')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.week}</div>
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
                  {t('inspectionReport')}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                </Button>
                <GlobalExportToolbar
                  filename="过程检验报告"
                  title="过程检验报告"
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
                      formatter: (v) => {
                        const m: Record<number, string> = {
                          0: t('pendingProduction'),
                          1: t('pendingInspection'),
                          2: t('inspecting'),
                          3: t('inspected'),
                        };
                        return m[v] || tc('unknown');
                      },
                    },
                  ]}
                  data={
                    selectedIds.length > 0
                      ? filteredProcesses.filter((p) => selectedIds.includes(p.id))
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedIds.length === filteredProcesses.length &&
                            filteredProcesses.length > 0
                          }
                          onCheckedChange={() => {
                            if (selectedIds.length === filteredProcesses.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(filteredProcesses.map((p) => p.id));
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
                      <TableHead>{t('qualityManager')}</TableHead>
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
                    {filteredProcesses.map((process, index) => (
                      <TableRow key={process.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(process.id)}
                            onCheckedChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(process.id)
                                  ? prev.filter((i) => i !== process.id)
                                  : [...prev, process.id]
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{process.card_no}</span>
                            <span className="text-xs text-muted-foreground">
                              {process.work_order_no}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{process.product_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {process.material_spec}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {process.print_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{process.customer_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {process.customer_code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>
                              {t('size')}: {process.finished_size}
                            </span>
                            <span>
                              {t('tolerance')}: {process.tolerance}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {process.plan_qty ? process.plan_qty.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>{process.quality_manager}</TableCell>
                        <TableCell>{getStatusBadge(process.burdening_status)}</TableCell>
                        <TableCell>
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
                      {selectedProcess.process_flow1?.split('-').map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <Badge variant="outline">{step}</Badge>
                          {index < arr.length - 1 && (
                            <span className="mx-1 text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                      {selectedProcess.process_flow2?.split('-').map((step, index, arr) => (
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

        {/* 检验对话框 */}
        <Dialog open={isInspectOpen} onOpenChange={setIsInspectOpen}>
          <DialogContent className="max-w-2xl" resizable>
            {selectedProcess && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {t('processInspection')}: {selectedProcess.card_no}
                  </DialogTitle>
                  <DialogDescription>{t('recordInspectionResult')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 流程卡信息 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{tc('product')}:</span>
                        <span className="ml-2 font-medium">{selectedProcess.product_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('customer')}:</span>
                        <span className="ml-2">{selectedProcess.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('specification')}:</span>
                        <span className="ml-2">
                          {selectedProcess.finished_size} ({selectedProcess.tolerance})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span className="ml-2">
                          {(selectedProcess.plan_qty ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 检验项目 */}
                  <div className="space-y-3">
                    <Label>{t('inspectionItems')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {inspectItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={inspectForm.checkedItems.includes(item.id)}
                            onCheckedChange={() => toggleInspectItem(item.id)}
                          />
                          <label
                            htmlFor={item.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.name}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 检验结果 */}
                  <div className="space-y-3">
                    <Label>{t('inspectionResult')}</Label>
                    <Select
                      value={inspectForm.result}
                      onValueChange={(value) => setInspectForm({ ...inspectForm, result: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectInspectionResult')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            {tc('qualified')}
                          </div>
                        </SelectItem>
                        <SelectItem value="fail">
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            {tc('unqualified')}
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

                  {/* 数量 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>{t('qualifiedQty')}</Label>
                      <Input
                        type="number"
                        value={inspectForm.qualifiedQty}
                        onChange={(e) =>
                          setInspectForm({
                            ...inspectForm,
                            qualifiedQty: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>{t('defectQty')}</Label>
                      <Input
                        type="number"
                        value={inspectForm.defectQty}
                        onChange={(e) =>
                          setInspectForm({
                            ...inspectForm,
                            defectQty: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* 不良类型 */}
                  {inspectForm.defectQty > 0 && (
                    <div className="space-y-3">
                      <Label>{t('defectType')}</Label>
                      <Select
                        value={inspectForm.defectType}
                        onValueChange={(value) =>
                          setInspectForm({ ...inspectForm, defectType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectDefectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="size">{t('sizeDefect')}</SelectItem>
                          <SelectItem value="color">{t('colorDefect')}</SelectItem>
                          <SelectItem value="adhesion">{t('adhesionDefect')}</SelectItem>
                          <SelectItem value="appearance">{t('appearanceDefect')}</SelectItem>
                          <SelectItem value="printing">{t('printingDefect')}</SelectItem>
                          <SelectItem value="other">{tc('other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 检验员 */}
                  <div className="space-y-3">
                    <Label>{t('inspector')}</Label>
                    <Input
                      placeholder={t('enterInspectorName')}
                      value={inspectForm.inspector}
                      onChange={(e) =>
                        setInspectForm({ ...inspectForm, inspector: e.target.value })
                      }
                    />
                  </div>

                  {/* 备注 */}
                  <div className="space-y-3">
                    <Label>{tc('remark')}</Label>
                    <Textarea
                      placeholder={t('enterInspectionRemark')}
                      value={inspectForm.remark}
                      onChange={(e) => setInspectForm({ ...inspectForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsInspectOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button onClick={handleSubmitInspect} disabled={loading}>
                      {loading ? tc('submitting') : t('submitInspection')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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
                    <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">{t('pendingInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.inspecting}</div>
                    <div className="text-sm text-muted-foreground">{t('inspecting')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                    <div className="text-sm text-muted-foreground">{t('inspected')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
                    <div className="text-sm text-muted-foreground">{t('todayInspection')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{stats.week}</div>
                    <div className="text-sm text-muted-foreground">{t('weekInspection')}</div>
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
                    <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">{t('generating')}</span>
                    </div>
                  )}
                </div>

                {/* 流程卡信息 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
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
                    inspectRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.inspectNo}</TableCell>
                        <TableCell>{record.inspectType}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.result === '合格'
                                ? 'bg-green-100 text-green-700'
                                : record.result === '不合格'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                            }
                          >
                            {record.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.inspector}</TableCell>
                        <TableCell>{record.inspectTime}</TableCell>
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {inspectRecords.filter((r) => r.result === tc('qualified')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('qualifiedItems')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {inspectRecords.filter((r) => r.result === tc('unqualified')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('unqualifiedItems')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
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
