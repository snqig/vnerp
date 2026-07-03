'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';;
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Calculator, RefreshCw, Eye, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CostItem {
  material_id: number;
  material_name: string;
  material_code: string;
  material_spec: string;
  unit: string;
  total_quantity: number;
  total_cost_amount: number;
  avg_cost_price: number;
  min_cost_price: number;
  max_cost_price: number;
  warehouse_count: number;
}

export default function CostPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Warehouse');
  const { toast } = useToast();
  const [list, setList] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/warehouse/cost?page=${page}&pageSize=20`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

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
    } catch (e) {
      console.error(e);
    }
  };

  const recalculate = async (materialId: number) => {
    if (!confirm('确定重新计算该物料的成本？')) return;
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
    } catch (e) {
      toast({ title: t('recalculateFailed'), variant: 'destructive' });
    }
  };

  const totalCostAmount = list.reduce((sum, item) => sum + (item.total_cost_amount || 0), 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              成本核算管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              移动加权平均法成本核算，支持成本重算和成本分析
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            刷新
          </Button>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-muted-foreground">库存总成本</div>
                  <div className="text-2xl font-bold">¥{totalCostAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm text-muted-foreground">物料种类</div>
                  <div className="text-2xl font-bold">{total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-sm text-muted-foreground">核算方法</div>
                  <div className="text-2xl font-bold">移动加权平均</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>{tc("specification")}</TableHead>
                  <TableHead>{tc("unit")}</TableHead>
                  <TableHead>{tc("totalQuantity")}</TableHead>
                  <TableHead>平均成本价</TableHead>
                  <TableHead>库存金额</TableHead>
                  <TableHead>仓库数</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      暂无成本数据
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.material_id}>
                      <TableCell className="font-mono text-sm">{item.material_code}</TableCell>
                      <TableCell className="text-sm font-medium">{item.material_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.material_spec || '-'}</TableCell>
                      <TableCell className="text-sm">{item.unit}</TableCell>
                      <TableCell className="text-sm font-mono">{Number(item.total_quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-mono">
                        ¥{Number(item.avg_cost_price).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm font-mono font-medium">
                        ¥{Number(item.total_cost_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{item.warehouse_count} 个仓库</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => viewDetail(item.material_id)}>
                            <Eye className="h-3 w-3 mr-1" />
                            详情
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-orange-600" onClick={() => recalculate(item.material_id)}>
                            <Calculator className="h-3 w-3 mr-1" />
                            重算
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 种物料</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </div>

      {/* 成本详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>成本详情</DialogTitle>
            <DialogDescription>物料在各仓库的成本分布和变动历史</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              {/* 各仓库成本 */}
              <div>
                <h4 className="font-medium mb-2">各仓库成本</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc("warehouse")}</TableHead>
                      <TableHead className="text-xs">{tc("quantity")}</TableHead>
                      <TableHead className="text-xs">成本价</TableHead>
                      <TableHead className="text-xs">库存金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData.stock || []).map((s: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{s.warehouse_name || `仓库${s.warehouse_id}`}</TableCell>
                        <TableCell className="text-sm font-mono">{Number(s.quantity).toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-mono">¥{Number(s.cost_price || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-sm font-mono">¥{(Number(s.quantity) * Number(s.cost_price || 0)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 成本变动历史 */}
              <div>
                <h4 className="font-medium mb-2">最近入库记录</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc("time")}</TableHead>
                      <TableHead className="text-xs">{tc("type")}</TableHead>
                      <TableHead className="text-xs">{tc("quantity")}</TableHead>
                      <TableHead className="text-xs">单价</TableHead>
                      <TableHead className="text-xs">{tc("amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData.costHistory || []).map((h: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{h.create_time}</TableCell>
                        <TableCell className="text-xs">{h.movement_type}</TableCell>
                        <TableCell className="text-xs font-mono">{Number(h.quantity).toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-mono">¥{Number(h.unit_price || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-xs font-mono">¥{(Number(h.quantity) * Number(h.unit_price || 0)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {(detailData.costHistory || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                          暂无入库记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>{tc("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
