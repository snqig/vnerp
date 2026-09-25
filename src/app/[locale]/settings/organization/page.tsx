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
import { CompanyLogoUploader } from './company-logo-uploader';
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
  /** LOGO 资源路径（`sys_company.logo`），由 CompanyLogoUploader 维护 */
  logo?: string | null;
}

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  /** 顶级部门在库中为 NULL（parent_id 有外键约束，0 非法） */
  parent_id?: number | null;
  /** 部门负责人 → sys_employee.id；leader_name 是 LEFT JOIN 出来的派生列 */
  leader_id?: number | null;
  leader_name: string;
  sort_order: number;
  description: string;
  status: number;
  children?: Department[];
}

/** 负责人候选项：随部门接口一起下发（见请求参数 withLeaderOptions=1） */
interface LeaderOption {
  id: number;
  name: string;
  employee_no: string;
  position: string | null;
  status: number | null;
  dept_name: string | null;
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
  const [leaderOptions, setLeaderOptions] = useState<LeaderOption[]>([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMockCompany 是模拟数据兜底函数，仅使用 setState 稳定引用，定义在函数体之后
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
      // 部门是树形主数据，必须一次取全量（分页截断会让整棵子树从表格里消失）；
      // 负责人候选项与部门接口同权限下发，避免账号只有 ORG_DEPARTMENT 时下拉空白。
      const response = await authFetch(
        '/api/organization/department?pageSize=500&withLeaderOptions=1'
      );
      if (!response.ok) {
        // 不再用模拟部门兜底：假数据的 id 与真实部门同域，
        // 用户对「假部门」执行编辑/删除会命中同 id 的真实部门，造成脏写。
        toast.error(tc('fetchFailed'));
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
        setDepartments(deptList);
        if (Array.isArray(deptData?.leaderOptions)) {
          setLeaderOptions(deptData.leaderOptions);
        }
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('fetchFailed'));
    } finally {
      setDeptLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅使用 setState 与 next-intl 的稳定引用
  }, []);

