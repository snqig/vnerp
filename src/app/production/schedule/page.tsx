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
  Trash2,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
    1: { label: '待排产', className: 'bg-gray-100 text-gray-700' },
    2: { label: '已排产', className: 'bg-blue-100 text-blue-700' },
    3: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
    4: { label: '已完成', className: 'bg-green-100 text-green-700' },
    5: { label: '已取消', className: 'bg-red-100 text-red-700' },
  };
  const config = statusMap[status] || { label: '未知', className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 获取优先级标签
const getPriorityBadge = (priority: number) => {
  const priorityMap: Record<number, { label: string; className: string }> = {
    1: { label: '紧急', className: 'bg-red-100 text-red-700' },
    2: { label: '正常', className: 'bg-blue-100 text-blue-700' },
    3: { label: '低', className: 'bg-gray-100 text-gray-700' },
  };
  const config = priorityMap[priority] || { label: '正常', className: 'bg-blue-100 text-blue-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 获取车间标签
const getWorkshopBadge = (workshop: string) => {
  const workshopMap: Record<string, { label: string; className: string }> = {
    'die_cut': { label: '模切', className: 'bg-purple-100 text-purple-700' },
    'trademark': { label: '商标', className: 'bg-indigo-100 text-indigo-700' },
  };
  const config = workshopMap[workshop] || { label: workshop, className: 'bg-gray-100 text-gray-700' };
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
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
                          <TableCell>{schedule.planned_start || '-'}</TableCell>
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
                              className="text-xs p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
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
                      <span>{selectedSchedule.planned_start || '-'}</span>
                      <span className="text-muted-foreground">计划结束:</span>
                      <span>{selectedSchedule.planned_end || '-'}</span>
                      <span className="text-muted-foreground">实际开始:</span>
                      <span>{selectedSchedule.actual_start || '-'}</span>
                      <span className="text-muted-foreground">实际结束:</span>
                      <span>{selectedSchedule.actual_end || '-'}</span>
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
