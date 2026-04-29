'use client';

import { useState, useEffect, useRef } from 'react';
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
  Download,
  Users,
  DollarSign,
  CreditCard,
  Wallet,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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

// 获取性别文本
const getGenderText = (gender: number) => {
  return gender === 1 ? '男' : gender === 2 ? '女' : '未知';
};

// 模拟薪资数据
const mockSalaries: Salary[] = [
  {
    id: 1,
    employee_no: 'EMP2024001',
    name: '张三',
    gender: 1,
    dept_id: 1,
    dept_name: '生产部',
    position: '生产主管',
    entry_date: '2023-01-15',
    status: 1,
    salary_id: 1,
    month: '2024-03',
    basic_salary: 8000,
    position_allowance: 2000,
    performance_bonus: 1500,
    overtime_pay: 800,
    other_bonus: 500,
    social_security: 800,
    housing_fund: 1000,
    personal_tax: 200,
    other_deduction: 0,
    actual_salary: 10800,
    remark: '正常发放',
  },
  {
    id: 2,
    employee_no: 'EMP2024002',
    name: '李四',
    gender: 2,
    dept_id: 1,
    dept_name: '生产部',
    position: '操作工',
    entry_date: '2023-03-20',
    status: 1,
    salary_id: 2,
    month: '2024-03',
    basic_salary: 5000,
    position_allowance: 500,
    performance_bonus: 800,
    overtime_pay: 1200,
    other_bonus: 300,
    social_security: 500,
    housing_fund: 600,
    personal_tax: 0,
    other_deduction: 0,
    actual_salary: 6700,
    remark: '正常发放',
  },
  {
    id: 3,
    employee_no: 'EMP2024003',
    name: '王五',
    gender: 1,
    dept_id: 2,
    dept_name: '品质部',
    position: '质检员',
    entry_date: '2023-02-10',
    status: 1,
    salary_id: 3,
    month: '2024-03',
    basic_salary: 5500,
    position_allowance: 800,
    performance_bonus: 1000,
    overtime_pay: 600,
    other_bonus: 200,
    social_security: 550,
    housing_fund: 660,
    personal_tax: 0,
    other_deduction: 0,
    actual_salary: 6890,
    remark: '正常发放',
  },
  {
    id: 4,
    employee_no: 'EMP2024004',
    name: '赵六',
    gender: 1,
    dept_id: 3,
    dept_name: '技术部',
    position: '工程师',
    entry_date: '2022-08-05',
    status: 1,
    salary_id: 4,
    month: '2024-03',
    basic_salary: 10000,
    position_allowance: 3000,
    performance_bonus: 2000,
    overtime_pay: 0,
    other_bonus: 1000,
    social_security: 1000,
    housing_fund: 1200,
    personal_tax: 500,
    other_deduction: 0,
    actual_salary: 13300,
    remark: '正常发放',
  },
  {
    id: 5,
    employee_no: 'EMP2024005',
    name: '孙七',
    gender: 2,
    dept_id: 4,
    dept_name: '销售部',
    position: '销售经理',
    entry_date: '2022-05-12',
    status: 1,
    salary_id: 5,
    month: '2024-03',
    basic_salary: 9000,
    position_allowance: 2500,
    performance_bonus: 3000,
    overtime_pay: 0,
    other_bonus: 1500,
    social_security: 900,
    housing_fund: 1080,
    personal_tax: 600,
    other_deduction: 0,
    actual_salary: 13420,
    remark: '含销售提成',
  },
  {
    id: 6,
    employee_no: 'EMP2024006',
    name: '周八',
    gender: 1,
    dept_id: 5,
    dept_name: '财务部',
    position: '会计',
    entry_date: '2023-06-01',
    status: 1,
    salary_id: 6,
    month: '2024-03',
    basic_salary: 6500,
    position_allowance: 1000,
    performance_bonus: 1200,
    overtime_pay: 0,
    other_bonus: 300,
    social_security: 650,
    housing_fund: 780,
    personal_tax: 100,
    other_deduction: 0,
    actual_salary: 7470,
    remark: '正常发放',
  },
];

// 模拟部门数据
const mockDepartments: Department[] = [
  { id: 1, dept_name: '生产部', dept_code: 'PROD', parent_id: 0 },
  { id: 2, dept_name: '品质部', dept_code: 'QUAL', parent_id: 0 },
  { id: 3, dept_name: '技术部', dept_code: 'TECH', parent_id: 0 },
  { id: 4, dept_name: '销售部', dept_code: 'SALE', parent_id: 0 },
  { id: 5, dept_name: '财务部', dept_code: 'FIN', parent_id: 0 },
  { id: 6, dept_name: '人事部', dept_code: 'HR', parent_id: 0 },
];

