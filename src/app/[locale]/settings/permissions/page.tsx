'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
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
    name: tc('text_c7ysa'),
    icon: 'LayoutDashboard',
    permissions: [{ id: 'dashboard_view', name: tc('text_4lte3w'), description: tc('text_q0b5s') }],
  },
  {
    id: 'business',
    name: tc('text_a7c0wc'),
    icon: 'Briefcase',
    permissions: [
      { id: 'business_order_view', name: tc('text_dlur7d'), description: tc('text_2tryno') },
      { id: 'business_order_create', name: tc('text_are5wy'), description: tc('text_z6a7ob') },
      { id: 'business_order_edit', name: tc('text_gmqzji'), description: tc('text_fklrak') },
      { id: 'business_order_delete', name: tc('text_azljxz'), description: tc('text_naqi90') },
      { id: 'business_customer_view', name: tc('text_dlmo7v'), description: tc('text_q0q74') },
      { id: 'business_customer_manage', name: tc('text_g2skre'), description: tc('text_6l7mgb') },
    ],
  },
  {
    id: 'sample',
    name: tc('text_cu3n96'),
    icon: 'FlaskConical',
    permissions: [
      { id: 'sample_view', name: tc('text_dlnudm'), description: tc('text_1l89ay') },
      { id: 'sample_create', name: tc('text_ar7937'), description: tc('text_yzs6vt') },
      { id: 'sample_edit', name: tc('text_gmk2pr'), description: tc('text_ag3h4t') },
      { id: 'sample_approve', name: tc('text_byyerg'), description: tc('text_2v442o') },
      { id: 'sample_standard_card', name: tc('text_8rr715'), description: tc('text_7i925') },
    ],
  },
  {
    id: 'purchase',
    name: tc('text_iz76ff'),
    icon: 'ShoppingCart',
    permissions: [
      { id: 'purchase_order_view', name: tc('text_4c07g7'), description: tc('text_7qbq7z') },
      { id: 'purchase_order_create', name: tc('text_lj6hg0'), description: tc('text_suopys') },
      { id: 'purchase_order_approve', name: tc('text_g57efr'), description: tc('text_39rkrm') },
      { id: 'purchase_supplier_view', name: tc('text_4lx1mh'), description: tc('text_p5qu8b') },
      { id: 'purchase_supplier_manage', name: tc('text_151x7s'), description: tc('text_dl1usb') },
      { id: 'purchase_request_view', name: tc('text_4cuutj'), description: tc('text_7q881c') },
      { id: 'purchase_request_create', name: tc('text_lk14tc'), description: tc('text_s8dzyv') },
    ],
  },
  {
    id: 'warehouse',
    name: tc('text_acd50l'),
    icon: 'Warehouse',
    permissions: [
      { id: 'warehouse_inventory_view', name: tc('text_dln4vf'), description: tc('text_1293dl') },
      { id: 'warehouse_inbound', name: tc('text_anx7ct'), description: tc('text_uktq2m') },
      { id: 'warehouse_outbound', name: tc('text_aqkceg'), description: tc('text_ui6l0z') },
      { id: 'warehouse_transfer', name: tc('text_cbhbu2'), description: tc('text_sx9lld') },
      { id: 'warehouse_inventory_check', name: tc('text_cbdsxy'), description: tc('text_sxd4hh') },
    ],
  },
  {
    id: 'production',
    name: tc('text_f3xa0d'),
    icon: 'Factory',
    permissions: [
      { id: 'production_order_view', name: tc('text_4ghy1l'), description: tc('text_3uu1q6') },
      { id: 'production_order_create', name: tc('text_lno81e'), description: tc('text_w3s6a1') },
      { id: 'production_order_schedule', name: tc('text_f3t7vl'), description: tc('text_7nzkgu') },
      { id: 'production_report_view', name: tc('text_dlnuau'), description: tc('text_3uuwwe') },
      { id: 'production_report_create', name: tc('text_f3swnc'), description: tc('text_q4y0s3') },
    ],
  },
  {
    id: 'quality',
    name: tc('text_ba41n0'),
    icon: 'CheckSquare',
    permissions: [
      { id: 'quality_inspection_view', name: tc('text_dlp7o2'), description: tc('text_2lzvw7') },
      { id: 'quality_inspection_create', name: tc('text_czafdd'), description: tc('text_thvbla') },
      { id: 'quality_ncr_view', name: tc('text_4m6xl1'), description: tc('text_cs0d2t') },
      { id: 'quality_ncr_manage', name: tc('text_14s198'), description: tc('text_uhjof6') },
      { id: 'quality_report_view', name: tc('text_75ttde'), description: tc('text_3m98a4') },
    ],
  },
  {
    id: 'settings',
    name: tc('text_gar1ro'),
    icon: 'Settings',
    permissions: [
      { id: 'settings_organization', name: tc('text_giucz7'), description: tc('text_njdkkr') },
      { id: 'settings_permissions', name: tc('text_dnhnle'), description: tc('text_t7q32g') },
      { id: 'settings_system', name: tc('text_garzt1'), description: tc('text_t1z5v7') },
      { id: 'settings_audit', name: tc('text_c4zzjm'), description: tc('text_i1m4jv') },
    ],
  },
];

