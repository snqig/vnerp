'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Trash2, Plus, Edit, Settings, RefreshCw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface ConfigItem {
  id: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: number;
  description?: string;
  remark?: string;
}

// 配置分组定义
const configGroups = [
  { key: 'inventory', label: '库存管理', icon: '📦' },
  { key: 'order', label: '订单管理', icon: '📋' },
  { key: 'purchase', label: '采购管理', icon: '🛒' },
  { key: 'finance', label: '财务管理', icon: '💰' },
  { key: 'system', label: '系统设置', icon: '⚙️' },
  { key: 'other', label: '其他', icon: '📝' },
];

// 常用配置预设
const presetConfigs: Partial<ConfigItem>[] = [
  { config_name: '允许负库存', config_key: 'inventory.allow_negative', config_value: 'false', config_type: 2, description: '是否允许库存数量为负数' },
  { config_name: '库存预警阈值', config_key: 'inventory.alert_threshold', config_value: '10', config_type: 1, description: '低于此数量触发库存预警' },
  { config_name: '库存盘点差异审批', config_key: 'inventory.stocktake_approval', config_value: 'true', config_type: 2, description: '盘点差异是否需要审批' },
  { config_name: '订单号前缀', config_key: 'order.prefix', config_value: 'ORD', config_type: 1, description: '销售订单号前缀' },
  { config_name: '采购单号前缀', config_key: 'purchase.prefix', config_value: 'PO', config_type: 1, description: '采购订单号前缀' },
  { config_name: '入库单号前缀', config_key: 'inbound.prefix', config_value: 'INB', config_type: 1, description: '入库单号前缀' },
  { config_name: '出库单号前缀', config_key: 'outbound.prefix', config_value: 'OTB', config_type: 1, description: '出库单号前缀' },
  { config_name: '默认付款期限（天）', config_key: 'finance.payment_terms_days', config_value: '30', config_type: 1, description: '默认付款期限天数' },
  { config_name: '税率（%）', config_key: 'finance.tax_rate', config_value: '13', config_type: 1, description: '默认增值税税率' },
  { config_name: '密码最小长度', config_key: 'system.password_min_length', config_value: '6', config_type: 1, description: '用户密码最小长度要求' },
  { config_name: '登录失败锁定次数', config_key: 'system.login_fail_lock_count', config_value: '5', config_type: 1, description: '连续登录失败多少次后锁定账号' },
  { config_name: '登录锁定时间（分钟）', config_key: 'system.login_lock_minutes', config_value: '30', config_type: 1, description: '账号锁定持续时间' },
  { config_name: '密码过期天数', config_key: 'system.password_expire_days', config_value: '90', config_type: 1, description: '0表示永不过期' },
  { config_name: '初始密码强制修改', config_key: 'system.force_change_password', config_value: 'true', config_type: 2, description: '首次登录是否强制修改密码' },
  { config_name: '操作日志保留天数', config_key: 'system.log_retention_days', config_value: '180', config_type: 1, description: '操作日志保留天数，0表示永久保留' },
  { config_name: '会话超时（分钟）', config_key: 'system.session_timeout', config_value: '120', config_type: 1, description: '用户会话超时时间' },
];

function getConfigGroup(key: string): string {
  if (key.startsWith('inventory.')) return 'inventory';
  if (key.startsWith('order.')) return 'order';
  if (key.startsWith('purchase.')) return 'purchase';
  if (key.startsWith('finance.')) return 'finance';
  if (key.startsWith('system.')) return 'system';
  if (key.startsWith('inbound.') || key.startsWith('outbound.')) return 'inventory';
  return 'other';
}

