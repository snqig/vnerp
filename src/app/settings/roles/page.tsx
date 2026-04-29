'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Shield, RefreshCw, Search, Users, CheckSquare, Square, LayoutGrid, MousePointer } from 'lucide-react';
import { toast } from 'sonner';
import { getPermissionModules, Permission } from '@/hooks/usePermission';

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
  { value: 5, label: '自定义' }
];

// 权限模块
const permissionModules = getPermissionModules();

export default function RolesPage() {
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

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const url = search 
        ? `/api/organization/role?keyword=${encodeURIComponent(search)}`
        : '/api/organization/role';
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      toast.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // 获取菜单列表
  const fetchMenus = useCallback(async () => {
    try {
      const response = await fetch('/api/menu');
      const result = await response.json();
      if (result.success) {
        setMenus(result.data);
      }
    } catch (error) {
      console.error('获取菜单列表失败:', error);
    }
  }, []);

  // 获取角色权限
  const fetchRolePermissions = async (roleId: number) => {
    try {
      // 获取菜单权限
      const menuResponse = await fetch(`/api/role-permissions?roleId=${roleId}`);
      const menuResult = await menuResponse.json();
      if (menuResult.success) {
        setSelectedMenus(menuResult.data.map((p: any) => p.menu_id));
      }

      // 获取按钮权限
      const roleResponse = await fetch('/api/organization/role');
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
      console.error('获取角色权限失败:', error);
      setSelectedMenus([]);
      setSelectedPermissions([]);
    }
  };

  // 保存角色
  const saveRole = async () => {
    if (!form.role_code || !form.role_name) {
      toast.error('角色编码和名称不能为空');
      return;
    }

    try {
      const url = editing ? '/api/organization/role' : '/api/organization/role';
      const method = editing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success(editing ? '角色更新成功' : '角色创建成功');
        setDialogOpen(false);
        fetchRoles();
      } else {
        toast.error(result.message || '保存失败');
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

  // 保存角色权限
  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      // 保存菜单权限
      const menuResponse = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: selectedRole.id,
          menu_ids: selectedMenus
        })
      });
      
      const menuResult = await menuResponse.json();
      if (!menuResult.success) {
        toast.error(menuResult.message || '菜单权限设置失败');
        return;
      }

      // 保存按钮权限
      const btnResponse = await fetch('/api/role-permissions/buttons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: selectedRole.id,
          permissions: selectedPermissions
        })
      });

      const btnResult = await btnResponse.json();
      if (!btnResult.success) {
        toast.error(btnResult.message || '按钮权限设置失败');
        return;
      }

      toast.success('权限设置成功');
      setPermissionDialogOpen(false);
      fetchRoles(); // 刷新角色列表
    } catch (error) {
      console.error('保存权限失败:', error);
      toast.error('保存权限失败');
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
    
    // 确保菜单已加载
    if (menus.length === 0) {
      await fetchMenus();
    }
    
    await fetchRolePermissions(role.id);
    setPermissionDialogOpen(true);
  };

  // 切换菜单选择
  const toggleMenuSelection = (menuId: number) => {
    setSelectedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // 递归获取所有菜单ID
  const getAllMenuIds = (menuList: Menu[]): number[] => {
    let ids: number[] = [];
    menuList.forEach(menu => {
      ids.push(menu.id);
      if (menu.children && menu.children.length > 0) {
        ids = [...ids, ...getAllMenuIds(menu.children)];
      }
    });
    return ids;
  };

  // 递归渲染菜单树
  const renderMenuTree = (menuList: Menu[], level = 0) => {
    return menuList.map(menu => (
      <div key={menu.id} className={`${level > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2">
          <Checkbox 
            checked={selectedMenus.includes(menu.id)}
            onCheckedChange={() => toggleMenuSelection(menu.id)}
          />
          <span className="text-sm">{menu.menu_name}</span>
          {menu.path && <span className="text-xs text-gray-400">({menu.path})</span>}
        </div>
        {menu.children && menu.children.length > 0 && (
          <div className="border-l-2 border-gray-200 ml-4">
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">启用</Badge>;
      case 0:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">停用</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
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
                  角色管理
                </CardTitle>
                <CardDescription>
                  管理系统角色和权限分配
                </CardDescription>
              </div>
              <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                新增角色
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 搜索栏 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索角色名称、编码..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRoles()}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchRoles}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
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
                    <TableHead className="w-16">序号</TableHead>
                    <TableHead>角色编码</TableHead>
                    <TableHead>角色名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role, index) => (
                    <TableRow key={role.id}>
                      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
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
                            权限
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(role)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteRole(role.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
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
            <DialogTitle>{editing ? '编辑角色' : '新增角色'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改角色信息' : '填写新角色信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>角色编码 <span className="text-red-500">*</span></Label>
              <Input 
                value={form.role_code || ''} 
                onChange={(e) => setForm({...form, role_code: e.target.value})}
                placeholder="请输入角色编码"
                readOnly={editing}
              />
            </div>
            <div className="space-y-2">
              <Label>角色名称 <span className="text-red-500">*</span></Label>
              <Input 
                value={form.role_name || ''} 
                onChange={(e) => setForm({...form, role_name: e.target.value})}
                placeholder="请输入角色名称"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input 
                value={form.description || ''} 
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="请输入角色描述"
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
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveRole} className="bg-blue-600 hover:bg-blue-700">
              {editing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限设置对话框 */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>设置权限 - {selectedRole?.role_name}</DialogTitle>
            <DialogDescription>
              配置该角色的菜单访问权限和按钮操作权限
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activePermissionTab} onValueChange={setActivePermissionTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="menus" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                菜单权限
              </TabsTrigger>
              <TabsTrigger value="buttons" className="flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                按钮权限
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="menus" className="mt-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Checkbox 
                    checked={menus.length > 0 && getAllMenuIds(menus).every(id => selectedMenus.includes(id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMenus(getAllMenuIds(menus));
                      } else {
                        setSelectedMenus([]);
                      }
                    }}
                  />
                  <span className="font-medium">全选</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    已选择 {selectedMenus.length} 个菜单
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
                    checked={selectedPermissions.length > 0 && permissionModules.flatMap(m => m.permissions.map(p => p.id)).every(id => selectedPermissions.includes(id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allPermissionIds = permissionModules.flatMap(m => 
                          m.permissions.map(p => p.id)
                        );
                        setSelectedPermissions(allPermissionIds);
                      } else {
                        setSelectedPermissions([]);
                      }
                    }}
                  />
                  <span className="font-medium">全选所有权限</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    已选择 {selectedPermissions.length} 个权限
                  </span>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {permissionModules.map(module => (
                    <div key={module.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <Checkbox 
                          checked={module.permissions.every(p => selectedPermissions.includes(p.id))}
                          onCheckedChange={(checked) => {
                            const modulePermissionIds = module.permissions.map(p => p.id);
                            if (checked) {
                              setSelectedPermissions(prev => [
                                ...prev,
                                ...modulePermissionIds.filter(id => !prev.includes(id))
                              ]);
                            } else {
                              setSelectedPermissions(prev => 
                                prev.filter(id => !modulePermissionIds.includes(id))
                              );
                            }
                          }}
                        />
                        <span className="font-medium text-sm">{module.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {module.permissions.filter(p => selectedPermissions.includes(p.id)).length}/{module.permissions.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {module.permissions.map(permission => (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={() => {
                                setSelectedPermissions(prev => 
                                  prev.includes(permission.id)
                                    ? prev.filter(id => id !== permission.id)
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
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveRolePermissions} className="bg-blue-600 hover:bg-blue-700">
              保存权限
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
