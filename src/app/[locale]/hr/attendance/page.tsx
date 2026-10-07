'use client';
import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Filter,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  MoreHorizontal,
  Printer,
  RefreshCw,
  RotateCcw,
  Edit,
  Trash2,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { MainLayout } from '@/components/layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/lib/date-utils';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { SortState } from '@/components/common/standard-table';

type Loose = Record<string, unknown>;

// 部门下拉不再内联硬编码。原清单（管理部/业务部/生产部/打样中心/采购部/品质部/
// 模切/商标/其他/采购）是部门结构的第二份副本，与库中真实部门早已不一致。
// 现改为在组件内拉取部门主数据（/api/organization/department），
// 并与已加载考勤记录里出现过的部门名取并集 —— 这样历史记录中已改名/已删除的
// 部门仍可被筛选到，不会因为主数据收敛而丢掉过滤入口。

// 考勤记录接口
interface AttendanceRecord {
  id: number;
  date: string;
  employeeId: string;
  employeeName: string;
  department: string;
  checkIn?: string;
  checkOut?: string;
  status: 'normal' | 'late' | 'absent' | 'leave';
  workingHours?: number;
  overtimeHours?: number;
  remark?: string;
}

function calculateWorkingHours(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const diffMinutes = outH * 60 + outM - (inH * 60 + inM);
  return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
}