export default function ConfigPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<ConfigItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ConfigItem>>({});

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
        configName: searchName,
      });
      const res = await authFetch('/api/system/config?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [page, searchName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!form.config_key || !form.config_name) {
      toast({ title: '参数键和名称不能为空', variant: 'destructive' });
      return;
    }

    try {
      const url = '/api/system/config';
      const method = editing ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editing ? '更新成功' : '创建成功' });
        setDialogOpen(false);
        fetchData();
      } else {
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch('/api/system/config?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleInitPresets = async () => {
    if (!confirm('确定初始化预设配置？已存在的配置不会被覆盖。')) return;
    let created = 0;
    for (const preset of presetConfigs) {
      const exists = list.some((item) => item.config_key === preset.config_key);
      if (!exists) {
        try {
          const res = await authFetch('/api/system/config', {
            method: 'POST',
            body: JSON.stringify(preset),
          });
          const result = await res.json();
          if (result.success) created++;
        } catch (e) {
          console.error(e);
        }
      }
    }
    toast({ title: `初始化完成，新增 ${created} 条配置` });
    fetchData();
  };

  const openAddDialog = () => {
    setForm({ config_type: 1 });
    setEditing(false);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ConfigItem) => {
    setForm({ ...item });
    setEditing(true);
    setDialogOpen(true);
  };

  // 按分组过滤
  const filteredList = activeGroup === 'all'
    ? list
    : list.filter((item) => getConfigGroup(item.config_key) === activeGroup);

  const getTypeBadge = (type: number) => {
    if (type === 2) return <Badge variant="secondary" className="text-xs">{tc("boolean")}</Badge>;
    return <Badge variant="outline" className="text-xs">{tc("text")}</Badge>;
  };

  const renderValueInput = () => {
    if (form.config_type === 2) {
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={form.config_value === 'true'}
            onCheckedChange={(checked) => setForm({ ...form, config_value: checked ? 'true' : 'false' })}
          />
          <span className="text-sm">{form.config_value === 'true' ? tc("yes") : tc("no")}</span>
        </div>
      );
    }
    return (
      <Input
        value={form.config_value || ''}
        onChange={(e) => setForm({ ...form, config_value: e.target.value })}
        placeholder={tc("enterParamValue")}
      />
    );
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              {t("systemConfigCenter")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{tc("systemConfigDesc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={tc("searchParamPlaceholder")}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-48 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
            <Button size="sm" variant="outline" onClick={fetchData}>
              <Search className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleInitPresets}>
              {t("initPresets")}
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openAddDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t("add")}
            </Button>
          </div>
        </div>

        <Tabs value={activeGroup} onValueChange={setActiveGroup}>
          <TabsList>
            <TabsTrigger value="all">{tc("all")}</TabsTrigger>
            {configGroups.map((group) => (
              <TabsTrigger key={group.key} value={group.key} className="text-xs">
                {group.icon} {tc("configGroup_" + group.key)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeGroup} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc("paramName")}</TableHead>
                      <TableHead className="text-xs">{tc("paramKey")}</TableHead>
                      <TableHead className="text-xs">{tc("paramValue")}</TableHead>
                      <TableHead className="text-xs">{tc("type")}</TableHead>
                      <TableHead className="text-xs">{tc("description")}</TableHead>
                      <TableHead className="text-xs text-right">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.config_name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{item.config_key}</TableCell>
                        <TableCell className="text-sm font-mono">
                          {item.config_type === 2 ? (
                            <Badge variant={item.config_value === 'true' ? 'default' : 'secondary'} className="text-xs">
                              {item.config_value === 'true' ? tc("enabled") : tc("disabled")}
                            </Badge>
                          ) : (
                            item.config_value
                          )}
                        </TableCell>
                        <TableCell>{getTypeBadge(item.config_type)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                          {item.description || item.remark || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditDialog(item)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {tc("noConfigItems")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tc("totalItems", { count: filteredList.length })}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {tc("prevPage")}
            </Button>
            <Button size="sm" variant="outline" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>
              {tc("nextPage")}
            </Button>
          </div>
        </div>
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("editConfig") : t("addConfig")}</DialogTitle>
            <DialogDescription>{editing ? tc("editConfigDesc") : tc("addConfigDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{tc("paramName")} <span className="text-red-500">*</span></Label>
              <Input
                value={form.config_name || ''}
                onChange={(e) => setForm({ ...form, config_name: e.target.value })}
                placeholder={tc("paramNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc("paramKey")} <span className="text-red-500">*</span></Label>
              <Input
                value={form.config_key || ''}
                onChange={(e) => setForm({ ...form, config_key: e.target.value })}
                placeholder={tc("paramKeyPlaceholder")}
                readOnly={editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc("paramType")}</Label>
              <Select
                value={form.config_type?.toString() || '1'}
                onValueChange={(v) => setForm({ ...form, config_type: parseInt(v), config_value: parseInt(v) === 2 ? 'false' : '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{tc("text")}</SelectItem>
                  <SelectItem value="2">{tc("booleanOnOff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc("paramValue")}</Label>
              {renderValueInput()}
            </div>
            <div className="space-y-2">
              <Label>{tc("description")}</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={tc("configDescPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-1" />
              {editing ? tc("update") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
