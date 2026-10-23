'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeroHeader } from '@/components/layout/PageHeroHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
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
import { Calculator, RefreshCw, Eye, TrendingUp, DollarSign, Package, Truck, Archive } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';

interface CostItem {
  material_id: number;
  material_name: string;
  material_code: string;
  material_spec: string;
  // API（api/warehouse/cost/route.ts:64）SELECT 的是 inv_material.specification，
  // 页面表格第 217 行也读 item.specification，接口里原先漏了这行声明 → tsc 报 TS2339。
  specification: string;
  unit: string;
  total_quantity: number;
  total_cost_amount: number;
  avg_cost_price: number;
  min_cost_price: number;
  max_cost_price: number;
  warehouse_count: number;
}

export default function CostPage() {
  const ts = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const t = useTranslations('Warehouse');
  const { toast } = useToast();
  const [list, setList] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Loose>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/warehouse/cost?page=${page}&pageSize=${pageSize}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const viewDetail = async (materialId: number) => {
    try {
      const res = await authFetch(`/api/warehouse/cost?materialId=${materialId}`);
      const result = await res.json();
      if (result.success) {
        setDetailData(result.data);
        setDetailOpen(true);
      }
    } catch {}
  };

  const recalculate = async (materialId: number) => {
    if (!confirm(ts('k_1lb2310'))) return;
    try {
      const res = await authFetch('/api/warehouse/cost', {
        method: 'POST',
        body: JSON.stringify({ materialId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('costRecalculated', { price: result.data.costPrice.toFixed(4) }) });
        fetchData();
      } else {
        toast({ title: result.message || t('recalculateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('recalculateFailed'), variant: 'destructive' });
    }
  };

  const totalCostAmount = list.reduce((sum, item) => sum + (item.total_cost_amount || 0), 0);

  // /api/warehouse/cost 未支持 sortField / sortDirection，故不开列排序（需后端补排序参数）
  const columns: StandardTableColumn<CostItem>[] = [
    {
      key: 'material_code',
      title: tc('materialCode'),
      render: (r) => <span className="font-mono text-sm">{r.material_code}</span>,
    },
    {
      key: 'material_name',
      title: tc('materialName'),
      render: (r) => <span className="text-sm font-medium">{r.material_name}</span>,
    },
    {
      key: 'specification',
      title: tc('specification'),
      render: (r) => <span className="text-sm text-muted-foreground">{r.specification || '-'}</span>,
    },
    {
      key: 'unit',
      title: tc('unit'),
      render: (r) => <span className="text-sm">{r.unit}</span>,
    },
    {
      key: 'total_quantity',
      title: tc('totalQuantity'),
      align: 'right',
      render: (r) => (
        <span className="text-sm font-mono">{Number(r.total_quantity).toLocaleString()}</span>
      ),
    },
    {
      key: 'avg_cost_price',
      title: tc('avgCostPrice'),
      align: 'right',
      render: (r) => (
        <span className="text-sm font-mono">¥{Number(r.avg_cost_price).toFixed(4)}</span>
      ),
    },
    {
      key: 'total_cost_amount',
      title: tc('costAmount'),
      align: 'right',
      render: (r) => (
        <span className="text-sm font-mono font-medium">
          ¥
          {Number(r.total_cost_amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'warehouse_count',
      title: tc('warehouseCount'),
      render: (r) => (
        <Badge variant="outline" className="text-xs">
          {r.warehouse_count}
          {tc('warehouseUnitSuffix')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => viewDetail(r.material_id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            {ts('k_xc5h04')}</Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-orange-600 dark:text-orange-400"
            onClick={() => recalculate(r.material_id)}
          >
            <Calculator className="h-3 w-3 mr-1" />
            {ts('k_4mkdr1')}</Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalCost'), icon: DollarSign, ...StatsTheme.blue },
            { key: 'inStock', label: tc('inStockCost'), icon: Package, ...StatsTheme.green },
            { key: 'inTransit', label: tc('inTransitCost'), icon: Truck, ...StatsTheme.orange },
            { key: 'shipped', label: tc('shippedCost'), icon: Archive, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: stats.total_cost || totalCostAmount },
            { key: 'inStock', count: stats.in_stock_cost || list.reduce((sum, item) => sum + (item.total_cost_amount || 0), 0) },
            { key: 'inTransit', count: 0 },
            { key: 'shipped', count: 0 },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <PageHeroHeader
          icon={Calculator}
          title={ts('k_13bdco3')}
          description={ts('k_1gbfxkf')}
          action={
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {ts('k_12qo56a')}</Button>
          }
        />

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{tc('totalCostAmount')}</div>
                  <div className="text-2xl font-bold">
                    ¥
                    {totalCostAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{tc('materialTypeCount')}</div>
                  <div className="text-2xl font-bold">{total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{tc('costMethod')}</div>
                  <div className="text-2xl font-bold">{ts('k_1ln1c5')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <StandardTable<CostItem>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="material_id"
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading}
              onRetry={fetchData}
              emptyText={ts('k_1mp0dut')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 成本详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tc('materialCostDetail')}</DialogTitle>
            <DialogDescription>{tc('materialCostDetailDesc')}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              {/* 各仓库成本 */}
              <div>
                <h4 className="font-medium mb-2">{ts('k_163aghh')}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc('warehouse')}</TableHead>
                      <TableHead className="text-xs">{tc('quantity')}</TableHead>
                      <TableHead className="text-xs">{ts('k_9smtey')}</TableHead>
                      <TableHead className="text-xs">{tc('costAmount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData.stock || []).map((s: Loose, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {s.warehouse_name || `仓库${s.warehouse_id}`}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {Number(s.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          ¥{Number(s.cost_price || 0).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          ¥{(Number(s.quantity) * Number(s.cost_price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 成本变动历史 */}
              <div>
                <h4 className="font-medium mb-2">{tc('costChangeHistory')}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc('time')}</TableHead>
                      <TableHead className="text-xs">{tc('type')}</TableHead>
                      <TableHead className="text-xs">{tc('quantity')}</TableHead>
                      <TableHead className="text-xs">{ts('k_isc1c5')}</TableHead>
                      <TableHead className="text-xs">{tc('amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData.costHistory || []).map((h: Loose, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{h.create_time}</TableCell>
                        <TableCell className="text-xs">{h.movement_type}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {Number(h.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          ¥{Number(h.unit_price || 0).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          ¥{(Number(h.quantity) * Number(h.unit_price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(detailData.costHistory || []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground text-sm py-4"
                        >
                          {ts('k_1gfnr28')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
