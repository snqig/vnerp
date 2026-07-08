'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  RefreshCw,
  Search,
  Users,
  CheckSquare,
  Square,
  LayoutGrid,
  MousePointer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPermissionModules, Permission } from '@/hooks/usePermission';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';

// 角色接口
interface Role {
  id: number;
  role_code: string;
  role_name: string;
  description?: string;
  status: number;
  created_at?: string;
  permissions?: string[];
}

// 菜单接口
interface Menu {
  id: number;
  menu_name: string;
  parent_id: number;
  path: string;
  icon?: string;
  sort_order: number;
  children?: Menu[];
}

// 数据范围选项
const dataScopeOptions = [
  { value: 1, label: '全部数据' },
  { value: 2, label: '本部门数据' },
  { value: 3, label: '本部门及以下数据' },
  { value: 4, label: '仅本人数据' },
  { value: 5, label: '自定义' },
];

// 权限模块
const permissionModules = getPermissionModules();

export default function RolesPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Role>>({});
  const [editing, setEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [activePermissionTab, setActivePermissionTab] = useState('menus');
  const [dataScopeConfig, setDataScopeConfig] = useState<Record<string, number[]>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/organization/role?keyword=${encodeURIComponent(search)}`
        : '/api/organization/role';
      const response = await authFetch(url);
      if (!response.ok) return;
      const result = await response.json();
      if (result.success) {
        setRoles(Array.isArray(result.data) ? result.data : (result.data?.list || []));
      }
    } catch (error) {
      toast({ title: tc('fetchRoleListFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  // 获取菜单列表
  const fetchMenus = useCallback(async () => {
    try {
      const response = await authFetch('/api/menu');
      if (!response.ok) return [];
      const result = await response.json();
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setMenus(data);
        return data;
      }
    } catch (error) {
    }
    return [];
  }, []);

  // 获取角色权限
  const fetchRolePermissions = async (roleId: number) => {
    try {
      // 获取菜单权限
      const menuResponse = await authFetch(`/api/role-permissions?roleId=${roleId}`);
      const menuResult = await menuResponse.json();
      if (menuResult.success) {
        setSelectedMenus(menuResult.data.map((p: any) => p.menu_id));
      }

      // 获取按钮权限
      const roleResponse = await authFetch('/api/organization/role');
      const roleResult = await roleResponse.json();
      if (roleResult.success) {
        const role = roleResult.data.find((r: Role) => r.id === roleId);
        if (role && role.permissions) {
          setSelectedPermissions(role.permissions);
        } else {
          setSelectedPermissions([]);
        }
      }
    } catch (error) {
      setSelectedMenus([]);
      setSelectedPermissions([]);
    }
  };

  // 保存角色
  const saveRole = async () => {
    if (!form.role_code || !form.role_name) {
      toast({ title: tc('roleCodeNameRequired'), variant: 'destructive' });
      return;
    }

    try {
      const url = editing ? '/api/organization/role' : '/api/organization/role';
      const method = editing ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: editing ? tc('roleUpdateSuccess') : tc('roleCreateSuccess') });
        setDialogOpen(false);
        fetchRoles();
      } else {
        toast({ title: result.message || tc('saveFailed'), variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: tc('saveRoleFailed'), variant: 'destructive' });
    }
  };

  // 删除角色
  const deleteRole = async (id: number) => {
    if (!confirm(tc('confirmDeleteRole'))) return;

    try {
      const response = await authFetch(`/api/organization/role?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: tc('roleDeleteSuccess') });
        fetchRoles();
      } else {
        toast({ title: result.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: tc('deleteRoleFailed'), variant: 'destructive' });
    }
  };

  // 保存角色权限
  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      // 保存菜单权限
      const menuResponse = await authFetch('/api/role-permissions', {
        method: 'POST',
        body: JSON.stringify({
          role_id: selectedRole.id,
          menu_ids: selectedMenus,
        }),
      });

      const menuResult = await menuResponse.json();
      if (!menuResult.success) {
        toast({ title: menuResult.message || tc('menuPermissionFailed'), variant: 'destructive' });
        return;
      }

      const btnResponse = await authFetch('/api/role-permissions/buttons', {
        method: 'POST',
        body: JSON.stringify({
          role_id: selectedRole.id,
          permissions: selectedPermissions,
        }),
      });

      const btnResult = await btnResponse.json();
      if (!btnResult.success) {
        toast({ title: btnResult.message || tc('buttonPermissionFailed'), variant: 'destructive' });
        return;
      }

      // 保存数据权限
      try {
        await authFetch('/api/system/data-scope', {
          method: 'POST',
          body: JSON.stringify({
            roleId: selectedRole.id,
            scopes: dataScopeConfig,
          }),
        });
      } catch (e) {
      }

      toast({ title: tc('permissionSetSuccess') });
      setPermissionDialogOpen(false);
      fetchRoles();

      try {
        await authFetch('/api/auth/cache/clear', { method: 'POST' });
      } catch (e) {
      }
    } catch (error) {
      toast({ title: tc('savePermissionFailed'), variant: 'destructive' });
    }
  };

  // 打开新增对话框
  const openAddDialog = () => {
    setForm({ status: 1 });
    setEditing(false);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (role: Role) => {
    setForm({ ...role });
    setEditing(true);
    setDialogOpen(true);
  };

  // 打开权限设置对话框
  const openPermissionDialog = async (role: Role) => {
    setSelectedRole(role);
    setSelectedMenus([]);
    setSelectedPermissions([]);
    setActivePermissionTab('menus');
    setDataScopeConfig({});

    let currentMenus = menus;
    if (currentMenus.length === 0) {
      currentMenus = await fetchMenus();
    }

    await fetchRolePermissions(role.id);

    // 加载数据权限配置
    try {
      const scopeRes = await authFetch(`/api/system/data-scope?roleId=${role.id}`);
      const scopeResult = await scopeRes.json();
      if (scopeResult.success) {
        setDataScopeConfig(scopeResult.data || {});
      }
    } catch (e) {
    }

    // 加载仓库列表
    try {
      const whRes = await authFetch('/api/warehouse/list');
      const whResult = await whRes.json();
      if (whResult.success) {
        setWarehouses((whResult.data || []).map((w: any) => ({ id: w.id, name: w.warehouse_name || w.name })));
      }
    } catch (e) {
    }

    // 加载客户列表
    try {
      const custRes = await authFetch('/api/customers');
      const custResult = await custRes.json();
      if (custResult.success) {
        setCustomers((Array.isArray(custResult.data) ? custResult.data : (custResult.data?.list || [])).map((c: any) => ({ id: c.id, name: c.customer_name || c.name })));
      }
    } catch (e) {
    }

    // 加载供应商列表
    try {
      const supRes = await authFetch('/api/suppliers');
      const supResult = await supRes.json();
      if (supResult.success) {
        setSuppliers((Array.isArray(supResult.data) ? supResult.data : (supResult.data?.list || [])).map((s: any) => ({ id: s.id, name: s.supplier_name || s.name })));
      }
    } catch (e) {
    }

    setPermissionDialogOpen(true);
  };

  // 切换菜单选择
  const toggleMenuSelection = (menuId: number) => {
    setSelectedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  // 递归获取所有菜单ID
  const getAllMenuIds = (menuList: Menu[]): number[] => {
    let ids: number[] = [];
    menuList.forEach((menu) => {
      ids.push(menu.id);
      if (menu.children && menu.children.length > 0) {
        ids = [...ids, ...getAllMenuIds(menu.children)];
      }
    });
    return ids;
  };

  // 递归渲染菜单树
  const renderMenuTree = (menuList: Menu[], level = 0) => {
    return menuList.map((menu) => (
      <div key={menu.id} className={`${level > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center gap-2 py-1 hover:bg-muted rounded px-2">
          <Checkbox
            checked={selectedMenus.includes(menu.id)}
            onCheckedChange={() => toggleMenuSelection(menu.id)}
          />
          <span className="text-sm">{menu.menu_name}</span>
          {menu.path && <span className="text-xs text-gray-400">({menu.path})</span>}
        </div>
        {menu.children && menu.children.length > 0 && (
          <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-4">
            {renderMenuTree(menu.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // 获取状态徽章
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{tc('enabled')}</Badge>;
      case 0:
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted">{tc('disabled')}</Badge>;
      default:
        return <Badge variant="secondary">{tc('unknown')}</Badge>;
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchMenus();
  }, [fetchRoles, fetchMenus]);

  return (
    <MainLayout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  {tc('roleManagement')}
                </CardTitle>
                <CardDescription>{tc('roleManagementDesc')}</CardDescription>
              </div>
              <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {tc('addRole')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 搜索栏 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={tc('searchRolePlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRoles()}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchRoles}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {tc('refresh')}
              </Button>
            </div>

            {/* 角色列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{tc('index')}</TableHead>
                    <TableHead>{tc('roleCode')}</TableHead>
                    <TableHead>{tc('roleName')}</TableHead>
                    <TableHead>{tc('description')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-right">{tc('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role, index) => (
                    <TableRow key={role.id}>
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{role.role_code}</TableCell>
                      <TableCell>{role.role_name}</TableCell>
                      <TableCell className="text-gray-500">{role.description || '-'}</TableCell>
                      <TableCell>{getStatusBadge(role.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPermissionDialog(role)}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            {tc('permission')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(role)}>
                            <Edit className="w-4 h-4 mr-1" />
                            {tc('edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteRole(role.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {tc('delete')}
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
      </div>

      {/* 新增/编辑角色对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{editing ? tc('editRole') : tc('addRole')}</DialogTitle>
            <DialogDescription>{editing ? tc('editRoleDesc') : tc('addRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>
                {tc('roleCode')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.role_code || ''}
                onChange={(e) => setForm({ ...form, role_code: e.target.value })}
                placeholder={tc('roleCodePlaceholder')}
                readOnly={editing}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {tc('roleName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.role_name || ''}
                onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                placeholder={tc('roleNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('description')}</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={tc('descriptionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('status')}</Label>
              <Select
                value={form.status?.toString() || '1'}
                onValueChange={(v) => setForm({ ...form, status: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{tc('enabled')}</SelectItem>
                  <SelectItem value="0">{tc('disabled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveRole} className="bg-blue-600 hover:bg-blue-700">
              {editing ? tc('update') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限设置对话框 */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{tc('setPermission')} - {selectedRole?.role_name}</DialogTitle>
            <DialogDescription>{tc('setPermissionDesc')}</DialogDescription>
          </DialogHeader>

          <Tabs value={activePermissionTab} onValueChange={setActivePermissionTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="menus" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                {tc('menuPermission')}
              </TabsTrigger>
              <TabsTrigger value="buttons" className="flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                {tc('buttonPermission')}
              </TabsTrigger>
              <TabsTrigger value="dataScope" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {tc('dataPermission')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="menus" className="mt-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Checkbox
                    checked={
                      menus.length > 0 &&
                      getAllMenuIds(menus).every((id) => selectedMenus.includes(id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMenus(getAllMenuIds(menus));
                      } else {
                        setSelectedMenus([]);
                      }
                    }}
                  />
                  <span className="font-medium">{tc('selectAll')}</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    {tc('selectedMenuCount', { count: selectedMenus.length })}
                  </span>
                </div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {renderMenuTree(menus)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="buttons" className="mt-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Checkbox
                    checked={
                      selectedPermissions.length > 0 &&
                      permissionModules
                        .flatMap((m) => m.permissions.map((p) => p.id))
                        .every((id) => selectedPermissions.includes(id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allPermissionIds = permissionModules.flatMap((m) =>
                          m.permissions.map((p) => p.id)
                        );
                        setSelectedPermissions(allPermissionIds);
                      } else {
                        setSelectedPermissions([]);
                      }
                    }}
                  />
                  <span className="font-medium">{tc('selectAllPermissions')}</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    {tc('selectedPermissionCount', { count: selectedPermissions.length })}
                  </span>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {permissionModules.map((module) => (
                    <div key={module.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <Checkbox
                          checked={module.permissions.every((p) =>
                            selectedPermissions.includes(p.id)
                          )}
                          onCheckedChange={(checked) => {
                            const modulePermissionIds = module.permissions.map((p) => p.id);
                            if (checked) {
                              setSelectedPermissions((prev) => [
                                ...prev,
                                ...modulePermissionIds.filter((id) => !prev.includes(id)),
                              ]);
                            } else {
                              setSelectedPermissions((prev) =>
                                prev.filter((id) => !modulePermissionIds.includes(id))
                              );
                            }
                          }}
                        />
                        <span className="font-medium text-sm">{module.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {
                            module.permissions.filter((p) => selectedPermissions.includes(p.id))
                              .length
                          }
                          /{module.permissions.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {module.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={() => {
                                setSelectedPermissions((prev) =>
                                  prev.includes(permission.id)
                                    ? prev.filter((id) => id !== permission.id)
                                    : [...prev, permission.id]
                                );
                              }}
                            />
                            <span className="text-sm">{permission.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dataScope" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {tc('dataPermissionDesc')}
                </p>

                {/* 仓库维度 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <Checkbox
                      checked={warehouses.length > 0 && (dataScopeConfig.warehouse || []).length === warehouses.length}
                      onCheckedChange={(checked) => {
                        setDataScopeConfig((prev) => ({
                          ...prev,
                          warehouse: checked ? warehouses.map((w) => w.id) : [],
                        }));
                      }}
                    />
                    <span className="font-medium text-sm">{tc('warehousePermission')}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {(dataScopeConfig.warehouse || []).length}/{warehouses.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {warehouses.map((wh) => (
                      <div key={wh.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={(dataScopeConfig.warehouse || []).includes(wh.id)}
                          onCheckedChange={(checked) => {
                            setDataScopeConfig((prev) => {
                              const current = prev.warehouse || [];
                              return {
                                ...prev,
                                warehouse: checked
                                  ? [...current, wh.id]
                                  : current.filter((id) => id !== wh.id),
                              };
                            });
                          }}
                        />
                        <span className="text-sm">{wh.name}</span>
                      </div>
                    ))}
                    {warehouses.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">{tc('noWarehouseData')}</p>
                    )}
                  </div>
                </div>

                {/* 客户维度 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <Checkbox
                      checked={customers.length > 0 && (dataScopeConfig.customer || []).length === customers.length}
                      onCheckedChange={(checked) => {
                        setDataScopeConfig((prev) => ({
                          ...prev,
                          customer: checked ? customers.map((c) => c.id) : [],
                        }));
                      }}
                    />
                    <span className="font-medium text-sm">{tc('customerPermission')}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {(dataScopeConfig.customer || []).length}/{customers.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {customers.map((cust) => (
                      <div key={cust.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={(dataScopeConfig.customer || []).includes(cust.id)}
                          onCheckedChange={(checked) => {
                            setDataScopeConfig((prev) => {
                              const current = prev.customer || [];
                              return {
                                ...prev,
                                customer: checked
                                  ? [...current, cust.id]
                                  : current.filter((id) => id !== cust.id),
                              };
                            });
                          }}
                        />
                        <span className="text-sm">{cust.name}</span>
                      </div>
                    ))}
                    {customers.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">{tc('noCustomerData')}</p>
                    )}
                  </div>
                </div>

                {/* 供应商维度 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <Checkbox
                      checked={suppliers.length > 0 && (dataScopeConfig.supplier || []).length === suppliers.length}
                      onCheckedChange={(checked) => {
                        setDataScopeConfig((prev) => ({
                          ...prev,
                          supplier: checked ? suppliers.map((s) => s.id) : [],
                        }));
                      }}
                    />
                    <span className="font-medium text-sm">{tc('supplierPermission')}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {(dataScopeConfig.supplier || []).length}/{suppliers.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {suppliers.map((sup) => (
                      <div key={sup.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={(dataScopeConfig.supplier || []).includes(sup.id)}
                          onCheckedChange={(checked) => {
                            setDataScopeConfig((prev) => {
                              const current = prev.supplier || [];
                              return {
                                ...prev,
                                supplier: checked
                                  ? [...current, sup.id]
                                  : current.filter((id) => id !== sup.id),
                              };
                            });
                          }}
                        />
                        <span className="text-sm">{sup.name}</span>
                      </div>
                    ))}
                    {suppliers.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">{tc('noSupplierData')}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveRolePermissions} className="bg-blue-600 hover:bg-blue-700">
              {tc('savePermission')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
