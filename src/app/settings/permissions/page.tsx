'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield,
  Users,
  Save,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  FileEdit,
  Trash,
  Settings,
  UserCog,
} from 'lucide-react';

// 权限模块定义
const permissionModules = [
  {
    id: 'dashboard',
    name: '仪表盘',
    icon: 'LayoutDashboard',
    permissions: [
      { id: 'dashboard_view', name: '查看仪表盘', description: '查看系统仪表盘和数据概览' },
    ],
  },
  {
    id: 'business',
    name: '业务管理',
    icon: 'Briefcase',
    permissions: [
      { id: 'business_order_view', name: '查看订单', description: '查看客户订单列表和详情' },
      { id: 'business_order_create', name: '创建订单', description: '创建新的客户订单' },
      { id: 'business_order_edit', name: '编辑订单', description: '修改订单信息' },
      { id: 'business_order_delete', name: '删除订单', description: '删除订单记录' },
      { id: 'business_customer_view', name: '查看客户', description: '查看客户档案' },
      { id: 'business_customer_manage', name: '管理客户', description: '创建和编辑客户信息' },
    ],
  },
  {
    id: 'sample',
    name: '打样中心',
    icon: 'FlaskConical',
    permissions: [
      { id: 'sample_view', name: '查看打样', description: '查看打样工单' },
      { id: 'sample_create', name: '创建打样', description: '创建新的打样工单' },
      { id: 'sample_edit', name: '编辑打样', description: '修改打样信息' },
      { id: 'sample_approve', name: '审批打样', description: '审批打样申请' },
      { id: 'sample_standard_card', name: '标准卡管理', description: '管理标准卡（流程卡）' },
    ],
  },
  {
    id: 'purchase',
    name: '采购管理',
    icon: 'ShoppingCart',
    permissions: [
      { id: 'purchase_order_view', name: '查看采购单', description: '查看采购订单' },
      { id: 'purchase_order_create', name: '创建采购单', description: '创建新的采购订单' },
      { id: 'purchase_order_approve', name: '审批采购单', description: '审批采购申请' },
      { id: 'purchase_supplier_view', name: '查看供应商', description: '查看供应商信息' },
      { id: 'purchase_supplier_manage', name: '管理供应商', description: '创建和编辑供应商' },
      { id: 'purchase_request_view', name: '查看请购单', description: '查看采购申请' },
      { id: 'purchase_request_create', name: '创建请购单', description: '创建采购申请' },
    ],
  },
  {
    id: 'warehouse',
    name: '仓库管理',
    icon: 'Warehouse',
    permissions: [
      { id: 'warehouse_inventory_view', name: '查看库存', description: '查看库存信息' },
      { id: 'warehouse_inbound', name: '入库操作', description: '执行入库操作' },
      { id: 'warehouse_outbound', name: '出库操作', description: '执行出库操作' },
      { id: 'warehouse_transfer', name: '库存调拨', description: '执行库存调拨' },
      { id: 'warehouse_inventory_check', name: '库存盘点', description: '执行库存盘点' },
    ],
  },
  {
    id: 'production',
    name: '生产管理',
    icon: 'Factory',
    permissions: [
      { id: 'production_order_view', name: '查看生产单', description: '查看生产工单' },
      { id: 'production_order_create', name: '创建生产单', description: '创建生产工单' },
      { id: 'production_order_schedule', name: '生产排程', description: '安排生产计划' },
      { id: 'production_report_view', name: '查看报工', description: '查看生产报工' },
      { id: 'production_report_create', name: '生产报工', description: '执行生产报工' },
    ],
  },
  {
    id: 'quality',
    name: '品质管理',
    icon: 'CheckSquare',
    permissions: [
      { id: 'quality_inspection_view', name: '查看检验', description: '查看检验记录' },
      { id: 'quality_inspection_create', name: '执行检验', description: '执行来料/过程/成品检验' },
      { id: 'quality_ncr_view', name: '查看不合格', description: '查看不合格品记录' },
      { id: 'quality_ncr_manage', name: '管理不合格', description: '处理不合格品' },
      { id: 'quality_report_view', name: '查看质量报告', description: '查看质量统计报告' },
    ],
  },
  {
    id: 'settings',
    name: '系统设置',
    icon: 'Settings',
    permissions: [
      { id: 'settings_organization', name: '组织设置', description: '管理企业组织和部门' },
      { id: 'settings_permissions', name: '权限管理', description: '配置角色和权限' },
      { id: 'settings_system', name: '系统配置', description: '系统参数配置' },
      { id: 'settings_audit', name: '审计日志', description: '查看系统操作日志' },
    ],
  },
];

