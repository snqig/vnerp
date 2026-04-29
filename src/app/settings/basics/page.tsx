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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings,
  Save,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Bell,
  Globe,
} from 'lucide-react';
import { ThemeSettings } from '@/components/theme-settings';
import { toast } from 'sonner';

interface ConfigItem {
  id: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: number;
  description: string | null;
}

interface DictType {
  id: number;
  dict_name: string;
  dict_code: string;
  description: string | null;
  status: number;
}

interface DictData {
  id: number;
  dict_type_id: number;
  dict_label: string;
  dict_value: string;
  sort_order: number;
  status: number;
  remark: string | null;
  dict_type_code?: string;
}

interface NotificationConfig {
  id: string;
  name: string;
  email: boolean;
  sms: boolean;
  app: boolean;
}

export default function BasicsSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [configs, setConfigs] = useState<Record<string, ConfigItem>>({});
  const [dictOptions, setDictOptions] = useState<Record<string, DictData[]>>({});

  const [generalConfig, setGeneralConfig] = useState({
    company_name: '',
    company_short_name: '',
    company_code: '',
    currency: '',
    tax_rate: '',
    decimal_places: '2',
    price_precision: '4',
    date_format: '',
    time_format: '',
    timezone: '',
    first_day_of_week: '',
  });

  const [numberingConfig, setNumberingConfig] = useState({
    sales_order_prefix: '',
    purchase_order_prefix: '',
    work_order_prefix: '',
    sample_prefix: '',
    purchase_request_prefix: '',
    inbound_prefix: '',
    outbound_prefix: '',
    serial_length: '6',
  });

  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [dictDataMap, setDictDataMap] = useState<Record<number, DictData[]>>({});
  const [selectedDictId, setSelectedDictId] = useState<number | null>(null);
  const [isEditDictTypeOpen, setIsEditDictTypeOpen] = useState(false);
  const [isEditDictDataOpen, setIsEditDictDataOpen] = useState(false);
  const [editingDictType, setEditingDictType] = useState<Partial<DictType> & { id?: number }>({});
  const [editingDictData, setEditingDictData] = useState<Partial<DictData> & { id?: number }>({});

  const [notificationConfigs, setNotificationConfigs] = useState<NotificationConfig[]>([]);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/system/config?pageSize=200');
      const data = await res.json();
      if (data.success && data.data?.list) {
        const map: Record<string, ConfigItem> = {};
        data.data.list.forEach((item: ConfigItem) => {
          map[item.config_key] = item;
        });
        setConfigs(map);

        setGeneralConfig(prev => ({
          company_name: map['company_name']?.config_value || prev.company_name,
          company_short_name: map['company_short_name']?.config_value || prev.company_short_name,
          company_code: map['company_code']?.config_value || prev.company_code,
          currency: map['currency']?.config_value || prev.currency,
          tax_rate: map['tax_rate']?.config_value || prev.tax_rate,
          decimal_places: map['decimal_places']?.config_value || prev.decimal_places,
          price_precision: map['price_precision']?.config_value || prev.price_precision,
          date_format: map['date_format']?.config_value || prev.date_format,
          time_format: map['time_format']?.config_value || prev.time_format,
          timezone: map['timezone']?.config_value || prev.timezone,
          first_day_of_week: map['first_day_of_week']?.config_value || prev.first_day_of_week,
        }));

        setNumberingConfig(prev => ({
          sales_order_prefix: map['sales_order_prefix']?.config_value || prev.sales_order_prefix,
          purchase_order_prefix: map['purchase_order_prefix']?.config_value || prev.purchase_order_prefix,
          work_order_prefix: map['work_order_prefix']?.config_value || prev.work_order_prefix,
          sample_prefix: map['sample_prefix']?.config_value || prev.sample_prefix,
          purchase_request_prefix: map['purchase_request_prefix']?.config_value || prev.purchase_request_prefix,
          inbound_prefix: map['inbound_prefix']?.config_value || prev.inbound_prefix,
          outbound_prefix: map['outbound_prefix']?.config_value || prev.outbound_prefix,
          serial_length: map['serial_length']?.config_value || prev.serial_length,
        }));
      }
    } catch (e) {
      console.error('加载配置失败', e);
    }
  }, []);

  const loadDictOptions = useCallback(async () => {
    try {
      const codes = ['currency', 'timezone', 'date_format', 'time_format', 'first_day_of_week', 'notification_type', 'tax_rate'];
      const newOptions: Record<string, DictData[]> = {};
      await Promise.all(codes.map(async (code) => {
        try {
          const typeRes = await fetch(`/api/system/dict-type?dictType=${code}&pageSize=1`);
          const typeData = await typeRes.json();
          if (typeData.success && typeData.data?.list?.length > 0) {
            const typeId = typeData.data.list[0].id;
            const dataRes = await fetch(`/api/system/dict-data?dictTypeId=${typeId}&pageSize=200`);
            const dataData = await dataRes.json();
            if (dataData.success && dataData.data?.list) {
              newOptions[code] = dataData.data.list;
            }
          }
        } catch (e) {
          console.error(`加载字典${code}失败`, e);
        }
      }));
      setDictOptions(newOptions);

      if (newOptions['notification_type']?.length > 0) {
        const notifConfigs: NotificationConfig[] = newOptions['notification_type'].map((nd: DictData) => ({
          id: nd.dict_value,
          name: nd.dict_label,
          email: false,
          sms: false,
          app: false,
        }));

        const configRes = await fetch('/api/system/config?pageSize=200');
        const configData = await configRes.json();
        if (configData.success && configData.data?.list) {
          const configMap: Record<string, ConfigItem> = {};
          configData.data.list.forEach((item: ConfigItem) => {
            configMap[item.config_key] = item;
          });
          notifConfigs.forEach(nc => {
            const emailKey = `notif_${nc.id}_email`;
            const smsKey = `notif_${nc.id}_sms`;
            const appKey = `notif_${nc.id}_app`;
            if (configMap[emailKey]) nc.email = configMap[emailKey].config_value === 'true';
            if (configMap[smsKey]) nc.sms = configMap[smsKey].config_value === 'true';
            if (configMap[appKey]) nc.app = configMap[appKey].config_value === 'true';
          });
        }
        setNotificationConfigs(notifConfigs);
      }
    } catch (e) {
      console.error('加载字典选项失败', e);
    }
  }, []);

  const loadDictTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/system/dict-type?pageSize=200');
      const data = await res.json();
      if (data.success && data.data?.list) {
        setDictTypes(data.data.list);
        if (data.data.list.length > 0 && !selectedDictId) {
          setSelectedDictId(data.data.list[0].id);
        }
      }
    } catch (e) {
      console.error('加载字典类型失败', e);
    }
  }, [selectedDictId]);

  const loadDictData = useCallback(async (dictTypeId: number) => {
    try {
      const res = await fetch(`/api/system/dict-data?dictTypeId=${dictTypeId}&pageSize=200`);
      const data = await res.json();
      if (data.success && data.data?.list) {
        setDictDataMap(prev => ({ ...prev, [dictTypeId]: data.data.list }));
      }
    } catch (e) {
      console.error('加载字典数据失败', e);
    }
  }, []);

  const loadAllDictData = useCallback(async (types: DictType[]) => {
    const newDataMap: Record<number, DictData[]> = {};
    await Promise.all(types.map(async (t) => {
      try {
        const res = await fetch(`/api/system/dict-data?dictTypeId=${t.id}&pageSize=200`);
        const data = await res.json();
        if (data.success && data.data?.list) {
          newDataMap[t.id] = data.data.list;
        }
      } catch (e) {
        console.error('加载字典数据失败', e);
      }
    }));
    setDictDataMap(newDataMap);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConfigs(), loadDictOptions(), loadDictTypes()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (dictTypes.length > 0) {
      loadAllDictData(dictTypes);
    }
  }, [dictTypes.length]);

  const saveConfig = async (key: string, value: string, name: string) => {
    const existing = configs[key];
    if (existing) {
      await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, config_name: name, config_key: key, config_value: value, config_type: 1 }),
      });
    } else {
      const res = await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_name: name, config_key: key, config_value: value, config_type: 1 }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setConfigs(prev => ({
          ...prev,
          [key]: { id: data.data.id, config_name: name, config_key: key, config_value: value, config_type: 1, description: null },
        }));
      }
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const configMap: Record<string, { value: string; name: string }> = {
        company_name: { value: generalConfig.company_name, name: '公司名称' },
        company_short_name: { value: generalConfig.company_short_name, name: '公司简称' },
        company_code: { value: generalConfig.company_code, name: '公司编码' },
        currency: { value: generalConfig.currency, name: '默认币种' },
        tax_rate: { value: generalConfig.tax_rate, name: '默认税率' },
        decimal_places: { value: generalConfig.decimal_places, name: '金额小数位数' },
        price_precision: { value: generalConfig.price_precision, name: '单价精度' },
        date_format: { value: generalConfig.date_format, name: '日期格式' },
        time_format: { value: generalConfig.time_format, name: '时间格式' },
        timezone: { value: generalConfig.timezone, name: '时区' },
        first_day_of_week: { value: generalConfig.first_day_of_week, name: '每周起始日' },
      };
      for (const [key, { value, name }] of Object.entries(configMap)) {
        await saveConfig(key, value, name);
      }
      toast.success('通用设置保存成功');
    } catch (e) {
      console.error('保存通用设置失败', e);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNumbering = async () => {
    setSaving(true);
    try {
      const configMap: Record<string, { value: string; name: string }> = {
        sales_order_prefix: { value: numberingConfig.sales_order_prefix, name: '销售订单前缀' },
        purchase_order_prefix: { value: numberingConfig.purchase_order_prefix, name: '采购订单前缀' },
        work_order_prefix: { value: numberingConfig.work_order_prefix, name: '生产工单前缀' },
        sample_prefix: { value: numberingConfig.sample_prefix, name: '打样工单前缀' },
        purchase_request_prefix: { value: numberingConfig.purchase_request_prefix, name: '请购单前缀' },
        inbound_prefix: { value: numberingConfig.inbound_prefix, name: '入库单前缀' },
        outbound_prefix: { value: numberingConfig.outbound_prefix, name: '出库单前缀' },
        serial_length: { value: numberingConfig.serial_length, name: '流水号长度' },
      };
      for (const [key, { value, name }] of Object.entries(configMap)) {
        await saveConfig(key, value, name);
      }
      toast.success('编码规则保存成功');
    } catch (e) {
      console.error('保存编码配置失败', e);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      for (const nc of notificationConfigs) {
        await saveConfig(`notif_${nc.id}_email`, String(nc.email), `${nc.name}-邮件`);
        await saveConfig(`notif_${nc.id}_sms`, String(nc.sms), `${nc.name}-短信`);
        await saveConfig(`notif_${nc.id}_app`, String(nc.app), `${nc.name}-应用内`);
      }
      toast.success('通知设置保存成功');
    } catch (e) {
      console.error('保存通知设置失败', e);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDictType = async () => {
    try {
      if (editingDictType.id) {
        await fetch('/api/system/dict-type', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDictType.id, dict_name: editingDictType.dict_name, dict_code: editingDictType.dict_code, status: editingDictType.status ?? 1, description: editingDictType.description }),
        });
        toast.success('字典类型更新成功');
      } else {
        await fetch('/api/system/dict-type', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dict_name: editingDictType.dict_name, dict_code: editingDictType.dict_code, status: editingDictType.status ?? 1, description: editingDictType.description }),
        });
        toast.success('字典类型创建成功');
      }
      setIsEditDictTypeOpen(false);
      loadDictTypes();
    } catch (e) {
      console.error('保存字典类型失败', e);
      toast.error('保存失败');
    }
  };

  const handleDeleteDictType = async (id: number) => {
    if (!confirm('确定删除该字典类型？关联的字典数据也将被删除。')) return;
    try {
      await fetch(`/api/system/dict-type?id=${id}`, { method: 'DELETE' });
      toast.success('删除成功');
      loadDictTypes();
      if (selectedDictId === id) {
        setSelectedDictId(dictTypes.find(t => t.id !== id)?.id || null);
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleSaveDictData = async () => {
    try {
      if (editingDictData.id) {
        await fetch('/api/system/dict-data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDictData.id,
            dict_type_id: editingDictData.dict_type_id || selectedDictId,
            dict_label: editingDictData.dict_label,
            dict_value: editingDictData.dict_value,
            sort_order: editingDictData.sort_order || 0,
            status: editingDictData.status ?? 1,
            remark: editingDictData.remark,
          }),
        });
        toast.success('字典数据更新成功');
      } else {
        await fetch('/api/system/dict-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dict_type_id: selectedDictId,
            dict_label: editingDictData.dict_label,
            dict_value: editingDictData.dict_value,
            sort_order: editingDictData.sort_order || 0,
            status: editingDictData.status ?? 1,
            remark: editingDictData.remark,
          }),
        });
        toast.success('字典数据创建成功');
      }
      setIsEditDictDataOpen(false);
      if (selectedDictId) loadDictData(selectedDictId);
    } catch (e) {
      console.error('保存字典数据失败', e);
      toast.error('保存失败');
    }
  };

  const handleDeleteDictData = async (id: number) => {
    if (!confirm('确定删除该字典数据？')) return;
    try {
      await fetch(`/api/system/dict-data?id=${id}`, { method: 'DELETE' });
      toast.success('删除成功');
      if (selectedDictId) loadDictData(selectedDictId);
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const currentDictData = selectedDictId ? (dictDataMap[selectedDictId] || []) : [];

  const renderDictSelect = (dictCode: string, value: string, onChange: (v: string) => void, placeholder: string) => {
    const options = dictOptions[dictCode] || [];
    if (options.length === 0) {
      return <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
    }
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.id} value={opt.dict_value}>{opt.dict_label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (loading) {
    return (
      <MainLayout title="基础设置">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="基础设置">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
            <TabsTrigger value="general">通用设置</TabsTrigger>
            <TabsTrigger value="numbering">编码规则</TabsTrigger>
            <TabsTrigger value="dictionary">数据字典</TabsTrigger>
            <TabsTrigger value="notification">通知设置</TabsTrigger>
            <TabsTrigger value="theme">主题设置</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  公司信息
                </CardTitle>
                <CardDescription>配置公司基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>公司名称</Label>
                    <Input value={generalConfig.company_name} onChange={e => setGeneralConfig({ ...generalConfig, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>公司简称</Label>
                    <Input value={generalConfig.company_short_name} onChange={e => setGeneralConfig({ ...generalConfig, company_short_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>公司编码</Label>
                    <Input value={generalConfig.company_code} onChange={e => setGeneralConfig({ ...generalConfig, company_code: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  业务参数
                </CardTitle>
                <CardDescription>配置系统的基本业务参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      默认币种
                    </Label>
                    {renderDictSelect('currency', generalConfig.currency, v => setGeneralConfig({ ...generalConfig, currency: v }), '选择币种')}
                  </div>
                  <div className="space-y-2">
                    <Label>默认税率 (%)</Label>
                    {renderDictSelect('tax_rate', generalConfig.tax_rate, v => setGeneralConfig({ ...generalConfig, tax_rate: v }), '选择税率')}
                  </div>
                  <div className="space-y-2">
                    <Label>金额小数位数</Label>
                    <Input type="number" min="0" max="6" value={generalConfig.decimal_places} onChange={e => setGeneralConfig({ ...generalConfig, decimal_places: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>单价精度</Label>
                    <Input type="number" min="0" max="8" value={generalConfig.price_precision} onChange={e => setGeneralConfig({ ...generalConfig, price_precision: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  日期时间
                </CardTitle>
                <CardDescription>配置系统的日期时间格式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      日期格式
                    </Label>
                    {renderDictSelect('date_format', generalConfig.date_format, v => setGeneralConfig({ ...generalConfig, date_format: v }), '选择日期格式')}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      时间格式
                    </Label>
                    {renderDictSelect('time_format', generalConfig.time_format, v => setGeneralConfig({ ...generalConfig, time_format: v }), '选择时间格式')}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      时区
                    </Label>
                    {renderDictSelect('timezone', generalConfig.timezone, v => setGeneralConfig({ ...generalConfig, timezone: v }), '选择时区')}
                  </div>
                  <div className="space-y-2">
                    <Label>每周起始日</Label>
                    {renderDictSelect('first_day_of_week', generalConfig.first_day_of_week, v => setGeneralConfig({ ...generalConfig, first_day_of_week: v }), '选择起始日')}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存通用设置'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="numbering" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  单据编码规则
                </CardTitle>
                <CardDescription>配置各类单据的编码前缀和流水号长度</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>销售订单前缀</Label>
                    <Input value={numberingConfig.sales_order_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, sales_order_prefix: e.target.value })} placeholder="如: SO" />
                  </div>
                  <div className="space-y-2">
                    <Label>采购订单前缀</Label>
                    <Input value={numberingConfig.purchase_order_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, purchase_order_prefix: e.target.value })} placeholder="如: PO" />
                  </div>
                  <div className="space-y-2">
                    <Label>生产工单前缀</Label>
                    <Input value={numberingConfig.work_order_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, work_order_prefix: e.target.value })} placeholder="如: WO" />
                  </div>
                  <div className="space-y-2">
                    <Label>打样工单前缀</Label>
                    <Input value={numberingConfig.sample_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, sample_prefix: e.target.value })} placeholder="如: SP" />
                  </div>
                  <div className="space-y-2">
                    <Label>请购单前缀</Label>
                    <Input value={numberingConfig.purchase_request_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, purchase_request_prefix: e.target.value })} placeholder="如: PR" />
                  </div>
                  <div className="space-y-2">
                    <Label>入库单前缀</Label>
                    <Input value={numberingConfig.inbound_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, inbound_prefix: e.target.value })} placeholder="如: IN" />
                  </div>
                  <div className="space-y-2">
                    <Label>出库单前缀</Label>
                    <Input value={numberingConfig.outbound_prefix} onChange={e => setNumberingConfig({ ...numberingConfig, outbound_prefix: e.target.value })} placeholder="如: OUT" />
                  </div>
                  <div className="space-y-2">
                    <Label>流水号长度</Label>
                    <Input type="number" min="1" max="10" value={numberingConfig.serial_length} onChange={e => setNumberingConfig({ ...numberingConfig, serial_length: e.target.value })} />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    编码规则示例：{numberingConfig.sales_order_prefix || 'SO'}{new Date().getFullYear().toString().slice(2)}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(1).padStart(Number(numberingConfig.serial_length) || 6, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">格式：前缀 + 年月 + 流水号</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveNumbering} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存编码规则'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="dictionary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">字典类型</CardTitle>
                    <Button size="sm" onClick={() => { setEditingDictType({}); setIsEditDictTypeOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> 新增
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-[500px] overflow-y-auto">
                    {dictTypes.map(dt => (
                      <div
                        key={dt.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50 ${selectedDictId === dt.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedDictId(dt.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{dt.dict_name}</div>
                          <div className="text-xs text-muted-foreground">{dt.dict_code}</div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditingDictType(dt); setIsEditDictTypeOpen(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDeleteDictType(dt.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {dictTypes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">暂无字典类型</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        字典数据
                        {selectedDictId && dictTypes.find(t => t.id === selectedDictId) && (
                          <Badge variant="secondary" className="ml-2">
                            {dictTypes.find(t => t.id === selectedDictId)?.dict_name}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <Button size="sm" onClick={() => { setEditingDictData({}); setIsEditDictDataOpen(true); }} disabled={!selectedDictId}>
                      <Plus className="h-4 w-4 mr-1" /> 新增
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">排序</TableHead>
                        <TableHead>标签</TableHead>
                        <TableHead>值</TableHead>
                        <TableHead className="w-[80px]">状态</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDictData.map(dd => (
                        <TableRow key={dd.id}>
                          <TableCell>{dd.sort_order}</TableCell>
                          <TableCell className="font-medium">{dd.dict_label}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{dd.dict_value}</code></TableCell>
                          <TableCell>
                            <Badge variant={dd.status === 1 ? 'default' : 'secondary'}>
                              {dd.status === 1 ? '启用' : '禁用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{dd.remark || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingDictData(dd); setIsEditDictDataOpen(true); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDictData(dd.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {currentDictData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {selectedDictId ? '暂无字典数据' : '请先选择字典类型'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  通知设置
                </CardTitle>
                <CardDescription>配置系统通知方式，通知类型从数据字典加载</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {notificationConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    请先在数据字典中添加「通知类型」字典数据
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notificationConfigs.map(nc => (
                      <div key={nc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{nc.name}</div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">邮件</Label>
                            <Switch checked={nc.email} onCheckedChange={v => setNotificationConfigs(prev => prev.map(p => p.id === nc.id ? { ...p, email: v } : p))} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">短信</Label>
                            <Switch checked={nc.sms} onCheckedChange={v => setNotificationConfigs(prev => prev.map(p => p.id === nc.id ? { ...p, sms: v } : p))} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">应用内</Label>
                            <Switch checked={nc.app} onCheckedChange={v => setNotificationConfigs(prev => prev.map(p => p.id === nc.id ? { ...p, app: v } : p))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotifications} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存通知设置'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <ThemeSettings />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDictTypeOpen} onOpenChange={setIsEditDictTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDictType.id ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
            <DialogDescription>配置字典类型的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>字典名称</Label>
              <Input value={editingDictType.dict_name || ''} onChange={e => setEditingDictType({ ...editingDictType, dict_name: e.target.value })} placeholder="如：用户状态" />
            </div>
            <div className="space-y-2">
              <Label>字典编码</Label>
              <Input value={editingDictType.dict_code || ''} onChange={e => setEditingDictType({ ...editingDictType, dict_code: e.target.value })} placeholder="如：user_status" />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={String(editingDictType.status ?? 1)} onValueChange={v => setEditingDictType({ ...editingDictType, status: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={editingDictType.description || ''} onChange={e => setEditingDictType({ ...editingDictType, description: e.target.value })} placeholder="字典类型描述" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDictTypeOpen(false)}>取消</Button>
            <Button onClick={handleSaveDictType}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDictDataOpen} onOpenChange={setIsEditDictDataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDictData.id ? '编辑字典数据' : '新增字典数据'}</DialogTitle>
            <DialogDescription>配置字典数据项</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标签</Label>
              <Input value={editingDictData.dict_label || ''} onChange={e => setEditingDictData({ ...editingDictData, dict_label: e.target.value })} placeholder="显示名称" />
            </div>
            <div className="space-y-2">
              <Label>值</Label>
              <Input value={editingDictData.dict_value || ''} onChange={e => setEditingDictData({ ...editingDictData, dict_value: e.target.value })} placeholder="存储值" />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input type="number" value={editingDictData.sort_order || 0} onChange={e => setEditingDictData({ ...editingDictData, sort_order: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={String(editingDictData.status ?? 1)} onValueChange={v => setEditingDictData({ ...editingDictData, status: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={editingDictData.remark || ''} onChange={e => setEditingDictData({ ...editingDictData, remark: e.target.value })} placeholder="备注信息" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDictDataOpen(false)}>取消</Button>
            <Button onClick={handleSaveDictData}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
