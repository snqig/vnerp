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
} from 'lucide-react';
import { ThemeSettings } from '@/components/theme-settings';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import ApiClient from '@/lib/api-client';

interface ConfigItem {
  id?: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description?: string;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
  options?: string[];
  min?: number;
  max?: number;
}

interface ConfigGroup {
  category: string;
  display_name: string;
  items: ConfigItem[];
}

interface SystemConfigResponse {
  success: boolean;
  data: {
    list: ConfigItem[];
    categories: string[];
    grouped: Record<string, ConfigItem[]>;
  };
  message?: string;
}

export default function BasicsSettingsPage() {
  const { hasRole, isAuthenticated } = useAuth();
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = useState<string>('theme');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);

  // 等待用户认证状态确定后才计算isAdmin
  const isAdmin = isAuthenticated && hasRole('super_admin');

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiClient.get<SystemConfigResponse>('/api/settings/system');

      if (result.success && result.data) {
        const groups: ConfigGroup[] = [];
        const values: Record<string, string> = {};

        result.data.categories.forEach((category) => {
          const items = result.data.grouped[category] || [];
          if (items.length > 0) {
            groups.push({
              category,
              display_name: category,
              items: items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
            });
          }

          items.forEach((item) => {
            values[item.config_key] = item.config_value;
          });
        });

        setConfigGroups(groups);
        setCategories(result.data.categories);
        setConfigValues(values);

        // 使用返回的分类数据，而不是state中的旧值
        if (groups.length > 0 && !result.data.categories.includes(activeTab)) {
          setActiveTab(groups[0].category);
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAdmin) {
      loadConfigs();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadConfigs]);

  const handleValueChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (category: string) => {
    const group = configGroups.find((g) => g.category === category);
    if (!group) return;

    setSaving(true);
    try {
      const updates = group.items.map((item) => ({
        config_key: item.config_key,
        config_value: configValues[item.config_key] ?? item.config_value,
      }));

      const result = await ApiClient.post('/api/settings/system', { updates });

      if (result.success) {
        toast.success(result.message || '保存成功');
        await loadConfigs();
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (e: any) {
      console.error('保存配置失败:', e);
      toast.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderConfigItem = (item: ConfigItem) => {
    const value = configValues[item.config_key] ?? item.config_value;

    switch (item.config_type) {
      case 'boolean':
        return (
          <div
            key={item.config_key}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <Label className="font-medium">{item.display_name || item.config_name}</Label>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <Switch
              checked={value === 'true'}
              onCheckedChange={(v) => handleValueChange(item.config_key, String(v))}
            />
          </div>
        );

      case 'number':
        return (
          <div key={item.config_key} className="space-y-2">
            <Label>{item.display_name || item.config_name}</Label>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <Input
              type="number"
              min={item.min}
              max={item.max}
              value={value}
              onChange={(e) => handleValueChange(item.config_key, e.target.value)}
            />
          </div>
        );

      case 'string':
        return (
          <div key={item.config_key} className="space-y-2">
            <Label>{item.display_name || item.config_name}</Label>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <Input
              value={value}
              onChange={(e) => handleValueChange(item.config_key, e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderConfigGroup = (group: ConfigGroup) => {
    const iconMap: Record<string, React.ReactNode> = {
      单据编码规则: <FileText className="h-5 w-5" />,
      刀模配置: <Scissors className="h-5 w-5" />,
      网版配置: <LayoutGrid className="h-5 w-5" />,
      原材料保质期: <Package className="h-5 w-5" />,
      小料拆分标准: <Scaling className="h-5 w-5" />,
      仓库管理规则: <Warehouse className="h-5 w-5" />,
      盘点周期管理: <RefreshCw className="h-5 w-5" />,
      生产与品质规则: <Factory className="h-5 w-5" />,
      审批规则: <ShieldCheck className="h-5 w-5" />,
      系统基础配置: <Settings className="h-5 w-5" />,
    };

    return (
      <Card key={group.category}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {iconMap[group.category] || <Settings className="h-5 w-5" />}
            {group.display_name || group.category}
          </CardTitle>
          <CardDescription>配置{group.display_name || group.category}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((item) => renderConfigItem(item))}
          </div>
        </CardContent>
        <div className="px-6 pb-6 flex justify-end">
          {hasPermission('settings:basics:edit') && (
            <Button onClick={() => handleSave(group.category)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存设置'}
            </Button>
          )}
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
            {isAdmin &&
              categories.map((category) => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                  {category}
                </TabsTrigger>
              ))}
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              主题设置
            </TabsTrigger>
          </TabsList>

          {isAdmin &&
            configGroups.map((group) => (
              <TabsContent key={group.category} value={group.category} className="space-y-6">
                {renderConfigGroup(group)}
              </TabsContent>
            ))}

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
