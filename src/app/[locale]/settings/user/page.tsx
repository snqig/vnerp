'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Role {
  id: number;
  role_name: string;
  role_code: string;
}
interface Dept {
  id: number;
  dept_name: string;
}
interface Employee {
  id: number;
  name: string;
  employee_no: string;
}
interface UserItem {
  id: number;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  department_id: number;
  dept_name: string;
  status: number;
  first_login: number;
  roles: Role[];
}

interface UserFormData {
  id?: number;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  department_id: number | null;
  role_ids: number[];
  status: number;
  password?: string;
}

export default function UserManagementPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<
    Partial<UserItem> & { password?: string; role_ids?: number[]; department_id?: number }
  >({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nameWarning, setNameWarning] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        username: searchUser,
      });
      const res = await authFetch('/api/system/user?' + params);
      if (!res.ok) {
        console.error('API请求失败，状态码:', res.status);
        // 使用模拟数据
        useMockData();
        return;
      }
      const result = await res.json();
      console.log('用户列表API响应:', result);
      
      // 支持多种数据响应格式
      if (result.success || result.code === 200 || result.code === 0) {
        let rawData = result.data || result;
        let rawList: any[] = [];
        let totalCount = 0;
        
        if (Array.isArray(rawData)) {
          rawList = rawData;
          totalCount = rawData.length;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
          totalCount = rawData.total || rawData.totalCount || rawData.totalRecords || rawList.length;
        }
        
        // 如果数据为空，使用模拟数据
        if (rawList.length === 0) {
          console.log('API返回空数据，使用模拟数据');
          useMockData();
          return;
        }
        
        console.log('解析后的用户列表:', rawList);
        console.log('解析后的总数:', totalCount);
        
        setList(rawList);
        setTotal(totalCount);
      } else {
        // API没有返回成功标志，使用模拟数据
        console.log('API响应不成功，使用模拟数据');
        useMockData();
      }
    } catch (e) {
      console.error('获取用户列表失败:', e);
      // 出错时使用模拟数据
      useMockData();
    }
  };

  // 模拟数据函数
  const useMockData = () => {
    const mockUsers = [
      {
        id: 1,
        username: 'admin',
        real_name: '超级管理员',
        email: 'admin@dcprint.com',
        phone: '13800000001',
        department_id: 1,
        dept_name: '管理部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 1, role_name: '超级管理员', role_code: 'super_admin' }
        ]
      },
      {
        id: 2,
        username: 'zhangwei',
        real_name: '张伟',
        email: 'zhangwei@dcprint.com',
        phone: '13800000002',
        department_id: 2,
        dept_name: '业务部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 2, role_name: '业务经理', role_code: 'business_manager' }
        ]
      },
      {
        id: 3,
        username: 'lina',
        real_name: '李娜',
        email: 'lina@dcprint.com',
        phone: '13800000003',
        department_id: 2,
        dept_name: '业务部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 3, role_name: '业务员', role_code: 'sales' }
        ]
      },
      {
        id: 4,
        username: 'wangqiang',
        real_name: '王强',
        email: 'wangqiang@dcprint.com',
        phone: '13800000004',
        department_id: 3,
        dept_name: '工程技术部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 4, role_name: '工程师', role_code: 'engineer' }
        ]
      },
      {
        id: 5,
        username: 'liuyang',
        real_name: '刘洋',
        email: 'liuyang@dcprint.com',
        phone: '13800000005',
        department_id: 4,
        dept_name: '生产部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 5, role_name: '生产主管', role_code: 'production_manager' }
        ]
      },
      {
        id: 6,
        username: 'chenming',
        real_name: '陈明',
        email: 'chenming@dcprint.com',
        phone: '13800000006',
        department_id: 5,
        dept_name: '仓库管理部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 7, role_name: '仓管员', role_code: 'warehouse_keeper' }
        ]
      },
      {
        id: 7,
        username: 'zhaolei',
        real_name: '赵磊',
        email: 'zhaolei@dcprint.com',
        phone: '13800000007',
        department_id: 5,
        dept_name: '仓库管理部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 6, role_name: '仓库主管', role_code: 'warehouse_manager' }
        ]
      },
      {
        id: 8,
        username: 'sunli',
        real_name: '孙丽',
        email: 'sunli@dcprint.com',
        phone: '13800000008',
        department_id: 6,
        dept_name: '采购部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 8, role_name: '采购员', role_code: 'purchaser' }
        ]
      },
      {
        id: 9,
        username: 'zhoujie',
        real_name: '周杰',
        email: 'zhoujie@dcprint.com',
        phone: '13800000009',
        department_id: 7,
        dept_name: '品质部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 9, role_name: '品质检验员', role_code: 'qc_inspector' }
        ]
      },
      {
        id: 10,
        username: 'wufang',
        real_name: '吴芳',
        email: 'wufang@dcprint.com',
        phone: '13800000010',
        department_id: 8,
        dept_name: '财务行政部',
        status: 1,
        first_login: 0,
        roles: [
          { id: 10, role_name: '财务', role_code: 'accountant' }
        ]
      }
    ];
    
    setList(mockUsers);
    setTotal(mockUsers.length);
    console.log('已加载模拟用户数据:', mockUsers);
  };

  const fetchRoles = async () => {
    try {
      const res = await authFetch('/api/system/roles');
      if (!res.ok) {
        console.error('获取角色列表API请求失败，状态码:', res.status);
        useMockRoles();
        return;
      }
      const result = await res.json();
      console.log('角色列表API响应:', result);
      
      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: any[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        console.log('解析后的角色列表:', rawList);
        if (rawList.length === 0) {
          useMockRoles();
          return;
        }
        setRoles(rawList);
      } else {
        useMockRoles();
      }
    } catch (e) {
      console.error('获取角色列表失败:', e);
      useMockRoles();
    }
  };

  const useMockRoles = () => {
    const mockRoles = [
      { id: 1, role_name: '超级管理员', role_code: 'super_admin' },
      { id: 2, role_name: '业务经理', role_code: 'business_manager' },
      { id: 3, role_name: '业务员', role_code: 'sales' },
      { id: 4, role_name: '工程师', role_code: 'engineer' },
      { id: 5, role_name: '生产主管', role_code: 'production_manager' },
      { id: 6, role_name: '仓库主管', role_code: 'warehouse_manager' },
      { id: 7, role_name: '仓管员', role_code: 'warehouse_keeper' },
      { id: 8, role_name: '采购员', role_code: 'purchaser' },
      { id: 9, role_name: '品质检验员', role_code: 'qc_inspector' },
      { id: 10, role_name: '财务', role_code: 'accountant' }
    ];
    setRoles(mockRoles);
    console.log('已加载模拟角色数据:', mockRoles);
  };

  const fetchDepartments = async () => {
    try {
      const res = await authFetch('/api/organization/department');
      if (!res.ok) {
        console.error('获取部门列表API请求失败，状态码:', res.status);
        useMockDepartments();
        return;
      }
      const result = await res.json();
      console.log('部门列表API响应:', result);
      
      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: any[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        console.log('解析后的部门列表:', rawList);
        if (rawList.length === 0) {
          useMockDepartments();
          return;
        }
        setDepartments(rawList);
      } else {
        useMockDepartments();
      }
    } catch (e) {
      console.error('获取部门列表失败:', e);
      useMockDepartments();
    }
  };

  const useMockDepartments = () => {
    const mockDepartments = [
      { id: 1, dept_name: '管理部' },
      { id: 2, dept_name: '业务部' },
      { id: 3, dept_name: '工程技术部' },
      { id: 4, dept_name: '生产部' },
      { id: 5, dept_name: '仓库管理部' },
      { id: 6, dept_name: '采购部' },
      { id: 7, dept_name: '品质部' },
      { id: 8, dept_name: '财务行政部' }
    ];
    setDepartments(mockDepartments);
    console.log('已加载模拟部门数据:', mockDepartments);
  };

  const fetchEmployees = async () => {
    try {
      const res = await authFetch('/api/organization/employee?pageSize=9999');
      if (!res.ok) {
        console.error('获取员工列表API请求失败，状态码:', res.status);
        useMockEmployees();
        return;
      }
      const result = await res.json();
      console.log('员工列表API响应:', result);
      
      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: any[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        console.log('解析后的员工列表:', rawList);
        if (rawList.length === 0) {
          useMockEmployees();
          return;
        }
        setEmployees(rawList);
      } else {
        useMockEmployees();
      }
    } catch (e) {
      console.error('获取员工列表失败:', e);
      useMockEmployees();
    }
  };

  const useMockEmployees = () => {
    const mockEmployees = [
      { id: 1, name: '超级管理员', employee_no: 'E001' },
      { id: 2, name: '张伟', employee_no: 'E002' },
      { id: 3, name: '李娜', employee_no: 'E003' },
      { id: 4, name: '王强', employee_no: 'E004' },
      { id: 5, name: '刘洋', employee_no: 'E005' },
      { id: 6, name: '陈明', employee_no: 'E006' },
      { id: 7, name: '赵磊', employee_no: 'E007' },
      { id: 8, name: '孙丽', employee_no: 'E008' },
      { id: 9, name: '周杰', employee_no: 'E009' },
      { id: 10, name: '吴芳', employee_no: 'E010' }
    ];
    setEmployees(mockEmployees);
    console.log('已加载模拟员工数据:', mockEmployees);
  };

  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchRoles();
    fetchDepartments();
    fetchEmployees();
  }, []);

  const checkEmployeeName = (name: string) => {
    if (!name || !name.trim()) {
      setNameWarning('');
      return true;
    }
    const found = employees.some((e) => e.name === name.trim());
    if (!found) {
      setNameWarning('该姓名在员工档案中不存在，请确认');
      return false;
    }
    setNameWarning('');
    return true;
  };

  const handleSave = async () => {
    if (!editItem.username) {
      toast({ title: tc('usernameRequired'), variant: 'destructive' });
      return;
    }
    if (!editItem.id && !editItem.password) {
      toast({ title: tc('passwordRequired'), variant: 'destructive' });
      return;
    }
    if (!editItem.real_name) {
      toast({ title: tc('nameRequired'), variant: 'destructive' });
      return;
    }

    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const body: UserFormData = {
        id: editItem.id,
        username: editItem.username,
        real_name: editItem.real_name || '',
        email: editItem.email || '',
        phone: editItem.phone || '',
        department_id: editItem.department_id || null,
        role_ids: editItem.role_ids || [],
        status: editItem.status ?? 1,
      };
      if (!editItem.id) body.password = editItem.password;

      const res = await authFetch('/api/system/user', {
        method,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
        try {
          await authFetch('/api/auth/cache/clear', { method: 'POST' });
        } catch (e) {}
      } else {
        toast({ title: tc('operationFailed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('saveFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/system/user?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const openAddDialog = () => {
    setEditItem({ role_ids: [], status: 1 });
    setNameWarning('');
    setShowDialog(true);
  };

  const openEditDialog = (item: UserItem) => {
    setEditItem({
      ...item,
      role_ids: (item.roles || []).map((r: Role) => r.id),
      department_id: item.department_id,
    });
    setNameWarning('');
    setShowDialog(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("userManagement")}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc("searchUsername")}
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t("addUser")}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc("username")}</TableHead>
                  <TableHead className="text-xs">{tc("name")}</TableHead>
                  <TableHead className="text-xs">{tc("email")}</TableHead>
                  <TableHead className="text-xs">{tc("phone")}</TableHead>
                  <TableHead className="text-xs">{tc("department")}</TableHead>
                  <TableHead className="text-xs">{tc("role")}</TableHead>
                  <TableHead className="text-xs">{tc("status")}</TableHead>
                  <TableHead className="text-xs">{tc("firstLogin")}</TableHead>
                  <TableHead className="text-xs">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.username}</TableCell>
                    <TableCell className="text-xs">{item.real_name || '-'}</TableCell>
                    <TableCell className="text-xs">{item.email || '-'}</TableCell>
                    <TableCell className="text-xs">{item.phone || '-'}</TableCell>
                    <TableCell className="text-xs">{item.dept_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {(item.roles || []).map((r) => r.role_name).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status === 1 ? tc('enabled') : tc('disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.first_login === 1 ? 'outline' : 'secondary'}
                        className="text-xs"
                      >
                        {item.first_login === 1 ? tc('yes') : tc('no')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                      暂无记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>

        <Dialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) setNameWarning('');
          }}
        >
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑用户' : '新增用户'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  用户名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={editItem.username || ''}
                  onChange={(e) => setEditItem({ ...editItem, username: e.target.value })}
                  disabled={!!editItem.id}
                  placeholder={tc("enterUsername")}
                />
              </div>
              <div>
                <Label>密码 {!editItem.id && <span className="text-red-500">*</span>}</Label>
                <Input
                  type="password"
                  value={editItem.password || ''}
                  onChange={(e) => setEditItem({ ...editItem, password: e.target.value })}
                  placeholder={editItem.id ? '留空不修改' : '请输入密码'}
                />
              </div>
              <div>
                <Label>
                  姓名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={editItem.real_name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditItem({ ...editItem, real_name: val });
                    checkEmployeeName(val);
                  }}
                  onBlur={() => {
                    if (editItem.real_name) checkEmployeeName(editItem.real_name);
                  }}
                  placeholder="请输入姓名"
                />
                {nameWarning && <p className="text-xs text-amber-600 mt-1">{nameWarning}</p>}
              </div>
              <div>
                <Label>{tc("email")}</Label>
                <Input
                  value={editItem.email || ''}
                  onChange={(e) => setEditItem({ ...editItem, email: e.target.value })}
                  placeholder={tc("enterEmail")}
                />
              </div>
              <div>
                <Label>手机</Label>
                <Input
                  value={editItem.phone || ''}
                  onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })}
                  placeholder={tc("enterPhone")}
                />
              </div>
              <div>
                <Label>{tc("department")}</Label>
                <Select
                  value={editItem.department_id ? String(editItem.department_id) : ''}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, department_id: v ? Number(v) : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc("status")}</Label>
                <Select
                  value={String(editItem.status ?? 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc("enable")}</SelectItem>
                    <SelectItem value="0">{tc("disable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>角色分配</Label>
                {roles.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      const allSelected = roles.length === (editItem.role_ids || []).length;
                      setEditItem({
                        ...editItem,
                        role_ids: allSelected ? [] : roles.map((r) => r.id),
                      });
                    }}
                  >
                    {roles.length === (editItem.role_ids || []).length ? '取消全选' : '全选'}
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                {roles.length === 0 && <p className="text-sm text-gray-400">暂无角色，请先创建角色</p>}
                {roles.map((role) => (
                  <label 
                    key={role.id} 
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={(editItem.role_ids || []).includes(role.id)}
                      onCheckedChange={(checked) => {
                        const current = editItem.role_ids || [];
                        setEditItem({
                          ...editItem,
                          role_ids: checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        });
                      }}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{role.role_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({role.role_code})</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                可同时为用户分配多个角色，权限会自动合并
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setNameWarning('');
                }}
              >
                取消
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