// 角色数据
const roles = [
  {
    id: 'admin',
    name: tc('text_7z3p2n'),
    code: 'ADMIN',
    description: tc('text_c1l5oe'),
    userCount: 2,
    isSystem: true,
    permissions: permissionModules.flatMap((m) => m.permissions.map((p) => p.id)),
  },
  {
    id: 'sales_mgr',
    name: tc('text_a7ckda'),
    code: 'SALES_MGR',
    description: tc('text_jk6xn1'),
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'business_order_view',
      'business_order_create',
      'business_order_edit',
      'business_customer_view',
      'business_customer_manage',
      'sample_view',
      'sample_create',
      'sample_edit',
      'sample_approve',
    ],
  },
  {
    id: 'prod_mgr',
    name: tc('text_f3plim'),
    code: 'PROD_MGR',
    description: tc('text_3anj8y'),
    userCount: 2,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'production_order_view',
      'production_order_create',
      'production_order_schedule',
      'production_report_view',
      'production_report_create',
      'quality_inspection_view',
      'quality_inspection_create',
    ],
  },
  {
    id: 'qc_mgr',
    name: tc('text_b9wd59'),
    code: 'QC_MGR',
    description: tc('text_zdar2l'),
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'quality_inspection_view',
      'quality_inspection_create',
      'quality_ncr_view',
      'quality_ncr_manage',
      'quality_report_view',
    ],
  },
  {
    id: 'purchase_mgr',
    name: tc('text_iz7pwd'),
    code: 'PUR_MGR',
    description: tc('text_px7jsc'),
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'purchase_order_view',
      'purchase_order_create',
      'purchase_order_approve',
      'purchase_supplier_view',
      'purchase_supplier_manage',
      'purchase_request_view',
      'purchase_request_create',
    ],
  },
  {
    id: 'warehouse_mgr',
    name: tc('text_ac5giu'),
    code: 'WH_MGR',
    description: tc('text_nwgosa'),
    userCount: 1,
    isSystem: false,
    permissions: [
      'dashboard_view',
      'warehouse_inventory_view',
      'warehouse_inbound',
      'warehouse_outbound',
      'warehouse_transfer',
      'warehouse_inventory_check',
    ],
  },
  {
    id: 'user',
    name: tc('text_dim3g9'),
    code: 'USER',
    description: tc('text_51s0pq'),
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
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 初始化角色权限状态
  const initRolePermissions = (role: (typeof roles)[0]) => {
    const perms: Record<string, boolean> = {};
    permissionModules.forEach((module) => {
      module.permissions.forEach((perm) => {
        perms[perm.id] = role.permissions.includes(perm.id);
      });
    });
    setRolePermissions(perms);
  };

  // 切换角色
  const handleRoleSelect = (role: (typeof roles)[0]) => {
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
    const moduleData = permissionModules.find((m) => m.id === moduleId);
    if (!moduleData) return;

    const newPerms = { ...rolePermissions };
    moduleData.permissions.forEach((perm) => {
      newPerms[perm.id] = checked;
    });
    setRolePermissions(newPerms);
  };

  // 保存权限
  const savePermissions = () => {
    const enabledPermissions = Object.entries(rolePermissions)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);
    alert(`已保存 ${selectedRole.name} 的权限设置`);
  };

  return (
    <MainLayout title="权限管理">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
            <TabsTrigger value="roles">{tc('text_hxen9p')}</TabsTrigger>
            <TabsTrigger value="users">{tc('text_f6uwfw')}</TabsTrigger>
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
                      {tc('text_gaqqlg')}
                    </CardTitle>
                    <CardDescription>{tc('text_frsgjy')}</CardDescription>
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
                              : 'hover:bg-muted border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{role.name}</div>
                            {role.isSystem && (
                              <Badge variant="secondary" className="text-xs">
                                {tc('text_lydg')}
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
                              {role.userCount}
                              {tc('text_fju')}
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
                        {tc('text_dnlejy')}
                      </CardTitle>
                      <CardDescription>
                        {tc('text_pewx')}
                        {selectedRole.name}
                        {tc('text_krsk2o')}
                        {selectedRole.isSystem && (
                          <span className="text-orange-600 ml-2">{tc('text_o8kqbk')}</span>
                        )}
                      </CardDescription>
                    </div>
                    {!selectedRole.isSystem && (
                      <Button onClick={savePermissions}>
                        <Save className="h-4 w-4 mr-2" />
                        {tc('text_agioco')}
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
                                <Label className="text-sm text-muted-foreground">
                                  {tc('selectAll')}
                                </Label>
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
                                    : 'hover:bg-muted cursor-pointer'
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
                    {tc('text_y9wjst')}
                  </CardTitle>
                  <CardDescription>{tc('text_yks3aq')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{tc('text_yl8cd2')}</p>
                  <p className="text-sm mt-2">{tc('text_pf7uo')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
