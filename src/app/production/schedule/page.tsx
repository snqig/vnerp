'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { formatDate } from '@/lib/date-utils';
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// 排程数据类型
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
    1: { label: '待排产', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
    2: { label: '已排产', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    3: { label: '生产中', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    4: { label: '已完成', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    5: { label: '已取消', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };
  const config = statusMap[status] || { label: '未知', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 获取优先级标签
const getPriorityBadge = (priority: number) => {
  const priorityMap: Record<number, { label: string; className: string }> = {
    1: { label: '紧急', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    2: { label: '正常', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    3: { label: '低', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  };
  const config = priorityMap[priority] || { label: '正常', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 获取车间标签
const getWorkshopBadge = (workshop: string) => {
  const workshopMap: Record<string, { label: string; className: string }> = {
    'die_cut': { label: '模切', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    'trademark': { label: '商标', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  };
  const config = workshopMap[workshop] || { label: workshop, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<Date>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'gantt'>('list');
  const [loading, setLoading] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/schedule?pageSize=100');
      const data = await res.json();
      if (data.success) {
        const list = data.data?.list || [];
        setSchedules(list);
        setStats({
          total: list.length,
          pending: list.filter((s: Schedule) => s.status === 1).length,
          scheduled: list.filter((s: Schedule) => s.status === 2).length,
          producing: list.filter((s: Schedule) => s.status === 3).length,
          completed: list.filter((s: Schedule) => s.status === 4).length,
          planQty: list.reduce((sum: number, s: Schedule) => sum + (Number(s.planned_qty) || 0), 0),
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
    workshop: '',
    planned_qty: 0,
    planned_start: '',
    planned_end: '',
    priority: 2,
    scheduler: '',
    remark: '',
  });

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

  const ganttWorkshopLabels: Record<string, string> = {
    die_cut: '模切车间',
    trademark: '商标车间',
    printing: '印刷车间',
    packaging: '包装车间',
  };

  const ganttStatusBarColors: Record<number, string> = {
    1: 'bg-blue-500/80',
    2: 'bg-amber-500/80',
    3: 'bg-green-500/80',
    4: 'bg-gray-400/80',
    5: 'bg-red-500/80',
  };

  const ganttStatusProgressColors: Record<number, string> = {
    1: 'bg-blue-700/50',
    2: 'bg-amber-700/50',
    3: 'bg-green-700/50',
    4: 'bg-gray-600/50',
    5: 'bg-red-700/50',
  };

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
    return Math.max(0, (now.getTime() - ganttDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
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

  const getGanttBarStyle = (schedule: Schedule) => {
    if (!schedule.planned_start || !schedule.planned_end) return null;
    const start = new Date(schedule.planned_start);
    const end = new Date(schedule.planned_end);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const startOffset = (start.getTime() - ganttDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
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
        const a = items[i];
        const b = items[j];
        if (
          a.planned_start && a.planned_end &&
          b.planned_start && b.planned_end &&
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
          ...editForm,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchSchedules();
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
          status: 2,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchSchedules();
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
          status: 3,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchSchedules();
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
          status: 4,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchSchedules();
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
    return schedules.filter((s) => s.planned_start && s.planned_start.startsWith(dateStr));
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
                <Button
                  variant={viewMode === 'gantt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('gantt')}
                >
                  <GanttChart className="h-4 w-4 mr-1" />
                  甘特图
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
                        <TableHead>排产单号</TableHead>
                        <TableHead>订单号</TableHead>
                        <TableHead>产品名称</TableHead>
                        <TableHead>车间</TableHead>
                        <TableHead>计划数量</TableHead>
                        <TableHead>计划开始</TableHead>
                        <TableHead>优先级</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
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
                                    查看详情
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  {schedule.status === 1 && (
                                    <DropdownMenuItem onClick={() => handleConfirmSchedule(schedule)}>
                                      <CalendarIcon className="h-4 w-4 mr-2" />
                                      确认排产
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.status === 2 && (
                                    <DropdownMenuItem onClick={() => handleStartProduction(schedule)}>
                                      <Play className="h-4 w-4 mr-2" />
                                      开始生产
                                    </DropdownMenuItem>
                                  )}
                                  {schedule.status === 3 && (
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
                              className="text-xs p-2 rounded bg-muted cursor-pointer hover:bg-muted/80"
                              onClick={() => handleViewDetail(s)}
                            >
                              <div className="font-medium truncate">{s.product_name}</div>
                              <div className="text-muted-foreground">{Number(s.planned_qty).toLocaleString()}</div>
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
                甘特图排程视图
              </CardTitle>
              <CardDescription>按车间分组查看生产排程时间线</CardDescription>
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
                    排程信息
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
                            <div className="text-xs font-medium truncate">{schedule.product_name}</div>
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
                    <div className="flex border-b border-border bg-muted/50" style={{ height: GANTT_ROW_HEIGHT }}>
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
                                className={`absolute top-0 bottom-0 border-r border-border/30 ${
                                  isGanttWeekend(day) ? 'bg-muted/20' : ''
                                }`}
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
                                    className={`absolute top-0 bottom-0 border-r border-border/20 ${
                                      isGanttWeekend(day) ? 'bg-muted/10' : ''
                                    }`}
                                    style={{ left: i * GANTT_DAY_WIDTH, width: GANTT_DAY_WIDTH }}
                                  />
                                ))}
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-10"
                                  style={{ left: ganttTodayOffset * GANTT_DAY_WIDTH + GANTT_DAY_WIDTH / 2 }}
                                />
                                {barStyle && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <motion.div
                                          className={`absolute top-1.5 rounded-md cursor-pointer overflow-hidden ${
                                            ganttStatusBarColors[schedule.status] || 'bg-gray-400/80'
                                          } ${hasConflict ? 'ring-2 ring-red-500/60' : ''}`}
                                          style={{
                                            left: barStyle.left,
                                            width: barStyle.width,
                                            height: GANTT_ROW_HEIGHT - 12,
                                          }}
                                          initial={{ opacity: 0, scaleX: 0 }}
                                          animate={{ opacity: 1, scaleX: 1 }}
                                          transition={{ duration: 0.4, delay: idx * 0.05, ease: 'easeOut' }}
                                          onClick={() => handleViewDetail(schedule)}
                                        >
                                          <div
                                            className={`absolute inset-y-0 left-0 rounded-md ${
                                              ganttStatusProgressColors[schedule.status] || 'bg-gray-600/50'
                                            }`}
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
                                          <div className="font-semibold">{schedule.schedule_no}</div>
                                          <div>产品: {schedule.product_name}</div>
                                          <div>车间: {ganttWorkshopLabels[schedule.workshop] || schedule.workshop}</div>
                                          <div>计划: {formatDate(schedule.planned_start)} ~ {formatDate(schedule.planned_end)}</div>
                                          {schedule.actual_start && (
                                            <div>实际: {formatDate(schedule.actual_start)}{schedule.actual_end ? ` ~ ${formatDate(schedule.actual_end)}` : ''}</div>
                                          )}
                                          <div>数量: {schedule.completed_qty || 0}/{schedule.planned_qty}</div>
                                          <div className="flex items-center gap-1">
                                            状态: {getStatusBadge(schedule.status)}
                                          </div>
                                          {hasConflict && (
                                            <div className="text-red-500 font-medium flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              时间冲突
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

        {/* 排程详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    排程详情: {selectedSchedule.schedule_no}
                    {getStatusBadge(selectedSchedule.status)}
                  </DialogTitle>
                  <DialogDescription>查看生产排程详细信息</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">排程信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">排产单号:</span>
                        <span>{selectedSchedule.schedule_no}</span>
                        <span className="text-muted-foreground">订单号:</span>
                        <span>{selectedSchedule.order_no || '-'}</span>
                        <span className="text-muted-foreground">排产人:</span>
                        <span>{selectedSchedule.scheduler || '-'}</span>
                        <span className="text-muted-foreground">优先级:</span>
                        <span>{getPriorityBadge(selectedSchedule.priority)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">产品信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">产品名称:</span>
                        <span>{selectedSchedule.product_name}</span>
                        <span className="text-muted-foreground">产品编码:</span>
                        <span>{selectedSchedule.product_code || '-'}</span>
                        <span className="text-muted-foreground">车间:</span>
                        <span>{getWorkshopBadge(selectedSchedule.workshop)}</span>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span>{Number(selectedSchedule.planned_qty).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 计划时间 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">计划时间</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <span className="text-muted-foreground">计划开始:</span>
                      <span>{formatDate(selectedSchedule.planned_start) || '-'}</span>
                      <span className="text-muted-foreground">计划结束:</span>
                      <span>{formatDate(selectedSchedule.planned_end) || '-'}</span>
                      <span className="text-muted-foreground">实际开始:</span>
                      <span>{formatDate(selectedSchedule.actual_start) || '-'}</span>
                      <span className="text-muted-foreground">实际结束:</span>
                      <span>{formatDate(selectedSchedule.actual_end) || '-'}</span>
                    </div>
                  </div>

                  {/* 备注 */}
                  {selectedSchedule.remark && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">备注</h4>
                      <div className="text-sm p-3 bg-gray-50 rounded">{selectedSchedule.remark}</div>
                    </div>
                  )}

                  {/* 时间信息 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">时间信息</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">创建时间:</span>
                      <span>{selectedSchedule.create_time}</span>
                      <span className="text-muted-foreground">更新时间:</span>
                      <span>{selectedSchedule.update_time}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      关闭
                    </Button>
                    {selectedSchedule.status === 1 && (
                      <Button onClick={() => { handleConfirmSchedule(selectedSchedule); setIsDetailOpen(false); }}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        确认排产
                      </Button>
                    )}
                    {selectedSchedule.status === 2 && (
                      <Button onClick={() => { handleStartProduction(selectedSchedule); setIsDetailOpen(false); }}>
                        <Play className="h-4 w-4 mr-2" />
                        开始生产
                      </Button>
                    )}
                    {selectedSchedule.status === 3 && (
                      <Button onClick={() => { handleCompleteSchedule(selectedSchedule); setIsDetailOpen(false); }}>
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

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            {selectedSchedule && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    编辑排程: {selectedSchedule.schedule_no}
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
                      <Label>车间</Label>
                      <Select
                        value={editForm.workshop}
                        onValueChange={(value) => setEditForm({ ...editForm, workshop: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择车间" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="die_cut">模切车间</SelectItem>
                          <SelectItem value="trademark">商标车间</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>计划数量</Label>
                      <Input
                        type="number"
                        value={editForm.planned_qty}
                        onChange={(e) => setEditForm({ ...editForm, planned_qty: parseInt(e.target.value) || 0 })}
                        placeholder="输入计划数量"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>优先级</Label>
                      <Select
                        value={String(editForm.priority)}
                        onValueChange={(value) => setEditForm({ ...editForm, priority: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择优先级" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">紧急</SelectItem>
                          <SelectItem value="2">正常</SelectItem>
                          <SelectItem value="3">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>计划开始</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.planned_start}
                        onChange={(e) => setEditForm({ ...editForm, planned_start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>计划结束</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.planned_end}
                        onChange={(e) => setEditForm({ ...editForm, planned_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>排产人</Label>
                    <Input
                      value={editForm.scheduler}
                      onChange={(e) => setEditForm({ ...editForm, scheduler: e.target.value })}
                      placeholder="输入排产人"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Input
                      value={editForm.remark}
                      onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                      placeholder="输入备注"
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
                    确定要删除排程 <strong>{selectedSchedule.schedule_no}</strong> 吗？此操作不可恢复。
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                    <p className="font-medium text-red-800">排程信息:</p>
                    <ul className="mt-2 space-y-1 text-red-700">
                      <li>产品: {selectedSchedule.product_name}</li>
                      <li>车间: {getWorkshopBadge(selectedSchedule.workshop)}</li>
                      <li>数量: {Number(selectedSchedule.planned_qty).toLocaleString()}</li>
                      <li>状态: {getStatusBadge(selectedSchedule.status)}</li>
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
