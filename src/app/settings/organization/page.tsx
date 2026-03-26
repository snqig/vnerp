'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Building2, Users, Shield, Save, RefreshCw, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { DepartmentTable } from './department-table';
import { WarehouseCategoryManager } from './warehouse-category';

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
  code: string;
  name: string;
  parent_id: number;
  manager_name: string;
  sort_order: number;
  description: string;
  status: number;
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
    const existingCodes = roles.map(r => r.code);
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
    return roles.some(r => r.code === code && r.id !== excludeId);
  };



  // 获取企业信息
  const fetchCompany = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const response = await fetch('/api/organization?type=company');
      const result = await response.json();
      if (result.success) {
        setCompany(result.data);
      }
    } catch (error) {
      console.error('获取企业信息失败:', error);
      toast.error('获取企业信息失败');
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  // 保存企业信息
  const saveCompany = async () => {
    if (!company) return;
    setCompanySaving(true);
    try {
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      const result = await response.json();
      if (result.success) {
        toast.success('企业信息保存成功');
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存企业信息失败:', error);
      toast.error('保存企业信息失败');
    } finally {
      setCompanySaving(false);
    }
  };

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    setDeptLoading(true);
    try {
      const response = await fetch('/api/organization/department');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
      toast.error('获取部门列表失败');
    } finally {
      setDeptLoading(false);
    }
  }, []);

  // 保存部门
  const saveDepartment = async () => {
    try {
      const method = deptEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/organization/department', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(deptEditing ? '部门更新成功' : '部门创建成功');
        setDeptDialogOpen(false);
        fetchDepartments();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('保存部门失败:', error);
      toast.error('保存部门失败');
    }
  };

  // 删除部门
  const deleteDepartment = async (id: number) => {
    if (!confirm('确定要删除该部门吗？')) return;
    try {
      const response = await fetch(`/api/organization/department?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        toast.success('部门删除成功');
        fetchDepartments();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除部门失败:', error);
      toast.error('删除部门失败');
    }
  };

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    setRoleLoading(true);
    try {
      const response = await fetch('/api/organization/role');
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      toast.error('获取角色列表失败');
    } finally {
      setRoleLoading(false);
    }
  }, []);

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
      // 转换字段名以匹配API期望
      const requestBody = {
        ...roleForm,
        role_code: roleForm.code,
        role_name: roleForm.name
      };
      
      const method = roleEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/organization/role', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(roleEditing ? '角色更新成功' : '角色创建成功');
        setRoleDialogOpen(false);
        setCodeError('');
        fetchRoles();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      toast.error('保存角色失败');
    }
  };

  // 删除角色
  const deleteRole = async (id: number) => {
    if (!confirm('确定要删除该角色吗？')) return;
    try {
      const response = await fetch(`/api/organization/role?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        toast.success('角色删除成功');
        fetchRoles();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
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
      1: 'bg-green-100 text-green-800',
      0: 'bg-gray-100 text-gray-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-red-100 text-red-800'
    };
    const labels = {
      1: '启用',
      0: '停用',
      2: '试用期',
      3: '离职'
    };
    return <Badge className={styles[status as keyof typeof styles] || styles[1]}>{labels[status as keyof typeof labels] || '未知'}</Badge>;
  };

  // 角色类型标签
  const getRoleTypeBadge = (type: number) => {
    return type === 1 
      ? <Badge className="bg-blue-100 text-blue-800">系统角色</Badge>
      : <Badge className="bg-purple-100 text-purple-800">自定义</Badge>;
  };

  // 菜单项配置
  const menuItems = [
    { key: 'company', label: '企业信息', icon: Building2 },
    { key: 'department', label: '部门管理', icon: Users },
    { key: 'role', label: '角色权限', icon: Shield },
    { key: 'warehouse', label: '仓库分类', icon: Warehouse },
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
                        : 'text-gray-700 hover:bg-gray-100'
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
                企业基本信息
              </CardTitle>
              <CardDescription>配置企业的基本信息和联系方式</CardDescription>
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
                      <Label>企业全称</Label>
                      <Input 
                        value={company.full_name || ''} 
                        onChange={(e) => setCompany({...company, full_name: e.target.value})}
                        placeholder="请输入企业全称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>企业简称</Label>
                      <Input 
                        value={company.short_name || ''} 
                        onChange={(e) => setCompany({...company, short_name: e.target.value})}
                        placeholder="请输入企业简称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>企业编码</Label>
                      <Input 
                        value={company.code || ''} 
                        onChange={(e) => setCompany({...company, code: e.target.value})}
                        placeholder="请输入企业编码"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>法定代表人</Label>
                      <Input 
                        value={company.legal_person || ''} 
                        onChange={(e) => setCompany({...company, legal_person: e.target.value})}
                        placeholder="请输入法定代表人"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>注册地址</Label>
                      <Input 
                        value={company.reg_address || ''} 
                        onChange={(e) => setCompany({...company, reg_address: e.target.value})}
                        placeholder="请输入注册地址"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>联系电话</Label>
                      <Input 
                        value={company.contact_phone || ''} 
                        onChange={(e) => setCompany({...company, contact_phone: e.target.value})}
                        placeholder="请输入联系电话"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>企业邮箱</Label>
                      <Input 
                        value={company.email || ''} 
                        onChange={(e) => setCompany({...company, email: e.target.value})}
                        placeholder="请输入企业邮箱"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>企业官网</Label>
                      <Input 
                        value={company.website || ''} 
                        onChange={(e) => setCompany({...company, website: e.target.value})}
                        placeholder="请输入企业官网"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>传真</Label>
                      <Input 
                        value={company.fax || ''} 
                        onChange={(e) => setCompany({...company, fax: e.target.value})}
                        placeholder="请输入传真号码"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>邮编</Label>
                      <Input 
                        value={company.postcode || ''} 
                        onChange={(e) => setCompany({...company, postcode: e.target.value})}
                        placeholder="请输入邮编"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">税务银行信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>纳税人识别号</Label>
                        <Input 
                          value={company.tax_no || ''} 
                          onChange={(e) => setCompany({...company, tax_no: e.target.value})}
                          placeholder="请输入纳税人识别号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>开户银行</Label>
                        <Input 
                          value={company.bank_name || ''} 
                          onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                          placeholder="请输入开户银行"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>银行账号</Label>
                        <Input 
                          value={company.bank_account || ''} 
                          onChange={(e) => setCompany({...company, bank_account: e.target.value})}
                          placeholder="请输入银行账号"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">企业简介</h3>
                    <Textarea 
                      value={company.description || ''} 
                      onChange={(e) => setCompany({...company, description: e.target.value})}
                      placeholder="请输入企业简介"
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
                <div className="text-center py-8 text-muted-foreground">
                  暂无企业信息
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
                  部门管理
                </CardTitle>
                <CardDescription>管理企业组织架构和部门信息，支持多级部门结构</CardDescription>
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
                <CardDescription>管理系统角色和权限配置</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  const newCode = generateRoleCode();
                  setRoleForm({ code: newCode, status: 1, role_type: 2, data_scope: 1, sort_order: roles.length + 1 });
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
                      <TableHead className="w-[60px]">序号</TableHead>
                      <TableHead>角色编码</TableHead>
                      <TableHead>角色名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
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
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteRole(role.id)}
                            >
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{deptEditing ? '编辑部门' : '新增部门'}</DialogTitle>
            <DialogDescription>
              {deptEditing ? '修改部门信息' : '填写部门基本信息，支持多级部门结构'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门编码 <span className="text-red-500">*</span></Label>
                <Input 
                  value={deptForm.code || ''} 
                  onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                  placeholder="如: DEPT001"
                />
              </div>
              <div className="space-y-2">
                <Label>部门名称 <span className="text-red-500">*</span></Label>
                <Input 
                  value={deptForm.name || ''} 
                  onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                  placeholder="请输入部门名称"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>上级部门</Label>
              <Select 
                value={String(deptForm.parent_id ?? 0)} 
                onValueChange={(value) => setDeptForm({...deptForm, parent_id: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择上级部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">无（一级部门）</SelectItem>
                  {departments
                    .filter(d => d.id !== deptForm.id) // 排除自己，避免循环引用
                    .map(dept => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门负责人</Label>
                <Input 
                  value={deptForm.manager_name || ''} 
                  onChange={(e) => setDeptForm({...deptForm, manager_name: e.target.value})}
                  placeholder="请输入负责人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>排序号</Label>
                <Input 
                  type="number"
                  value={deptForm.sort_order || 0} 
                  onChange={(e) => setDeptForm({...deptForm, sort_order: parseInt(e.target.value) || 0})}
                  placeholder="数字越小越靠前"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select 
                value={String(deptForm.status ?? 1)} 
                onValueChange={(value) => setDeptForm({...deptForm, status: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>部门描述</Label>
              <Textarea 
                value={deptForm.description || ''} 
                onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="请输入部门描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>取消</Button>
            <Button onClick={saveDepartment} className="bg-blue-600 hover:bg-blue-700">保存</Button>
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
              <Label>角色编码 <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input 
                  value={roleForm.code || ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    setRoleForm({...roleForm, code: value});
                    
                    // 实时检测重复
                    if (value && checkRoleCodeDuplicate(value, roleForm.id)) {
                      setCodeError('该角色编码已存在');
                    } else {
                      setCodeError('');
                    }
                  }}
                  placeholder="请输入角色编码"
                  className={codeError ? 'border-red-500' : ''}
                />
                {!roleEditing && (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      const newCode = generateRoleCode();
                      setRoleForm({...roleForm, code: newCode});
                      setCodeError('');
                    }}
                  >
                    自动生成
                  </Button>
                )}
              </div>
              {codeError && (
                <p className="text-sm text-red-500">{codeError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>角色名称 <span className="text-red-500">*</span></Label>
              <Input 
                value={roleForm.name || ''} 
                onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                placeholder="请输入角色名称"
              />
            </div>
            <div className="space-y-2">
              <Label>角色类型</Label>
              <Select 
                value={String(roleForm.role_type ?? 2)} 
                onValueChange={(value) => setRoleForm({...roleForm, role_type: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择角色类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">系统角色</SelectItem>
                  <SelectItem value="2">自定义角色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>数据范围</Label>
              <Select 
                value={String(roleForm.data_scope ?? 1)} 
                onValueChange={(value) => setRoleForm({...roleForm, data_scope: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择数据范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">全部数据</SelectItem>
                  <SelectItem value="2">本部门数据</SelectItem>
                  <SelectItem value="3">本人数据</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input 
                type="number"
                value={roleForm.sort_order || 0} 
                onChange={(e) => setRoleForm({...roleForm, sort_order: parseInt(e.target.value) || 0})}
                placeholder="请输入排序号"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select 
                value={String(roleForm.status ?? 1)} 
                onValueChange={(value) => setRoleForm({...roleForm, status: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>角色描述</Label>
              <Textarea 
                value={roleForm.description || ''} 
                onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                placeholder="请输入角色描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} type="button">取消</Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('保存按钮被点击');
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