export default function AttendancePage() {
  const ts = useTranslations('Common');
  // 翻译钩子
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const localeTag =
    locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-TW' ? 'zh-TW' : locale === 'vi' ? 'vi' : 'en-US';

  const statusOptions = [
    {
      value: 'all',
      label: tc('all'),
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    {
      value: 'normal',
      label: tc('normal'),
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    {
      value: 'late',
      label: tc('late'),
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    {
      value: 'absent',
      label: tc('absent'),
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    {
      value: 'leave',
      label: tc('leave'),
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
  ];

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ComponentType<Loose> }
  > = {
    normal: {
      label: tc('normal'),
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200',
      icon: CheckCircle2,
    },
    late: {
      label: tc('late'),
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200',
      icon: Clock3,
    },
    absent: {
      label: tc('absent'),
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200',
      icon: AlertCircle,
    },
    leave: {
      label: tc('leave'),
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200',
      icon: Calendar,
    },
  };

  const columns: StandardTableColumn<AttendanceRecord>[] = [
    { key: 'date', title: tc('date'), sortable: true },
    { key: 'employeeId', title: tc('employeeNo'), sortable: true },
    { key: 'employeeName', title: tc('name'), sortable: true },
    { key: 'department', title: tc('department'), sortable: true },
    { key: 'checkIn', title: tc('checkIn'), sortable: true },
    { key: 'checkOut', title: tc('checkOut'), sortable: true },
    { key: 'workingHours', title: tc('workingHours'), sortable: true },
    { key: 'overtimeHours', title: tc('overtimeHours'), sortable: true },
    {
      key: 'status',
      title: tc('status'),
      sortable: true,
      render: (record) => {
        const StatusIcon = statusConfig[record.status]?.icon || Clock;
        return (
          <div className="flex items-center justify-center gap-1">
            <StatusIcon className="w-4 h-4" />
            <span>{statusConfig[record.status]?.label || record.status}</span>
          </div>
        );
      },
    },
    { key: 'remark', title: tc('remark') },
    {
      key: 'actions',
      title: tc('actions'),
      render: (record) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(record)}>
              <Edit className="mr-2 h-4 w-4" />
              {tc('edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(record)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {tc('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const { companyName } = useCompanyName();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // 部门主数据（唯一真相源：/api/organization/department）
  const [liveDepartments, setLiveDepartments] = useState<{ id: number; dept_name: string }[]>([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/organization/department?pageSize=500');
      const data = await res.json();
      if (data.success || data.code === 200) {
        const raw = data.data;
        const list = Array.isArray(raw) ? raw : raw?.list || [];
        setLiveDepartments(
          list.map((d: Loose) => ({ id: Number(d.id), dept_name: String(d.dept_name ?? '') }))
        );
      }
    } catch {
      // 主数据拉取失败不阻断页面：下拉退化为「仅历史记录里出现过的部门」
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // 选项 = 主数据部门 ∪ 已加载考勤记录里的部门名（保住历史值的过滤入口）
  const departmentOptions = useMemo(() => {
    const names = new Set<string>();
    for (const dept of liveDepartments) if (dept.dept_name) names.add(dept.dept_name);
    for (const record of attendanceRecords) if (record.department) names.add(record.department);
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [liveDepartments, attendanceRecords]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);

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

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/hr/attendance?pageSize=9999');
      const data = await res.json();
      if (data.success || data.code === 200) {
        // 统一处理API返回的数据结构
        const rawData = data.data;
        const rawList = Array.isArray(rawData) ? rawData : rawData?.list || [];
        setAttendanceRecords(
          rawList.map((r: Loose, idx: number) => {
            let dateStr = String(r.attendanceDate || r.attendance_date || r.date || '');
            if (dateStr && dateStr.includes('T')) {
              dateStr = formatDate(dateStr);
            }
            return {
              id: r.id || idx + 1,
              date: dateStr,
              employeeId: r.employeeId || r.employee_id,
              employeeName: r.employeeName || r.employee_name,
              department: r.departmentName || r.department_name || r.department,
              checkIn: r.checkInTime || r.check_in_time || r.check_in,
              checkOut: r.checkOutTime || r.check_out_time || r.check_out,
              status: r.status || 'normal',
              workingHours:
                r.workingHours ||
                r.working_hours ||
                calculateWorkingHours(
                  String(r.checkInTime || r.check_in_time || r.check_in),
                  String(r.checkOutTime || r.check_out_time || r.check_out)
                ),
              overtimeHours: r.overtimeHours || r.overtime_hours || 0,
              remark: r.remark || '',
            };
          })
        );
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    await fetchAttendanceRecords();
    toast.success(t('refreshSuccess'));
  }, [fetchAttendanceRecords, t]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setDateRange('all');
    setSelectedRows([]);
    setSortField('');
    setSortDirection('asc');
    toast.success(t('resetSuccess'));
  }, [t]);

  // 筛选考勤记录
  const filteredRecords = useMemo(() => {
    let records = attendanceRecords.filter((record) => {
      const matchesSearch =
        !searchQuery ||
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      const matchesDepartment =
        departmentFilter === 'all' || record.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });

    if (sortField) {
      records = [...records].sort((a, b) => {
        let aVal: string | number | undefined, bVal: string | number | undefined;
        switch (sortField) {
          case 'date':
            aVal = a.date;
            bVal = b.date;
            break;
          case 'employeeId':
            aVal = a.employeeId;
            bVal = b.employeeId;
            break;
          case 'employeeName':
            aVal = a.employeeName;
            bVal = b.employeeName;
            break;
          case 'department':
            aVal = a.department;
            bVal = b.department;
            break;
          case 'checkIn':
            aVal = a.checkIn;
            bVal = b.checkIn;
            break;
          case 'checkOut':
            aVal = a.checkOut;
            bVal = b.checkOut;
            break;
          case 'workingHours':
            aVal = a.workingHours;
            bVal = b.workingHours;
            break;
          case 'overtimeHours':
            aVal = a.overtimeHours;
            bVal = b.overtimeHours;
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            return 0;
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
      updated.workingHours = calculateWorkingHours(
        updated.checkInTime,
        updated.checkOutTime
      ).toString();
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
  const handleEdit = (record: AttendanceRecord) => {
    setCurrentRecord(record);
    setFormData({
      attendanceDate: record.date,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      departmentName: record.department,
      checkInTime: record.checkIn || '',
      checkOutTime: record.checkOut || '',
      status: record.status,
      workingHours: record.workingHours?.toString() || '',
      overtimeHours: record.overtimeHours?.toString() || '',
      remark: record.remark || '',
    });
    setIsEditDialogOpen(true);
  };

  // 保存考勤记录
  const handleSave = async () => {
    try {
      const res = await authFetch('/api/hr/attendance', {
        method: 'POST',
        body: JSON.stringify({
          attendanceDate: formData.attendanceDate,
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          departmentName: formData.departmentName,
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          status: formData.status,
          workingHours: parseFloat(formData.workingHours) || undefined,
          overtimeHours: parseFloat(formData.overtimeHours) || 0,
          remark: formData.remark,
        }),
      });
      const data = await res.json();
      if (data.success || data.code === 200) {
        setIsAddDialogOpen(false);
        await fetchAttendanceRecords();
        toast.success(t('saveSuccess'));
      } else {
        toast.error(data.message || t('saveFailed'));
      }
    } catch {
      toast.error(t('saveRetry'));
    }
  };

  // 更新考勤记录
  const handleUpdate = async () => {
    if (!currentRecord) return;
    try {
      const res = await authFetch('/api/hr/attendance', {
        method: 'PUT',
        body: JSON.stringify({
          id: currentRecord.id,
          attendanceDate: formData.attendanceDate,
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          departmentName: formData.departmentName,
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          status: formData.status,
          workingHours: parseFloat(formData.workingHours) || undefined,
          overtimeHours: parseFloat(formData.overtimeHours) || 0,
          remark: formData.remark,
        }),
      });
      const data = await res.json();
      if (data.success || data.code === 200) {
        setIsEditDialogOpen(false);
        await fetchAttendanceRecords();
        toast.success(t('updateSuccess'));
      } else {
        toast.error(data.message || t('updateFailed'));
      }
    } catch {
      toast.error(t('updateRetry'));
    }
  };

  // 删除考勤记录
  const handleDelete = (record: AttendanceRecord) => {
    setCurrentRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentRecord) return;
    try {
      const res = await authFetch(`/api/hr/attendance?id=${currentRecord.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success || data.code === 200) {
        setIsDeleteDialogOpen(false);
        await fetchAttendanceRecords();
        toast.success(t('deleteSuccess'));
      } else {
        toast.error(data.message || t('deleteFailed'));
      }
    } catch {
      toast.error(t('deleteRetry'));
    }
  };

  // 打印
  const handlePrint = () => {
    if (selectedRows.length === 0) {
      toast.error(t('selectToPrint'));
      return;
    }
    const recordsToPrint = filteredRecords.filter((r) => selectedRows.includes(r.id));
    const statusLabels: Record<string, string> = {
      normal: tc('normal'),
      late: t('late'),
      absent: t('absent'),
      leave: t('leave'),
    };
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('cannotOpenPrint'));
      return;
    }
    const rows = recordsToPrint
      .map(
        (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.employeeId}</td>
        <td>${r.employeeName}</td>
        <td>${r.department}</td>
        <td>${r.checkIn || '-'}</td>
        <td>${r.checkOut || '-'}</td>
        <td>${r.workingHours} ${t('workingHoursUnit')}</td>
        <td>${r.overtimeHours} ${t('workingHoursUnit')}</td>
        <td>${statusLabels[r.status] || r.status}</td>
        <td>${r.remark || '-'}</td>
      </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('printTitle')}</title>
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
        <h1>${t('attendanceRecords')}</h1>
        <div class="info">${t('printTime')}：${new Date().toLocaleString(localeTag)} | ${t('totalRecords', { count: recordsToPrint.length })}</div>
        <table>
          <thead><tr><th>${tc('date')}</th><th>${tc('employeeNo')}</th><th>${tc('name')}</th><th>${tc('department')}</th><th>${t('checkIn')}</th><th>${t('checkOut')}</th><th>${t('workingHours')}</th><th>${t('overtimeHours')}</th><th>${tc('status')}</th><th>${tc('remark')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(t('printingRecords', { count: recordsToPrint.length }));
  };

  // 计算统计数据
  const totalRecords = attendanceRecords.length;
  const normalRecords = attendanceRecords.filter((r) => r.status === 'normal').length;
  const lateRecords = attendanceRecords.filter((r) => r.status === 'late').length;
  const absentRecords = attendanceRecords.filter((r) => r.status === 'absent').length;
  const attendanceRate =
    totalRecords > 0 ? Math.round(((totalRecords - absentRecords) / totalRecords) * 100) : 0;

  return (
    <MainLayout title={t('attendance')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('attendance')}</h1>
              <p className="text-muted-foreground">{t('manageAttendanceDesc')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl shadow-sm border">
          <Button onClick={handleAdd} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {tc('add')}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            {tc('print')}
          </Button>
          <div className="w-px h-8 bg-border mx-2" />
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {tc('reset')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{tc('status')}：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={tc('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{tc('department')}：</span>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={tc('selectDepartment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allDepartments')}</SelectItem>
                {departmentOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{tc('keyword')}：</span>
            <Input
              placeholder={tc('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('dateRange')}：</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('dateRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
                <SelectItem value="week">{t('week')}</SelectItem>
                <SelectItem value="month">{t('month')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRows.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {t('selectedRecords', { count: selectedRows.length })}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('attendanceRate')}</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('overallAttendanceRate')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('normalAttendance')}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{normalRecords}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('normalRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('lateRecord')}</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{lateRecords}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('lateRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                  <Clock3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('absentRecord')}</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{absentRecords}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('absentRecords')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle>{t('attendanceRecords')}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('totalRecords', { count: filteredRecords.length })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <StandardTable<AttendanceRecord>
              rowSelectable
              selectedRows={filteredRecords.filter((r) => selectedRows.includes(r.id))}
              onRowSelectedChange={(rows) => setSelectedRows(rows.map((r) => r.id))}
              rowKey="id"
              dataSource={filteredRecords}
              columns={columns}
              total={filteredRecords.length}
              showPagination
            />
          </CardContent>
        </Card>
      </div>

      {/* 新增考勤记录对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>{t('addAttendance')}</DialogTitle>
            <DialogDescription>{t('fillAttendanceInfo')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendanceDate">{t('attendanceDate')} *</Label>
                <Input
                  id="attendanceDate"
                  type="date"
                  value={toDateInput(formData.attendanceDate)}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">{tc('employeeNo')} *</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder={t('enterEmployeeNo')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeName">{tc('name')} *</Label>
                <Input
                  id="employeeName"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder={t('enterEmployeeName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">{tc('department')} *</Label>
                <Select
                  value={formData.departmentName}
                  onValueChange={(value) => setFormData({ ...formData, departmentName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInTime">{t('checkInTime')} *</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleFormTimeChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">{t('checkOutTime')} *</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleFormTimeChange('checkOutTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{tc('status')} *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter((opt) => opt.value !== 'all')
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHours">{tc('salaryWorkingHours')}</Label>
                <Input
                  id="workingHours"
                  type="number"
                  step="0.1"
                  value={formData.workingHours}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeHours">{t('overtimeHours')}</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  step="0.1"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                  placeholder={t('overtimeHoursPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">{tc('remark')}</Label>
                <Input
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑考勤记录对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>{t('editAttendance')}</DialogTitle>
            <DialogDescription>{tc('fillAttendanceInfoShort')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendanceDate">{t('attendanceDate')} *</Label>
                <Input
                  id="attendanceDate"
                  type="date"
                  value={toDateInput(formData.attendanceDate)}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">{tc('employeeNo')} *</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder={t('enterEmployeeNo')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeName">{tc('name')} *</Label>
                <Input
                  id="employeeName"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder={t('enterEmployeeName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">{tc('department')} *</Label>
                <Select
                  value={formData.departmentName}
                  onValueChange={(value) => setFormData({ ...formData, departmentName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInTime">{t('checkInTime')} *</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleFormTimeChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">{t('checkOutTime')} *</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleFormTimeChange('checkOutTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{tc('status')} *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter((opt) => opt.value !== 'all')
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHours">{tc('salaryWorkingHours')}</Label>
                <Input
                  id="workingHours"
                  type="number"
                  step="0.1"
                  value={formData.workingHours}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeHours">{t('overtimeHours')}</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  step="0.1"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                  placeholder={t('overtimeHoursPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">{tc('remark')}</Label>
                <Input
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
              {tc('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除考勤记录对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>{t('deleteAttendance')}</DialogTitle>
            <DialogDescription>
              {tc('confirmDeleteAttendanceDesc')}
              {currentRecord?.employeeName}{ts('k_ckqy3b')}{currentRecord?.date} {ts('k_1xc8nj8')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
