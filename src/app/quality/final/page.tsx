'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import QRCode from 'qrcode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
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
const finalInspectItems = [
  { id: 'appearance', name: '外观检验', required: true },
  { id: 'size', name: '尺寸检验', required: true },
  { id: 'color', name: '颜色检验', required: true },
  { id: 'printing', name: '印刷质量', required: true },
  { id: 'packaging', name: '包装检验', required: true },
  { id: 'quantity', name: '数量清点', required: true },
  { id: 'label', name: '标签核对', required: true },
];

// 获取状态标签
const getStatusBadge = (status: number) => {
  const statusMap: Record<number, { label: string; className: string }> = {
    0: { label: '待排产', className: 'bg-gray-100 text-gray-700' },
    1: { label: '已排产', className: 'bg-blue-100 text-blue-700' },
    2: { label: '待终检', className: 'bg-orange-100 text-orange-700' },
    3: { label: '已终检', className: 'bg-green-100 text-green-700' },
  };
  const config = statusMap[status] || { label: '未知', className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 模拟终检数据
const mockFinalInspects: FinalInspect[] = [
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
    lock_status: 0,
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
    packing_type: '纸箱包装',
    slice_per_box: '1000',
    slice_per_bundle: '100',
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
    burdening_status: 3,
    lock_status: 0,
    create_user_name: '李四',
    create_time: '2024-03-19 08:00:00',
    update_time: '2024-03-19 16:00:00',
    customer_name: '广州贸易发展有限公司',
    customer_code: 'CUST20240002',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
    print_type: '胶印',
    finished_size: '80mm x 40mm',
    tolerance: '±0.3mm',
    quality_manager: '质量主管B',
    packing_type: '袋装',
    slice_per_box: '500',
    slice_per_bundle: '50',
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
    burdening_status: 2,
    lock_status: 0,
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
    packing_type: '纸箱包装',
    slice_per_box: '2000',
    slice_per_bundle: '200',
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
    lock_status: 0,
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
    packing_type: '卷装',
    slice_per_box: '800',
    slice_per_bundle: '100',
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
    burdening_status: 2,
    lock_status: 0,
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
    packing_type: '袋装',
    slice_per_box: '600',
    slice_per_bundle: '60',
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
    lock_status: 0,
    create_user_name: '周八',
    create_time: '2024-03-22 08:00:00',
    update_time: '2024-03-22 14:00:00',
    customer_name: '惠州包装材料有限公司',
    customer_code: 'CUST20240006',
    process_flow1: '切料-印刷-模切',
    process_flow2: '检验-包装',
    print_type: '丝网印刷',
    finished_size: '70mm x 35mm',
    tolerance: '±0.3mm',
    quality_manager: '质量主管A',
    packing_type: '纸箱包装',
    slice_per_box: '1200',
    slice_per_bundle: '120',
  },
];

export default function QualityFinalPage() {
  const [finals, setFinals] = useState<FinalInspect[]>([]);
  const [stats, setStats] = useState<FinalStats>({
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const fetchFinals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quality/final');
      const data = await res.json();
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : [];
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
      }
    } catch (error) {
      console.error('获取终检数据失败:', error);
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
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFinals(finals.map(f => 
        f.id === selectedFinal.id 
          ? { ...f, burdening_status: 3 }
          : f
      ));
      
      setIsFinalOpen(false);
      alert('终检提交成功');
    } catch (error) {
      console.error('提交终检失败:', error);
      alert('提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换检验项目
  const toggleInspectItem = (itemId: string) => {
    setFinalForm(prev => ({
      ...prev,
      checkedItems: prev.checkedItems.includes(itemId)
        ? prev.checkedItems.filter(id => id !== itemId)
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
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
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
            <title>终检报告</title>
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
    <MainLayout title="终检管理">
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待终检</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">终检中</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inspecting}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已终检</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日终检</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本周终检</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.week}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">合格率</CardTitle>
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
                  placeholder="搜索流程卡号、工单号、产品..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  终检报告
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  打印
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 终检列表 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">全部 ({finals.length})</TabsTrigger>
            <TabsTrigger value="pending">待终检 ({stats.pending})</TabsTrigger>
            <TabsTrigger value="passed">已终检 ({stats.passed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流程卡号</TableHead>
                      <TableHead>产品信息</TableHead>
                      <TableHead>客户</TableHead>
                      <TableHead>规格要求</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>包装方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFinals.map((final) => (
                      <TableRow key={final.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{final.card_no}</span>
                            <span className="text-xs text-muted-foreground">{final.work_order_no}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{final.product_name}</span>
                            <span className="text-xs text-muted-foreground">{final.material_spec}</span>
                            <span className="text-xs text-muted-foreground">{final.print_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{final.customer_name}</span>
                            <span className="text-xs text-muted-foreground">{final.customer_code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>尺寸: {final.finished_size}</span>
                            <span>公差: {final.tolerance}</span>
                          </div>
                        </TableCell>
                        <TableCell>{final.plan_qty.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{final.packing_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {final.slice_per_box}片/箱
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
                              <Button
                                size="sm"
                                onClick={() => handleStartFinal(final)}
                              >
                                <ClipboardCheck className="h-4 w-4 mr-1" />
                                终检
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
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewQRCode(final)}>
                                  <QrCode className="h-4 w-4 mr-2" />
                                  查看二维码
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  终检记录
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
                    终检详情: {selectedFinal.card_no}
                    {getStatusBadge(selectedFinal.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>查看终检详细信息</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">流程信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">流程卡号:</span>
                        <span>{selectedFinal.card_no}</span>
                        <span className="text-muted-foreground">工单号:</span>
                        <span>{selectedFinal.work_order_no}</span>
                        <span className="text-muted-foreground">主标编号:</span>
                        <span>{selectedFinal.main_label_no}</span>
                        <span className="text-muted-foreground">排产日期:</span>
                        <span>{selectedFinal.work_order_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">产品信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">产品名称:</span>
                        <span>{selectedFinal.product_name}</span>
                        <span className="text-muted-foreground">物料规格:</span>
                        <span>{selectedFinal.material_spec}</span>
                        <span className="text-muted-foreground">印刷方式:</span>
                        <span>{selectedFinal.print_type}</span>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span>{selectedFinal.plan_qty.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">规格与包装</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <span className="text-muted-foreground">成品尺寸:</span>
                        <span>{selectedFinal.finished_size}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">公差要求:</span>
                        <span>{selectedFinal.tolerance}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">包装方式:</span>
                        <span>{selectedFinal.packing_type}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground">装箱规格:</span>
                        <span>{selectedFinal.slice_per_box}片/箱 × {selectedFinal.slice_per_bundle}片/捆</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">工艺流程</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedFinal.process_flow1?.split('-').map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <Badge variant="outline">{step}</Badge>
                          {index < arr.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
                        </div>
                      ))}
                      {selectedFinal.process_flow2?.split('-').map((step, index, arr) => (
                        <div key={`2-${index}`} className="flex items-center">
                          <span className="mx-1 text-muted-foreground">→</span>
                          <Badge variant="outline">{step}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      关闭
                    </Button>
                    {selectedFinal.burdening_status === 2 && (
                      <Button onClick={() => {
                        setIsDetailOpen(false);
                        handleStartFinal(selectedFinal);
                      }}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        开始终检
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
                    终检: {selectedFinal.card_no}
                  </DialogTitle>
                  <DialogDescription>记录终检结果</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">产品:</span>
                        <span className="ml-2 font-medium">{selectedFinal.product_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户:</span>
                        <span className="ml-2">{selectedFinal.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">规格:</span>
                        <span className="ml-2">{selectedFinal.finished_size} ({selectedFinal.tolerance})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span className="ml-2">{selectedFinal.plan_qty.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>终检项目 <span className="text-red-500">*</span></Label>
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
                    <Label>终检结果</Label>
                    <Select
                      value={finalForm.result}
                      onValueChange={(value) => setFinalForm({ ...finalForm, result: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择终检结果" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            合格入库
                          </div>
                        </SelectItem>
                        <SelectItem value="fail">
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            不合格返工
                          </div>
                        </SelectItem>
                        <SelectItem value="concession">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                            让步接收
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>合格数量</Label>
                      <Input
                        type="number"
                        value={finalForm.qualifiedQty}
                        onChange={(e) => setFinalForm({ ...finalForm, qualifiedQty: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>不良数量</Label>
                      <Input
                        type="number"
                        value={finalForm.defectQty}
                        onChange={(e) => setFinalForm({ ...finalForm, defectQty: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {finalForm.defectQty > 0 && (
                    <div className="space-y-3">
                      <Label>不良原因</Label>
                      <Select
                        value={finalForm.defectReason}
                        onValueChange={(value) => setFinalForm({ ...finalForm, defectReason: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择不良原因" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="size">尺寸不良</SelectItem>
                          <SelectItem value="color">颜色不良</SelectItem>
                          <SelectItem value="appearance">外观不良</SelectItem>
                          <SelectItem value="printing">印刷不良</SelectItem>
                          <SelectItem value="packaging">包装不良</SelectItem>
                          <SelectItem value="quantity">数量不符</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>包装方式确认</Label>
                    <Input
                      value={finalForm.packMethod}
                      onChange={(e) => setFinalForm({ ...finalForm, packMethod: e.target.value })}
                      placeholder="确认包装方式"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>终检员</Label>
                    <Input
                      placeholder="输入终检员姓名"
                      value={finalForm.inspector}
                      onChange={(e) => setFinalForm({ ...finalForm, inspector: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>备注</Label>
                    <Textarea
                      placeholder="输入终检备注..."
                      value={finalForm.remark}
                      onChange={(e) => setFinalForm({ ...finalForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsFinalOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSubmitFinal} disabled={loading}>
                      {loading ? '提交中...' : '提交终检'}
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
                终检报告
              </DialogTitle>
              <DialogDescription>查看终检汇总报告</DialogDescription>
            </DialogHeader>

            <div ref={printRef} className="space-y-6 py-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">终检报告</h1>
                <p className="text-muted-foreground mt-2">生成时间: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
              </div>

              <div className="grid grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">待终检</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.inspecting}</div>
                    <div className="text-sm text-muted-foreground">终检中</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                    <div className="text-sm text-muted-foreground">已终检</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
                    <div className="text-sm text-muted-foreground">今日终检</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{stats.week}</div>
                    <div className="text-sm text-muted-foreground">本周终检</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-pink-600">{stats.passRate}%</div>
                    <div className="text-sm text-muted-foreground">合格率</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-4">终检明细</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流程卡号</TableHead>
                      <TableHead>产品名称</TableHead>
                      <TableHead>客户</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFinals.map((final) => (
                      <TableRow key={final.id}>
                        <TableCell>{final.card_no}</TableCell>
                        <TableCell>{final.product_name}</TableCell>
                        <TableCell>{final.customer_name}</TableCell>
                        <TableCell>{final.finished_size}</TableCell>
                        <TableCell>{final.plan_qty.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(final.burdening_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t mt-8">
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">终检员签字</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">质量主管签字</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">审核签字</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                关闭
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                打印报告
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
                流程卡二维码
              </DialogTitle>
              <DialogDescription>扫描二维码查看流程卡信息</DialogDescription>
            </DialogHeader>

            {selectedFinal && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-64 h-64 border rounded-lg p-2"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">生成中...</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">流程卡号:</span>
                    <span className="font-medium">{selectedFinal.card_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">产品名称:</span>
                    <span>{selectedFinal.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">客户:</span>
                    <span>{selectedFinal.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">数量:</span>
                    <span>{selectedFinal.plan_qty.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setIsQRCodeOpen(false)}>
                    关闭
                  </Button>
                  <Button onClick={handleDownloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    下载二维码
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
