'use client';
import { useRowSelection } from '@/lib/useRowSelection';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calculator,
  TrendingUp,
  Calendar,
  FileText,
  Printer,
  Users,
  DollarSign,
  CreditCard,
  Wallet,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

// DECIMAL 列经 mysql2 返回字符串，统一归一为数值，避免 `+` 变成字符串拼接
const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// 薪资数据类型
interface Salary {
  id: number;
  employee_no: string;
  name: string;
  gender: number;
  dept_id: number;
  dept_name: string;
  position: string;
  entry_date: string;
  status: number;
  salary_id?: number;
  month?: string;
  basic_salary?: number;
  position_allowance?: number;
  performance_bonus?: number;
  overtime_pay?: number;
  other_bonus?: number;
  social_security?: number;
  housing_fund?: number;
  personal_tax?: number;
  other_deduction?: number;
  actual_salary?: number;
  remark?: string;
}

// 统计数据类型
interface SalaryStats {
  totalEmployees: number;
  paidEmployees: number;
  totalSalary: number;
  avgSalary: number;
  maxSalary: number;
  minSalary: number;
  deptStats: {
    dept_name: string;
    count: number;
    total: number;
  }[];
}

// 部门类型
interface Department {
  id: number;
  dept_name: string;
  dept_code: string;
  parent_id: number;
}

