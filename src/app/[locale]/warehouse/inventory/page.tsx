'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  TrendingDown,
  Package,
  DollarSign,
  Barcode,
  BoxIcon,
  Layers,
  RefreshCw,
  Download,
  Snowflake,
} from 'lucide-react';
import { AdvancedSearch, FilterField, ActiveFilter } from '@/components/ui/advanced-search';
import { BatchToolbar, BatchAction } from '@/components/ui/batch-toolbar';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

export default function InventoryPage() {
  const ts = useTranslations('Warehouse');
  // 添加翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const [inventoryItems, setInventoryItems] = useState<Loose[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<Loose[]>([]);
  const [alerts, setAlerts] = useState<Loose[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState('all');
  // StandardTable：分页 / 排序 / 勾选
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);
  const [selectedRows, setSelectedRows] = useState<Loose[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const { toast } = useToast();

  // 高级搜索字段配置
  const filterFields: FilterField[] = [
    {
      key: 'material_code',
      label: t('materialCode'),
      type: 'text',
      placeholder: t('materialCode'),
    },
    { key: 'material_name', label: t('material'), type: 'text', placeholder: t('material') },
    {
      key: 'specification',
      label: t('specification'),
      type: 'text',
      placeholder: t('specification'),
    },
    { key: 'batch_no', label: t('batchNo'), type: 'text', placeholder: t('batchNo') },
    {
      key: 'status',
      label: tc('status'),
      type: 'select',
      options: [
        { label: tc('normal'), value: 'normal' },
        { label: tc('frozen'), value: 'frozen' },
        { label: tc('expired'), value: 'expired' },
      ],
    },
    { key: 'expiry_date_start', label: t('expiryDate') + ts('k_116a71n'), type: 'date' },
    { key: 'expiry_date_end', label: t('expiryDate') + ts('k_1knarg2'), type: 'date' },
  ];

  // 批量操作配置
  const batchActions: BatchAction[] = [
    {
      key: 'freeze',
      label: t('freeze'),
      icon: <Snowflake className="h-3 w-3" />,
      onClick: async (ids) => {
        try {
          const res = await authFetch('/api/warehouse/freeze', {
            method: 'POST',
            body: JSON.stringify({ inventoryIds: ids, action: 'freeze' }),
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: tc('frozenCount', { count: ids.length }) });
            clear();
            fetchInventory();
          } else {
            toast({ title: result.message || tc('freezeFailed'), variant: 'destructive' });
          }
        } catch {
          toast({ title: tc('freezeFailed'), variant: 'destructive' });
        }
      },
      confirm: tc('confirmFreezeSelected'),
    },
    {
      key: 'export',
      label: tc('export'),
      icon: <Download className="h-3 w-3" />,
      onClick: async (ids) => {
        try {
          const res = await authFetch(`/api/warehouse/inventory/export?ids=${ids.join(',')}`);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: tc('exportSuccess') });
        } catch {
          toast({ title: tc('exportFailed'), variant: 'destructive' });
        }
      },
    },
  ];

  // 使用翻译的状态映射
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      normal: {
        label: tc('normal'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      frozen: {
        label: tc('frozen'),
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      },
      expired: {
        label: tc('expired'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      },
    };
    const config = statusMap[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getAlertBadge = (alertLevel: string) => {
    const alertMap: Record<string, { label: string; className: string }> = {
      normal: {
        label: tc('normal'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      warning: {
        label: tc('warning'),
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      },
      critical: {
        label: tc('critical'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      },
    };
    const config = alertMap[alertLevel] || {
      label: alertLevel,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const sortedInventory = useMemo(() => {
    if (!sort) return inventoryItems;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...inventoryItems].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sort.field] ?? '').toLowerCase();
      const bVal = String((b as Record<string, unknown>)[sort.field] ?? '').toLowerCase();
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }, [inventoryItems, sort]);

  // StandardTable 只渲染当前页数据
  const paged = useMemo(
    () => sortedInventory.slice((page - 1) * pageSize, page * pageSize),
    [sortedInventory, page, pageSize]
  );

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const clear = () => setSelectedRows([]);

  const columns: StandardTableColumn<Loose>[] = [
    {
      key: 'batch_no',
      title: t('batchNo'),
      sortable: true,
      className: 'font-mono',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Barcode className="h-4 w-4 text-muted-foreground" />
          {item.batch_no}
        </div>
      ),
    },
    {
      key: 'material_code',
      title: t('materialCode'),
      sortable: true,
      className: 'font-mono text-xs',
      render: (item) => item.material_code || '-',
    },
    {
      key: 'material_name',
      title: t('material'),
      sortable: true,
      className: 'font-medium',
      render: (item) => item.material_name,
    },
    {
      key: 'material_spec',
      title: t('specification'),
      sortable: true,
      className: 'text-muted-foreground',
      render: (item) => item.material_spec || '-',
    },
    {
      key: 'warehouse_name',
      title: t('warehouseName'),
      sortable: true,
      render: (item) => <span className="text-sm">{item.warehouse_name || '-'}</span>,
    },
    {
      key: 'quantity',
      title: t('quantity'),
      align: 'right',
      sortable: true,
      className: 'font-medium',
      render: (item) => `${parseFloat(item.quantity || 0).toLocaleString()} ${item.unit}`,
    },
    {
      key: 'available_qty',
      title: t('availableQty'),
      align: 'right',
      sortable: true,
      render: (item) => parseFloat(item.available_qty || 0).toLocaleString(),
    },
    {
      key: 'locked_qty',
      title: t('lockedQty'),
      align: 'right',
      sortable: true,
      className: 'text-orange-600 dark:text-orange-400',
      render: (item) => parseFloat(item.locked_qty || 0).toLocaleString(),
    },
    {
      key: 'status',
      title: tc('status'),
      sortable: true,
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'alertLevel',
      title: tc('warning'),
      render: (item) => getAlertBadge(item.alertLevel),
    },
    {
      key: 'expire_date',
      title: t('expiryDate'),
      sortable: true,
      className: 'text-muted-foreground',
      render: (item) => (item.expire_date ? new Date(item.expire_date).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      title: tc('operation'),
      align: 'right',
      render: () => (
        <Button variant="ghost" size="sm">
          <Layers className="h-4 w-4 mr-1" />
          {t('trace')}
        </Button>
      ),
    },
  ];

  useEffect(() => {
    fetchBaseList();
  }, []);

  const fetchBaseList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      const response = await authFetch(`/api/inventory?${params.toString()}`);
      const result = await response.json();
      if (result.success && result.data) {
        const list = result.data.list || [];
        setInventoryItems(list);

        const alertItems = list.filter(
          (item: Loose) => item.alertLevel === 'warning' || item.alertLevel === 'critical'
        );
        setAlerts(
          alertItems.map((item: Loose) => ({
            material: item.material_name,
            current: parseFloat(item.available_qty) || 0,
            safety: parseFloat(item.safety_stock) || 0,
            unit: item.unit,
            type: item.alertLevel === 'critical' ? 'out' : 'low',
          }))
        );

        const whMap = new Map<number, { name: string; count: number; value: number }>();
        list.forEach((item: Loose) => {
          const wid = item.warehouse_id;
          if (!whMap.has(wid)) {
            whMap.set(wid, { name: item.warehouse_name || t('unknown'), count: 0, value: 0 });
          }
          const wh = whMap.get(wid)!;
          wh.count++;
          wh.value += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        });
        const stats = Array.from(whMap.entries()).map(([id, wh], i) => ({
          id,
          name: wh.name,
          code: `WH-${String(i + 1).padStart(3, '0')}`,
          utilization: Math.min(Math.round((wh.count / 50) * 100), 100),
          items: wh.count,
          value: Math.round(wh.value),
        }));
        setWarehouseStats(stats);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    setPage(1);
    setSelectedRows([]);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (warehouseId) params.set('warehouseId', warehouseId);
      if (status && status !== 'all') params.set('status', status);
      params.set('pageSize', '100');

      const response = await authFetch(`/api/inventory?${params.toString()}`);
      const result = await response.json();
      if (result.success && result.data) {
        const list = result.data.list || [];
        setInventoryItems(list);

        const alertItems = list.filter(
          (item: Loose) => item.alertLevel === 'warning' || item.alertLevel === 'critical'
        );
        setAlerts(
          alertItems.map((item: Loose) => ({
            material: item.material_name,
            current: parseFloat(item.available_qty) || 0,
            safety: parseFloat(item.safety_stock) || 0,
            unit: item.unit,
            type: item.alertLevel === 'critical' ? 'out' : 'low',
          }))
        );

        const whMap = new Map<number, { name: string; count: number; value: number }>();
        list.forEach((item: Loose) => {
          const wid = item.warehouse_id;
          if (!whMap.has(wid)) {
            whMap.set(wid, { name: item.warehouse_name || t('unknown'), count: 0, value: 0 });
          }
          const wh = whMap.get(wid)!;
          wh.count++;
          wh.value += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        });
        const stats = Array.from(whMap.entries()).map(([id, wh], i) => ({
          id,
          name: wh.name,
          code: `WH-${String(i + 1).padStart(3, '0')}`,
          utilization: Math.min(Math.round((wh.count / 50) * 100), 100),
          items: wh.count,
          value: Math.round(wh.value),
        }));
        setWarehouseStats(stats);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchInventory();
  };

  return (
    <MainLayout title={t('inventory')}>
      <div className="space-y-6">
        <StatsCards
          configs={[
            { key: 'sku', label: '物料总数', icon: Package, ...StatsTheme.blue },
            { key: 'value', label: '库存价值', icon: DollarSign, ...StatsTheme.green },
            { key: 'alerts', label: '预警数量', icon: AlertTriangle, ...StatsTheme.orange },
            { key: 'lowStock', label: '低库存数量', icon: TrendingDown, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'sku', count: inventoryItems.length },
            { key: 'value', count: inventoryItems.reduce((sum, item) => sum + (item.total_cost || 0), 0) },
            { key: 'alerts', count: alerts.length },
            { key: 'lowStock', count: inventoryItems.filter((item) => item.qty < (item.min_stock || 0)).length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        {warehouseStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {warehouseStats.map((wh) => (
              <Card key={wh.id || wh.code}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BoxIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{wh.name}</span>
                    </div>
                    <Badge variant="outline">{wh.code}</Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t('utilizationRate')}</span>
                        <span className="font-medium">{wh.utilization}%</span>
                      </div>
                      <Progress value={wh.utilization} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('materialTypes')}</span>
                      <span className="font-medium">
                        {wh.items}
                        {t('typesUnit')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('stockValue')}</span>
                      <span className="font-medium">¥{wh.value.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-950/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
                {t('inventoryWarning')}
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">
                {t('lowStockWarning')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-lg p-4 border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown
                        className={`h-4 w-4 ${
                          alert.type === 'out'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      />
                      <span className="font-medium text-sm text-foreground">{alert.material}</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('current')}</span>
                        <span
                          className={`font-medium ${
                            alert.type === 'out'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {alert.current} {alert.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('safetyStock')}</span>
                        <span className="font-medium text-foreground">
                          {alert.safety} {alert.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>{t('stockDetails')}</CardTitle>
                <CardDescription>{t('batchInventoryDesc')}</CardDescription>
              </div>
              <div className="flex flex-1 gap-4 items-center max-w-2xl">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={() => fetchInventory()}
                  className="flex-1"
                />
                <WarehouseSelect
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder={t('allWarehouses')}
                  className="w-[140px]"
                />
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={tc('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                    <SelectItem value="normal">{tc('normal')}</SelectItem>
                    <SelectItem value="frozen">{tc('frozen')}</SelectItem>
                    <SelectItem value="expired">{tc('expired')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { handleSearch(); }}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {tc('refresh')}
                </Button>
                <AdvancedSearch
                  fields={filterFields}
                  onSearch={(filters) => {
                    const newFilters: ActiveFilter[] = [];
                    Object.entries(filters).forEach(([key, value]) => {
                      if (value) {
                        const field = filterFields.find((f) => f.key === key);
                        if (field) {
                          const option = field.options?.find((o) => o.value === value);
                          newFilters.push({
                            key,
                            label: field.label,
                            value,
                            displayValue: option?.label || value,
                          });
                        }
                      }
                    });
                    setActiveFilters(newFilters);
                    // 将筛选条件应用到搜索
                    Object.entries(filters).forEach(([key, value]) => {
                      if (key === 'status' && value) setStatus(value);
                    });
                    const kw = filters.material_name || filters.material_code || '';
                    if (kw) setKeyword(kw);
                    fetchInventory();
                  }}
                  onReset={() => {
                    setActiveFilters([]);
                    setKeyword('');
                    setWarehouseId('');
                    setStatus('all');
                    fetchInventory();
                  }}
                  activeFilters={activeFilters}
                  onRemoveFilter={(key) => {
                    setActiveFilters((prev) => prev.filter((f) => f.key !== key));
                    if (key === 'status') setStatus('all');
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BatchToolbar
              selectedIds={selectedRows.map((r) => Number(r.id))}
              totalItems={inventoryItems.length}
              onSelectAll={() => setSelectedRows([...paged])}
              onClearSelection={clear}
              actions={batchActions}
            />
            <StandardTable<Loose>
              columns={columns}
              dataSource={paged}
              total={sortedInventory.length}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              sortState={sort}
              onSortChange={handleSortChange}
              loading={loading}
              onRetry={fetchInventory}
              emptyText={t('noInventoryData')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
