'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  Shield,
  Save,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import { DepartmentTable } from './department-table';
import { WarehouseCategoryManager } from './warehouse-category';
import { authFetch } from '@/lib/auth-fetch';

// 企业信息接口
interface Company {
  id: number;
  full_name: string;
  short_name: string;
  code: string;
  legal_person: string;
  reg_address: string;
  contact_phone: string;
  email: string;
  tax_no: string;
  bank_name: string;
  bank_account: string;
  website: string;
  fax: string;
  postcode: string;
  description: string;
}

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  parent_id: number;
  leader_name: string;
  sort_order: number;
  description: string;
  status: number;
  children?: Department[];
}

// 角色接口
interface Role {
  id: number;
  code: string;
  name: string;
  role_type: number;
  description: string;
  permissions: string[];
  data_scope: number;
  sort_order: number;
  status: number;
}

export default function OrganizationPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const [activeTab, setActiveTab] = useState('company');

  // 企业信息状态
  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  // 部门管理状态
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [deptEditing, setDeptEditing] = useState(false);

  // 角色权限状态
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<Partial<Role>>({});
  const [roleEditing, setRoleEditing] = useState(false);
  const [codeError, setCodeError] = useState('');

  // 生成唯一角色编码
  const generateRoleCode = () => {
    const existingCodes = roles.map((r) => r.code);
    let counter = roles.length + 1;
    let newCode = `ROLE${String(counter).padStart(3, '0')}`;

    // 如果编码已存在，继续递增
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = `ROLE${String(counter).padStart(3, '0')}`;
    }

    return newCode;
  };

  // 检查角色编码是否重复
  const checkRoleCodeDuplicate = (code: string, excludeId?: number) => {
    return roles.some((r) => r.code === code && r.id !== excludeId);
  };

  // 获取企业信息
  const fetchCompany = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const response = await authFetch('/api/organization?type=company');
      const result = await response.json();
      // 支持多种响应格式
      if (result.success || result.code === 200) {
        let companyData = result.data;
        // 检查是否需要从 list 中取第一个
        if (Array.isArray(companyData) && companyData.length > 0) {
          companyData = companyData[0];
        } else if (
          companyData &&
          companyData.list &&
          Array.isArray(companyData.list) &&
          companyData.list.length > 0
        ) {
          companyData = companyData.list[0];
        } else if (
          companyData &&
          companyData.records &&
          Array.isArray(companyData.records) &&
          companyData.records.length > 0
        ) {
          companyData = companyData.records[0];
        } else if (
          companyData &&
          companyData.items &&
          Array.isArray(companyData.items) &&
          companyData.items.length > 0
        ) {
          companyData = companyData.items[0];
        }
        if (companyData) {
          setCompany(companyData);
        } else {
          // 使用模拟数据
          loadMockCompany();
        }
      } else {
        // 使用模拟数据
        loadMockCompany();
      }
    } catch {
      loadMockCompany();
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  // 模拟企业数据
  const loadMockCompany = () => {
    setCompany({
      id: 1,
      full_name: '越南达昌丝网印刷有限公司',
      short_name: '达昌印刷',
      code: 'DCYS2024001',
      legal_person: '张伟',
      reg_address: '越南河内市工业区123号',
      contact_phone: '0123456789',
      email: 'info@dachang.com',
      tax_no: 'VN123456789',
      bank_name: '越南工商银行',
      bank_account: '123456789012345',
      website: 'www.dachang.com',
      fax: '0123456780',
      postcode: '100000',
      description:
        '越南达昌丝网印刷有限公司是一家专业从事丝网印刷的现代化企业，提供高品质印刷服务。',
    });
  };

  // 保存企业信息
  const saveCompany = async () => {
    if (!company) return;
    setCompanySaving(true);
    try {
      const response = await authFetch('/api/organization', {
        method: 'PUT',
        body: JSON.stringify(company),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('企业信息保存成功');
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch {
      toast.error('保存企业信息失败');
    } finally {
      setCompanySaving(false);
    }
  };

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    setDeptLoading(true);
    try {
      const response = await authFetch('/api/organization/department');
      if (!response.ok) {
        loadMockDepartments();
        return;
      }
      const result = await response.json();
      if (result.success || result.code === 200) {
        const deptData = result.data;
        let deptList: any[] = [];
        if (Array.isArray(deptData)) {
          deptList = deptData;
        } else if (deptData) {
          deptList = deptData.list || deptData.records || deptData.items || [];
        }
        if (deptList.length === 0) {
          loadMockDepartments();
          return;
        }
        setDepartments(deptList);
      } else {
        loadMockDepartments();
      }
    } catch {
      loadMockDepartments();
    } finally {
      setDeptLoading(false);
    }
  }, []);

  // 模拟部门数据
  const loadMockDepartments = () => {
    setDepartments([
      {
        id: 1,
        dept_code: 'DEPT001',
        dept_name: '管理部',
        parent_id: 0,
        leader_name: '张伟',
        sort_order: 1,
        status: 1,
        description: '公司高层管理部门',
      },
      {
        id: 2,
        dept_code: 'DEPT002',
        dept_name: '业务部',
        parent_id: 0,
        leader_name: '李娜',
        sort_order: 2,
        status: 1,
        description: '负责业务拓展和客户关系',
      },
      {
        id: 3,
        dept_code: 'DEPT003',
        dept_name: '工程技术部',
        parent_id: 0,
        leader_name: '王强',
        sort_order: 3,
        status: 1,
        description: '负责技术研发和工程设计',
      },
      {
        id: 4,
        dept_code: 'DEPT004',
        dept_name: '生产部',
        parent_id: 0,
        leader_name: '刘洋',
        sort_order: 4,
        status: 1,
        description: '负责产品生产和制造',
      },
      {
        id: 5,
        dept_code: 'DEPT005',
        dept_name: '仓库管理部',
        parent_id: 0,
        leader_name: '赵磊',
        sort_order: 5,
        status: 1,
        description: '负责仓库和物料管理',
      },
      {
        id: 6,
        dept_code: 'DEPT006',
        dept_name: '采购部',
        parent_id: 0,
        leader_name: '孙丽',
        sort_order: 6,
        status: 1,
        description: '负责原材料和设备采购',
      },
      {
        id: 7,
        dept_code: 'DEPT007',
        dept_name: '品质部',
        parent_id: 0,
        leader_name: '周杰',
        sort_order: 7,
        status: 1,
        description: '负责质量检查和品质控制',
      },
      {
        id: 8,
        dept_code: 'DEPT008',
        dept_name: '财务行政部',
        parent_id: 0,
        leader_name: '吴芳',
        sort_order: 8,
        status: 1,
        description: '负责财务管理和行政事务',
      },
    ]);
  };

  // 保存部门
  const saveDepartment = async () => {
    try {
      const method = deptEditing ? 'PUT' : 'POST';
      const response = await authFetch('/api/organization/department', {
        method,
        body: JSON.stringify(deptForm),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(deptEditing ? '部门更新成功' : '部门创建成功');
        setDeptDialogOpen(false);
        fetchDepartments();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error('保存部门失败');
    }
  };

  // 删除部门
  const deleteDepartment = async (id: number) => {
    if (!confirm('确定要删除该部门吗？')) return;
    try {
      const response = await authFetch(`/api/organization/department?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success('部门删除成功');
        fetchDepartments();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch {
      toast.error('删除部门失败');
    }
  };

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    setRoleLoading(true);
    try {
      const response = await authFetch('/api/organization/role');
      if (!response.ok) {
        loadMockRoles();
        return;
      }
      const result = await response.json();
      if (result.success || result.code === 200) {
        const roleData = result.data;
        let roleList: any[] = [];
        if (Array.isArray(roleData)) {
          roleList = roleData;
        } else if (roleData) {
          roleList = roleData.list || roleData.records || roleData.items || [];
        }
        if (roleList.length === 0) {
          loadMockRoles();
          return;
        }
        setRoles(roleList);
      } else {
        loadMockRoles();
      }
    } catch {
      loadMockRoles();
    } finally {
      setRoleLoading(false);
    }
  }, []);

  // 模拟角色数据
  const loadMockRoles = () => {
    setRoles([
      {
        id: 1,
        code: 'SUPER_ADMIN',
        name: '超级管理员',
        role_type: 1,
        description: '拥有系统全部权限',
        permissions: [],
        data_scope: 1,
        sort_order: 1,
        status: 1,
      },
      {
        id: 2,
        code: 'BUSINESS_MANAGER',
        name: '业务经理',
        role_type: 2,
        description: '负责业务部门管理权限',
        permissions: [],
        data_scope: 2,
        sort_order: 2,
        status: 1,
      },
      {
        id: 3,
        code: 'SALES',
        name: '业务员',
        role_type: 2,
        description: '负责销售业务操作',
        permissions: [],
        data_scope: 3,
        sort_order: 3,
        status: 1,
      },
      {
        id: 4,
        code: 'ENGINEER',
        name: '工程师',
        role_type: 2,
        description: '负责技术研发工作',
        permissions: [],
        data_scope: 2,
        sort_order: 4,
        status: 1,
      },
      {
        id: 5,
        code: 'PRODUCTION_MANAGER',
        name: '生产主管',
        role_type: 2,
        description: '负责生产部门管理',
        permissions: [],
        data_scope: 2,
        sort_order: 5,
        status: 1,
      },
      {
        id: 6,
        code: 'WAREHOUSE_MANAGER',
        name: '仓库主管',
        role_type: 2,
        description: '负责仓库管理工作',
        permissions: [],
        data_scope: 2,
        sort_order: 6,
        status: 1,
      },
      {
        id: 7,
        code: 'WAREHOUSE_KEEPER',
        name: '仓管员',
        role_type: 2,
        description: '负责仓库日常操作',
        permissions: [],
        data_scope: 2,
        sort_order: 7,
        status: 1,
      },
      {
        id: 8,
        code: 'PURCHASER',
        name: '采购员',
        role_type: 2,
        description: '负责采购业务',
        permissions: [],
        data_scope: 3,
        sort_order: 8,
        status: 1,
      },
      {
        id: 9,
        code: 'QC_INSPECTOR',
        name: '品质检验员',
        role_type: 2,
        description: '负责品质检验工作',
        permissions: [],
        data_scope: 3,
        sort_order: 9,
        status: 1,
      },
      {
        id: 10,
        code: 'ACCOUNTANT',
        name: '财务',
        role_type: 2,
        description: '负责财务相关工作',
        permissions: [],
        data_scope: 2,
        sort_order: 10,
        status: 1,
      },
    ]);
  };

  // 保存角色
  const saveRole = async () => {
    // 表单验证
    if (!roleForm.code || !roleForm.code.trim()) {
      toast.error('请输入角色编码');
      return;
    }
    if (!roleForm.name || !roleForm.name.trim()) {
      toast.error('请输入角色名称');
      return;
    }

    // 检查编码重复
    if (checkRoleCodeDuplicate(roleForm.code, roleForm.id)) {
      setCodeError('该角色编码已存在');
      toast.error('该角色编码已存在');
      return;
    }

    try {
      // 转换字段名以匹配 API 期望
      const requestBody = {
        ...roleForm,
        role_code: roleForm.code,
        role_name: roleForm.name,
      };

      const method = roleEditing ? 'PUT' : 'POST';
      const response = await authFetch('/api/organization/role', {
        method,
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(roleEditing ? '角色更新成功' : '角色创建成功');
        setRoleDialogOpen(false);
        setCodeError('');
        fetchRoles();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error('保存角色失败');
    }
  };

  // 删除角色
  const deleteRole = async (id: number) => {
    if (!confirm('确定要删除该角色吗？')) return;
    try {
      const response = await authFetch(`/api/organization/role?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success('角色删除成功');
        fetchRoles();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch {
      toast.error('删除角色失败');
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchCompany();
    fetchDepartments();
    fetchRoles();
  }, [fetchCompany, fetchDepartments, fetchRoles]);

  // 状态标签
  const getStatusBadge = (status: number) => {
    const styles = {
      1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      0: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      3: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels = {
      1: tc('enabled'),
      0: '停用',
      2: '试用期',
      3: '离职',
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles[1]}>
        {labels[status as keyof typeof labels] || tc('unknown')}
      </Badge>
    );
  };

  // 角色类型标签
  const getRoleTypeBadge = (type: number) => {
    return type === 1 ? (
      <Badge className="bg-blue-100 text-blue-800">系统角色</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800">自定义</Badge>
    );
  };

  // 菜单项配置
  const menuItems = [
    { key: 'company', label: tc('companyInfo'), icon: Building2 },
    { key: 'department', label: tc('deptManagement'), icon: Users },
    { key: 'role', label: tc('rolePermission'), icon: Shield },
    { key: 'warehouse', label: tc('warehouseCategory'), icon: Warehouse },
  ];

  return (
    <MainLayout title="组织设置">
      <div className="space-y-6">
        {/* 顶部标签菜单 */}
        <Card>
          <CardContent className="pt-6">
            <nav className="flex gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === item.key
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* 内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* 企业信息 */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {tc('companyBasicInfo')}
                </CardTitle>
                <CardDescription>{tc('companyBasicInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {companyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : company ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{tc('companyFullName')}</Label>
                        <Input
                          value={company.full_name || ''}
                          onChange={(e) => setCompany({ ...company, full_name: e.target.value })}
                          placeholder={tc('enterCompanyFullName')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('companyShortName')}</Label>
                        <Input
                          value={company.short_name || ''}
                          onChange={(e) => setCompany({ ...company, short_name: e.target.value })}
                          placeholder={tc('enterCompanyShortName')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('companyCode')}</Label>
                        <Input
                          value={company.code || ''}
                          onChange={(e) => setCompany({ ...company, code: e.target.value })}
                          placeholder={tc('enterCompanyCode')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('legalPerson')}</Label>
                        <Input
                          value={company.legal_person || ''}
                          onChange={(e) => setCompany({ ...company, legal_person: e.target.value })}
                          placeholder={tc('enterLegalPerson')}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>{tc('regAddress')}</Label>
                        <Input
                          value={company.reg_address || ''}
                          onChange={(e) => setCompany({ ...company, reg_address: e.target.value })}
                          placeholder={tc('enterRegAddress')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('phone')}</Label>
                        <Input
                          value={company.contact_phone || ''}
                          onChange={(e) =>
                            setCompany({ ...company, contact_phone: e.target.value })
                          }
                          placeholder={tc('enterPhone')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('companyEmail')}</Label>
                        <Input
                          value={company.email || ''}
                          onChange={(e) => setCompany({ ...company, email: e.target.value })}
                          placeholder={tc('enterCompanyEmail')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('text_aam9iq')}</Label>
                        <Input
                          value={company.website || ''}
                          onChange={(e) => setCompany({ ...company, website: e.target.value })}
                          placeholder={tc('enterCompanyWebsite')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>传真</Label>
                        <Input
                          value={company.fax || ''}
                          onChange={(e) => setCompany({ ...company, fax: e.target.value })}
                          placeholder={tc('enterFax')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('text_pb1k')}</Label>
                        <Input
                          value={company.postcode || ''}
                          onChange={(e) => setCompany({ ...company, postcode: e.target.value })}
                          placeholder={tc('enterPostalCode')}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">{tc('text_70dlhz')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{tc('text_4yz4qb')}</Label>
                          <Input
                            value={company.tax_no || ''}
                            onChange={(e) => setCompany({ ...company, tax_no: e.target.value })}
                            placeholder={tc('enterTaxId')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>开户银行</Label>
                          <Input
                            value={company.bank_name || ''}
                            onChange={(e) => setCompany({ ...company, bank_name: e.target.value })}
                            placeholder={tc('enterBankName')}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>银行账号</Label>
                          <Input
                            value={company.bank_account || ''}
                            onChange={(e) =>
                              setCompany({ ...company, bank_account: e.target.value })
                            }
                            placeholder={tc('enterBankAccount')}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">{tc('text_aarfb8')}</h3>
                      <Textarea
                        value={company.description || ''}
                        onChange={(e) => setCompany({ ...company, description: e.target.value })}
                        placeholder={tc('enterCompanyIntro')}
                        rows={4}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={saveCompany}
                        disabled={companySaving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {companySaving ? '保存中...' : '保存企业信息'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">{tc('text_n2lby3')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 部门管理 */}
          <TabsContent value="department">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    部门管理
                  </CardTitle>
                  <CardDescription>{tc('text_p2iek1')}</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setDeptForm({});
                    setDeptEditing(false);
                    setDeptDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增一级部门
                </Button>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <DepartmentTable
                    departments={departments}
                    onEdit={(dept) => {
                      setDeptForm(dept);
                      setDeptEditing(true);
                      setDeptDialogOpen(true);
                    }}
                    onDelete={deleteDepartment}
                    onAdd={(parentId) => {
                      setDeptForm({ parent_id: parentId || 0 });
                      setDeptEditing(false);
                      setDeptDialogOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 角色权限 */}
          <TabsContent value="role">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    角色权限
                  </CardTitle>
                  <CardDescription>{tc('text_t05ypd')}</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    const newCode = generateRoleCode();
                    setRoleForm({
                      code: newCode,
                      status: 1,
                      role_type: 2,
                      data_scope: 1,
                      sort_order: roles.length + 1,
                    });
                    setRoleEditing(false);
                    setCodeError('');
                    setRoleDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增角色
                </Button>
              </CardHeader>
              <CardContent>
                {roleLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{tc('serialNo')}</TableHead>
                        <TableHead>角色编码</TableHead>
                        <TableHead>角色名称</TableHead>
                        <TableHead>{tc('type')}</TableHead>
                        <TableHead>{tc('description')}</TableHead>
                        <TableHead>{tc('sortOrder')}</TableHead>
                        <TableHead>{tc('status')}</TableHead>
                        <TableHead className="text-right">{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role, index) => (
                        <TableRow key={role.id}>
                          <TableCell className="text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-medium">{role.code}</TableCell>
                          <TableCell>{role.name}</TableCell>
                          <TableCell>{getRoleTypeBadge(role.role_type)}</TableCell>
                          <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                          <TableCell>{role.sort_order}</TableCell>
                          <TableCell>{getStatusBadge(role.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRoleForm(role);
                                  setRoleEditing(true);
                                  setCodeError('');
                                  setRoleDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteRole(role.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 仓库分类 */}
          <TabsContent value="warehouse">
            <WarehouseCategoryManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* 部门对话框 */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{deptEditing ? '编辑部门' : '新增部门'}</DialogTitle>
            <DialogDescription>
              {deptEditing ? '修改部门信息' : '填写部门基本信息，支持多级部门结构'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  部门编码
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={deptForm.dept_code || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value })}
                  placeholder="如: DEPT001"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  部门名称
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={deptForm.dept_name || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, dept_name: e.target.value })}
                  placeholder={tc('enterDepartmentName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc('text_adlqxp')}</Label>
              <Select
                value={String(deptForm.parent_id ?? 0)}
                onValueChange={(value) => setDeptForm({ ...deptForm, parent_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectParentDepartment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{tc('text_bbmwiu')}</SelectItem>
                  {departments
                    .filter((d) => d.id !== deptForm.id) // 排除自己，避免循环引用
                    .map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc('text_hu00nq')}</Label>
                <Input
                  value={deptForm.leader_name || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, leader_name: e.target.value })}
                  placeholder="请输入负责人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>排序号</Label>
                <Input
                  type="number"
                  value={deptForm.sort_order || 0}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, sort_order: parseInt(e.target.value) || 0 })
                  }
                  placeholder="数字越小越靠前"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc('status')}</Label>
              <Select
                value={String(deptForm.status ?? 1)}
                onValueChange={(value) => setDeptForm({ ...deptForm, status: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{tc('enable')}</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>部门描述</Label>
              <Textarea
                value={deptForm.description || ''}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder={tc('enterDepartmentDesc')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveDepartment} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 角色对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleEditing ? '编辑角色' : '新增角色'}</DialogTitle>
            <DialogDescription>
              {roleEditing ? '修改角色信息' : '填写角色基本信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                角色编码
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={roleForm.code || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRoleForm({ ...roleForm, code: value });

                    // 实时检测重复
                    if (value && checkRoleCodeDuplicate(value, roleForm.id)) {
                      setCodeError('该角色编码已存在');
                    } else {
                      setCodeError('');
                    }
                  }}
                  placeholder={tc('enterRoleCode')}
                  className={codeError ? 'border-red-500' : ''}
                />
                {!roleEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newCode = generateRoleCode();
                      setRoleForm({ ...roleForm, code: newCode });
                      setCodeError('');
                    }}
                  >
                    自动生成
                  </Button>
                )}
              </div>
              {codeError && <p className="text-sm text-red-500">{codeError}</p>}
            </div>
            <div className="space-y-2">
              <Label>
                角色名称
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={roleForm.name || ''}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder={tc('enterRoleName')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('text_hxhwsw')}</Label>
              <Select
                value={String(roleForm.role_type ?? 2)}
                onValueChange={(value) => setRoleForm({ ...roleForm, role_type: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectRoleType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">系统角色</SelectItem>
                  <SelectItem value="2">{tc('text_mmvh15')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('text_d7s98v')}</Label>
              <Select
                value={String(roleForm.data_scope ?? 1)}
                onValueChange={(value) => setRoleForm({ ...roleForm, data_scope: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectDataScope')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">全部数据</SelectItem>
                  <SelectItem value="2">本部门数据</SelectItem>
                  <SelectItem value="3">{tc('text_dchmrw')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input
                type="number"
                value={roleForm.sort_order || 0}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, sort_order: parseInt(e.target.value) || 0 })
                }
                placeholder={tc('enterSortOrder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('status')}</Label>
              <Select
                value={String(roleForm.status ?? 1)}
                onValueChange={(value) => setRoleForm({ ...roleForm, status: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{tc('enable')}</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('text_hxe0v5')}</Label>
              <Textarea
                value={roleForm.description || ''}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder={tc('enterRoleDesc')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} type="button">
              取消
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveRole();
              }}
              className="bg-blue-600 hover:bg-blue-700"
              type="button"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