export default function HRSalaryPage() {
  const { toast } = useToast();
  // 翻译钩子
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const getGenderText = (gender: number) => {
    return gender === 1 ? tc('maleShort') : gender === 2 ? tc('femaleShort') : tc('unknown');
  };

  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<SalaryStats>({
    totalEmployees: 0,
    paidEmployees: 0,
    totalSalary: 0,
    avgSalary: 0,
    maxSalary: 0,
    minSalary: 0,
    deptStats: [],
  });
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const [salaryRes, deptRes] = await Promise.all([
        authFetch('/api/hr/salary'),
        authFetch('/api/organization/department?pageSize=500'),
      ]);
      const salaryData = await salaryRes.json();
      const deptData = await deptRes.json();

      if (salaryData.success) {
        // 统一处理API返回的数据结构
        const rawData = salaryData.data;
        const rawList = Array.isArray(rawData) ? rawData : rawData?.list || [];
        const list = rawList.map((item: Loose) => ({
          id: item.id,
          employee_no: item.employeeNo || item.employee_no,
          name: item.name,
          gender: item.gender,
          dept_id: item.deptId || item.dept_id,
          dept_name: item.deptName || item.dept_name,
          position: item.position,
          entry_date: item.entryDate || item.entry_date,
          status: item.status,
          salary_id: item.salaryId || item.salary_id,
          month: item.month,
          basic_salary: toNumber(item.basicSalary ?? item.basic_salary),
          position_allowance: toNumber(item.positionAllowance ?? item.position_allowance),
          performance_bonus: toNumber(item.performanceBonus ?? item.performance_bonus),
          overtime_pay: toNumber(item.overtimePay ?? item.overtime_pay),
          other_bonus: toNumber(item.otherBonus ?? item.other_bonus),
          social_security: toNumber(item.socialSecurity ?? item.social_security),
          housing_fund: toNumber(item.housingFund ?? item.housing_fund),
          personal_tax: toNumber(item.personalTax ?? item.personal_tax),
          other_deduction: toNumber(item.otherDeduction ?? item.other_deduction),
          actual_salary: toNumber(item.actualSalary ?? item.actual_salary),
          remark: item.remark,
        }));
        setSalaries(list);
        const totalSalary = list.reduce(
          (sum: number, s: Salary) => sum + (parseFloat(String(s.actual_salary)) || 0),
          0
        );
        setStats({
          totalEmployees: list.length,
          paidEmployees: list.length,
          totalSalary,
          avgSalary: list.length > 0 ? Math.round(totalSalary / list.length) : 0,
          maxSalary:
            list.length > 0
              ? Math.max(...list.map((s: Salary) => parseFloat(String(s.actual_salary)) || 0))
              : 0,
          minSalary:
            list.length > 0
              ? Math.min(...list.map((s: Salary) => parseFloat(String(s.actual_salary)) || 0))
              : 0,
          deptStats: [],
        });
      }

      if (deptData.success) {
        const rawDeptData = deptData.data;
        const deptList = Array.isArray(rawDeptData) ? rawDeptData : rawDeptData?.list || [];
        setDepartments(deptList);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, []);

  // 薪资表单
  const [salaryForm, setSalaryForm] = useState({
    basicSalary: 0,
    positionAllowance: 0,
    performanceBonus: 0,
    overtimePay: 0,
    otherBonus: 0,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    otherDeduction: 0,
    remark: '',
  });

  // 计算实发工资
  const calculateActualSalary = (form: typeof salaryForm) => {
    const income =
      toNumber(form.basicSalary) +
      toNumber(form.positionAllowance) +
      toNumber(form.performanceBonus) +
      toNumber(form.overtimePay) +
      toNumber(form.otherBonus);
    const deduction =
      toNumber(form.socialSecurity) +
      toNumber(form.housingFund) +
      toNumber(form.personalTax) +
      toNumber(form.otherDeduction);
    return income - deduction;
  };

  // 筛选薪资
  const filteredSalaries = salaries.filter((salary) => {
    if (selectedDept !== 'all' && salary.dept_id !== parseInt(selectedDept)) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        salary.name.toLowerCase().includes(query) ||
        salary.employee_no.toLowerCase().includes(query) ||
        salary.position.toLowerCase().includes(query)
      );
    }
    return true;
  });
  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } = useRowSelection(
    filteredSalaries,
    (r) => String(r.id)
  );
  const [deleting, setDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch('/api/hr/salary?id=' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    await fetchSalaryData();
  };

  const sortedSalaries = (() => {
    if (!sortField) return filteredSalaries;
    return [...filteredSalaries].sort((a, b) => {
      let aVal: Loose, bVal: Loose;
      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'employee_no':
          aVal = a.employee_no;
          bVal = b.employee_no;
          break;
        case 'dept_name':
          aVal = a.dept_name;
          bVal = b.dept_name;
          break;
        case 'basic_salary':
          aVal = a.basic_salary || 0;
          bVal = b.basic_salary || 0;
          break;
        case 'actual_salary':
          aVal = a.actual_salary || 0;
          bVal = b.actual_salary || 0;
          break;
        default:
          return 0;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  })();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({
    field,
    children,
    className = '',
  }: {
    field: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // 查看详情
  const handleViewDetail = (salary: Salary) => {
    setSelectedSalary(salary);
    setIsDetailOpen(true);
  };

  // 编辑薪资
  const handleEdit = (salary: Salary) => {
    setSelectedSalary(salary);
    setSalaryForm({
      basicSalary: Number(salary.basic_salary) || 0,
      positionAllowance: Number(salary.position_allowance) || 0,
      performanceBonus: Number(salary.performance_bonus) || 0,
      overtimePay: Number(salary.overtime_pay) || 0,
      otherBonus: Number(salary.other_bonus) || 0,
      socialSecurity: Number(salary.social_security) || 0,
      housingFund: Number(salary.housing_fund) || 0,
      personalTax: Number(salary.personal_tax) || 0,
      otherDeduction: Number(salary.other_deduction) || 0,
      remark: salary.remark || '',
    });
    setIsEditOpen(true);
  };

  // 保存薪资
  const handleSave = async () => {
    if (!selectedSalary) return;
    setLoading(true);
    try {
      const actualSalary = calculateActualSalary(salaryForm);
      const res = await authFetch('/api/hr/salary', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedSalary.id,
          month: currentMonth,
          basicSalary: salaryForm.basicSalary,
          positionAllowance: salaryForm.positionAllowance,
          performanceBonus: salaryForm.performanceBonus,
          overtimePay: salaryForm.overtimePay,
          otherBonus: salaryForm.otherBonus,
          socialSecurity: salaryForm.socialSecurity,
          housingFund: salaryForm.housingFund,
          personalTax: salaryForm.personalTax,
          otherDeduction: salaryForm.otherDeduction,
          remark: salaryForm.remark,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchSalaryData();
        setIsEditOpen(false);
        toast({ title: t('salarySaveSuccess') });
      } else {
        toast({ title: t('salarySaveFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('salarySaveFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 删除薪资
  const handleDelete = async (salary: Salary) => {
    if (!confirm(t('confirmDeleteSalary', { name: salary.name }))) return;
    if (!salary.salary_id) {
      toast({ title: tc('error'), description: tc('failed'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/hr/salary?id=' + salary.salary_id, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        await fetchSalaryData();
        toast({ title: t('salaryDeleteSuccess') });
      } else {
        toast({ title: t('salarySaveFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('salarySaveFailed'), variant: 'destructive' });
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
            <title>${t('salaryReport')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              h1 { text-align: center; }
              .text-right { text-align: right; }
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

  // 切换月份
  const changeMonth = (offset: number) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  return (
    <MainLayout title={t('salaryManagement')}>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <StatsCards
          configs={[
            { key: 'totalEmployees', label: '员工总数', icon: Users, ...StatsTheme.blue },
            { key: 'paidEmployees', label: '已发薪人数', icon: CreditCard, ...StatsTheme.green },
            { key: 'totalSalary', label: '工资总额', icon: DollarSign, ...StatsTheme.purple },
            { key: 'avgSalary', label: '平均工资', icon: TrendingUp, ...StatsTheme.orange },
            { key: 'maxSalary', label: '最高工资', icon: Wallet, ...StatsTheme.cyan },
            { key: 'minSalary', label: '最低工资', icon: PieChart, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'totalEmployees', count: stats.totalEmployees },
            { key: 'paidEmployees', count: stats.paidEmployees },
            { key: 'totalSalary', count: stats.totalSalary, prefix: '¥' },
            { key: 'avgSalary', count: stats.avgSalary, prefix: '¥' },
            { key: 'maxSalary', count: stats.maxSalary, prefix: '¥' },
            { key: 'minSalary', count: stats.minSalary, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 6 }}
        />


        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 月份选择 */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentMonth}</span>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* 部门筛选 */}
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={tc('selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allDepartment')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 搜索 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tc('searchPlaceholder')}
                    className="pl-10 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  {tc('salaryReport')}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                </Button>
                <GlobalExportToolbar
                  filename={`${t('salaryTable')}_${currentMonth}`}
                  title={t('salaryTable')}
                  landscape
                  columns={[
                    { key: 'employee_no', label: t('employeeNo'), width: 12 },
                    { key: 'name', label: tc('name'), width: 10 },
                    { key: 'dept_name', label: tc('department'), width: 12 },
                    { key: 'position', label: t('position'), width: 12 },
                    {
                      key: 'basic_salary',
                      label: t('basicSalary'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'position_allowance',
                      label: t('positionAllowance'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'performance_bonus',
                      label: t('performanceBonus'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'overtime_pay',
                      label: t('overtimePay'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'other_bonus',
                      label: t('otherBonus'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'social_security',
                      label: t('socialSecurity'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'housing_fund',
                      label: t('housingFund'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'personal_tax',
                      label: t('personalTax'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'other_deduction',
                      label: t('otherDeduction'),
                      width: 10,
                      formatter: (v) => Number(v || 0),
                    },
                    {
                      key: 'actual_salary',
                      label: t('actualSalary'),
                      width: 12,
                      formatter: (v) => Number(v || 0),
                    },
                    { key: 'remark', label: tc('remark'), width: 15 },
                  ]}
                  data={
                    selectedCount > 0
                      ? filteredSalaries.filter((s) => isSelected(String(s.id)))
                      : filteredSalaries
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 薪资列表 */}
        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} loading={deleting} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><input ref={selectAllRef} type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={allSelected} onChange={toggleAll} aria-label={tc('selectAll')} /></TableHead>
                  <TableHead className="w-10 text-center">{tc('serialNo')}</TableHead>
                  <SortableHeader field="name" className="w-28">{tc('employeeInfo')}</SortableHeader>
                  <SortableHeader field="dept_name" className="w-28">{tc('deptPosition')}</SortableHeader>
                  <SortableHeader field="basic_salary" className="text-right w-24">
                    {tc('baseSalary')}
                  </SortableHeader>
                  <TableHead className="text-right w-28">{tc('allowanceBonus')}</TableHead>
                  <TableHead className="text-right w-28">{tc('deductionItems')}</TableHead>
                  <SortableHeader field="actual_salary" className="text-right w-24">
                    {tc('netSalary')}
                  </SortableHeader>
                  <TableHead className="w-20">{tc('status')}</TableHead>
                  <TableHead className="w-20">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSalaries.map((salary, index) => (
                  <TableRow key={salary.id}>
                      <TableCell><input type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={isSelected(String(salary.id))} onChange={() => toggle(String(salary.id))} aria-label={tc('selectRow', { id: salary.id })} /></TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>
                    <TableCell className="max-w-28">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">{salary.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{salary.employee_no}</span>
                        <span className="text-xs text-muted-foreground">{getGenderText(salary.gender)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-28">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate">{salary.dept_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{salary.position}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      ¥{(salary.basic_salary || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate">{tc('positionAllowanceShort')} {(salary.position_allowance || 0).toLocaleString()}</span>
                        <span className="truncate">{tc('performanceBonusShort')} {(salary.performance_bonus || 0).toLocaleString()}</span>
                        <span className="truncate">{tc('overtimePayShort')} {(salary.overtime_pay || 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate">{tc('socialSecurityShort')} {(salary.social_security || 0).toLocaleString()}</span>
                        <span className="truncate">{tc('housingFundShort')} {(salary.housing_fund || 0).toLocaleString()}</span>
                        <span className="truncate">{tc('personalTaxShort')} {(salary.personal_tax || 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                        ¥{(salary.actual_salary || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {salary.actual_salary ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {tc('salaryStatusPaid')}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {tc('salaryStatusPending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => handleViewDetail(salary)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => handleEdit(salary)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(salary)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {tc('view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(salary)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {tc('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(salary)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tc('delete')}
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

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            {selectedSalary && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {tc('editSalaryTitle')}
                    {selectedSalary.name}
                  </DialogTitle>
                  <DialogDescription>
                    {currentMonth}
                    {tc('salaryDetail')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 员工信息 */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{tc('employeeNoLabelShort')}</span>
                        <span className="ml-2 font-medium">{selectedSalary.employee_no}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('employeeNameLabel')}</span>
                        <span className="ml-2 font-medium">{selectedSalary.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('deptLabel')}</span>
                        <span className="ml-2">{selectedSalary.dept_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('positionLabel')}</span>
                        <span className="ml-2">{selectedSalary.position}</span>
                      </div>
                    </div>
                  </div>

                  {/* 收入项目 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {tc('incomeItems')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('basicSalary')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.basicSalary}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              basicSalary: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('positionAllowance')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.positionAllowance}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              positionAllowance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('performanceBonus')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.performanceBonus}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              performanceBonus: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('overtimePay')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.overtimePay}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              overtimePay: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('otherBonus')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.otherBonus}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              otherBonus: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 扣款项目 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {tc('deductionItems')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('socialSecurity')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.socialSecurity}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              socialSecurity: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('housingFund')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.housingFund}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              housingFund: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('personalTax')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.personalTax}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              personalTax: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('otherDeduction')}</Label>
                        <Input
                          type="number"
                          value={salaryForm.otherDeduction}
                          onChange={(e) =>
                            setSalaryForm({
                              ...salaryForm,
                              otherDeduction: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 实发工资 */}
                  <div className="bg-green-500/10 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{tc('netSalaryLabel')}</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ¥{calculateActualSalary(salaryForm).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 备注 */}
                  <div className="space-y-2">
                    <Label>{tc('remark')}</Label>
                    <Textarea
                      placeholder={t('enterRemark')}
                      value={salaryForm.remark}
                      onChange={(e) => setSalaryForm({ ...salaryForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? tc('loading') : tc('save')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl" resizable>
            {selectedSalary && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {tc('viewSalaryDetailTitle')}
                    {selectedSalary.name}
                  </DialogTitle>
                  <DialogDescription>
                    {currentMonth}
                    {tc('salaryDetail')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 员工信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {tc('employeeInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{tc('employeeNoLabelShort')}</span>
                        <span>{selectedSalary.employee_no}</span>
                        <span className="text-muted-foreground">{tc('employeeNameLabel')}</span>
                        <span>{selectedSalary.name}</span>
                        <span className="text-muted-foreground">{tc('genderLabel')}</span>
                        <span>{getGenderText(selectedSalary.gender)}</span>
                        <span className="text-muted-foreground">{tc('entryDateLabel')}</span>
                        <span>{selectedSalary.entry_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {tc('positionInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{tc('deptLabel')}</span>
                        <span>{selectedSalary.dept_name}</span>
                        <span className="text-muted-foreground">{tc('positionLabel')}</span>
                        <span>{selectedSalary.position}</span>
                        <span className="text-muted-foreground">{tc('salaryMonthLabel')}</span>
                        <span>{selectedSalary.month || currentMonth}</span>
                      </div>
                    </div>
                  </div>

                  {/* 薪资明细 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {tc('salaryDetail')}
                    </h4>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{t('basicSalary')}</TableCell>
                          <TableCell className="text-right">
                            ¥{(selectedSalary.basic_salary || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('positionAllowance')}</TableCell>
                          <TableCell className="text-right">
                            ¥{(selectedSalary.position_allowance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('performanceBonus')}</TableCell>
                          <TableCell className="text-right">
                            ¥{(selectedSalary.performance_bonus || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('overtimePay')}</TableCell>
                          <TableCell className="text-right">
                            ¥{(selectedSalary.overtime_pay || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('otherBonus')}</TableCell>
                          <TableCell className="text-right">
                            ¥{(selectedSalary.other_bonus || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-green-500/10">
                          <TableCell className="font-bold">{t('incomeTotal')}</TableCell>
                          <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                            ¥
                            {(
                              (selectedSalary.basic_salary || 0) +
                              (selectedSalary.position_allowance || 0) +
                              (selectedSalary.performance_bonus || 0) +
                              (selectedSalary.overtime_pay || 0) +
                              (selectedSalary.other_bonus || 0)
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600 dark:text-red-400">
                            {t('socialSecurity')}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            -¥{(selectedSalary.social_security || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600 dark:text-red-400">
                            {t('housingFund')}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            -¥{(selectedSalary.housing_fund || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600 dark:text-red-400">
                            {t('personalTax')}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            -¥{(selectedSalary.personal_tax || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600 dark:text-red-400">
                            {t('otherDeduction')}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            -¥{(selectedSalary.other_deduction || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-500/10">
                          <TableCell className="font-bold">{t('actualSalary')}</TableCell>
                          <TableCell className="text-right font-bold text-xl text-blue-600 dark:text-blue-400">
                            ¥{(selectedSalary.actual_salary || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {selectedSalary.remark && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {tc('remark')}
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded">{selectedSalary.remark}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleEdit(selectedSalary);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {tc('edit')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 报表对话框 */}
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('salaryReport')}
              </DialogTitle>
              <DialogDescription>
                {currentMonth}
                {tc('reportSubtitle')}
              </DialogDescription>
            </DialogHeader>

            <div ref={printRef} className="space-y-6 py-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">{t('salaryReport')}</h1>
                <p className="text-muted-foreground mt-2">
                  {tc('salaryMonthLabel')}
                  {currentMonth}
                </p>
                <p className="text-muted-foreground">
                  {tc('reportGeneratedAt')}
                  {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>

              <div className="grid grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalEmployees}</div>
                    <div className="text-sm text-muted-foreground">{tc('totalEmployees')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paidEmployees}</div>
                    <div className="text-sm text-muted-foreground">{tc('paidEmployees')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ¥{stats.totalSalary.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{tc('totalSalary')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ¥{stats.avgSalary.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{tc('avgSalary')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      ¥{stats.maxSalary.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{tc('maxSalary')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      ¥{stats.minSalary.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{tc('minSalary')}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-4">{tc('salaryDetail')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('employeeNo')}</TableHead>
                      <TableHead>{tc('name')}</TableHead>
                      <TableHead>{tc('department')}</TableHead>
                      <TableHead>{tc('position')}</TableHead>
                      <TableHead className="text-right">{t('basicSalary')}</TableHead>
                      <TableHead className="text-right">{t('actualSalary')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaries.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell>{salary.employee_no}</TableCell>
                        <TableCell>{salary.name}</TableCell>
                        <TableCell>{salary.dept_name}</TableCell>
                        <TableCell>{salary.position}</TableCell>
                        <TableCell className="text-right">
                          ¥{(salary.basic_salary || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ¥{(salary.actual_salary || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t mt-8">
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">{tc('signaturePrepared')}</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">{tc('signatureReviewed')}</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">{tc('signatureApproved')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                {tc('close')}
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {tc('print')}
                {t('salaryReport')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
