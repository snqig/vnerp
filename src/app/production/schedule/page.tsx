'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
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
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Calendar as CalendarIcon,
  Clock,
  Factory,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  QrCode,
  Trash2,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import QRCode from 'qrcode';

// 排程数据类型
interface Schedule {
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
}

// 统计数据类型
interface ScheduleStats {
  total: number;
  pending: number;
  scheduled: number;
  producing: number;
  completed: number;
  planQty: number;
  dailyStats: Array<{
    date: string;
    count: number;
    planQty: number;
  }>;
}

// 获取状态标签
const getStatusBadge = (status: number) => {
  const statusMap: Record<number, { label: string; className: string }> = {
    0: { label: '待排产', className: 'bg-gray-100 text-gray-700' },
    1: { label: '已排产', className: 'bg-blue-100 text-blue-700' },
    2: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
    3: { label: '已完成', className: 'bg-green-100 text-green-700' },
  };
  const config = statusMap[status] || { label: '未知', className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 模拟排程数据
const mockSchedules: Schedule[] = [
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
    lock_status: 0,
    create_user_name: '李四',
    create_time: '2024-03-19 08:00:00',
    update_time: '2024-03-19 10:00:00',
    customer_name: '广州贸易发展有限公司',
    customer_code: 'CUST20240002',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
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
    lock_status: 0,
    create_user_name: '王五',
    create_time: '2024-03-20 08:00:00',
    update_time: '2024-03-20 08:00:00',
    customer_name: '东莞制造有限公司',
    customer_code: 'CUST20240003',
    process_flow1: '切料-印刷-模切',
    process_flow2: '检验-包装',
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
    burdening_status: 0,
    lock_status: 0,
    create_user_name: '孙七',
    create_time: '2024-03-21 08:00:00',
    update_time: '2024-03-21 08:00:00',
    customer_name: '中山电子科技有限公司',
    customer_code: 'CUST20240005',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
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
    burdening_status: 1,
    lock_status: 0,
    create_user_name: '周八',
    create_time: '2024-03-22 08:00:00',
    update_time: '2024-03-22 08:00:00',
    customer_name: '惠州包装材料有限公司',
    customer_code: 'CUST20240006',
    process_flow1: '切料-印刷-模切',
    process_flow2: '检验-包装',
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
    burdening_status: 0,
    lock_status: 0,
    create_user_name: '吴九',
    create_time: '2024-03-23 08:00:00',
    update_time: '2024-03-23 08:00:00',
    customer_name: '珠海进出口贸易有限公司',
    customer_code: 'CUST20240007',
    process_flow1: '切料-复合-印刷-烘干',
    process_flow2: '模切-检验-包装',
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
    lock_status: 0,
    create_user_name: '郑十',
    create_time: '2024-03-24 08:00:00',
    update_time: '2024-03-24 08:00:00',
    customer_name: '江门印刷包装有限公司',
    customer_code: 'CUST20240008',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
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
    burdening_status: 0,
    lock_status: 0,
    create_user_name: '钱十一',
    create_time: '2024-03-25 08:00:00',
    update_time: '2024-03-25 08:00:00',
    customer_name: '肇庆新材料科技有限公司',
    customer_code: 'CUST20240009',
    process_flow1: '切料-磨切-印刷',
    process_flow2: '模切-检验-包装',
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
    burdening_status: 1,
    lock_status: 0,
    create_user_name: '冯十二',
    create_time: '2024-03-26 08:00:00',
    update_time: '2024-03-26 08:00:00',
    customer_name: '汕头塑料制品有限公司',
    customer_code: 'CUST20240010',
    process_flow1: '切料-磨切-印刷-烘干',
    process_flow2: '模切-检验-包装',
  },
];

export default function ProductionSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    total: 0,
    pending: 0,
    scheduled: 0,
    producing: 0,
    completed: 0,
    planQty: 0,
    dailyStats: [],
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<Date>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/schedule');
      const data = await res.json();
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : [];
        setSchedules(list);
        setStats({
          total: list.length,
          pending: list.filter((s: Schedule) => s.burdening_status === 0).length,
          scheduled: list.filter((s: Schedule) => s.burdening_status === 1).length,
          producing: list.filter((s: Schedule) => s.burdening_status === 2).length,
          completed: list.filter((s: Schedule) => s.burdening_status === 3).length,
          planQty: list.reduce((sum: number, s: Schedule) => sum + (parseFloat(String(s.plan_qty)) || 0), 0),
          dailyStats: [],
        });
      }
    } catch (error) {
      console.error('获取排程数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    product_name: '',
    material_spec: '',
    plan_qty: 0,
    work_order_date: '',
    main_label_no: '',
  });

  // 筛选排程
  const filteredSchedules = schedules.filter((schedule) => {
    if (activeTab !== 'all') {
      const statusMap: Record<string, number> = {
        pending: 0,
        scheduled: 1,
        producing: 2,
        completed: 3,
      };
      if (schedule.burdening_status !== statusMap[activeTab]) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        schedule.card_no.toLowerCase().includes(query) ||
        schedule.work_order_no.toLowerCase().includes(query) ||
        schedule.product_name.toLowerCase().includes(query) ||
        schedule.customer_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });
// 查看详情
  const handleViewDetail = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setEditForm({
      product_name: schedule.product_name,
      material_spec: schedule.material_spec,
      plan_qty: schedule.plan_qty,
      work_order_date: schedule.work_order_date,
      main_label_no: schedule.main_label_no,
    });
    setIsEditOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedSchedule) return;
    setLoading(true);
    try {
      const response = await fetch('/api/production/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSchedule.id,
          product_name: editForm.product_name,
          material_spec: editForm.material_spec,
          plan_qty: editForm.plan_qty,
          work_order_date: editForm.work_order_date,
          main_label_no: editForm.main_label_no,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // 更新本地数据
        setSchedules(schedules.map(s => 
          s.id === selectedSchedule.id 
            ? { ...s, ...editForm }
            : s
        ));
        setIsEditOpen(false);
        alert('排程更新成功');
      } else {
        alert(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新排程失败:', error);
      alert('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 确认排产
  const handleConfirmSchedule = async (schedule: Schedule) => {
    setLoading(true);
    try {
      const response = await fetch('/api/production/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedule.id,
          burdening_status: 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(schedules.map(s => 
          s.id === schedule.id 
            ? { ...s, burdening_status: 1 }
            : s
        ));
        alert('排产确认成功');
      } else {
        alert(result.message || '确认失败');
      }
    } catch (error) {
      console.error('确认排产失败:', error);
      alert('确认失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始生产
  const handleStartProduction = async (schedule: Schedule) => {
    setLoading(true);
    try {
      const response = await fetch('/api/production/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedule.id,
          burdening_status: 2,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(schedules.map(s => 
          s.id === schedule.id 
            ? { ...s, burdening_status: 2 }
            : s
        ));
        alert('生产开始成功');
      } else {
        alert(result.message || '开始失败');
      }
    } catch (error) {
      console.error('开始生产失败:', error);
      alert('开始失败');
    } finally {
      setLoading(false);
    }
  };

  // 完成排程
  const handleCompleteSchedule = async (schedule: Schedule) => {
    setLoading(true);
    try {
      const response = await fetch('/api/production/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedule.id,
          burdening_status: 3,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(schedules.map(s => 
          s.id === schedule.id 
            ? { ...s, burdening_status: 3 }
            : s
        ));
        alert('排程完成成功');
      } else {
        alert(result.message || '完成失败');
      }
    } catch (error) {
      console.error('完成排程失败:', error);
      alert('完成失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开删除确认
  const handleDeleteClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!selectedSchedule) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/production/schedule?id=${selectedSchedule.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setSchedules(schedules.filter(s => s.id !== selectedSchedule.id));
        setIsDeleteOpen(false);
        alert('排程删除成功');
      } else {
        alert(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除排程失败:', error);
      alert('删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 查看二维码
  const handleViewQrCode = async (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    try {
      const url = await QRCode.toDataURL(schedule.qr_code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
      setIsQrOpen(true);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  // 下载二维码
  const handleDownloadQrCode = () => {
    if (qrCodeUrl && selectedSchedule) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR_${selectedSchedule.card_no}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 打印二维码
  const handlePrintQrCode = () => {
    if (qrCodeUrl && selectedSchedule) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>打印二维码 - ${selectedSchedule.card_no}</title>
              <style>
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0;
                  font-family: Arial, sans-serif;
                }
                .container {
                  text-align: center;
                }
                .qr-code {
                  width: 300px;
                  height: 300px;
                }
                .info {
                  margin-top: 20px;
                  font-size: 14px;
                }
                .card-no {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 10px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <img src="${qrCodeUrl}" class="qr-code" />
                <div class="info">
                  <div class="card-no">${selectedSchedule.card_no}</div>
                  <div>产品: ${selectedSchedule.product_name}</div>
                  <div>客户: ${selectedSchedule.customer_name}</div>
                  <div>数量: ${selectedSchedule.plan_qty.toLocaleString()}</div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // 获取未来7天的日期
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // 获取某天的排程
  const getSchedulesByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter((s) => s.work_order_date === dateStr);
  };

  return (
    <MainLayout title="生产排程">
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总排程数</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待排产</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已排产</CardTitle>
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">生产中</CardTitle>
              <Play className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索排程号、工单号、产品..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'yyyy-MM-dd') : '选择日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  列表视图
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  日历视图
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  筛选
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新建排程
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl" resizable>
                    <DialogHeader>
                      <DialogTitle>新建生产排程</DialogTitle>
                      <DialogDescription>创建新的生产排程卡片</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>工单号</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择工单" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WO001">WO202403001 - 深圳科技</SelectItem>
                              <SelectItem value="WO002">WO202403002 - 广州贸易</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>产品</Label>
                          <Input disabled value="透明包装膜A款" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>计划数量</Label>
                          <Input type="number" placeholder="生产数量" />
                        </div>
                        <div className="space-y-2">
                          <Label>主标编号</Label>
                          <Input placeholder="输入主标编号" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>物料规格</Label>
                        <Input placeholder="输入物料规格" />
                      </div>
                      <div className="space-y-2">
                        <Label>排产日期</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={() => setIsCreateOpen(false)}>创建排程</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 列表视图 */}
        {viewMode === 'list' && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">全部 ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">待排产 ({stats.pending})</TabsTrigger>
              <TabsTrigger value="scheduled">已排产 ({stats.scheduled})</TabsTrigger>
              <TabsTrigger value="producing">生产中 ({stats.producing})</TabsTrigger>
              <TabsTrigger value="completed">已完成 ({stats.completed})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>排程号</TableHead>
                        <TableHead>工单号</TableHead>
                        <TableHead>产品信息</TableHead>
                        <TableHead>客户</TableHead>
                        <TableHead>计划数量</TableHead>
                        <TableHead>排产日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{schedule.card_no}</span>
                              <span className="text-xs text-muted-foreground">{schedule.qr_code}</span>
                            </div>
                          </TableCell>
                          <TableCell>{schedule.work_order_no}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{schedule.product_name}</span>
                              <span className="text-xs text-muted-foreground">{schedule.material_spec}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{schedule.customer_name}</span>
                              <span className="text-xs text-muted-foreground">{schedule.customer_code}</span>
                            </div>
                          </TableCell>
                          <TableCell>{schedule.plan_qty.toLocaleString()}</TableCell>
                          <TableCell>{schedule.work_order_date}</TableCell>
                          <TableCell>{getStatusBadge(schedule.burdening_status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(schedule)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetail(schedule)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    查看详情
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewQrCode(schedule)}>
                                    <QrCode className="h-4 w-4 mr-2" />
                                    查看二维码
                                  </DropdownMenuItem>
                                  {schedule.burdening_status === 0 && (
                                    <DropdownMenuItem onClick={() => handleConfirmSchedule(schedule)}>
                                      <CalendarIcon className="h-4 w-4 mr-2" />
                                      确认排产
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.burdening_status === 1 && (
                                    <DropdownMenuItem onClick={() => handleStartProduction(schedule)}>
                                      <Play className="h-4 w-4 mr-2" />
                                      开始生产
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.burdening_status === 2 && (
                                    <DropdownMenuItem onClick={() => handleCompleteSchedule(schedule)}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      完成排程
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    className="text-red-600" 
                                    onClick={() => handleDeleteClick(schedule)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
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
        )}

        {/* 日历视图 */}
        {viewMode === 'calendar' && (
          <Card>
            <CardHeader>
              <CardTitle>未来7天排程</CardTitle>
              <CardDescription>按日期查看生产排程安排</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {getNext7Days().map((day, index) => {
                  const daySchedules = getSchedulesByDate(day);
                  return (
                    <div key={index} className="border rounded-lg p-3 min-h-[200px]">
                      <div className="text-center border-b pb-2 mb-2">
                        <div className="text-sm font-medium">{format(day, 'MM-dd')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(day, 'EEE', { locale: zhCN })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {daySchedules.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            无排程
                          </div>
                        ) : (
                          daySchedules.map((s) => (
                            <div
                              key={s.id}
                              className="text-xs p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => handleViewDetail(s)}
                            >
                              <div className="font-medium truncate">{s.product_name}</div>
                              <div className="text-muted-foreground">{s.plan_qty.toLocaleString()}</div>
                              <div className="mt-1">{getStatusBadge(s.burdening_status)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 排程详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    排程详情: {selectedSchedule.card_no}
                    {getStatusBadge(selectedSchedule.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>查看生产排程详细信息</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">排程信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">排程号:</span>
                        <span>{selectedSchedule.card_no}</span>
                        <span className="text-muted-foreground">二维码:</span>
                        <span className="text-xs">{selectedSchedule.qr_code}</span>
                        <span className="text-muted-foreground">工单号:</span>
                        <span>{selectedSchedule.work_order_no}</span>
                        <span className="text-muted-foreground">主标编号:</span>
                        <span>{selectedSchedule.main_label_no}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">产品信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">产品名称:</span>
                        <span>{selectedSchedule.product_name}</span>
                        <span className="text-muted-foreground">产品编码:</span>
                        <span>{selectedSchedule.product_code}</span>
                        <span className="text-muted-foreground">物料规格:</span>
                        <span>{selectedSchedule.material_spec}</span>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span>{selectedSchedule.plan_qty.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 客户信息 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">客户信息</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <span className="text-muted-foreground">客户名称:</span>
                      <span>{selectedSchedule.customer_name}</span>
                      <span className="text-muted-foreground">客户编码:</span>
                      <span>{selectedSchedule.customer_code}</span>
                    </div>
                  </div>

                  {/* 工艺流程 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">工艺流程</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedSchedule.process_flow1?.split('-').map((process, index, arr) => (
                        <div key={index} className="flex items-center">
                          <Badge variant="outline">{process}</Badge>
                          {index < arr.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
                        </div>
                      ))}
                      {selectedSchedule.process_flow2?.split('-').map((process, index, arr) => (
                        <div key={`2-${index}`} className="flex items-center">
                          <span className="mx-1 text-muted-foreground">→</span>
                          <Badge variant="outline">{process}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">时间信息</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">排产日期:</span>
                      <span>{selectedSchedule.work_order_date}</span>
                      <span className="text-muted-foreground">创建时间:</span>
                      <span>{selectedSchedule.create_time}</span>
                      <span className="text-muted-foreground">更新时间:</span>
                      <span>{selectedSchedule.update_time}</span>
                      <span className="text-muted-foreground">创建人:</span>
                      <span>{selectedSchedule.create_user_name}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      关闭
                    </Button>
                    {selectedSchedule.burdening_status === 0 && (
                      <Button>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        确认排产
                      </Button>
                    )}
                    {selectedSchedule.burdening_status === 1 && (
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        开始生产
                      </Button>
                    )}
                    {selectedSchedule.burdening_status === 2 && (
                      <Button>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        完成排程
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 二维码查看对话框 */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="max-w-md" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    二维码: {selectedSchedule.card_no}
                  </DialogTitle>
                  <DialogDescription>扫描二维码查看生产排程详情</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-6">
                  {/* 二维码图片 */}
                  {qrCodeUrl ? (
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <span className="text-muted-foreground">生成中...</span>
                    </div>
                  )}

                  {/* 排程信息 */}
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">排程号:</span>
                      <span className="font-medium">{selectedSchedule.card_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">产品:</span>
                      <span className="font-medium">{selectedSchedule.product_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">客户:</span>
                      <span className="font-medium">{selectedSchedule.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">数量:</span>
                      <span className="font-medium">{selectedSchedule.plan_qty.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">二维码内容:</span>
                      <span className="font-mono text-xs text-muted-foreground">{selectedSchedule.qr_code}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDownloadQrCode}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handlePrintQrCode}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      打印
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setIsQrOpen(false)}
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    编辑排程: {selectedSchedule.card_no}
                  </DialogTitle>
                  <DialogDescription>修改生产排程信息</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>产品名称</Label>
                      <Input
                        value={editForm.product_name}
                        onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                        placeholder="输入产品名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>物料规格</Label>
                      <Input
                        value={editForm.material_spec}
                        onChange={(e) => setEditForm({ ...editForm, material_spec: e.target.value })}
                        placeholder="输入物料规格"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>计划数量</Label>
                      <Input
                        type="number"
                        value={editForm.plan_qty}
                        onChange={(e) => setEditForm({ ...editForm, plan_qty: parseInt(e.target.value) || 0 })}
                        placeholder="输入计划数量"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>排产日期</Label>
                      <Input
                        type="date"
                        value={editForm.work_order_date}
                        onChange={(e) => setEditForm({ ...editForm, work_order_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>主标编号</Label>
                    <Input
                      value={editForm.main_label_no}
                      onChange={(e) => setEditForm({ ...editForm, main_label_no: e.target.value })}
                      placeholder="输入主标编号"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={loading}>
                    {loading ? '保存中...' : '保存'}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    确认删除
                  </DialogTitle>
                  <DialogDescription>
                    确定要删除排程 <strong>{selectedSchedule.card_no}</strong> 吗？此操作不可恢复。
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                    <p className="font-medium text-red-800">排程信息:</p>
                    <ul className="mt-2 space-y-1 text-red-700">
                      <li>产品: {selectedSchedule.product_name}</li>
                      <li>客户: {selectedSchedule.customer_name}</li>
                      <li>数量: {selectedSchedule.plan_qty.toLocaleString()}</li>
                      <li>状态: {getStatusBadge(selectedSchedule.burdening_status)}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={loading}
                  >
                    {loading ? '删除中...' : '确认删除'}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