// 角色数据
const roles = [
  {
    id: 'admin',
    name: '系统管理员',
    code: 'ADMIN',
    description: '系统最高权限，可访问所有功能',
    userCount: 2,
    isSystem: true,
    permissions: permissionModules.flatMap(m => m.permissions.map(p => p.id)),
  },
  {
    id: 'sales_mgr',
    name: '业务经理',
    code: 'SALES_MGR',
    description: '业务部管理权限',
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'business_order_view', 'business_order_create', 'business_order_edit',
      'business_customer_view', 'business_customer_manage',
      'sample_view', 'sample_create', 'sample_edit', 'sample_approve',
    ],
  },
  {
    id: 'prod_mgr',
    name: '生产主管',
    code: 'PROD_MGR',
    description: '生产部管理权限',
    userCount: 2,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'production_order_view', 'production_order_create', 'production_order_schedule',
      'production_report_view', 'production_report_create',
      'quality_inspection_view', 'quality_inspection_create',
    ],
  },
  {
    id: 'qc_mgr',
    name: '品质主管',
    code: 'QC_MGR',
    description: '品质部管理权限',
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'quality_inspection_view', 'quality_inspection_create',
      'quality_ncr_view', 'quality_ncr_manage',
      'quality_report_view',
    ],
  },
  {
    id: 'purchase_mgr',
    name: '采购经理',
    code: 'PUR_MGR',
    description: '采购部管理权限',
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'purchase_order_view', 'purchase_order_create', 'purchase_order_approve',
      'purchase_supplier_view', 'purchase_supplier_manage',
      'purchase_request_view', 'purchase_request_create',
    ],
  },
  {
    id: 'warehouse_mgr',
    name: '仓库主管',
    code: 'WH_MGR',
    description: '仓库部管理权限',
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'warehouse_inventory_view', 'warehouse_inbound', 'warehouse_outbound',
      'warehouse_transfer', 'warehouse_inventory_check',
    ],
  },
  {
    id: 'user',
    name: '普通员工',
    code: 'USER',
    description: '基础操作权限',
    userCount: 45,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'business_order_view',
      'sample_view',
      'production_report_create',
    ],
  },
];

export default function PermissionsSettingsPage() {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 初始化角色权限状态
  const initRolePermissions = (role: typeof roles[0]) => {
    const perms: Record<string, boolean> = {};
    permissionModules.forEach((module) => {
      module.permissions.forEach((perm) => {
        perms[perm.id] = role.permissions.includes(perm.id);
      });
    });
    setRolePermissions(perms);
  };

  // 切换角色
  const handleRoleSelect = (role: typeof roles[0]) => {
    setSelectedRole(role);
    initRolePermissions(role);
  };

  // 切换权限
  const togglePermission = (permId: string) => {
    if (selectedRole.isSystem) return; // 系统角色不可编辑
    setRolePermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  // 全选/取消全选模块权限
  const toggleModulePermissions = (moduleId: string, checked: boolean) => {
    if (selectedRole.isSystem) return;
    const module = permissionModules.find((m) => m.id === moduleId);
    if (!module) return;

    const newPerms = { ...rolePermissions };
    module.permissions.forEach((perm) => {
      newPerms[perm.id] = checked;
    });
    setRolePermissions(newPerms);
  };

  // 保存权限
  const savePermissions = () => {
    const enabledPermissions = Object.entries(rolePermissions)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);
    console.log('保存角色权限:', selectedRole.name, enabledPermissions);
    alert(`已保存 ${selectedRole.name} 的权限设置`);
  };

  return (
    <MainLayout title="权限管理">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
            <TabsTrigger value="roles">角色权限</TabsTrigger>
            <TabsTrigger value="users">用户权限</TabsTrigger>
          </TabsList>

          {/* 角色权限 */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* 角色列表 */}
              <div className="col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      系统角色
                    </CardTitle>
                    <CardDescription>选择角色配置权限</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => handleRoleSelect(role)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedRole.id === role.id
                              ? 'bg-blue-50 border-2 border-blue-200'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{role.name}</div>
                            {role.isSystem && (
                              <Badge variant="secondary" className="text-xs">
                                系统
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {role.description}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {role.code}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {role.userCount} 人
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 权限配置 */}
              <div className="col-span-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        权限配置
                      </CardTitle>
                      <CardDescription>
                        配置 {selectedRole.name} 的操作权限
                        {selectedRole.isSystem && (
                          <span className="text-orange-600 ml-2">(系统角色不可编辑)</span>
                        )}
                      </CardDescription>
                    </div>
                    {!selectedRole.isSystem && (
                      <Button onClick={savePermissions}>
                        <Save className="h-4 w-4 mr-2" />
                        保存权限
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {permissionModules.map((module) => (
                        <div key={module.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg">{module.name}</h4>
                            {!selectedRole.isSystem && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">全选</Label>
                                <Switch
                                  checked={module.permissions.every((p) => rolePermissions[p.id])}
                                  onCheckedChange={(checked) =>
                                    toggleModulePermissions(module.id, checked)
                                  }
                                />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {module.permissions.map((perm) => (
                              <div
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border ${
                                  selectedRole.isSystem
                                    ? 'opacity-60'
                                    : 'hover:bg-gray-50 cursor-pointer'
                                }`}
                                onClick={() => togglePermission(perm.id)}
                              >
                                <Checkbox
                                  checked={rolePermissions[perm.id] || false}
                                  disabled={selectedRole.isSystem}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{perm.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {perm.description}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 用户权限 */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    用户权限分配
                  </CardTitle>
                  <CardDescription>为特定用户分配额外权限或限制权限</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>用户级权限配置功能开发中...</p>
                  <p className="text-sm mt-2">您可以通过角色管理来控制用户权限</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
