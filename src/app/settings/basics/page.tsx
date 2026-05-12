'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Save,
  FileText,
  Scissors,
  LayoutGrid,
  Package,
  Scaling,
  Warehouse,
  RefreshCw,
  Factory,
  ShieldCheck,
  Palette,
  BookOpen,
} from 'lucide-react';
import { ThemeSettings } from '@/components/theme-settings';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ConfigItem {
  id?: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type_enum: 'string' | 'number' | 'boolean' | 'select';
  category: string;
  description?: string;
  is_required?: boolean;
  approval_required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

interface ConfigGroup {
  category: string;
  display_name: string;
  items: ConfigItem[];
}

export default function BasicsSettingsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin');

  const [activeTab, setActiveTab] = useState(isAdmin ? 'numbering' : 'theme');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/system');
      const data = await res.json();
      if (data.success && data.data?.groups) {
        setConfigGroups(data.data.groups);
        const values: Record<string, string> = {};
        data.data.groups.forEach((group: ConfigGroup) => {
          group.items.forEach((item: ConfigItem) => {
            values[item.config_key] = item.config_value;
          });
        });
        setConfigValues(values);
      }
    } catch (e) {
      console.error('加载配置失败', e);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadConfigs();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleValueChange = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (category: string) => {
    setSaving(true);
    try {
      const group = configGroups.find(g => g.category === category);
      if (!group) return;

      const updates = group.items.map(item => ({
        config_key: item.config_key,
        config_value: configValues[item.config_key] || item.config_value,
      }));

      const res = await fetch('/api/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || '保存成功');
        await loadConfigs();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (e) {
      console.error('保存配置失败', e);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderConfigItem = (item: ConfigItem) => {
    const value = configValues[item.config_key] || item.config_value;

    switch (item.config_type_enum) {
      case 'boolean':
        return (
          <div key={item.config_key} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">{item.config_name}</Label>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <Switch
              checked={value === 'true'}
              onCheckedChange={v => handleValueChange(item.config_key, String(v))}
            />
          </div>
        );

      case 'number':
        return (
          <div key={item.config_key} className="space-y-2">
            <Label>{item.config_name}</Label>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <Input
              type="number"
              min={item.min}
              max={item.max}
              value={value}
              onChange={e => handleValueChange(item.config_key, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={item.config_key} className="space-y-2">
            <Label>{item.config_name}</Label>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <Select value={value} onValueChange={v => handleValueChange(item.config_key, v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(item.options || []).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <div key={item.config_key} className="space-y-2">
            <Label>{item.config_name}</Label>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <Input
              value={value}
              onChange={e => handleValueChange(item.config_key, e.target.value)}
            />
          </div>
        );
    }
  };

  const renderConfigGroup = (category: string, icon: React.ReactNode, title: string, description: string) => {
    const group = configGroups.find(g => g.category === category);
    if (!group) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map(item => renderConfigItem(item))}
          </div>
        </CardContent>
        <div className="px-6 pb-6 flex justify-end">
          <Button onClick={() => handleSave(category)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <MainLayout title="系统设置">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="系统设置">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full gap-1">
            {isAdmin && (
              <>
                <TabsTrigger value="numbering" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  编码规则
                </TabsTrigger>
                <TabsTrigger value="die" className="flex items-center gap-1">
                  <Scissors className="h-4 w-4" />
                  刀模配置
                </TabsTrigger>
                <TabsTrigger value="screen" className="flex items-center gap-1">
                  <LayoutGrid className="h-4 w-4" />
                  网版配置
                </TabsTrigger>
                <TabsTrigger value="material" className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  原材料保质期
                </TabsTrigger>
                <TabsTrigger value="split" className="flex items-center gap-1">
                  <Scaling className="h-4 w-4" />
                  小料拆分
                </TabsTrigger>
                <TabsTrigger value="warehouse" className="flex items-center gap-1">
                  <Warehouse className="h-4 w-4" />
                  仓库规则
                </TabsTrigger>
                <TabsTrigger value="cycle" className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  循环盘点
                </TabsTrigger>
                <TabsTrigger value="production" className="flex items-center gap-1">
                  <Factory className="h-4 w-4" />
                  生产品质
                </TabsTrigger>
                <TabsTrigger value="approval" className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  审批规则
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              主题设置
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="numbering" className="space-y-6">
              {renderConfigGroup(
                'numbering',
                <FileText className="h-5 w-5" />,
                '编码规则配置',
                '配置各类单据的编码前缀和流水号规则'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="die" className="space-y-6">
              {renderConfigGroup(
                'die',
                <Scissors className="h-5 w-5" />,
                '刀模寿命配置',
                '配置刀模的使用寿命和预警规则'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="screen" className="space-y-6">
              {renderConfigGroup(
                'screen',
                <LayoutGrid className="h-5 w-5" />,
                '网版寿命配置',
                '配置网版的使用寿命和预警规则'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="material" className="space-y-6">
              {renderConfigGroup(
                'material',
                <Package className="h-5 w-5" />,
                '原材料/油墨保质期配置',
                '配置各类原材料和油墨的保质期'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="split" className="space-y-6">
              {renderConfigGroup(
                'split',
                <Scaling className="h-5 w-5" />,
                '小料拆分标准配置',
                '配置小料拆分的标准规格'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="warehouse" className="space-y-6">
              {renderConfigGroup(
                'warehouse',
                <Warehouse className="h-5 w-5" />,
                '仓库管理规则配置',
                '配置仓库管理的各项规则'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="cycle" className="space-y-6">
              {renderConfigGroup(
                'cycle',
                <RefreshCw className="h-5 w-5" />,
                '循环盘点周期配置',
                '配置不同等级物料的盘点周期'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="production" className="space-y-6">
              {renderConfigGroup(
                'production',
                <Factory className="h-5 w-5" />,
                '生产与品质规则配置',
                '配置生产流程和品质控制规则'
              )}
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="approval" className="space-y-6">
              {renderConfigGroup(
                'approval',
                <ShieldCheck className="h-5 w-5" />,
                '审批规则配置',
                '配置参数变更的审批流程'
              )}
            </TabsContent>
          )}

          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  主题设置
                </CardTitle>
                <CardDescription>配置系统的显示主题</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