  // 部门按「树序」展开成带层级的扁平列表，供「上级部门」下拉带缩进展示。
  // 同时做孤儿兜底：父级已被软删 / 不在当前集合里的节点照样列出来，
  // 否则下拉里看不到它，会被误判成「这个部门不存在」。
  const departmentOptionsWithDepth = (() => {
    const byId = new Map(departments.map((d) => [d.id, d]));
    const children = new Map<string, Department[]>();
    for (const d of departments) {
      const parentId = d.parent_id ?? null;
      const key = parentId !== null && byId.has(parentId) ? String(parentId) : 'root';
      const bucket = children.get(key) || [];
      bucket.push(d);
      children.set(key, bucket);
    }
    const out: { dept: Department; depth: number }[] = [];
    const seen = new Set<number>();
    const walk = (key: string, depth: number) => {
      const bucket = (children.get(key) || []).sort(
        (a, b) => a.sort_order - b.sort_order || a.id - b.id
      );
      for (const d of bucket) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        out.push({ dept: d, depth });
        walk(String(d.id), depth + 1);
      }
    };
    walk('root', 0);
    for (const d of departments) {
      if (!seen.has(d.id)) out.push({ dept: d, depth: 0 });
    }
    return out;
  })();

  // 按编码规则建议下一个部门编码：部 = DEPT00N；科/室/车间 = 父编码 + 两位序号
  const suggestDeptCode = (parentId?: number | null): string => {
    const used = new Set(departments.map((d) => d.dept_code).filter(Boolean));
    const parent = parentId ? departments.find((d) => d.id === parentId) : undefined;
    if (!parent) {
      for (let i = 1; i <= 99; i++) {
        const code = `DEPT${String(i).padStart(3, '0')}`;
        if (!used.has(code)) return code;
      }
      return 'DEPT999';
    }
    for (let i = 1; i <= 99; i++) {
      const code = `${parent.dept_code}${String(i).padStart(2, '0')}`;
      if (!used.has(code)) return code;
    }
    return `${parent.dept_code}99`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMockRoles 是模拟数据兜底函数，仅使用 setState 稳定引用，定义在函数体之后
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
      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{ts('k_1vu5jmn')}</Badge>
    ) : (
      <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">{tc('customRoleType')}</Badge>
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
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
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
                    <CompanyLogoUploader
                      logo={company.logo ?? null}
                      onChange={(logo) => setCompany({ ...company, logo })}
                    />
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
                    // 默认挂在树根（总经办）之下 —— 当前结构里 7 个部都是它的子级；
                    // 要挂到别处可在弹窗里改「上级部门」。
                    const root = departments.find((d) => !d.parent_id);
                    setDeptForm({
                      parent_id: root?.id,
                      dept_code: suggestDeptCode(root?.id),
                      status: 1,
                      sort_order:
                        departments.filter((d) => (d.parent_id ?? null) === (root?.id ?? null))
                          .length + 1,
                    });
                    setDeptEditing(false);
                    setDeptDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {ts('k_1as41yz')}</Button>
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
                      // children 是前端建树时挂上的，回传服务端无意义：落库前剥掉
                      const rest: Partial<Department> = { ...dept };
                      delete rest.children;
                      setDeptForm(rest);
                      setDeptEditing(true);
                      setDeptDialogOpen(true);
                    }}
                    onDelete={deleteDepartment}
                    onAdd={(parentId) => {
                      setDeptForm({
                        parent_id: parentId ?? undefined,
                        dept_code: suggestDeptCode(parentId),
                        status: 1,
                        sort_order:
                          departments.filter(
                            (d) => (d.parent_id ?? null) === (parentId ?? null)
                          ).length + 1,
                      });
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
                                <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
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
                  {ts('k_1flqf8g')}<span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  value={deptForm.dept_code || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value })}
                  placeholder={ts('k_imvm2z')}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {ts('k_1dwuqb4')}<span className="text-red-500 dark:text-red-400">*</span>
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
                value={deptForm.parent_id ? String(deptForm.parent_id) : 'none'}
                onValueChange={(value) => {
                  const nextParentId = value === 'none' ? undefined : parseInt(value);
                  setDeptForm({
                    ...deptForm,
                    // 'none' = 顶级部门：置空该字段，由服务端归一为 NULL
                    parent_id: nextParentId,
                    // 换了上级，编码按新父级重算；编辑既有部门时不动用户已定的编码
                    dept_code: deptEditing
                      ? deptForm.dept_code
                      : suggestDeptCode(nextParentId),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectParentDepartment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc('topDepartment')}</SelectItem>
                  {(() => {
                    // 排除自己与自己的所有下级：成环会让整棵子树从列表里消失。
                    // 前端先拦一层，服务端 PUT 另有一道 isSelfOrDescendant 兜底。
                    const blocked = new Set<number>();
                    if (deptForm.id) {
                      blocked.add(deptForm.id);
                      let grew = true;
                      while (grew) {
                        grew = false;
                        for (const d of departments) {
                          if (d.parent_id && blocked.has(d.parent_id) && !blocked.has(d.id)) {
                            blocked.add(d.id);
                            grew = true;
                          }
                        }
                      }
                    }
                    // 当前 parent_id 指向已软删 / 不存在的部门时，Radix Select 找不到匹配项会渲染成空白，
                    // 让人误以为「该部门没有上级」。这里补一个显式占位项，说明上级已失效，
                    // 用户可直接改选「顶级部门」把这条孤儿数据修正过来。
                    const orphanParentId =
                      deptForm.parent_id && !departments.some((d) => d.id === deptForm.parent_id)
                        ? deptForm.parent_id
                        : null;
                    return (
                      <>
                        {orphanParentId ? (
                          <SelectItem value={String(orphanParentId)}>
                            {ts('k_49h1e7')}（#{orphanParentId}）
                          </SelectItem>
                        ) : null}
                        {departmentOptionsWithDepth
                          .filter(({ dept }) => !blocked.has(dept.id))
                          .map(({ dept, depth }) => (
                            <SelectItem key={dept.id} value={String(dept.id)}>
                              {depth > 0 ? '　'.repeat(depth) + '└ ' : ''}
                              {dept.dept_name}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {dept.dept_code}
                              </span>
                            </SelectItem>
                          ))}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc('leaderLabel')}</Label>
                <Select
                  value={deptForm.leader_id ? String(deptForm.leader_id) : 'none'}
                  onValueChange={(value) => {
                    const leaderId = value === 'none' ? undefined : parseInt(value);
                    setDeptForm({
                      ...deptForm,
                      leader_id: leaderId,
                      // leader_name 在库里是 LEFT JOIN sys_employee 的派生列（唯一真相源是 leader_id），
                      // 这里同步写一份，只为让表格在重新拉取前也能立刻显示正确。
                      leader_name:
                        (leaderId &&
                          leaderOptions.find((emp) => emp.id === leaderId)?.name) ||
                        '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('responsiblePerson')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc('none')}</SelectItem>
                    {deptForm.leader_id &&
                    !leaderOptions.some((emp) => emp.id === deptForm.leader_id) ? (
                      <SelectItem value={String(deptForm.leader_id)}>
                        {deptForm.leader_name || ts('k_49h1e7')}（#{deptForm.leader_id}）
                      </SelectItem>
                    ) : null}
                    {leaderOptions.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {emp.employee_no}
                          {emp.dept_name ? ` · ${emp.dept_name}` : ''}
                          {emp.status === 3 ? ' · ' + ts('k_1v4n1r6') : ''}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {ts('k_2vd8u0')}<span className="text-red-500 dark:text-red-400">*</span>
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
              {codeError && <p className="text-sm text-red-500 dark:text-red-400">{codeError}</p>}
            </div>
            <div className="space-y-2">
              <Label>
                {ts('k_1v3mprs')}<span className="text-red-500 dark:text-red-400">*</span>
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
