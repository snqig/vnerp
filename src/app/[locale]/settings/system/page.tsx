'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  RefreshCw,
  AlertTriangle,
  Settings,
  Shield,
  Clock,
  Package,
  Factory,
  Warehouse,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';

interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
}

interface CategoryData {
  list: ConfigItem[];
  categories: string[];
  grouped: Record<string, ConfigItem[]>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  单据编码规则: <Settings className="w-4 h-4" />,
  '刀模/网版寿命管理': <Clock className="w-4 h-4" />,
  油墨保质期管理: <Shield className="w-4 h-4" />,
  小料拆分标准: <Package className="w-4 h-4" />,
  仓库7步闭环规则: <Warehouse className="w-4 h-4" />,
  生产报工规则: <Factory className="w-4 h-4" />,
  参数修改审批规则: <CheckCircle className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  单据编码规则: 'bg-blue-50 border-blue-200',
  '刀模/网版寿命管理': 'bg-orange-50 border-orange-200',
  油墨保质期管理: 'bg-purple-50 border-purple-200',
  小料拆分标准: 'bg-green-50 border-green-200',
  仓库7步闭环规则: 'bg-yellow-50 border-yellow-200',
  生产报工规则: 'bg-red-50 border-red-200',
  参数修改审批规则: 'bg-indigo-50 border-indigo-200',
};

export default function SystemConfigPage() {
  // 翻译钩子
  const t = useTranslations('System');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedConfigs, setModifiedConfigs] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState('单据编码规则');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/system');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setActiveCategory(result.data.categories[0] || '单据编码规则');
      }
    } catch (e) {
      toast({ title: '加载配置失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateConfigValue = (key: string, value: string) => {
    setModifiedConfigs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    const configs = Object.entries(modifiedConfigs).map(([config_key, config_value]) => ({
      config_key,
      config_value,
    }));

    if (configs.length === 0) {
      toast({ title: '没有修改的配置', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/settings/system', {
        method: 'POST',
        body: JSON.stringify({
          configs,
          operator_id: 1,
          remark: remark || null,
        }),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: result.message || '保存成功' });
        setModifiedConfigs({});
        setRemark('');
        fetchConfig();
      } else {
        toast({ title: '保存失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderConfigInput = (item: ConfigItem) => {
    const currentValue =
      modifiedConfigs[item.config_key] !== undefined
        ? modifiedConfigs[item.config_key]
        : item.config_value;

    switch (item.config_type) {
      case 'boolean':
        return (
          <Select value={currentValue} onValueChange={(v) => updateConfigValue(item.config_key, v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{tc("yes")}</SelectItem>
              <SelectItem value="false">{tc("no")}</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => updateConfigValue(item.config_key, e.target.value)}
            className="w-32"
          />
        );

      default:
        return (
          <Input
            value={currentValue}
            onChange={(e) => updateConfigValue(item.config_key, e.target.value)}
            className="w-48"
          />
        );
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">正在加载系统配置...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">无法加载配置数据</p>
        </div>
      </MainLayout>
    );
  }

  const hasChanges = Object.keys(modifiedConfigs).length > 0;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">全局系统配置</h1>
            <p className="text-sm text-muted-foreground mt-1">
              系统核心参数配置中心，修改需审批后生效
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchConfig}>
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">
                    您有 {Object.keys(modifiedConfigs).length} 项配置待保存
                  </p>
                  <div className="mt-2">
                    <Label className="text-xs text-yellow-700">修改说明（可选）</Label>
                    <Input
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="请输入修改原因..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-1">
            {data.categories.map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {CATEGORY_ICONS[category]}
                <span className="ml-1 hidden sm:inline">{category}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {data.categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <Card className={CATEGORY_COLORS[category]}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {CATEGORY_ICONS[category]}
                    {category}
                    <Badge variant="secondary" className="ml-auto">
                      {data.grouped[category]?.length || 0} 项
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.grouped[category]?.map((item: ConfigItem) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          modifiedConfigs[item.config_key] !== undefined
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{item.display_name}</Label>
                            {item.is_required && (
                              <Badge
                                variant="outline"
                                className="text-xs text-red-600 border-red-200"
                              >
                                必填
                              </Badge>
                            )}
                            {item.approval_required && (
                              <Badge
                                variant="outline"
                                className="text-xs text-orange-600 border-orange-200"
                              >
                                需审批
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {renderConfigInput(item)}
                          {modifiedConfigs[item.config_key] !== undefined && (
                            <Badge variant="default" className="bg-blue-600">
                              已修改
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
