'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Filter,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Clock3,
  MoreHorizontal,
  Download,
  Printer,
  RefreshCw,
  RotateCcw,
  Edit,
  Trash2,
  BarChart2,
  Users,
  Briefcase,
  Award,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// 状态类型
const statusOptions = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'normal', label: '正常', color: 'bg-green-100 text-green-700' },
  { value: 'late', label: '迟到', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'absent', label: '缺勤', color: 'bg-red-100 text-red-700' },
  { value: 'leave', label: '请假', color: 'bg-blue-100 text-blue-700' },
];

// 部门选项
const departmentOptions = [
  { value: 'all', label: '全部部门' },
  { value: '生产部', label: '生产部' },
  { value: '品质部', label: '品质部' },
  { value: '研发部', label: '研发部' },
  { value: '销售部', label: '销售部' },
  { value: '行政部', label: '行政部' },
  { value: '财务部', label: '财务部' },
];

// 示例考勤记录数据
const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  normal: { label: '正常', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  late: { label: '迟到', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock3 },
  absent: { label: '缺勤', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  leave: { label: '请假', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
};

export default function AttendancePage() {
  const { companyName } = useCompanyName();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    attendanceDate: '',
    employeeId: '',
    employeeName: '',
    departmentName: '',
    checkInTime: '',
    checkOutTime: '',
    status: 'normal',
    workingHours: '',
    overtimeHours: '',
    remark: '',
  });

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/hr/attendance');
      const data = await res.json();
      if (data.success || data.code === 200) {
        const records = data.data || [];
        setAttendanceRecords(records.map((r: any, idx: number) => ({
          id: r.id || idx + 1,
          date: r.attendance_date || r.date,
          employeeId: r.employee_no || r.employee_id,
          employeeName: r.employee_name,
          department: r.department_name || r.department,
          checkIn: r.check_in_time || r.check_in,
          checkOut: r.check_out_time || r.check_out,
          status: r.status || 'normal',
          workingHours: r.working_hours || calculateWorkingHours(r.check_in_time || r.check_in, r.check_out_time || r.check_out),
          overtimeHours: r.overtime_hours || 0,
          remark: r.remark || '',
        })));
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success('数据已刷新');
  }, []);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setDateRange('all');
    setSelectedRecords([]);
    toast.success('筛选条件已重置');
  }, []);

  const calculateWorkingHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none border border-gray-300 bg-gray-100 text-center whitespace-nowrap hover:bg-gray-200 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // 筛选考勤记录
  const filteredRecords = useMemo(() => {
    let records = attendanceRecords.filter(record => {
      const matchesSearch = !searchQuery || 
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      
      const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });

    if (sortField) {
      records = [...records].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case 'date': aVal = a.date; bVal = b.date; break;
          case 'employeeId': aVal = a.employeeId; bVal = b.employeeId; break;
          case 'employeeName': aVal = a.employeeName; bVal = b.employeeName; break;
          case 'department': aVal = a.department; bVal = b.department; break;
          case 'checkIn': aVal = a.checkIn; bVal = b.checkIn; break;
          case 'checkOut': aVal = a.checkOut; bVal = b.checkOut; break;
          case 'workingHours': aVal = a.workingHours; bVal = b.workingHours; break;
          case 'overtimeHours': aVal = a.overtimeHours; bVal = b.overtimeHours; break;
          case 'status': aVal = a.status; bVal = b.status; break;
          default: return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return records;
  }, [attendanceRecords, searchQuery, statusFilter, departmentFilter, sortField, sortDirection]);

  const handleFormTimeChange = (field: 'checkInTime' | 'checkOutTime', value: string) => {
    const updated = { ...formData, [field]: value };
    if (updated.checkInTime && updated.checkOutTime) {
      updated.workingHours = calculateWorkingHours(updated.checkInTime, updated.checkOutTime).toString();
    }
    setFormData(updated);
  };

  // 新增考勤记录
  const handleAdd = () => {
    setFormData({
      attendanceDate: new Date().toISOString().slice(0, 10),
      employeeId: '',
      employeeName: '',
      departmentName: '',
      checkInTime: '08:00',
      checkOutTime: '17:30',
      status: 'normal',
      workingHours: '8.5',
      overtimeHours: '0',
      remark: '',
    });
    setIsAddDialogOpen(true);
  };

  // 编辑考勤记录
  const handleEdit = (record: any) => {
    setCurrentRecord(record);
    setFormData({
      attendanceDate: record.date,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      departmentName: record.department,
      checkInTime: record.checkIn,
      checkOutTime: record.checkOut,
      status: record.status,
      workingHours: record.workingHours?.toString() || '',
      overtimeHours: record.overtimeHours?.toString() || '',
      remark: record.remark || '',
    });
    setIsEditDialogOpen(true);
  };

  // 保存考勤记录
  const handleSave = () => {
    const newRecord = {
      id: attendanceRecords.length + 1,
      date: formData.attendanceDate,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.departmentName,
      checkIn: formData.checkInTime,
      checkOut: formData.checkOutTime,
      status: formData.status,
      workingHours: parseFloat(formData.workingHours) || 0,
      overtimeHours: parseFloat(formData.overtimeHours) || 0,
      remark: formData.remark,
    };
    
    setAttendanceRecords([newRecord, ...attendanceRecords]);
    setIsAddDialogOpen(false);
    toast.success('考勤记录保存成功');
  };

  // 更新考勤记录
  const handleUpdate = () => {
    if (!currentRecord) return;
    
    setAttendanceRecords(attendanceRecords.map(r => 
      r.id === currentRecord.id 
        ? { 
            ...r, 
            date: formData.attendanceDate,
            employeeId: formData.employeeId,
            employeeName: formData.employeeName,
            department: formData.departmentName,
            checkIn: formData.checkInTime,
            checkOut: formData.checkOutTime,
            status: formData.status,
            workingHours: parseFloat(formData.workingHours) || 0,
            overtimeHours: parseFloat(formData.overtimeHours) || 0,
            remark: formData.remark,
          }
        : r
    ));
    setIsEditDialogOpen(false);
    toast.success('考勤记录更新成功');
  };

  // 删除考勤记录
  const handleDelete = (record: any) => {
    setCurrentRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!currentRecord) return;
    setAttendanceRecords(attendanceRecords.filter(r => r.id !== currentRecord.id));
    setIsDeleteDialogOpen(false);
    toast.success('考勤记录删除成功');
  };

  // 打印
  const handlePrint = () => {
    if (selectedRecords.length === 0) {
      toast.error('请先选择要打印的记录');
      return;
    }
    const recordsToPrint = filteredRecords.filter(r => selectedRecords.includes(r.id));
    const statusLabels: Record<string, string> = { normal: '正常', late: '迟到', absent: '缺勤', leave: '请假' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }
    const rows = recordsToPrint.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.employeeId}</td>
        <td>${r.employeeName}</td>
        <td>${r.department}</td>
        <td>${r.checkIn || '-'}</td>
        <td>${r.checkOut || '-'}</td>
        <td>${r.workingHours} 小时</td>
        <td>${r.overtimeHours} 小时</td>
        <td>${statusLabels[r.status] || r.status}</td>
        <td>${r.remark || '-'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>考勤记录打印</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>考勤记录</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToPrint.length} 条记录</div>
        <table>
          <thead><tr><th>日期</th><th>工号</th><th>姓名</th><th>部门</th><th>上班时间</th><th>下班时间</th><th>工作时长</th><th>加班时长</th><th>状态</th><th>备注</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(`正在打印 ${recordsToPrint.length} 条考勤记录`);
  };

  // 选择记录
  const toggleSelectRecord = (recordId: number) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 全选
  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  // 计算统计数据
  const totalRecords = attendanceRecords.length;
  const normalRecords = attendanceRecords.filter(r => r.status === 'normal').length;
  const lateRecords = attendanceRecords.filter(r => r.status === 'late').length;
  const absentRecords = attendanceRecords.filter(r => r.status === 'absent').length;
  const leaveRecords = attendanceRecords.filter(r => r.status === 'leave').length;
  const attendanceRate = totalRecords > 0 
    ? Math.round(((totalRecords - absentRecords) / totalRecords) * 100)
    : 0;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* 页面标题 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">考勤管理</h1>
                  <p className="text-slate-500">员工考勤记录管理与统计</p>
                </div>
              </div>
            </motion.div>

            {/* 功能按钮栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border"
            >
              <Button onClick={handleAdd} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                打印
              </Button>
              <div className="w-px h-8 bg-slate-200 mx-2" />
              <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
            </motion.div>

            {/* 查询筛选栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">状态：</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">部门：</span>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">关键字：</span>
                <Input
                  placeholder="搜索员工姓名、工号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">时间：</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="today">今日</SelectItem>
                    <SelectItem value="week">本周</SelectItem>
                    <SelectItem value="month">本月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRecords.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  已选择 {selectedRecords.length} 条记录
                </Badge>
              )}
            </motion.div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">考勤率</p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">{attendanceRate}%</p>
                        <p className="text-xs text-slate-500 mt-1">整体考勤率</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">正常出勤</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">{normalRecords}</p>
                        <p className="text-xs text-slate-500 mt-1">条正常记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-amber-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">迟到记录</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">{lateRecords}</p>
                        <p className="text-xs text-slate-500 mt-1">条迟到记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <Clock3 className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">缺勤记录</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">{absentRecords}</p>
                        <p className="text-xs text-slate-500 mt-1">条缺勤记录</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 考勤记录表格 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <CardTitle>考勤记录</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">共 {filteredRecords.length} 条记录</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="border-collapse border border-gray-300">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="border border-gray-300 bg-gray-100 text-center w-12">
                            <Checkbox
                              checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <SortableHeader field="date">日期</SortableHeader>
                          <SortableHeader field="employeeId">工号</SortableHeader>
                          <SortableHeader field="employeeName">姓名</SortableHeader>
                          <SortableHeader field="department">部门</SortableHeader>
                          <SortableHeader field="checkIn">上班时间</SortableHeader>
                          <SortableHeader field="checkOut">下班时间</SortableHeader>
                          <SortableHeader field="workingHours">工作时长</SortableHeader>
                          <SortableHeader field="overtimeHours">加班时长</SortableHeader>
                          <SortableHeader field="status">状态</SortableHeader>
                          <TableHead className="border border-gray-300 bg-gray-100 text-center">备注</TableHead>
                          <TableHead className="border border-gray-300 bg-gray-100 text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => {
                          const StatusIcon = statusConfig[record.status]?.icon || Clock;
                          return (
                            <TableRow key={record.id} className="hover:bg-blue-50 even:bg-gray-50/50">
                              <TableCell className="border border-gray-300 text-center">
                                <Checkbox
                                  checked={selectedRecords.includes(record.id)}
                                  onCheckedChange={() => toggleSelectRecord(record.id)}
                                />
                              </TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.date}</TableCell>
                              <TableCell className="border border-gray-300 text-center font-mono">{record.employeeId}</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.employeeName}</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.department}</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.checkIn || '-'}</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.checkOut || '-'}</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.workingHours} 小时</TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.overtimeHours} 小时</TableCell>
                              <TableCell className="border border-gray-300 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <StatusIcon className="w-4 h-4" />
                                  <span>{statusConfig[record.status]?.label || record.status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="border border-gray-300 text-center">{record.remark || '-'}</TableCell>
                              <TableCell className="border border-gray-300 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(record)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(record)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">暂无考勤记录</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>

      {/* 新增考勤记录对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>新增考勤记录</DialogTitle>
            <DialogDescription>
              填写考勤记录信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendanceDate">日期 *</Label>
                <Input
                  id="attendanceDate"
                  type="date"
                  value={formData.attendanceDate}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">工号 *</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="请输入工号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeName">姓名 *</Label>
                <Input
                  id="employeeName"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">部门 *</Label>
                <Select value={formData.departmentName} onValueChange={(value) => setFormData({ ...formData, departmentName: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.filter(opt => opt.value !== 'all').map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInTime">上班时间 *</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleFormTimeChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">下班时间 *</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleFormTimeChange('checkOutTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态 *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.filter(opt => opt.value !== 'all').map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHours">工作时长（自动计算）</Label>
                <Input
                  id="workingHours"
                  type="number"
                  step="0.1"
                  value={formData.workingHours}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeHours">加班时长</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  step="0.1"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                  placeholder="请输入加班时长"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">备注</Label>
                <Input
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="请输入备注"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑考勤记录对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>编辑考勤记录</DialogTitle>
            <DialogDescription>
              修改考勤记录信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendanceDate">日期 *</Label>
                <Input
                  id="attendanceDate"
                  type="date"
                  value={formData.attendanceDate}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">工号 *</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="请输入工号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeName">姓名 *</Label>
                <Input
                  id="employeeName"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">部门 *</Label>
                <Select value={formData.departmentName} onValueChange={(value) => setFormData({ ...formData, departmentName: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.filter(opt => opt.value !== 'all').map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInTime">上班时间 *</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleFormTimeChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">下班时间 *</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleFormTimeChange('checkOutTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态 *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.filter(opt => opt.value !== 'all').map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHours">工作时长（自动计算）</Label>
                <Input
                  id="workingHours"
                  type="number"
                  step="0.1"
                  value={formData.workingHours}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeHours">加班时长</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  step="0.1"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                  placeholder="请输入加班时长"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">备注</Label>
                <Input
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="请输入备注"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除考勤记录对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>删除考勤记录</DialogTitle>
            <DialogDescription>
              确定要删除 {currentRecord?.employeeName} 在 {currentRecord?.date} 的考勤记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
