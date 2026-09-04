'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { DepartmentTable } from './department-table';
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
  const ts = useTranslations('Common');
  // 翻译钩子
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
      full_name: ts('k_1pyz0ii'),
      short_name: ts('k_af493q'),
      code: 'DCYS2024001',
      legal_person: ts('k_3vr19c'),
      reg_address: ts('k_prcoeu'),
      contact_phone: '0123456789',
      email: 'info@dachang.com',
      tax_no: 'VN123456789',
      bank_name: ts('k_llnw9r'),
      bank_account: '123456789012345',
      website: 'www.dachang.com',
      fax: '0123456780',
      postcode: '100000',
      description:
        ts('k_1oqiy23'),
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
        toast.success(tc('companySaved'));
      } else {
        toast.error(result.message || ts('k_1q9u8le'));
      }
    } catch {
      toast.error(tc('saveFailed'));
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
        let deptList: Loose[] = [];
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
        dept_name: ts('k_1f4z30i'),
        parent_id: 0,
        leader_name: ts('k_3vr19c'),
        sort_order: 1,
        status: 1,
        description: ts('k_184t2v4'),
      },
      {
        id: 2,
        dept_code: 'DEPT002',
        dept_name: ts('k_axb29w'),
        parent_id: 0,
        leader_name: ts('k_o5eojb'),
        sort_order: 2,
        status: 1,
        description: ts('k_1r91wmb'),
      },
      {
        id: 3,
        dept_code: 'DEPT003',
        dept_name: ts('k_boxyuc'),
        parent_id: 0,
        leader_name: ts('k_nqtivk'),
        sort_order: 3,
        status: 1,
        description: ts('k_ajc5hm'),
      },
      {
        id: 4,
        dept_code: 'DEPT004',
        dept_name: ts('k_18glq49'),
        parent_id: 0,
        leader_name: ts('k_9nfhqc'),
        sort_order: 4,
        status: 1,
        description: ts('k_16r4b4h'),
      },
      {
        id: 5,
        dept_code: 'DEPT005',
        dept_name: ts('k_qe62zc'),
        parent_id: 0,
        leader_name: ts('k_qkv38u'),
        sort_order: 5,
        status: 1,
        description: ts('k_o2ntke'),
      },
      {
        id: 6,
        dept_code: 'DEPT006',
        dept_name: ts('k_1rgc4zf'),
        parent_id: 0,
        leader_name: ts('k_wrfy17'),
        sort_order: 6,
        status: 1,
        description: ts('k_158jngu'),
      },
      {
        id: 7,
        dept_code: 'DEPT007',
        dept_name: ts('k_11g5fpo'),
        parent_id: 0,
        leader_name: ts('k_1gmpisl'),
        sort_order: 7,
        status: 1,
        description: ts('k_ry9su3'),
      },
      {
        id: 8,
        dept_code: 'DEPT008',
        dept_name: ts('k_1jqantr'),
        parent_id: 0,
        leader_name: ts('k_vy0n74'),
        sort_order: 8,
        status: 1,
        description: ts('k_pgejje'),
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
        toast.success(deptEditing ? ts('k_1iy4ubo') : ts('k_1cw6qfp'));
        setDeptDialogOpen(false);
        fetchDepartments();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('saveFailed'));
    }
  };

  // 删除部门
  const deleteDepartment = async (id: number) => {
    if (!window.confirm(tc('confirmDeleteDept'))) return;
    try {
      const response = await authFetch(`/api/organization/department?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success(tc('deptDeleted'));
        fetchDepartments();
      } else {
        toast.error(result.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
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
        let roleList: Loose[] = [];
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
        name: ts('k_1fcdmqa'),
        role_type: 1,
        description: ts('k_orh26e'),
        permissions: [],
        data_scope: 1,
        sort_order: 1,
        status: 1,
      },
      {
        id: 2,
        code: 'BUSINESS_MANAGER',
        name: ts('k_ojn305'),
        role_type: 2,
        description: ts('k_e47ne6'),
        permissions: [],
        data_scope: 2,
        sort_order: 2,
        status: 1,
      },
      {
        id: 3,
        code: 'SALES',
        name: ts('k_15vw6tw'),
        role_type: 2,
        description: ts('k_1n6j229'),
        permissions: [],
        data_scope: 3,
        sort_order: 3,
        status: 1,
      },
      {
        id: 4,
        code: 'ENGINEER',
        name: ts('k_1tyjla3'),
        role_type: 2,
        description: ts('k_1wzfx3g'),
        permissions: [],
        data_scope: 2,
        sort_order: 4,
        status: 1,
      },
      {
        id: 5,
        code: 'PRODUCTION_MANAGER',
        name: ts('k_d1s7gj'),
        role_type: 2,
        description: ts('k_oksfke'),
        permissions: [],
        data_scope: 2,
        sort_order: 5,
        status: 1,
      },
      {
        id: 6,
        code: 'WAREHOUSE_MANAGER',
        name: ts('k_1bngyff'),
        role_type: 2,
        description: ts('k_1wz7ten'),
        permissions: [],
        data_scope: 2,
        sort_order: 6,
        status: 1,
      },
      {
        id: 7,
        code: 'WAREHOUSE_KEEPER',
        name: ts('k_hdkgmr'),
        role_type: 2,
        description: ts('k_z6ponl'),
        permissions: [],
        data_scope: 2,
        sort_order: 7,
        status: 1,
      },
      {
        id: 8,
        code: 'PURCHASER',
        name: ts('k_epyr6z'),
        role_type: 2,
        description: ts('k_g8bbzm'),
        permissions: [],
        data_scope: 3,
        sort_order: 8,
        status: 1,
      },
      {
        id: 9,
        code: 'QC_INSPECTOR',
        name: ts('k_l5ij28'),
        role_type: 2,
        description: ts('k_dnt03f'),
        permissions: [],
        data_scope: 3,
        sort_order: 9,
        status: 1,
      },
      {
        id: 10,
        code: 'ACCOUNTANT',
        name: ts('k_8s57ik'),
        role_type: 2,
        description: ts('k_7n2gfq'),
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
      toast.error(tc('enterRoleCode'));
      return;
    }
    if (!roleForm.name || !roleForm.name.trim()) {
      toast.error(tc('enterRoleName'));
      return;
    }

    // 检查编码重复
    if (checkRoleCodeDuplicate(roleForm.code, roleForm.id)) {
      setCodeError(tc('roleCodeExists'));
      toast.error(tc('roleCodeExists'));
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
        toast.success(roleEditing ? tc('roleUpdateSuccess') : tc('roleCreateSuccess'));
        setRoleDialogOpen(false);
        setCodeError('');
        fetchRoles();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('saveFailed'));
    }
  };

  // 删除角色
  const deleteRole = async (id: number) => {
    if (!window.confirm(tc('confirmDeleteRole'))) return;
    try {
      const response = await authFetch(`/api/organization/role?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success(tc('roleDeleted'));
        fetchRoles();
      } else {
        toast.error(result.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
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
      0: ts('k_6q9o5l'),
      2: ts('k_1ng2vzp'),
      3: ts('k_1v4n1r6'),
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
      <Badge className="bg-blue-100 text-blue-800">{ts('k_1vu5jmn')}</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800">{tc('customRoleType')}</Badge>
    );
  };

  // 菜单项配置
  const menuItems = [
    { key: 'company', label: tc('companyInfo'), icon: Building2 },
    { key: 'department', label: tc('deptManagement'), icon: Users },
    { key: 'role', label: tc('rolePermission'), icon: Shield },
  ];

  return (
    <MainLayout title={ts('k_1gn6di0')}>
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
                        <Label>{tc('websiteLabel')}</Label>
                        <Input
                          value={company.website || ''}
                          onChange={(e) => setCompany({ ...company, website: e.target.value })}
                          placeholder={tc('enterCompanyWebsite')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{ts('k_etcppc')}</Label>
                        <Input
                          value={company.fax || ''}
                          onChange={(e) => setCompany({ ...company, fax: e.target.value })}
                          placeholder={tc('enterFax')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tc('postalCodeLabel')}</Label>
                        <Input
                          value={company.postcode || ''}
                          onChange={(e) => setCompany({ ...company, postcode: e.target.value })}
                          placeholder={tc('enterPostalCode')}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">{tc('financialInfo')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{tc('taxIdLabel')}</Label>
                          <Input
                            value={company.tax_no || ''}
                            onChange={(e) => setCompany({ ...company, tax_no: e.target.value })}
                            placeholder={tc('enterTaxId')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{ts('k_1n7h4j6')}</Label>
                          <Input
                            value={company.bank_name || ''}
                            onChange={(e) => setCompany({ ...company, bank_name: e.target.value })}
                            placeholder={tc('enterBankName')}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>{ts('k_h1aaqs')}</Label>
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
                      <h3 className="text-lg font-semibold mb-4">{tc('companyIntro')}</h3>
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
                        {companySaving ? ts('k_rr6ulf') : ts('k_wwe98z')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {tc('noCompanyInfo')}
                  </div>
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
                    {ts('k_1eaudl2')}</CardTitle>
                  <CardDescription>{tc('deptManagementDesc')}</CardDescription>
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
                  {ts('k_15tciwq')}</Button>
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
                    {ts('k_qea0w6')}</CardTitle>
                  <CardDescription>{tc('rolePermissionDesc')}</CardDescription>
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
                  {tc('addRole')}</Button>
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
                        <TableHead>{ts('k_2vd8u0')}</TableHead>
                        <TableHead>{ts('k_1v3mprs')}</TableHead>
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
        </Tabs>
      </div>

      {/* 部门对话框 */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{deptEditing ? ts('k_q2a9rs') : ts('k_1as41yz')}</DialogTitle>
            <DialogDescription>
              {deptEditing ? ts('k_v0w66k') : ts('k_fms0ed')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {ts('k_1flqf8g')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={deptForm.dept_code || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value })}
                  placeholder={ts('k_imvm2z')}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {ts('k_1dwuqb4')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={deptForm.dept_name || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, dept_name: e.target.value })}
                  placeholder={tc('enterDepartmentName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc('parentDepartmentLabel')}</Label>
              <Select
                value={String(deptForm.parent_id ?? 0)}
                onValueChange={(value) => setDeptForm({ ...deptForm, parent_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectParentDepartment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{tc('topDepartment')}</SelectItem>
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
                <Label>{tc('leaderLabel')}</Label>
                <Input
                  value={deptForm.leader_name || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, leader_name: e.target.value })}
                  placeholder={ts('k_1glfj1a')}
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('k_1wnrlkr')}</Label>
                <Input
                  type="number"
                  value={deptForm.sort_order || 0}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, sort_order: parseInt(e.target.value) || 0 })
                  }
                  placeholder={ts('k_1olh8rw')}
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
                  <SelectItem value="0">{ts('k_6q9o5l')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ts('k_aqgoaq')}</Label>
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
              {tc('cancel')}</Button>
            <Button onClick={saveDepartment} className="bg-blue-600 hover:bg-blue-700">
              {ts('k_1c3mapc')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 角色对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleEditing ? tc('editRole') : tc('addRole')}</DialogTitle>
            <DialogDescription>
              {roleEditing ? ts('k_1ll0djk') : ts('k_ouf7in')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {ts('k_2vd8u0')}<span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={roleForm.code || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRoleForm({ ...roleForm, code: value });

                    // 实时检测重复
                    if (value && checkRoleCodeDuplicate(value, roleForm.id)) {
                      setCodeError(tc('roleCodeExists'));
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
                    {ts('k_3q0eu8')}</Button>
                )}
              </div>
              {codeError && <p className="text-sm text-red-500">{codeError}</p>}
            </div>
            <div className="space-y-2">
              <Label>
                {ts('k_1v3mprs')}<span className="text-red-500">*</span>
              </Label>
              <Input
                value={roleForm.name || ''}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder={tc('enterRoleName')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('roleTypeLabel')}</Label>
              <Select
                value={String(roleForm.role_type ?? 2)}
                onValueChange={(value) => setRoleForm({ ...roleForm, role_type: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectRoleType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{ts('k_1vu5jmn')}</SelectItem>
                  <SelectItem value="2">{tc('customRoleType')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('dataScopeLabel')}</Label>
              <Select
                value={String(roleForm.data_scope ?? 1)}
                onValueChange={(value) => setRoleForm({ ...roleForm, data_scope: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectDataScope')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{ts('k_1qqskvf')}</SelectItem>
                  <SelectItem value="2">{ts('k_1gyixz9')}</SelectItem>
                  <SelectItem value="3">{tc('selfDataScope')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ts('k_1wnrlkr')}</Label>
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
                  <SelectItem value="0">{ts('k_6q9o5l')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('roleDescriptionLabel')}</Label>
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
              {tc('cancel')}</Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveRole();
              }}
              className="bg-blue-600 hover:bg-blue-700"
              type="button"
            >
              {ts('k_1c3mapc')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
