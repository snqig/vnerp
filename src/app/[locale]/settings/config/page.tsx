'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, Trash2, Plus, Edit, Settings, Save } from 'lucide-react';
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
  // ===== 库存配置 =====
  {
    config_name: '库存允许负数',
    config_key: 'inventory.allow_negative',
    config_value: 'false',
    config_type: 2,
    description: '是否允许库存数量为负数',
  },
  {
    config_name: '库存预警阈值',
    config_key: 'inventory.alert_threshold',
    config_value: '10',
    config_type: 1,
    description: '低于此数量触发库存预警',
  },
  {
    config_name: '库存盘点差异审批',
    config_key: 'inventory.stocktake_approval',
    config_value: 'true',
    config_type: 2,
    description: '盘点差异是否需要审批',
  },
  {
    config_name: '默认仓库编码',
    config_key: 'inventory.default_warehouse',
    config_value: 'WH001',
    config_type: 1,
    description: '新建单据默认带出的仓库编码',
  },
  {
    config_name: '库存数量精度',
    config_key: 'inventory.decimal_precision',
    config_value: '2',
    config_type: 1,
    description: '库存数量保留的小数位数',
  },
  {
    config_name: '安全库存比例',
    config_key: 'inventory.safety_stock_ratio',
    config_value: '20',
    config_type: 1,
    description: '安全库存占日均销量的百分比',
  },
  {
    config_name: '自动生成批次号',
    config_key: 'inventory.auto_batch',
    config_value: 'true',
    config_type: 2,
    description: '入库时是否自动生成批次号',
  },
  {
    config_name: '批次过期预警天数',
    config_key: 'inventory.batch_expire_warn_days',
    config_value: '30',
    config_type: 1,
    description: '距批次失效还有多少天时进行预警',
  },
  {
    config_name: '库存盘点周期',
    config_key: 'inventory.stocktake_cycle_days',
    config_value: '90',
    config_type: 1,
    description: '默认库存盘点周期（天）',
  },
  {
    config_name: '负库存预警提醒',
    config_key: 'inventory.negative_warning',
    config_value: 'true',
    config_type: 2,
    description: '出现负库存时是否发送预警提醒',
  },
  {
    config_name: '入库单号前缀',
    config_key: 'inbound.prefix',
    config_value: 'INB',
    config_type: 1,
    description: '入库单号前缀',
  },
  {
    config_name: '出库单号前缀',
    config_key: 'outbound.prefix',
    config_value: 'OTB',
    config_type: 1,
    description: '出库单号前缀',
  },
  // ===== 订单配置 =====
  {
    config_name: '订单号前缀',
    config_key: 'order.prefix',
    config_value: 'ORD',
    config_type: 1,
    description: '销售订单号前缀',
  },
  {
    config_name: '订单自动审核',
    config_key: 'order.auto_approve',
    config_value: 'false',
    config_type: 2,
    description: '订单提交后是否自动审核通过',
  },
  {
    config_name: '缺货处理方式',
    config_key: 'order.out_of_stock_action',
    config_value: 'warn',
    config_type: 1,
    description: 'warn=提醒，block=禁止下单，allow=允许超卖',
  },
  {
    config_name: '订单超期提醒',
    config_key: 'order.overdue_remind_days',
    config_value: '7',
    config_type: 1,
    description: '订单超过承诺交货期多少天触发提醒',
  },
  {
    config_name: '允许修改已审核订单',
    config_key: 'order.allow_edit_approved',
    config_value: 'false',
    config_type: 2,
    description: '已审核订单是否允许编辑',
  },
  {
    config_name: '默认交货周期',
    config_key: 'order.default_delivery_days',
    config_value: '7',
    config_type: 1,
    description: '新建销售订单默认的承诺交货天数',
  },
  {
    config_name: '订单价格精度',
    config_key: 'order.price_precision',
    config_value: '2',
    config_type: 1,
    description: '订单单价与金额保留的小数位数',
  },
  {
    config_name: '最低订单金额',
    config_key: 'order.min_amount',
    config_value: '0',
    config_type: 1,
    description: '低于此金额的订单将被拒绝，0表示不限制',
  },
  {
    config_name: '客户信用额度控制',
    config_key: 'order.credit_control',
    config_value: 'true',
    config_type: 2,
    description: '下单时是否校验客户可用信用额度',
  },
  {
    config_name: '退货期限',
    config_key: 'order.return_deadline_days',
    config_value: '15',
    config_type: 1,
    description: '销售订单允许退货的天数',
  },
  {
    config_name: '未付款自动取消',
    config_key: 'order.auto_cancel_unpaid_days',
    config_value: '3',
    config_type: 1,
    description: '未付款订单超过多少天自动取消，0表示不取消',
  },
  // ===== 采购配置 =====
  {
    config_name: '采购单号前缀',
    config_key: 'purchase.prefix',
    config_value: 'PO',
    config_type: 1,
    description: '采购订单号前缀',
  },
  {
    config_name: '采购价格上限控制',
    config_key: 'purchase.price_control',
    config_value: 'true',
    config_type: 2,
    description: '采购价超过历史最高价时是否拦截',
  },
  {
    config_name: '采购到货提醒',
    config_key: 'purchase.arrival_remind_days',
    config_value: '3',
    config_type: 1,
    description: '距预计到货日期多少天发送提醒',
  },
  {
    config_name: '采购允差比例',
    config_key: 'purchase.tolerance_ratio',
    config_value: '5',
    config_type: 1,
    description: '到货数量与订单数量的允许偏差百分比',
  },
  {
    config_name: '供应商评估周期',
    config_key: 'purchase.supplier_eval_cycle',
    config_value: '90',
    config_type: 1,
    description: '供应商绩效评估周期（天）',
  },
  {
    config_name: '采购默认税率',
    config_key: 'purchase.tax_rate',
    config_value: '13',
    config_type: 1,
    description: '采购单据默认税率（%）',
  },
  {
    config_name: '采购到货自动入库',
    config_key: 'purchase.auto_stock_in',
    config_value: 'false',
    config_type: 2,
    description: '采购到货确认后是否自动生成入库单',
  },
  {
    config_name: '采购审批金额阈值',
    config_key: 'purchase.approval_threshold',
    config_value: '10000',
    config_type: 1,
    description: '超过此金额的采购单需要审批',
  },
  {
    config_name: '最小采购批量',
    config_key: 'purchase.min_qty',
    config_value: '1',
    config_type: 1,
    description: '采购明细默认最小起订数量',
  },
  {
    config_name: '采购退货期限',
    config_key: 'purchase.return_deadline_days',
    config_value: '30',
    config_type: 1,
    description: '采购订单允许退货的天数',
  },
  // ===== 财务配置 =====
  {
    config_name: '默认付款期限',
    config_key: 'finance.payment_terms_days',
    config_value: '30',
    config_type: 1,
    description: '默认付款期限天数',
  },
  {
    config_name: '税率',
    config_key: 'finance.tax_rate',
    config_value: '13',
    config_type: 1,
    description: '默认增值税税率（%）',
  },
  {
    config_name: '默认币种',
    config_key: 'finance.default_currency',
    config_value: 'CNY',
    config_type: 1,
    description: '系统默认结算币种',
  },
  {
    config_name: '财务结账日',
    config_key: 'finance.settlement_day',
    config_value: '1',
    config_type: 1,
    description: '每月财务结账日（日期）',
  },
  {
    config_name: '应收账款预警',
    config_key: 'finance.ar_receivable_warn_days',
    config_value: '30',
    config_type: 1,
    description: '应收账款超过多少天未收回触发预警',
  },
  {
    config_name: '启用多币种',
    config_key: 'finance.multi_currency',
    config_value: 'false',
    config_type: 2,
    description: '是否启用多币种核算',
  },
  {
    config_name: '默认发票类型',
    config_key: 'finance.invoice_type',
    config_value: 'vat',
    config_type: 1,
    description: 'vat=增值税专用发票，normal=普通发票',
  },
  {
    config_name: '成本计价方法',
    config_key: 'finance.cost_method',
    config_value: 'moving_avg',
    config_type: 1,
    description: 'moving_avg=移动平均，fifo=先进先出，weighted=加权平均',
  },
  {
    config_name: '现金折扣率',
    config_key: 'finance.cash_discount_rate',
    config_value: '2',
    config_type: 1,
    description: '提前付款可享受的现金折扣率（%）',
  },
  {
    config_name: '金额舍入方式',
    config_key: 'finance.rounding_mode',
    config_value: 'round_half_up',
    config_type: 1,
    description: 'round_half_up=四舍五入，round_up=向上，round_down=向下',
  },
  // ===== 系统配置 =====
  {
    config_name: '密码最小长度',
    config_key: 'system.password_min_length',
    config_value: '6',
    config_type: 1,
    description: '用户密码最小长度要求',
  },
  {
    config_name: '登录失败锁定次数',
    config_key: 'system.login_fail_lock_count',
    config_value: '5',
    config_type: 1,
    description: '连续登录失败多少次后锁定账号',
  },
  {
    config_name: '登录锁定时间',
    config_key: 'system.login_lock_minutes',
    config_value: '30',
    config_type: 1,
    description: '账号锁定持续时间（分钟）',
  },
  {
    config_name: '密码过期天数',
    config_key: 'system.password_expire_days',
    config_value: '90',
    config_type: 1,
    description: '0表示永不过期',
  },
  {
    config_name: '初始密码强制修改',
    config_key: 'system.force_change_password',
    config_value: 'true',
    config_type: 2,
    description: '首次登录是否强制修改密码',
  },
  {
    config_name: '操作日志保留天数',
    config_key: 'system.log_retention_days',
    config_value: '180',
    config_type: 1,
    description: '操作日志保留天数，0表示永久保留',
  },
  {
    config_name: '会话超时',
    config_key: 'system.session_timeout',
    config_value: '120',
    config_type: 1,
    description: '用户会话超时时间（分钟）',
  },
  {
    config_name: '系统名称',
    config_key: 'system.name',
    config_value: 'DC ERP',
    config_type: 1,
    description: '系统登录页与标题显示的名称',
  },
  {
    config_name: '默认语言',
    config_key: 'system.default_language',
    config_value: 'zh-CN',
    config_type: 1,
    description: '新用户默认语言',
  },
  {
    config_name: '系统默认时区',
    config_key: 'system.timezone',
    config_value: 'Asia/Shanghai',
    config_type: 1,
    description: '系统时间显示使用的时区',
  },
  {
    config_name: '数据备份周期',
    config_key: 'system.backup_cycle_days',
    config_value: '7',
    config_type: 1,
    description: '自动数据备份周期（天）',
  },
  {
    config_name: '启用双因素认证',
    config_key: 'system.two_factor_auth',
    config_value: 'false',
    config_type: 2,
    description: '登录时是否启用双因素认证（2FA）',
  },
  {
    config_name: '系统维护模式',
    config_key: 'system.maintenance_mode',
    config_value: 'false',
    config_type: 2,
    description: '开启后仅管理员可登录系统',
  },
  // ===== 其他配置 =====
  {
    config_name: '公司名称',
    config_key: 'company.name',
    config_value: '某某科技有限公司',
    config_type: 1,
    description: '打印单据与报表抬头显示的公司名称',
  },
  {
    config_name: '公司地址',
    config_key: 'company.address',
    config_value: '',
    config_type: 1,
    description: '公司注册地址',
  },
  {
    config_name: '客服电话',
    config_key: 'company.phone',
    config_value: '400-000-0000',
    config_type: 1,
    description: '对外公布的客服联系电话',
  },
  {
    config_name: '纳税人识别号',
    config_key: 'company.tax_no',
    config_value: '',
    config_type: 1,
    description: '公司纳税人识别号（开票使用）',
  },
  {
    config_name: '启用邮件通知',
    config_key: 'notify.email',
    config_value: 'true',
    config_type: 2,
    description: '业务事件是否发送邮件通知',
  },
  {
    config_name: '启用短信通知',
    config_key: 'notify.sms',
    config_value: 'false',
    config_type: 2,
    description: '业务事件是否发送短信通知',
  },
  {
    config_name: '导出文件编码',
    config_key: 'export.encoding',
    config_value: 'UTF-8',
    config_type: 1,
    description: '数据导出文件的字符编码',
  },
  {
    config_name: '默认分页大小',
    config_key: 'ui.page_size',
    config_value: '20',
    config_type: 1,
    description: '列表页默认每页显示条数',
  },
  {
    config_name: '显示演示数据',
    config_key: 'ui.demo_data',
    config_value: 'false',
    config_type: 2,
    description: '是否在演示环境中显示示例数据',
  },
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

  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setInitError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
        configName: searchName,
      });
      const res = await authFetch('/api/system/config?' + params);
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        setInitError(errBody?.message || `请求失败 (${res.status})`);
        return;
      }
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      } else {
        setInitError(result.message || '获取配置列表失败');
      }
    } catch (e) {
      setInitError((e as Error)?.message || '网络异常，请检查连接');
    } finally {
      setLoading(false);
    }
  }, [page, searchName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!form.config_key || !form.config_name) {
      toast({ title: tc('paramKeyNameRequired'), variant: 'destructive' });
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
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/system/config?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const [initLoading, setInitLoading] = useState(false);
  const handleInitPresets = async () => {
    if (!window.confirm(tc('confirmInitPresets'))) return;
    setInitLoading(true);
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
        } catch {}
      }
    }
    setInitLoading(false);
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
  const filteredList =
    activeGroup === 'all'
      ? list
      : list.filter((item) => getConfigGroup(item.config_key) === activeGroup);

  const getTypeBadge = (type: number) => {
    if (type === 2)
      return (
        <Badge variant="secondary" className="text-xs">
          {tc('boolean')}
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-xs">
        {tc('text')}
      </Badge>
    );
  };

  const renderValueInput = () => {
    if (form.config_type === 2) {
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={form.config_value === 'true'}
            onCheckedChange={(checked) =>
              setForm({ ...form, config_value: checked ? 'true' : 'false' })
            }
          />
          <span className="text-sm">{form.config_value === 'true' ? tc('yes') : tc('no')}</span>
        </div>
      );
    }
    return (
      <Input
        value={form.config_value || ''}
        onChange={(e) => setForm({ ...form, config_value: e.target.value })}
        placeholder={tc('enterParamValue')}
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
              {t('systemConfigCenter')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{tc('systemConfigDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={tc('searchParamPlaceholder')}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-48 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
            <Button size="sm" variant="outline" onClick={fetchData}>
              <Search className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleInitPresets} disabled={initLoading}>
              {initLoading ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                  {t('initPresets')}
                </span>
              ) : (
                t('initPresets')
              )}
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openAddDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t('add')}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            加载中...
          </div>
        )}

        {initError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠</span>
            <div>
              <p className="font-medium">加载失败</p>
              <p>{initError}</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={fetchData}>
                重试
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeGroup} onValueChange={setActiveGroup}>
          <TabsList>
            <TabsTrigger value="all">{tc('all')}</TabsTrigger>
            {configGroups.map((group) => (
              <TabsTrigger key={group.key} value={group.key} className="text-xs">
                {group.icon} {tc('configGroup_' + group.key)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeGroup} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc('paramName')}</TableHead>
                      <TableHead className="text-xs">{tc('paramKey')}</TableHead>
                      <TableHead className="text-xs">{tc('paramValue')}</TableHead>
                      <TableHead className="text-xs">{tc('type')}</TableHead>
                      <TableHead className="text-xs">{tc('description')}</TableHead>
                      <TableHead className="text-xs text-right">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.config_name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {item.config_key}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {item.config_type === 2 ? (
                            <Badge
                              variant={item.config_value === 'true' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.config_value === 'true' ? tc('enabled') : tc('disabled')}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && !initError && filteredList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Settings className="w-8 h-8 opacity-30" />
                            <p>暂无系统配置项</p>
                            <p className="text-xs">
                              请点击上方「初始化预设配置」按钮或手动添加配置
                            </p>
                          </div>
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
          <span className="text-sm text-muted-foreground">
            {tc('totalItems', { count: filteredList.length })}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 50 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editConfig') : t('addConfig')}</DialogTitle>
            <DialogDescription>
              {editing ? tc('editConfigDesc') : tc('addConfigDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>
                {tc('paramName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.config_name || ''}
                onChange={(e) => setForm({ ...form, config_name: e.target.value })}
                placeholder={tc('paramNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {tc('paramKey')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.config_key || ''}
                onChange={(e) => setForm({ ...form, config_key: e.target.value })}
                placeholder={tc('paramKeyPlaceholder')}
                readOnly={editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('paramType')}</Label>
              <Select
                value={form.config_type?.toString() || '1'}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    config_type: parseInt(v),
                    config_value: parseInt(v) === 2 ? 'false' : '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{tc('text')}</SelectItem>
                  <SelectItem value="2">{tc('booleanOnOff')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('paramValue')}</Label>
              {renderValueInput()}
            </div>
            <div className="space-y-2">
              <Label>{tc('description')}</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={tc('configDescPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-1" />
              {editing ? tc('update') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
