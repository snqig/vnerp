'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, UserCircle, RefreshCw, Printer, QrCode, Upload, X, CheckSquare, Square, FileSpreadsheet, FileText, BarChart3, Users, GraduationCap, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { usePermission } from '@/hooks/usePermission';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyName } from '@/hooks/useCompanyName';

// 员工接口
interface Employee {
  id: number;
  employee_no: string;
  name: string;
  gender: number;
  age?: number;
  id_card?: string;
  phone: string;
  email: string;
  dept_id: number;
  dept_name: string;
  section?: string;
  role_id: number;
  role_name: string;
  position: string;
  entry_date: string;
  birth_date?: string;
  native_place?: string;
  home_address?: string;
  current_address?: string;
  birth_month?: string;
  id_card_expiry?: string;
  education?: string;
  status: number;
  remark?: string;
  photo?: string;
}

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
}

// 角色接口
interface Role {
  id: number;
  role_code: string;
  role_name: string;
}

export default function EmployeePage() {
  const { companyName } = useCompanyName();
  const { hasPermission } = usePermission();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [batchPrintDialogOpen, setBatchPrintDialogOpen] = useState(false);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    avgAge: 0,
    education: {} as Record<string, number>
  });

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Employee | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // 计算统计数据
  const calculateStats = useCallback((data: Employee[]) => {
    const total = data.length;
    const male = data.filter(e => e.gender === 1).length;
    const female = data.filter(e => e.gender === 2).length;
    const ages = data.filter(e => e.age).map(e => e.age!);
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    
    const education: Record<string, number> = {};
    data.forEach(e => {
      const edu = e.education || '未填写';
      education[edu] = (education[edu] || 0) + 1;
    });

    setStats({ total, male, female, avgAge, education });
  }, []);

  // 排序函数
  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 获取排序后的员工列表
  const sortedEmployees = useCallback(() => {
    if (!sortConfig.key) return employees;
    
    return [...employees].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue, 'zh-CN')
          : bValue.localeCompare(aValue, 'zh-CN');
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [employees, sortConfig]);

  // 获取员工列表
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const url = debouncedSearch 
        ? `/api/organization/employee?keyword=${encodeURIComponent(debouncedSearch)}`
        : '/api/organization/employee';
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error('获取员工列表失败:', error);
      toast.error('获取员工列表失败');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, calculateStats]);

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/organization/department');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  }, []);

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/organization/role');
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
    }
  }, []);

  // 生成员工编号
  const generateEmployeeNo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `E${year}${random}`;
  };

  // 处理照片上传
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const result = await response.json();
      if (result.success) {
        setForm({ ...form, photo: result.url });
        toast.success('照片上传成功');
      } else {
        toast.error(result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传照片失败:', error);
      toast.error('上传照片失败');
    } finally {
      setUploadingPhoto(false);
      // 清空 input 以便可以重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除照片
  const handleRemovePhoto = () => {
    setForm({ ...form, photo: undefined });
  };

  // 保存员工
  const saveEmployee = async () => {
    try {
      // 验证必填字段
      if (!form.name) {
        toast.error('请输入员工姓名');
        return;
      }

      // 确保 employee_no 有值
      const submitData = {
        ...form,
        employee_no: form.employee_no || generateEmployeeNo()
      };

      console.log('提交数据:', submitData);

      const method = editing ? 'PUT' : 'POST';
      const response = await fetch('/api/organization/employee', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(editing ? '员工更新成功' : '员工创建成功');
        setDialogOpen(false);
        fetchEmployees();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('保存员工失败:', error);
      toast.error('保存员工失败');
    }
  };

  // 删除员工
  const deleteEmployee = async (id: number) => {
    if (!confirm('确定要删除该员工吗？')) return;
    try {
      const response = await fetch(`/api/organization/employee?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        toast.success('员工删除成功');
        fetchEmployees();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除员工失败:', error);
      toast.error('删除员工失败');
    }
  };

  // 选择/取消选择员工
  const toggleSelectEmployee = (id: number) => {
    setSelectedEmployees(prev => 
      prev.includes(id) 
        ? prev.filter(empId => empId !== id)
        : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const handlePrintList = () => {
    const dataToPrint = selectedEmployees.length > 0
      ? employees.filter(emp => selectedEmployees.includes(emp.id))
      : employees;

    if (dataToPrint.length === 0) {
      toast.error('没有数据可打印');
      return;
    }

    const statusLabels: Record<number, string> = { 1: '在职', 0: '停用', 2: '试用期', 3: '离职' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }

    const rows = dataToPrint.map((emp, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${emp.employee_no}</td>
        <td>${emp.name}</td>
        <td>${emp.gender === 1 ? '男' : '女'}</td>
        <td>${emp.age || '-'}</td>
        <td>${emp.dept_name}</td>
        <td>${emp.section || '-'}</td>
        <td>${emp.position}</td>
        <td>${emp.entry_date}</td>
        <td>${emp.education || '-'}</td>
        <td>${emp.native_place || '-'}</td>
        <td>${emp.phone}</td>
        <td>${statusLabels[emp.status] || '未知'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>员工列表打印</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>员工列表</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${dataToPrint.length} 名员工</div>
        <table>
          <thead><tr><th>序号</th><th>员工编号</th><th>姓名</th><th>性别</th><th>年龄</th><th>部门</th><th>课室</th><th>职位</th><th>入职日期</th><th>学历</th><th>籍贯</th><th>联系方式</th><th>状态</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(`正在打印 ${dataToPrint.length} 名员工记录`);
  };

  // 批量打印
  const handleBatchPrint = () => {
    if (selectedEmployees.length === 0) {
      toast.error('请先选择要打印的员工');
      return;
    }
    setBatchPrintDialogOpen(true);
  };

  // 导出Excel
  const exportToExcel = () => {
    const dataToExport = selectedEmployees.length > 0 
      ? employees.filter(emp => selectedEmployees.includes(emp.id))
      : employees;

    if (dataToExport.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    // 创建CSV内容
    const headers = ['员工编号', '姓名', '性别', '年龄', '部门', '课室', '职位', '学历', '入职日期', '籍贯', '联系方式', '状态'];
    const rows = dataToExport.map(emp => [
      emp.employee_no,
      emp.name,
      emp.gender === 1 ? '男' : '女',
      emp.age || '',
      emp.dept_name,
      emp.section || '',
      emp.position,
      emp.education || '',
      emp.entry_date,
      emp.native_place || '',
      emp.phone,
      emp.status === 1 ? '在职' : emp.status === 2 ? '试用期' : emp.status === 3 ? '离职' : '停用'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `员工列表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`已导出 ${dataToExport.length} 条记录`);
  };

  // 导出PDF
  const exportToPDF = () => {
    const dataToExport = selectedEmployees.length > 0 
      ? employees.filter(emp => selectedEmployees.includes(emp.id))
      : employees;

    if (dataToExport.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹出窗口以导出PDF');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>员工列表</title>
        <style>
          body { font-family: SimSun, Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .header { margin-bottom: 10px; font-size: 12px; }
          @media print {
            body { margin: 10px; }
            th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>员工列表 - ${new Date().toLocaleDateString('zh-CN')}</h1>
          <p>总人数: ${dataToExport.length}人</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>员工编号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>年龄</th>
              <th>部门</th>
              <th>课室</th>
              <th>职位</th>
              <th>学历</th>
              <th>入职日期</th>
              <th>联系方式</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${dataToExport.map((emp, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${emp.employee_no}</td>
                <td>${emp.name}</td>
                <td>${emp.gender === 1 ? '男' : '女'}</td>
                <td>${emp.age || '-'}</td>
                <td>${emp.dept_name}</td>
                <td>${emp.section || '-'}</td>
                <td>${emp.position}</td>
                <td>${emp.education || '-'}</td>
                <td>${emp.entry_date}</td>
                <td>${emp.phone}</td>
                <td>${emp.status === 1 ? '在职' : emp.status === 2 ? '试用期' : emp.status === 3 ? '离职' : '停用'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(`已准备 ${dataToExport.length} 条记录的PDF`);
  };

  // 批量打印全部
  const handleBatchPrintAll = () => {
    const selectedEmps = employees.filter(emp => selectedEmployees.includes(emp.id));
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹出窗口以进行打印');
      return;
    }

    const cardsHtml = selectedEmps.map((emp, index) => `
      <div class="card" style="${index > 0 ? 'page-break-before: always;' : ''}">
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="card-title">员工上岗证</div>
        </div>
        <div class="photo-area">
          ${emp.photo ? `<img src="${emp.photo}" alt="${emp.name}" />` : '<span class="photo-text">照片</span>'}
        </div>
        <div class="content-row">
          <div class="left-section">
            <div class="qr-section">
              <img src="${qrCodeUrl || ''}" alt="二维码" class="qr-code" />
            </div>
          </div>
          <div class="right-section">
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">姓名</span>
                <span class="info-value">${emp.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">性别</span>
                <span class="info-value">${emp.gender === 1 ? '男' : '女'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">部门</span>
                <span class="info-value">${emp.dept_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">职位</span>
                <span class="info-value">${emp.position || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="employee-no">NO: ${emp.employee_no}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>批量打印上岗证</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .card { page-break-inside: avoid; }
          }
          body {
            font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: #f5f5f5;
          }
          .card {
            width: 320px;
            height: 480px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            color: white;
            position: relative;
            overflow: hidden;
            margin-bottom: 20px;
          }
          .header { text-align: center; margin-bottom: 20px; position: relative; z-index: 1; }
          .company-name { font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px; line-height: 1.4; }
          .card-title { font-size: 16px; opacity: 0.9; }
          .photo-area { width: 120px; height: 160px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; border: 2px dashed rgba(255,255,255,0.4); overflow: hidden; margin: 0 auto 20px; }
          .photo-area img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
          .photo-text { font-size: 12px; opacity: 0.7; }
          .content-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; position: relative; z-index: 1; gap: 16px; }
          .left-section { width: 45%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .right-section { width: 55%; display: flex; flex-direction: column; justify-content: center; }
          .qr-section { text-align: center; position: relative; z-index: 1; }
          .qr-code { width: 100px; height: 100px; background: white; border-radius: 8px; padding: 6px; margin: 0 auto 4px; }
          .qr-code img { width: 100%; height: 100%; object-fit: contain; }
          .qr-text { font-size: 10px; opacity: 0.8; }
          .info-section { position: relative; z-index: 1; margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 10px; font-size: 13px; }
          .info-label { width: 50px; opacity: 0.8; }
          .info-value { flex: 1; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 2px; }
          .employee-no { font-size: 12px; opacity: 0.9; font-weight: 500; text-align: center; margin-top: 10px; position: relative; z-index: 1; }
        </style>
      </head>
      <body>
        ${cardsHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    toast.success('打印窗口已打开');
  };

  // 批量打印卡片组件
  const BatchPrintCard = ({ employee, index }: { employee: Employee; index: number }) => {
    const [qrUrl, setQrUrl] = useState('');
    
    useEffect(() => {
      const generateQR = async () => {
        const queryUrl = `${window.location.origin}/hr/employee/query?id=${employee.id}`;
        const url = await QRCode.toDataURL(queryUrl, { width: 100, margin: 1 });
        setQrUrl(url);
      };
      generateQR();
    }, [employee.id]);
    
    return (
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-500">序号 {index + 1}</span>
          <span className="font-medium">{employee.name}</span>
        </div>
        <div className="flex gap-4">
          <div className="w-20 h-24 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            {employee.photo ? (
              <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div className="flex-1 text-sm space-y-1">
            <div>编号: {employee.employee_no}</div>
            <div>部门: {employee.dept_name}</div>
            <div>职位: {employee.position || '-'}</div>
          </div>
          {qrUrl && (
            <div className="w-16 h-16">
              <img src={qrUrl} alt="二维码" className="w-full h-full" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // 生成员工查询二维码
  const generateEmployeeQR = async (employee: Employee) => {
    try {
      const queryUrl = `${window.location.origin}/hr/employee/query?id=${employee.id}`;
      const url = await QRCode.toDataURL(queryUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(url);
      setSelectedEmployee(employee);
      setPrintDialogOpen(true);
    } catch (error) {
      console.error('生成二维码失败:', error);
      toast.error('生成二维码失败');
    }
  };

  // 打印上岗证
  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹出窗口以进行打印');
      return;
    }

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>员工上岗证</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
          body {
            font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .card {
            width: 320px;
            height: 480px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            color: white;
            position: relative;
            overflow: hidden;
          }
          .card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 8px;
            line-height: 1.4;
          }
          .card-title {
            font-size: 16px;
            opacity: 0.9;
          }
          .photo-area {
            width: 120px;
            height: 160px;
            background: rgba(255,255,255,0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 1;
            border: 2px dashed rgba(255,255,255,0.4);
            overflow: hidden;
            margin: 0 auto 20px;
          }
          .photo-area img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 6px;
          }
          .photo-text {
            font-size: 12px;
            opacity: 0.7;
          }
          .content-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
            gap: 16px;
          }
          .left-section {
            width: 45%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .right-section {
            width: 55%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .employee-no {
            font-size: 12px;
            opacity: 0.9;
            font-weight: 500;
            text-align: center;
            margin-top: 10px;
            position: relative;
            z-index: 1;
          }
          .info-section {
            position: relative;
            z-index: 1;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .info-label {
            width: 60px;
            opacity: 0.8;
          }
          .info-value {
            flex: 1;
            font-weight: 500;
            border-bottom: 1px solid rgba(255,255,255,0.3);
            padding-bottom: 2px;
          }
          .qr-section {
            text-align: center;
            position: relative;
            z-index: 1;
          }
          .qr-code {
            width: 120px;
            height: 120px;
            background: white;
            border-radius: 8px;
            padding: 8px;
            margin: 0 auto 8px;
          }
          .qr-code img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .qr-text {
            font-size: 11px;
            opacity: 0.8;
          }
          .card-number {
            position: absolute;
            bottom: 12px;
            right: 16px;
            font-size: 11px;
            opacity: 0.6;
            z-index: 1;
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 200);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 初始化加载
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchRoles();
  }, [fetchEmployees, fetchDepartments, fetchRoles]);

  // 状态标签
  const getStatusBadge = (status: number) => {
    const styles: Record<number, string> = {
      1: 'bg-green-100 text-green-800',
      0: 'bg-gray-100 text-gray-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-red-100 text-red-800'
    };
    const labels: Record<number, string> = {
      1: '在职',
      0: '停用',
      2: '试用期',
      3: '离职'
    };
    return <Badge className={styles[status] || styles[1]}>{labels[status] || '未知'}</Badge>;
  };

  return (
    <MainLayout title="员工档案">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                员工档案
              </CardTitle>
              <CardDescription>管理企业员工信息和组织架构</CardDescription>
            </div>
            <Button
              onClick={() => {
                setForm({ employee_no: generateEmployeeNo() });
                setEditing(false);
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增员工
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索员工姓名、编号、手机号..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchEmployees}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button variant="outline" onClick={handlePrintList}>
                <Printer className="w-4 h-4 mr-2" />
                打印
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                导出Excel
              </Button>
              <Button variant="outline" onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                导出PDF
              </Button>
            </div>

            {/* 统计面板 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">总人数</p>
                      <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">男性</p>
                      <p className="text-2xl font-bold text-green-800">{stats.male}</p>
                      <p className="text-xs text-green-500">{stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : 0}%</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white font-bold">男</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-pink-600 font-medium">女性</p>
                      <p className="text-2xl font-bold text-pink-800">{stats.female}</p>
                      <p className="text-xs text-pink-500">{stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : 0}%</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold">女</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">平均年龄</p>
                      <p className="text-2xl font-bold text-purple-800">{stats.avgAge}</p>
                      <p className="text-xs text-purple-500">岁</p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 学历分布 */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  学历分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.education).map(([edu, count]) => (
                    <Badge key={edu} variant="secondary" className="px-3 py-1">
                      {edu}: {count}人
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                {selectedEmployees.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-600">已选择 {selectedEmployees.length} 名员工</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBatchPrint}
                      className="ml-2"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      批量打印上岗证
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToExcel}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      导出Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToPDF}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      导出PDF
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedEmployees([])}
                      className="ml-auto text-gray-500"
                    >
                      清除选择
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedEmployees.length === employees.length && employees.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('id')}>
                        <div className="flex items-center gap-1">
                          序号
                          {sortConfig.key === 'id' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>照片</TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('employee_no')}>
                        <div className="flex items-center gap-1">
                          员工编号
                          {sortConfig.key === 'employee_no' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          姓名
                          {sortConfig.key === 'name' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('gender')}>
                        <div className="flex items-center gap-1">
                          性别
                          {sortConfig.key === 'gender' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('age')}>
                        <div className="flex items-center gap-1">
                          年龄
                          {sortConfig.key === 'age' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dept_name')}>
                        <div className="flex items-center gap-1">
                          部门
                          {sortConfig.key === 'dept_name' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('section')}>
                        <div className="flex items-center gap-1">
                          课室
                          {sortConfig.key === 'section' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('position')}>
                        <div className="flex items-center gap-1">
                          职位
                          {sortConfig.key === 'position' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('entry_date')}>
                        <div className="flex items-center gap-1">
                          入职日期
                          {sortConfig.key === 'entry_date' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('education')}>
                        <div className="flex items-center gap-1">
                          学历
                          {sortConfig.key === 'education' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('native_place')}>
                        <div className="flex items-center gap-1">
                          籍贯
                          {sortConfig.key === 'native_place' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('phone')}>
                        <div className="flex items-center gap-1">
                          联系方式
                          {sortConfig.key === 'phone' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">
                          状态
                          {sortConfig.key === 'status' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmployees().map((emp, index) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedEmployees.includes(emp.id)}
                            onCheckedChange={() => toggleSelectEmployee(emp.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        {emp.photo ? (
                          <img 
                            src={emp.photo} 
                            alt={emp.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{emp.employee_no}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.gender === 1 ? '男' : '女'}</TableCell>
                      <TableCell>{emp.age || '-'}</TableCell>
                      <TableCell>{emp.dept_name}</TableCell>
                      <TableCell>{emp.section || '-'}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>{emp.entry_date}</TableCell>
                      <TableCell>{emp.education || '-'}</TableCell>
                      <TableCell>{emp.native_place || '-'}</TableCell>
                      <TableCell>{emp.phone}</TableCell>
                      <TableCell>{getStatusBadge(emp.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => generateEmployeeQR(emp)}
                            title="打印上岗证"
                          >
                            <Printer className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setForm(emp);
                              setEditing(true);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteEmployee(emp.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 员工表单对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑员工' : '新增员工'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改员工信息' : '填写新员工信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {/* 照片上传区域 */}
            <div className="col-span-1 row-span-4">
              <Label className="mb-2 block">员工照片</Label>
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {form.photo ? (
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200">
                    <img 
                      src={form.photo} 
                      alt="员工照片" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="删除照片"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-500">点击上传照片</span>
                        <span className="text-xs text-gray-400">支持 JPG、PNG</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>员工编号</Label>
              <Input 
                value={form.employee_no || ''} 
                onChange={(e) => setForm({...form, employee_no: e.target.value})}
                placeholder="系统自动生成"
                readOnly={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>姓名 <span className="text-red-500">*</span></Label>
              <Input 
                value={form.name || ''} 
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>性别 <span className="text-gray-400 text-xs">(身份证自动识别)</span></Label>
              <Select 
                value={form.gender?.toString() || '1'} 
                onValueChange={(v) => setForm({...form, gender: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">男</SelectItem>
                  <SelectItem value="2">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input 
                value={form.phone || ''} 
                onChange={(e) => setForm({...form, phone: e.target.value})}
                placeholder="请输入手机号"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input 
                value={form.email || ''} 
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>部门</Label>
              <Select 
                value={form.dept_id?.toString() || ''} 
                onValueChange={(v) => setForm({...form, dept_id: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>职位</Label>
              <Input 
                value={form.position || ''} 
                onChange={(e) => setForm({...form, position: e.target.value})}
                placeholder="请输入职位"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select 
                value={form.role_id?.toString() || ''} 
                onValueChange={(v) => setForm({...form, role_id: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>入职日期</Label>
              <Input 
                type="date"
                value={form.entry_date || ''} 
                onChange={(e) => setForm({...form, entry_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select 
                value={form.status?.toString() || '1'} 
                onValueChange={(v) => setForm({...form, status: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">在职</SelectItem>
                  <SelectItem value="2">试用期</SelectItem>
                  <SelectItem value="3">离职</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>年龄 <span className="text-gray-400 text-xs">(自动计算)</span></Label>
              <Input 
                type="number"
                value={form.age || ''} 
                readOnly
                className="bg-gray-50"
                placeholder="自动计算"
              />
            </div>
            <div className="space-y-2">
              <Label>课室</Label>
              <Input 
                value={form.section || ''} 
                onChange={(e) => setForm({...form, section: e.target.value})}
                placeholder="请输入课室"
              />
            </div>
            <div className="space-y-2">
              <Label>出生日期 <span className="text-gray-400 text-xs">(自动计算)</span></Label>
              <Input 
                type="date"
                value={form.birth_date || ''} 
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>身份证号</Label>
              <Input 
                value={form.id_card || ''} 
                onChange={(e) => {
                  const idCard = e.target.value.replace(/[^0-9Xx]/g, '');
                  let birthDate = '';
                  let age = undefined;
                  let gender = form.gender;
                  if (idCard.length === 18) {
                    const year = idCard.substring(6, 10);
                    const month = idCard.substring(10, 12);
                    const day = idCard.substring(12, 14);
                    birthDate = `${year}-${month}-${day}`;
                    const birthYear = parseInt(year);
                    const currentYear = new Date().getFullYear();
                    age = currentYear - birthYear;
                    const genderDigit = parseInt(idCard.substring(16, 17));
                    gender = genderDigit % 2 === 1 ? 1 : 2;
                  } else if (idCard.length === 15) {
                    const year = '19' + idCard.substring(6, 8);
                    const month = idCard.substring(8, 10);
                    const day = idCard.substring(10, 12);
                    birthDate = `${year}-${month}-${day}`;
                    const birthYear = parseInt(year);
                    const currentYear = new Date().getFullYear();
                    age = currentYear - birthYear;
                    const genderDigit = parseInt(idCard.substring(14, 15));
                    gender = genderDigit % 2 === 1 ? 1 : 2;
                  }
                  setForm({
                    ...form, 
                    id_card: idCard,
                    birth_date: birthDate || form.birth_date,
                    age: age || form.age,
                    gender: gender,
                  });
                }}
                placeholder="请输入身份证号"
              />
            </div>
            <div className="space-y-2">
              <Label>籍贯</Label>
              <Input 
                value={form.native_place || ''} 
                onChange={(e) => setForm({...form, native_place: e.target.value})}
                placeholder="请输入籍贯"
              />
            </div>
            <div className="space-y-2">
              <Label>学历</Label>
              <Select 
                value={form.education || ''} 
                onValueChange={(v) => setForm({...form, education: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择学历" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="初中">初中</SelectItem>
                  <SelectItem value="中专">中专</SelectItem>
                  <SelectItem value="高中">高中</SelectItem>
                  <SelectItem value="大专">大专</SelectItem>
                  <SelectItem value="本科">本科</SelectItem>
                  <SelectItem value="硕士">硕士</SelectItem>
                  <SelectItem value="博士">博士</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>家庭住址</Label>
              <Input 
                value={form.home_address || ''} 
                onChange={(e) => setForm({...form, home_address: e.target.value})}
                placeholder="请输入家庭住址"
              />
            </div>
            <div className="space-y-2">
              <Label>现住址</Label>
              <Input 
                value={form.current_address || ''} 
                onChange={(e) => setForm({...form, current_address: e.target.value})}
                placeholder="请输入现住址"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveEmployee} className="bg-blue-600 hover:bg-blue-700">
              {editing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打印上岗证对话框 */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>员工上岗证预览</DialogTitle>
            <DialogDescription>
              点击下方按钮打印上岗证
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4 overflow-auto">
            {/* 上岗证卡片 - 打印内容 */}
            <div ref={printRef} className="card" style={{ minWidth: '320px' }}>
              <div className="header">
                <div className="company-name">{companyName}</div>
                <div className="card-title">员工上岗证</div>
              </div>
              <div className="photo-area">
                {selectedEmployee?.photo ? (
                  <img 
                    src={selectedEmployee.photo} 
                    alt={selectedEmployee.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="photo-text">照片</span>
                )}
              </div>
              <div className="content-row">
                <div className="left-section">
                  <div className="qr-section">
                    {qrCodeUrl && (
                      <>
                        <img src={qrCodeUrl} alt="二维码" className="qr-code" />
                      </>
                    )}
                  </div>
                </div>
                <div className="right-section">
                  <div className="info-section">
                    <div className="info-row">
                      <span className="info-label">姓名</span>
                      <span className="info-value">{selectedEmployee?.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">性别</span>
                      <span className="info-value">{selectedEmployee?.gender === 1 ? '男' : '女'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">部门</span>
                      <span className="info-value">{selectedEmployee?.dept_name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">职位</span>
                      <span className="info-value">{selectedEmployee?.position || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="employee-no">NO: {selectedEmployee?.employee_no}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              打印上岗证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量打印对话框 */}
      <Dialog open={batchPrintDialogOpen} onOpenChange={setBatchPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto" resizable>
          <DialogHeader>
            <DialogTitle>批量打印上岗证</DialogTitle>
            <DialogDescription>
              共选择 {selectedEmployees.length} 名员工
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4">
              {employees
                .filter(emp => selectedEmployees.includes(emp.id))
                .map((emp, index) => (
                  <BatchPrintCard key={emp.id} employee={emp} index={index} />
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchPrintDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchPrintAll} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              打印全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打印样式 */}
      <style jsx>{`
        .card {
          width: 320px;
          height: 480px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .card-title {
          font-size: 16px;
          opacity: 0.9;
        }
        .photo-area {
          width: 120px;
          height: 160px;
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          border: 2px dashed rgba(255,255,255,0.4);
          overflow: hidden;
          margin: 0 auto 20px;
        }
        .photo-area img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }
        .photo-text {
          font-size: 12px;
          opacity: 0.7;
        }
        .content-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
          gap: 16px;
        }
        .left-section {
          width: 45%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .right-section {
          width: 55%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .employee-no {
          font-size: 12px;
          opacity: 0.9;
          font-weight: 500;
          text-align: center;
          margin-top: 10px;
          position: relative;
          z-index: 1;
        }
        .info-section {
          position: relative;
          z-index: 1;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .info-label {
          width: 60px;
          opacity: 0.8;
        }
        .info-value {
          flex: 1;
          font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.3);
          padding-bottom: 2px;
        }
        .qr-section {
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .qr-code {
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 8px;
          padding: 6px;
          margin: 0 auto 6px;
        }
        .qr-code img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .qr-text {
          font-size: 11px;
          opacity: 0.8;
        }
        .card-number {
          position: absolute;
          bottom: 12px;
          right: 16px;
          font-size: 11px;
          opacity: 0.6;
          z-index: 1;
        }
      `}</style>
    </MainLayout>
  );
}
