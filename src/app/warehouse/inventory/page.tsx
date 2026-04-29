'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  AlertTriangle,
  TrendingDown,
  Barcode,
  BoxIcon,
  Layers,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    normal: { label: '正常', className: 'bg-green-100 text-green-700' },
    frozen: { label: '冻结', className: 'bg-orange-100 text-orange-700' },
    expired: { label: '过期', className: 'bg-red-100 text-red-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

const getAlertBadge = (alertLevel: string) => {
  const alertMap: Record<string, { label: string; className: string }> = {
    normal: { label: '正常', className: 'bg-green-100 text-green-700' },
    warning: { label: '预警', className: 'bg-yellow-100 text-yellow-700' },
    critical: { label: '紧急', className: 'bg-red-100 text-red-700' },
  };
  const config = alertMap[alertLevel] || { label: alertLevel, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') { setSortField(null); setSortOrder(null); }
    } else { setSortField(field); setSortOrder('asc'); }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };
  const sortedInventory = useMemo(() => {
    if (!sortField || !sortOrder) return inventoryItems;
    return [...inventoryItems].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [inventoryItems, sortField, sortOrder]);

  useEffect(() => {
    fetchWarehouses();
    fetchInventory();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouse');
      const result = await response.json();
      if (result.success && result.data) {
        const list = Array.isArray(result.data) ? result.data : (result.data.list || []);
        setWarehouses(list);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (warehouseId && warehouseId !== 'all') params.set('warehouseId', warehouseId);
      if (status && status !== 'all') params.set('status', status);
      params.set('pageSize', '100');

      const response = await fetch(`/api/inventory?${params.toString()}`);
      const result = await response.json();
      if (result.success && result.data) {
        const list = result.data.list || [];
        setInventoryItems(list);

        const alertItems = list.filter((item: any) => item.alertLevel === 'warning' || item.alertLevel === 'critical');
        setAlerts(alertItems.map((item: any) => ({
          material: item.material_name,
          current: parseFloat(item.available_qty) || 0,
          safety: parseFloat(item.safety_stock) || 0,
          unit: item.unit,
          type: item.alertLevel === 'critical' ? 'out' : 'low',
        })));

        const whMap = new Map<number, { name: string; count: number; value: number }>();
        list.forEach((item: any) => {
          const wid = item.warehouse_id;
          if (!whMap.has(wid)) {
            whMap.set(wid, { name: item.warehouse_name || '未知', count: 0, value: 0 });
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
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchInventory();
  };

  return (
    <MainLayout title="库存查询">
      <div className="space-y-6">
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
                        <span className="text-muted-foreground">库容利用率</span>
                        <span className="font-medium">{wh.utilization}%</span>
                      </div>
                      <Progress value={wh.utilization} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">物料种类</span>
                      <span className="font-medium">{wh.items}种</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">库存金额</span>
                      <span className="font-medium">¥{wh.value.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                库存预警
              </CardTitle>
              <CardDescription className="text-orange-600">
                以下物料库存低于安全库存，请及时补货
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {alerts.map((alert, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className={`h-4 w-4 ${alert.type === 'out' ? 'text-red-500' : 'text-orange-500'}`} />
                      <span className="font-medium text-sm">{alert.material}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      当前: <span className={alert.type === 'out' ? 'text-red-500 font-medium' : 'text-orange-500 font-medium'}>{alert.current}</span> {alert.unit}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      安全库存: {alert.safety} {alert.unit}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>库存明细</CardTitle>
                <CardDescription>批次库存查询，支持先进先出追溯</CardDescription>
              </div>
              <div className="flex flex-1 gap-4 items-center max-w-2xl">
                <SearchInput
                  placeholder="扫描/输入批次号、物料名称..."
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={() => fetchInventory()}
                  className="flex-1"
                />
                <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部仓库</SelectItem>
                    {warehouses.map((wh: any) => (
                      <SelectItem key={wh.id} value={String(wh.id)}>{wh.warehouse_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => { setStatus(v); }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="frozen">冻结</SelectItem>
                    <SelectItem value="expired">过期</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleSearch}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">加载中...</div>
            ) : inventoryItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无库存数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('batch_no')}>
                      <span className="inline-flex items-center">批次号{getSortIcon('batch_no')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('material_code')}>
                      <span className="inline-flex items-center">物料编码{getSortIcon('material_code')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('material_name')}>
                      <span className="inline-flex items-center">物料{getSortIcon('material_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('specification')}>
                      <span className="inline-flex items-center">规格{getSortIcon('specification')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('warehouse_name')}>
                      <span className="inline-flex items-center">仓库{getSortIcon('warehouse_name')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('quantity')}>
                      <span className="inline-flex items-center justify-end">数量{getSortIcon('quantity')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('available_qty')}>
                      <span className="inline-flex items-center justify-end">可用{getSortIcon('available_qty')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('locked_qty')}>
                      <span className="inline-flex items-center justify-end">锁定{getSortIcon('locked_qty')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead>预警</TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('expiry_date')}>
                      <span className="inline-flex items-center">有效期{getSortIcon('expiry_date')}</span>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInventory.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          <Barcode className="h-4 w-4 text-muted-foreground" />
                          {item.batch_no}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.material_code || '-'}</TableCell>
                      <TableCell className="font-medium">{item.material_name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.material_spec || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm">{item.warehouse_name || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.quantity || 0).toLocaleString()} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{parseFloat(item.available_qty || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600">{parseFloat(item.locked_qty || 0).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{getAlertBadge(item.alertLevel)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.expire_date ? new Date(item.expire_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Layers className="h-4 w-4 mr-1" />
                          追溯
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
