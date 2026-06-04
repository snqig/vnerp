'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  GanttChart,
  Zap,
  BarChart3,
  TrendingUp,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// 数据类型
// ============================================================

interface Schedule {
  id: number;
  schedule_no: string;
  order_id: number | null;
  order_no: string | null;
  product_id: number | null;
  product_code: string | null;
  product_name: string;
  workshop: string;
  planned_qty: number;
  completed_qty: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  priority: number;
  status: number;
  scheduler: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
}

interface ScheduleStats {
  total: number;
  pending: number;
  scheduled: number;
  producing: number;
  completed: number;
  planQty: number;
  capacityRate: number;
  conflictCount: number;
}

interface CapacityAnalysis {
  workshop: string;
  equipmentCount: number;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  utilizationRate: number;
}

interface AutoScheduleResult {
  work_order_id: number;
  work_order_no: string;
  color_sequences: Array<{
    seq_no: number;
    color_name: string;
    equipment_id: number;
    equipment_name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    status: string;
  }>;
  overall_start: string;
  overall_end: string;
  conflicts: Array<{
    seq_no: number;
    reason: string;
  }>;
}

// ============================================================
// 辅助函数
// ============================================================

const getWorkshopBadge = (workshop: string) => {
  const workshopMap: Record<string, { label: string; className: string }> = {
    die_cut: { label: t('workshopDieCutShort'), className: 'bg-purple-100 text-purple-700' },
    trademark: { label: t('workshopTrademarkShort'), className: 'bg-indigo-100 text-indigo-700' },
    printing: { label: t('workshopPrintingShort'), className: 'bg-pink-100 text-pink-700' },
    packaging: { label: t('workshopPackagingShort'), className: 'bg-teal-100 text-teal-700' },
  };
  const config = workshopMap[workshop] || {
    label: workshop,
    className: 'bg-gray-100 text-gray-700',
  };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// ============================================================
// 主组件
// ============================================================

export default function ProductionSchedulePage() {
  // 翻译钩子
  const t = useTranslations('Production');
  const tc = useTranslations('Common');

  const getStatusBadge = (status: number) => {
    const statusMap: Record<number, { label: string; className: string }> = {
      1: {
        label: t('statusPending'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      },
      2: {
        label: t('statusScheduled'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      3: {
        label: t('statusProducing'),
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      },
      4: {
        label: t('statusCompleted'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      5: {
        label: t('statusCancelled'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      },
    };
    const config = statusMap[status] || { label: tc('unknown'), className: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: number) => {
    const priorityMap: Record<number, { label: string; className: string }> = {
      1: { label: tc('critical'), className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      2: {
        label: tc('normal'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      3: { label: tc('low'), className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
    };
    const config = priorityMap[priority] || { label: tc('normal'), className: 'bg-blue-100 text-blue-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    total: 0,
    pending: 0,
    scheduled: 0,
    producing: 0,
    completed: 0,
    planQty: 0,
    capacityRate: 0,
    conflictCount: 0,
  });
  const [capacityData, setCapacityData] = useState<CapacityAnalysis[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isCapacityOpen, setIsCapacityOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<Date>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'gantt'>('list');
  const [loading, setLoading] = useState(false);
  const [autoScheduleLoading, setAutoScheduleLoading] = useState(false);
  const [autoScheduleResults, setAutoScheduleResults] = useState<AutoScheduleResult[]>([]);
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<number[]>([]);
  const [workOrders, setWorkOrders] = useState<
    Array<{
      id: number;
      work_order_no: string;
      product_name: string;
      plan_qty: number;
      status: string;
    }>
  >([]);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    product_name: '',
    workshop: '',
    planned_qty: 0,
    planned_start: '',
    planned_end: '',
    priority: 2,
    scheduler: '',
    remark: '',
  });

  // 获取排程数据
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/production/schedule?pageSize=100');
      const data = await res.json();
      if (data.success) {
        const list = data.data?.list || [];
        setSchedules(list);

        // 计算冲突数
        let conflicts = 0;
        const workshopGroups: Record<string, Schedule[]> = {};
        list.forEach((s: Schedule) => {
          const key = s.workshop || 'other';
          if (!workshopGroups[key]) workshopGroups[key] = [];
          workshopGroups[key].push(s);
        });

        Object.values(workshopGroups).forEach((items) => {
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const a = items[i];
              const b = items[j];
              if (a.planned_start && a.planned_end && b.planned_start && b.planned_end) {
                if (
                  new Date(a.planned_start) < new Date(b.planned_end) &&
                  new Date(b.planned_start) < new Date(a.planned_end)
                ) {
                  conflicts++;
                }
              }
            }
          }
        });

        setStats({
          total: list.length,
          pending: list.filter((s: Schedule) => s.status === 1).length,
          scheduled: list.filter((s: Schedule) => s.status === 2).length,
          producing: list.filter((s: Schedule) => s.status === 3).length,
          completed: list.filter((s: Schedule) => s.status === 4).length,
          planQty: list.reduce((sum: number, s: Schedule) => sum + (Number(s.planned_qty) || 0), 0),
          capacityRate: Math.round(
            (list.filter((s: Schedule) => s.status === 3).length / Math.max(list.length, 1)) * 100
          ),
          conflictCount: conflicts,
        });
      }
    } catch (error) {
      console.error('获取排程数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取产能数据
  const fetchCapacityData = async () => {
    try {
      const res = await authFetch('/api/production/schedule/capacity');
      const data = await res.json();
      if (data.success && data.data?.workshopCapacity) {
        setCapacityData(
          data.data.workshopCapacity.map((item: any) => ({
            workshop: item.workshop,
            equipmentCount: item.equipmentCount,
            totalCapacity: item.totalCapacity,
            usedCapacity: item.usedCapacity,
            availableCapacity: item.availableCapacity,
            utilizationRate: item.utilizationRate,
          }))
        );
      }
    } catch (error) {
      console.error('获取产能数据失败:', error);
    }
  };

  // 获取待排产工单
  const fetchWorkOrders = async () => {
    try {
      const res = await authFetch('/api/production/orders?status=pending&pageSize=50');
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.data?.list || []);
      }
    } catch (error) {
      console.error('获取工单失败:', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchCapacityData();
    fetchWorkOrders();
  }, []);

  // 筛选排程
  const filteredSchedules = schedules.filter((schedule) => {
    if (activeTab !== 'all') {
      const statusMap: Record<string, number> = {
        pending: 1,
        scheduled: 2,
        producing: 3,
        completed: 4,
      };
      if (schedule.status !== statusMap[activeTab]) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        schedule.schedule_no.toLowerCase().includes(query) ||
        (schedule.order_no && schedule.order_no.toLowerCase().includes(query)) ||
        schedule.product_name.toLowerCase().includes(query) ||
        (schedule.scheduler && schedule.scheduler.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // ============================================================
  // 甘特图配置
  // ============================================================

  const GANTT_DAY_WIDTH = 60;
  const GANTT_LEFT_COL_WIDTH = 250;
  const GANTT_ROW_HEIGHT = 44;

  const ganttDateRange = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    const end = new Date(now);
    end.setDate(now.getDate() + 14);
    return { startDate: start, endDate: end };
  }, []);

  const ganttTotalDays = Math.ceil(
    (ganttDateRange.endDate.getTime() - ganttDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const ganttTimelineWidth = ganttTotalDays * GANTT_DAY_WIDTH;

  const ganttDays = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < ganttTotalDays; i++) {
      const d = new Date(ganttDateRange.startDate);
      d.setDate(ganttDateRange.startDate.getDate() + i);
      result.push(d);
    }
    return result;
  }, [ganttDateRange, ganttTotalDays]);

  const ganttTodayOffset = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(
      0,
      (now.getTime() - ganttDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [ganttDateRange]);

  const ganttGrouped = useMemo(() => {
    const groups: Record<string, Schedule[]> = {};
    filteredSchedules.forEach((s) => {
      const key = s.workshop || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredSchedules]);

  const ganttWorkshopLabels: Record<string, string> = {
    die_cut: t('workshopDieCut'),
    trademark: t('workshopTrademark'),
    printing: t('workshopPrinting'),
    packaging: t('workshopPackaging'),
  };

  const ganttStatusBarColors: Record<number, string> = {
    1: 'bg-blue-500/80',
    2: 'bg-amber-500/80',
    3: 'bg-green-500/80',
    4: 'bg-gray-400/80',
    5: 'bg-red-500/80',
  };

  const getGanttBarStyle = (schedule: Schedule) => {
    if (!schedule.planned_start || !schedule.planned_end) return null;
    const start = new Date(schedule.planned_start);
    const end = new Date(schedule.planned_end);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const startOffset =
      (start.getTime() - ganttDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1);
    return {
      left: `${Math.max(0, startOffset) * GANTT_DAY_WIDTH}px`,
      width: `${duration * GANTT_DAY_WIDTH}px`,
    };
  };

  const getGanttProgress = (schedule: Schedule) => {
    if (!schedule.planned_qty || schedule.planned_qty === 0) return 0;
    return Math.min(1, (schedule.completed_qty || 0) / schedule.planned_qty);
  };

  const detectGanttConflicts = (items: Schedule[]) => {
    const conflicts = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i],
          b = items[j];
        if (
          a.planned_start &&
          a.planned_end &&
          b.planned_start &&
          b.planned_end &&
          new Date(a.planned_start) < new Date(b.planned_end) &&
          new Date(b.planned_start) < new Date(a.planned_end)
        ) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
    return conflicts;
  };

  const isGanttWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // ============================================================
  // 操作处理函数
  // ============================================================

  const handleViewDetail = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setEditForm({
      product_name: schedule.product_name,
      workshop: schedule.workshop,
      planned_qty: schedule.planned_qty,
      planned_start: schedule.planned_start || '',
      planned_end: schedule.planned_end || '',
      priority: schedule.priority,
      scheduler: schedule.scheduler || '',
      remark: schedule.remark || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSchedule) return;
    setLoading(true);
    try {
      const response = await authFetch('/api/production/schedule', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedSchedule.id, ...editForm }),
      });
      const result = await response.json();
        if (result.success) {
          fetchSchedules();
          setIsEditOpen(false);
        } else alert(result.message || tc('updateFailed'));
      } catch (error) {
        console.error('更新排程失败:', error);
        alert(tc('updateFailed'));
      }
  };

  const handleStatusChange = async (schedule: Schedule, newStatus: number) => {
    setLoading(true);
    try {
      const response = await authFetch('/api/production/schedule', {
        method: 'PUT',
        body: JSON.stringify({ id: schedule.id, status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        fetchSchedules();
      } else alert(result.message || tc('error'));
    } catch (error) {
      console.error('状态更新失败:', error);
      alert(tc('error'));
    } finally {
      setLoading(false);
    }
  };

  // 自动排程
  const handleAutoSchedule = async () => {
    if (selectedWorkOrders.length === 0) {
      alert(t('selectWorkOrdersFirst'));
      return;
    }
    setAutoScheduleLoading(true);
    try {
      const response = await authFetch('/api/production/schedule/auto', {
        method: 'POST',
        body: JSON.stringify({
          work_order_ids: selectedWorkOrders,
          start_date: new Date().toISOString(),
          respect_deadline: true,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setAutoScheduleResults(result.data?.results || []);
        fetchSchedules();
        alert(
          `${t('autoScheduleComplete')} ${t('successCount')}: ${result.data?.summary?.scheduled || 0}, ${t('conflictCount')}: ${result.data?.summary?.with_conflicts || 0}`
        );
      } else {
        alert(result.message || t('autoScheduleFailed'));
      }
    } catch (error) {
      console.error('自动排程失败:', error);
        alert(t('autoScheduleFailed'));
    } finally {
      setAutoScheduleLoading(false);
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

  const getSchedulesByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter((s) => s.planned_start && s.planned_start.startsWith(dateStr));
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <MainLayout title={t('schedule')}>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalSchedules')}</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusPending')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusProducing')}</CardTitle>
              <Play className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
              <p className="text-xs text-muted-foreground">{t('capacityRate', { rate: stats.capacityRate })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusCompleted')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('conflictDetection')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${stats.conflictCount > 0 ? 'text-red-600' : ''}`}
              >
                {stats.conflictCount}
              </div>
              {stats.conflictCount > 0 && <p className="text-xs text-red-500">{t('timeConflictFound')}</p>}
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
                    placeholder={t('searchSchedulePlaceholder')}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[240px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'yyyy-MM-dd') : t('selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  {t('listView')}
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  {t('calendarView')}
                </Button>
                <Button
                  variant={viewMode === 'gantt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('gantt')}
                >
                  <GanttChart className="h-4 w-4 mr-1" />
                  {t('ganttChart')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsCapacityOpen(true)}>
                  <BarChart3 className="h-4 w-4 mr-1" />
                  {t('capacityAnalysis')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAutoScheduleOpen(true)}>
                  <Zap className="h-4 w-4 mr-1" />
                  {t('autoSchedule')}
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('newSchedule')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('newScheduleTitle')}</DialogTitle>
                      <DialogDescription>{t('newScheduleDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('productName')}</Label>
                          <Input placeholder={t('inputProductName')} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('workshopLabel')}</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectWorkshop')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="die_cut">{t('workshopDieCut')}</SelectItem>
                              <SelectItem value="trademark">{t('workshopTrademark')}</SelectItem>
                              <SelectItem value="printing">{t('workshopPrinting')}</SelectItem>
                              <SelectItem value="packaging">{t('workshopPackaging')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('plannedQuantity')}</Label>
                          <Input type="number" placeholder={t('productionQuantity')} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('priorityLabel')}</Label>
                          <Select defaultValue="2">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{t('urgent')}</SelectItem>
                              <SelectItem value="2">{t('normal')}</SelectItem>
                              <SelectItem value="3">{t('low')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('plannedStart')}</Label>
                          <Input type="datetime-local" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('plannedEnd')}</Label>
                          <Input type="datetime-local" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('remarkLabel')}</Label>
                        <Input placeholder={t('inputRemark')} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        {tc('cancel')}
                      </Button>
                      <Button onClick={() => setIsCreateOpen(false)}>{t('createSchedule')}</Button>
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
              <TabsTrigger value="all">{tc('all')} ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">{t('statusPending')} ({stats.pending})</TabsTrigger>
              <TabsTrigger value="scheduled">{t('statusScheduled')} ({stats.scheduled})</TabsTrigger>
              <TabsTrigger value="producing">{t('statusProducing')} ({stats.producing})</TabsTrigger>
              <TabsTrigger value="completed">{t('statusCompleted')} ({stats.completed})</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('scheduleNo')}</TableHead>
                        <TableHead>{t('orderNo')}</TableHead>
                        <TableHead>{t('productName')}</TableHead>
                        <TableHead>{t('workshopLabel')}</TableHead>
                        <TableHead>{t('plannedQuantity')}</TableHead>
                        <TableHead>{t('plannedStart')}</TableHead>
                        <TableHead>{t('priorityLabel')}</TableHead>
                        <TableHead>{tc('status')}</TableHead>
                        <TableHead>{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.schedule_no}</TableCell>
                          <TableCell>{schedule.order_no || '-'}</TableCell>
                          <TableCell>{schedule.product_name}</TableCell>
                          <TableCell>{getWorkshopBadge(schedule.workshop)}</TableCell>
                          <TableCell>{Number(schedule.planned_qty).toLocaleString()}</TableCell>
                          <TableCell>{formatDate(schedule.planned_start) || '-'}</TableCell>
                          <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                          <TableCell>{getStatusBadge(schedule.status)}</TableCell>
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
                                    {tc('detail')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {tc('edit')}
                                  </DropdownMenuItem>
                                  {schedule.status === 1 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(schedule, 2)}
                                    >
                                      <CalendarIcon className="h-4 w-4 mr-2" />
                                      {t('confirmSchedule')}
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.status === 2 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(schedule, 3)}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      {t('startProduction')}
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.status === 3 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(schedule, 4)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('completeSchedule')}
                                    </DropdownMenuItem>
                                  )}
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
              <CardTitle>{t('next7DaysSchedule')}</CardTitle>
              <CardDescription>{t('calendarViewDesc')}</CardDescription>
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
                            {t('noSchedule')}
                          </div>
                        ) : (
                          daySchedules.map((s) => (
                            <div
                              key={s.id}
                              className="text-xs p-2 rounded bg-muted cursor-pointer hover:bg-muted/80"
                              onClick={() => handleViewDetail(s)}
                            >
                              <div className="font-medium truncate">{s.product_name}</div>
                              <div className="text-muted-foreground">
                                {Number(s.planned_qty).toLocaleString()}
                              </div>
                              <div className="mt-1">{getStatusBadge(s.status)}</div>
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

        {/* 甘特图视图 */}
        {viewMode === 'gantt' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GanttChart className="h-5 w-5" />
                {t('ganttScheduleView')}
              </CardTitle>
              <CardDescription>{t('ganttDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex">
                <div
                  className="flex-shrink-0 border-r border-border z-10 bg-background"
                  style={{ width: GANTT_LEFT_COL_WIDTH }}
                >
                  <div
                    className="flex items-center px-3 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50"
                    style={{ height: GANTT_ROW_HEIGHT }}
                  >
                    {t('scheduleInfo')}
                  </div>
                  {Object.entries(ganttGrouped).map(([workshop, items]) => (
                    <div key={workshop}>
                      <div
                        className="flex items-center gap-2 px-3 text-xs font-semibold border-b border-border bg-muted/30"
                        style={{ height: GANTT_ROW_HEIGHT }}
                      >
                        <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                        {ganttWorkshopLabels[workshop] || workshop}
                        <span className="text-muted-foreground">({items.length})</span>
                      </div>
                      {items.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center gap-2 px-3 border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                          style={{ height: GANTT_ROW_HEIGHT }}
                          onClick={() => handleViewDetail(schedule)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {schedule.product_name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {getStatusBadge(schedule.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <ScrollArea className="flex-1">
                  <div style={{ width: ganttTimelineWidth, minWidth: '100%' }}>
                    <div
                      className="flex border-b border-border bg-muted/50"
                      style={{ height: GANTT_ROW_HEIGHT }}
                    >
                      {ganttDays.map((day, i) => (
                        <div
                          key={i}
                          className={`flex flex-col items-center justify-center text-xs border-r border-border/50 ${
                            isGanttWeekend(day) ? 'bg-muted/30' : ''
                          } ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/10' : ''}`}
                          style={{ width: GANTT_DAY_WIDTH }}
                        >
                          <span className="font-medium">{format(day, 'MM/dd')}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(day, 'EEE', { locale: zhCN })}
                          </span>
                        </div>
                      ))}
                    </div>
                    {Object.entries(ganttGrouped).map(([workshop, items]) => {
                      const conflicts = detectGanttConflicts(items);
                      return (
                        <div key={workshop}>
                          <div
                            className="relative border-b border-border bg-muted/10"
                            style={{ height: GANTT_ROW_HEIGHT }}
                          >
                            {ganttDays.map((day, i) => (
                              <div
                                key={i}
                                className={`absolute top-0 bottom-0 border-r border-border/30 ${isGanttWeekend(day) ? 'bg-muted/20' : ''}`}
                                style={{ left: i * GANTT_DAY_WIDTH, width: GANTT_DAY_WIDTH }}
                              />
                            ))}
                          </div>
                          {items.map((schedule, idx) => {
                            const barStyle = getGanttBarStyle(schedule);
                            const progress = getGanttProgress(schedule);
                            const hasConflict = conflicts.has(schedule.id);
                            return (
                              <div
                                key={schedule.id}
                                className="relative border-b border-border"
                                style={{ height: GANTT_ROW_HEIGHT }}
                              >
                                {ganttDays.map((day, i) => (
                                  <div
                                    key={i}
                                    className={`absolute top-0 bottom-0 border-r border-border/20 ${isGanttWeekend(day) ? 'bg-muted/10' : ''}`}
                                    style={{ left: i * GANTT_DAY_WIDTH, width: GANTT_DAY_WIDTH }}
                                  />
                                ))}
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-10"
                                  style={{
                                    left: ganttTodayOffset * GANTT_DAY_WIDTH + GANTT_DAY_WIDTH / 2,
                                  }}
                                />
                                {barStyle && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <motion.div
                                          className={`absolute top-1.5 rounded-md cursor-pointer overflow-hidden ${
                                            ganttStatusBarColors[schedule.status] ||
                                            'bg-gray-400/80'
                                          } ${hasConflict ? 'ring-2 ring-red-500/60' : ''}`}
                                          style={{
                                            left: barStyle.left,
                                            width: barStyle.width,
                                            height: GANTT_ROW_HEIGHT - 12,
                                          }}
                                          initial={{ opacity: 0, scaleX: 0 }}
                                          animate={{ opacity: 1, scaleX: 1 }}
                                          transition={{
                                            duration: 0.4,
                                            delay: idx * 0.05,
                                            ease: 'easeOut',
                                          }}
                                          onClick={() => handleViewDetail(schedule)}
                                        >
                                          <div
                                            className={`absolute inset-y-0 left-0 rounded-md bg-black/20`}
                                            style={{ width: `${progress * 100}%` }}
                                          />
                                          <div className="relative flex items-center h-full px-2">
                                            <span className="text-[11px] text-white font-medium truncate">
                                              {schedule.product_name}
                                            </span>
                                            {hasConflict && (
                                              <AlertTriangle className="h-3 w-3 text-red-200 ml-1 flex-shrink-0" />
                                            )}
                                          </div>
                                        </motion.div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <div className="space-y-1 text-xs">
                                          <div className="font-semibold">
                                            {schedule.schedule_no}
                                          </div>
                                          <div>{t('tooltipProduct')}: {schedule.product_name}</div>
                                          <div>
                                            {t('tooltipWorkshop')}:{' '}
                                            {ganttWorkshopLabels[schedule.workshop] ||
                                              schedule.workshop}
                                          </div>
                                          <div>
                                            {t('tooltipPlan')}: {formatDate(schedule.planned_start)} ~{' '}
                                            {formatDate(schedule.planned_end)}
                                          </div>
                                          <div>
                                            {t('tooltipQuantity')}: {schedule.completed_qty || 0}/
                                            {schedule.planned_qty}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {t('tooltipStatus')}: {getStatusBadge(schedule.status)}
                                          </div>
                                          {hasConflict && (
                                            <div className="text-red-500 font-medium flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              {t('timeConflict')}
                                            </div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 自动排程对话框 */}
        <Dialog open={isAutoScheduleOpen} onOpenChange={setIsAutoScheduleOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t('autoScheduleTitle')}
              </DialogTitle>
              <DialogDescription>{t('autoScheduleDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('selectedCount', { count: selectedWorkOrders.length })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedWorkOrders([])}>
                    {t('clearSelection')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWorkOrders(workOrders.map((wo) => wo.id))}
                  >
                    {t('selectAll')}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t('select')}</TableHead>
                    <TableHead>{t('workOrderNo')}</TableHead>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead>{t('planQty')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo) => (
                    <TableRow
                      key={wo.id}
                      className={selectedWorkOrders.includes(wo.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedWorkOrders.includes(wo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorkOrders([...selectedWorkOrders, wo.id]);
                            } else {
                              setSelectedWorkOrders(
                                selectedWorkOrders.filter((id) => id !== wo.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>{wo.work_order_no}</TableCell>
                      <TableCell>{wo.product_name}</TableCell>
                      <TableCell>{wo.plan_qty}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{wo.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {autoScheduleResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('scheduleResult')}</h4>
                  {autoScheduleResults.map((result) => (
                    <Card
                      key={result.work_order_id}
                      className={
                        result.conflicts.length > 0 ? 'border-red-300' : 'border-green-300'
                      }
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{result.work_order_no}</div>
                          {result.conflicts.length > 0 ? (
                            <Badge variant="destructive">{t('hasConflict')}</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">{t('statusScheduled')}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('startLabel')}: {formatDate(result.overall_start)} ~ {t('endLabel')}:{' '}
                          {formatDate(result.overall_end)}
                        </div>
                        {result.conflicts.length > 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            {result.conflicts.map((c) => c.reason).join('; ')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAutoScheduleOpen(false)}>
                {tc('close')}
              </Button>
              <Button
                onClick={handleAutoSchedule}
                disabled={autoScheduleLoading || selectedWorkOrders.length === 0}
              >
                {autoScheduleLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {autoScheduleLoading ? t('schedulingInProgress') : t('startAutoSchedule')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 产能分析对话框 */}
        <Dialog open={isCapacityOpen} onOpenChange={setIsCapacityOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {t('capacityAnalysisTitle')}
              </DialogTitle>
              <DialogDescription>{t('capacityDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {capacityData.map((cap) => (
                <Card key={cap.workshop}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {ganttWorkshopLabels[cap.workshop] || cap.workshop}
                      </div>
                      <div
                        className={`text-sm font-bold ${cap.utilizationRate > 90 ? 'text-red-600' : cap.utilizationRate > 70 ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {cap.utilizationRate}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('equipmentCount')}: {cap.equipmentCount}</span>
                        <span>{t('totalCapacity')}: {cap.totalCapacity}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cap.utilizationRate > 90
                              ? 'bg-red-500'
                              : cap.utilizationRate > 70
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${cap.utilizationRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{t('usedCapacity')}: {cap.usedCapacity}</span>
                        <span>{t('availableCapacity')}: {cap.availableCapacity}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsCapacityOpen(false)}>
                {tc('close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl">
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {t('scheduleDetail')}: {selectedSchedule.schedule_no}
                    {getStatusBadge(selectedSchedule.status)}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{t('scheduleInfo')}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('scheduleNo')}:</span>
                        <span>{selectedSchedule.schedule_no}</span>
                        <span className="text-muted-foreground">{t('orderNo')}:</span>
                        <span>{selectedSchedule.order_no || '-'}</span>
                        <span className="text-muted-foreground">{t('scheduler')}:</span>
                        <span>{selectedSchedule.scheduler || '-'}</span>
                        <span className="text-muted-foreground">{t('priorityLabel')}:</span>
                        <span>{getPriorityBadge(selectedSchedule.priority)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{t('productInfo')}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('productName')}:</span>
                        <span>{selectedSchedule.product_name}</span>
                        <span className="text-muted-foreground">{t('productCode')}:</span>
                        <span>{selectedSchedule.product_code || '-'}</span>
                        <span className="text-muted-foreground">{t('workshopLabel')}:</span>
                        <span>{getWorkshopBadge(selectedSchedule.workshop)}</span>
                        <span className="text-muted-foreground">{t('plannedQuantity')}:</span>
                        <span>{Number(selectedSchedule.planned_qty).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">{t('planTime')}</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <span className="text-muted-foreground">{t('plannedStart')}:</span>
                      <span>{formatDate(selectedSchedule.planned_start) || '-'}</span>
                      <span className="text-muted-foreground">{t('plannedEnd')}:</span>
                      <span>{formatDate(selectedSchedule.planned_end) || '-'}</span>
                      <span className="text-muted-foreground">{t('actualStart')}:</span>
                      <span>{formatDate(selectedSchedule.actual_start) || '-'}</span>
                      <span className="text-muted-foreground">{t('actualEnd')}:</span>
                      <span>{formatDate(selectedSchedule.actual_end) || '-'}</span>
                    </div>
                  </div>
                  {selectedSchedule.remark && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{t('remarkLabel')}</h4>
                      <div className="text-sm p-3 bg-gray-50 rounded">
                        {selectedSchedule.remark}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {selectedSchedule.status === 1 && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedSchedule, 2);
                          setIsDetailOpen(false);
                        }}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {t('confirmSchedule')}
                      </Button>
                    )}
                    {selectedSchedule.status === 2 && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedSchedule, 3);
                          setIsDetailOpen(false);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {t('startProduction')}
                      </Button>
                    )}
                    {selectedSchedule.status === 3 && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedSchedule, 4);
                          setIsDetailOpen(false);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('completeSchedule')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    {t('editSchedule')}: {selectedSchedule.schedule_no}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('productName')}</Label>
                      <Input
                        value={editForm.product_name}
                        onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('workshopLabel')}</Label>
                      <Select
                        value={editForm.workshop}
                        onValueChange={(v) => setEditForm({ ...editForm, workshop: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="die_cut">{t('workshopDieCut')}</SelectItem>
                          <SelectItem value="trademark">{t('workshopTrademark')}</SelectItem>
                          <SelectItem value="printing">{t('workshopPrinting')}</SelectItem>
                          <SelectItem value="packaging">{t('workshopPackaging')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('plannedQuantity')}</Label>
                      <Input
                        type="number"
                        value={editForm.planned_qty}
                        onChange={(e) =>
                          setEditForm({ ...editForm, planned_qty: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('priorityLabel')}</Label>
                      <Select
                        value={String(editForm.priority)}
                        onValueChange={(v) => setEditForm({ ...editForm, priority: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t('urgent')}</SelectItem>
                          <SelectItem value="2">{t('normal')}</SelectItem>
                          <SelectItem value="3">{t('low')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('plannedStart')}</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.planned_start}
                        onChange={(e) =>
                          setEditForm({ ...editForm, planned_start: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('plannedEnd')}</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.planned_end}
                        onChange={(e) => setEditForm({ ...editForm, planned_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('scheduler')}</Label>
                    <Input
                      value={editForm.scheduler}
                      onChange={(e) => setEditForm({ ...editForm, scheduler: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('remarkLabel')}</Label>
                    <Input
                      value={editForm.remark}
                      onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    {tc('cancel')}
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={loading}>
                    {loading ? t('saving') : tc('save')}
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