export default function HRSalaryPage() {
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
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const [salaryRes, deptRes] = await Promise.all([
        fetch('/api/hr/salary'),
        fetch('/api/organization/department'),
      ]);
      const salaryData = await salaryRes.json();
      const deptData = await deptRes.json();

      if (salaryData.success) {
        const list = Array.isArray(salaryData.data) ? salaryData.data : [];
        setSalaries(list);
        const totalSalary = list.reduce((sum: number, s: Salary) => sum + (parseFloat(String(s.actual_salary)) || 0), 0);
        setStats({
          totalEmployees: list.length,
          paidEmployees: list.length,
          totalSalary,
          avgSalary: list.length > 0 ? Math.round(totalSalary / list.length) : 0,
          maxSalary: list.length > 0 ? Math.max(...list.map((s: Salary) => parseFloat(String(s.actual_salary)) || 0)) : 0,
          minSalary: list.length > 0 ? Math.min(...list.map((s: Salary) => parseFloat(String(s.actual_salary)) || 0)) : 0,
          deptStats: [],
        });
      }

      if (deptData.success) {
        const deptList = Array.isArray(deptData.data) ? deptData.data : [];
        setDepartments(deptList);
      }
    } catch (error) {
      console.error('获取薪资数据失败:', error);
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
    const income = form.basicSalary + form.positionAllowance + form.performanceBonus + 
                   form.overtimePay + form.otherBonus;
    const deduction = form.socialSecurity + form.housingFund + form.personalTax + 
                      form.otherDeduction;
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

  // 查看详情
  const handleViewDetail = (salary: Salary) => {
    setSelectedSalary(salary);
    setIsDetailOpen(true);
  };

  // 编辑薪资
  const handleEdit = (salary: Salary) => {
    setSelectedSalary(salary);
    setSalaryForm({
      basicSalary: salary.basic_salary || 0,
      positionAllowance: salary.position_allowance || 0,
      performanceBonus: salary.performance_bonus || 0,
      overtimePay: salary.overtime_pay || 0,
      otherBonus: salary.other_bonus || 0,
      socialSecurity: salary.social_security || 0,
      housingFund: salary.housing_fund || 0,
      personalTax: salary.personal_tax || 0,
      otherDeduction: salary.other_deduction || 0,
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
      
      // 更新本地数据
      setSalaries(salaries.map(s => 
        s.id === selectedSalary.id 
          ? { 
              ...s, 
              basic_salary: salaryForm.basicSalary,
              position_allowance: salaryForm.positionAllowance,
              performance_bonus: salaryForm.performanceBonus,
              overtime_pay: salaryForm.overtimePay,
              other_bonus: salaryForm.otherBonus,
              social_security: salaryForm.socialSecurity,
              housing_fund: salaryForm.housingFund,
              personal_tax: salaryForm.personalTax,
              other_deduction: salaryForm.otherDeduction,
              actual_salary: actualSalary,
              remark: salaryForm.remark,
            }
          : s
      ));
      
      setIsEditOpen(false);
      alert('薪资保存成功');
    } catch (error) {
      console.error('保存薪资失败:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除薪资
  const handleDelete = (salary: Salary) => {
    if (confirm(`确定要删除 ${salary.name} 的薪资记录吗？`)) {
      setSalaries(salaries.filter(s => s.id !== salary.id));
      alert('删除成功');
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
            <title>薪资报表</title>
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

  // 导出Excel
  const handleExport = () => {
    const csvContent = [
      ['员工编号', '姓名', '部门', '职位', '基本工资', '岗位津贴', '绩效奖金', '加班费', '其他奖金', 
       '社保', '公积金', '个税', '其他扣款', '实发工资', '备注'],
      ...filteredSalaries.map(s => [
        s.employee_no, s.name, s.dept_name, s.position,
        s.basic_salary || 0, s.position_allowance || 0, s.performance_bonus || 0,
        s.overtime_pay || 0, s.other_bonus || 0, s.social_security || 0,
        s.housing_fund || 0, s.personal_tax || 0, s.other_deduction || 0,
        s.actual_salary || 0, s.remark || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `薪资表_${currentMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 切换月份
  const changeMonth = (offset: number) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  return (
    <MainLayout title="薪资管理">
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">员工总数</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已发薪人数</CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paidEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">薪资总额</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{stats.totalSalary.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均工资</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{stats.avgSalary.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最高工资</CardTitle>
              <Wallet className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{stats.maxSalary.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最低工资</CardTitle>
              <PieChart className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{stats.minSalary.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

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
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部部门</SelectItem>
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
                    placeholder="搜索员工姓名、编号..."
                    className="pl-10 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  薪资报表
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  打印
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 薪资列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工信息</TableHead>
                  <TableHead>部门/职位</TableHead>
                  <TableHead className="text-right">基本工资</TableHead>
                  <TableHead className="text-right">津贴/奖金</TableHead>
                  <TableHead className="text-right">扣款项</TableHead>
                  <TableHead className="text-right">实发工资</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{salary.name}</span>
                        <span className="text-xs text-muted-foreground">{salary.employee_no}</span>
                        <span className="text-xs text-muted-foreground">{getGenderText(salary.gender)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{salary.dept_name}</span>
                        <span className="text-xs text-muted-foreground">{salary.position}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{(salary.basic_salary || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col text-xs">
                        <span>岗位: ¥{(salary.position_allowance || 0).toLocaleString()}</span>
                        <span>绩效: ¥{(salary.performance_bonus || 0).toLocaleString()}</span>
                        <span>加班: ¥{(salary.overtime_pay || 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col text-xs">
                        <span>社保: ¥{(salary.social_security || 0).toLocaleString()}</span>
                        <span>公积金: ¥{(salary.housing_fund || 0).toLocaleString()}</span>
                        <span>个税: ¥{(salary.personal_tax || 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-lg text-green-600">
                        ¥{(salary.actual_salary || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {salary.actual_salary ? (
                        <Badge className="bg-green-100 text-green-700">已发放</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">未录入</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(salary)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(salary)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(salary)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(salary)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑薪资
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(salary)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除记录
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
                    编辑薪资: {selectedSalary.name}
                  </DialogTitle>
                  <DialogDescription>{currentMonth} 薪资明细</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 员工信息 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">员工编号:</span>
                        <span className="ml-2 font-medium">{selectedSalary.employee_no}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">姓名:</span>
                        <span className="ml-2 font-medium">{selectedSalary.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">部门:</span>
                        <span className="ml-2">{selectedSalary.dept_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">职位:</span>
                        <span className="ml-2">{selectedSalary.position}</span>
                      </div>
                    </div>
                  </div>

                  {/* 收入项目 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground">收入项目</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>基本工资</Label>
                        <Input
                          type="number"
                          value={salaryForm.basicSalary}
                          onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>岗位津贴</Label>
                        <Input
                          type="number"
                          value={salaryForm.positionAllowance}
                          onChange={(e) => setSalaryForm({ ...salaryForm, positionAllowance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>绩效奖金</Label>
                        <Input
                          type="number"
                          value={salaryForm.performanceBonus}
                          onChange={(e) => setSalaryForm({ ...salaryForm, performanceBonus: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>加班费</Label>
                        <Input
                          type="number"
                          value={salaryForm.overtimePay}
                          onChange={(e) => setSalaryForm({ ...salaryForm, overtimePay: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>其他奖金</Label>
                        <Input
                          type="number"
                          value={salaryForm.otherBonus}
                          onChange={(e) => setSalaryForm({ ...salaryForm, otherBonus: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 扣款项目 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground">扣款项目</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>社保</Label>
                        <Input
                          type="number"
                          value={salaryForm.socialSecurity}
                          onChange={(e) => setSalaryForm({ ...salaryForm, socialSecurity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>公积金</Label>
                        <Input
                          type="number"
                          value={salaryForm.housingFund}
                          onChange={(e) => setSalaryForm({ ...salaryForm, housingFund: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>个人所得税</Label>
                        <Input
                          type="number"
                          value={salaryForm.personalTax}
                          onChange={(e) => setSalaryForm({ ...salaryForm, personalTax: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>其他扣款</Label>
                        <Input
                          type="number"
                          value={salaryForm.otherDeduction}
                          onChange={(e) => setSalaryForm({ ...salaryForm, otherDeduction: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 实发工资 */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">实发工资:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ¥{calculateActualSalary(salaryForm).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 备注 */}
                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea
                      placeholder="输入备注信息..."
                      value={salaryForm.remark}
                      onChange={(e) => setSalaryForm({ ...salaryForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? '保存中...' : '保存'}
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
                    薪资详情: {selectedSalary.name}
                  </DialogTitle>
                  <DialogDescription>{currentMonth} 薪资明细</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* 员工信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">员工信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">员工编号:</span>
                        <span>{selectedSalary.employee_no}</span>
                        <span className="text-muted-foreground">姓名:</span>
                        <span>{selectedSalary.name}</span>
                        <span className="text-muted-foreground">性别:</span>
                        <span>{getGenderText(selectedSalary.gender)}</span>
                        <span className="text-muted-foreground">入职日期:</span>
                        <span>{selectedSalary.entry_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">职位信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">部门:</span>
                        <span>{selectedSalary.dept_name}</span>
                        <span className="text-muted-foreground">职位:</span>
                        <span>{selectedSalary.position}</span>
                        <span className="text-muted-foreground">薪资月份:</span>
                        <span>{selectedSalary.month || currentMonth}</span>
                      </div>
                    </div>
                  </div>

                  {/* 薪资明细 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">薪资明细</h4>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">基本工资</TableCell>
                          <TableCell className="text-right">¥{(selectedSalary.basic_salary || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">岗位津贴</TableCell>
                          <TableCell className="text-right">¥{(selectedSalary.position_allowance || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">绩效奖金</TableCell>
                          <TableCell className="text-right">¥{(selectedSalary.performance_bonus || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">加班费</TableCell>
                          <TableCell className="text-right">¥{(selectedSalary.overtime_pay || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">其他奖金</TableCell>
                          <TableCell className="text-right">¥{(selectedSalary.other_bonus || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50">
                          <TableCell className="font-bold">收入合计</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            ¥{((selectedSalary.basic_salary || 0) + 
                                (selectedSalary.position_allowance || 0) + 
                                (selectedSalary.performance_bonus || 0) + 
                                (selectedSalary.overtime_pay || 0) + 
                                (selectedSalary.other_bonus || 0)).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">社保</TableCell>
                          <TableCell className="text-right text-red-600">-¥{(selectedSalary.social_security || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">公积金</TableCell>
                          <TableCell className="text-right text-red-600">-¥{(selectedSalary.housing_fund || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">个人所得税</TableCell>
                          <TableCell className="text-right text-red-600">-¥{(selectedSalary.personal_tax || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">其他扣款</TableCell>
                          <TableCell className="text-right text-red-600">-¥{(selectedSalary.other_deduction || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50">
                          <TableCell className="font-bold">实发工资</TableCell>
                          <TableCell className="text-right font-bold text-xl text-blue-600">
                            ¥{(selectedSalary.actual_salary || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {selectedSalary.remark && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">备注</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedSalary.remark}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      关闭
                    </Button>
                    <Button onClick={() => {
                      setIsDetailOpen(false);
                      handleEdit(selectedSalary);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
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
                薪资报表
              </DialogTitle>
              <DialogDescription>{currentMonth} 薪资汇总报表</DialogDescription>
            </DialogHeader>

            <div ref={printRef} className="space-y-6 py-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">薪资报表</h1>
                <p className="text-muted-foreground mt-2">薪资月份: {currentMonth}</p>
                <p className="text-muted-foreground">生成时间: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
              </div>

              <div className="grid grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalEmployees}</div>
                    <div className="text-sm text-muted-foreground">员工总数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.paidEmployees}</div>
                    <div className="text-sm text-muted-foreground">已发薪人数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">¥{stats.totalSalary.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">薪资总额</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">¥{stats.avgSalary.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">平均工资</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">¥{stats.maxSalary.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">最高工资</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-pink-600">¥{stats.minSalary.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">最低工资</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-4">薪资明细</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工编号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>职位</TableHead>
                      <TableHead className="text-right">基本工资</TableHead>
                      <TableHead className="text-right">实发工资</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaries.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell>{salary.employee_no}</TableCell>
                        <TableCell>{salary.name}</TableCell>
                        <TableCell>{salary.dept_name}</TableCell>
                        <TableCell>{salary.position}</TableCell>
                        <TableCell className="text-right">¥{(salary.basic_salary || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">¥{(salary.actual_salary || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t mt-8">
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">制表人签字</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">财务审核</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-dashed mb-2"></div>
                  <div className="text-sm text-muted-foreground">总经理签字</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                关闭
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                打印报表
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
