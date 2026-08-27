'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, CheckCircle, XCircle, Eye, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

interface SplitDetail {
  id?: number;
  pieces: number;
  qtyPerPiece: number;
  totalQty: number;
  width: number;
  isWaste: boolean;
  remark?: string;
}

interface SplitOrder {
  id: number;
  split_no: string;
  split_date: string;
  parent_batch_id: number;
  material_id: number;
  material_name: string;
  material_code: string;
  specification: string;
  warehouse_id: number;
  out_qty: string;
  total_waste: string;
  total_cost: string;
  status: number;
  remark: string;
  operator_name: string;
  audit_time: string;
  auditor_name: string;
  detail_count: number;
  create_time: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' }
> = {
  0: { label: '草稿', variant: 'outline' },
  1: { label: '已审核', variant: 'default' },
  3: { label: '已作废', variant: 'destructive' },
};

export default function SplitOrderPage() {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const { user } = useAuth();

  const [list, setList] = useState<SplitOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailList, setDetailList] = useState<SplitDetail[]>([]);
  const [currentOrder, setCurrentOrder] = useState<SplitOrder | null>(null);

  const [parentBatchNo, setParentBatchNo] = useState('');
  const [parentBatchId, setParentBatchId] = useState(0);
  const [parentInfo, setParentInfo] = useState<Loose>(null);
  const [warehouseId, setWarehouseId] = useState(0);
  const [remark, setRemark] = useState('');
  const [details, setDetails] = useState<SplitDetail[]>([
    { pieces: 1, qtyPerPiece: 0, totalQty: 0, width: 0, isWaste: false },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchNo) params.set('keyword', searchNo);
      if (statusFilter) params.set('status', statusFilter);
      const res = await authFetch('/api/warehouse/split-order?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  }, [page, searchNo, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchParentBatch = async () => {
    if (!parentBatchNo) return;
    try {
      const res = await authFetch(`/api/warehouse/batch-inventory?keyword=${parentBatchNo}`);
      const result = await res.json();
      const batch = result.data?.list?.[0];
      if (batch) {
        setParentBatchId(batch.id);
        setParentInfo(batch);
        setWarehouseId(batch.warehouse_id);
        toast({
          title: '已找到母料批次',
          description: `${batch.material_name} (可用: ${batch.available_qty})`,
        });
      } else {
        toast({ title: '未找到批次', variant: 'destructive' });
      }
    } catch {
      toast({ title: '查询失败', variant: 'destructive' });
    }
  };

  const addDetailRow = () => {
    setDetails([
      ...details,
      { pieces: 1, qtyPerPiece: 0, totalQty: 0, width: parentInfo?.width || 0, isWaste: false },
    ]);
  };

  const removeDetailRow = (idx: number) => {
    setDetails(details.filter((_, i) => i !== idx));
  };

  const updateDetail = (idx: number, field: keyof SplitDetail, value: unknown) => {
    const updated = details.map((d, i) => {
      if (i !== idx) return d;
      const next = { ...d, [field]: value };
      if (field === 'pieces' || field === 'qtyPerPiece') {
        next.totalQty = next.pieces * next.qtyPerPiece;
      }
      return next;
    });
    setDetails(updated);
  };

  const handleCreate = async () => {
    if (!parentBatchId || details.length === 0) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/warehouse/split-order', {
        method: 'POST',
        body: JSON.stringify({
          parentBatchId,
          warehouseId,
          remark,
          details: details.map((d) => ({
            pieces: d.pieces,
            qtyPerPiece: d.qtyPerPiece,
            totalQty: d.totalQty,
            width: d.width,
            isWaste: d.isWaste,
            remark: d.remark,
          })),
          operatorId: user?.id,
          operatorName: user?.username,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '创建成功', description: `分切单 ${result.data.splitNo}` });
        setShowCreate(false);
        resetForm();
        fetchData();
      } else {
        toast({ title: '创建失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleAudit = async (id: number) => {
    try {
      const res = await authFetch('/api/warehouse/split-order', {
        method: 'PATCH',
        body: JSON.stringify({
          splitId: id,
          action: 'audit',
          operatorId: user?.id,
          operatorName: user?.username,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '审核通过', description: `生成${result.data.childCount}个小料批次` });
        fetchData();
      } else {
        toast({ title: '审核失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '审核失败', variant: 'destructive' });
    }
  };

  const handleVoid = async (id: number) => {
    if (!confirm('确认作废此分切单？')) return;
    try {
      const res = await authFetch('/api/warehouse/split-order', {
        method: 'PATCH',
        body: JSON.stringify({ splitId: id, action: 'void' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '已作废' });
        fetchData();
      } else {
        toast({ title: '作废失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '作废失败', variant: 'destructive' });
    }
  };

  const viewDetail = async (order: SplitOrder) => {
    setCurrentOrder(order);
    setShowDetail(true);
    try {
      const res = await authFetch(`/api/warehouse/split-order/detail?splitId=${order.id}`);
      const result = await res.json();
      setDetailList(result.data || []);
    } catch {
      setDetailList([]);
    }
  };

  const resetForm = () => {
    setParentBatchNo('');
    setParentBatchId(0);
    setParentInfo(null);
    setWarehouseId(0);
    setRemark('');
    setDetails([{ pieces: 1, qtyPerPiece: 0, totalQty: 0, width: 0, isWaste: false }]);
  };

  return (
    <MainLayout>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">分切单管理</h1>
            <Button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新建分切单
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder="搜索分切单号/物料..."
              value={searchNo}
              onChange={(e) => setSearchNo(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">全部</SelectItem>
                <SelectItem value="0">草稿</SelectItem>
                <SelectItem value="1">已审核</SelectItem>
                <SelectItem value="3">已作废</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fetchData()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分切单号</TableHead>
                <TableHead>分切日期</TableHead>
                <TableHead>母料批次</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>出库数量</TableHead>
                <TableHead>损耗</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => {
                const cfg = STATUS_MAP[item.status] || { label: '未知', variant: 'outline' };
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.split_no}</TableCell>
                    <TableCell>{item.split_date}</TableCell>
                    <TableCell>{item.parent_batch_id}</TableCell>
                    <TableCell>{item.material_name}</TableCell>
                    <TableCell>{item.out_qty}</TableCell>
                    <TableCell>{item.total_waste}</TableCell>
                    <TableCell>
                      <Badge
                        variant={cfg.variant as 'default' | 'secondary' | 'destructive' | 'outline'}
                      >
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.operator_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => viewDetail(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.status === 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleAudit(item.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleVoid(item.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新建分切单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>母料批次号</Label>
                <Input
                  value={parentBatchNo}
                  onChange={(e) => setParentBatchNo(e.target.value)}
                  placeholder="输入批次号后点击查询"
                />
              </div>
              <Button variant="outline" onClick={searchParentBatch}>
                查询
              </Button>
            </div>
            {parentInfo && (
              <div className="p-3 bg-muted rounded text-sm space-y-1">
                <div>
                  物料: {parentInfo.material_name} (编码: {parentInfo.material_code})
                </div>
                <div>
                  可用量: {parentInfo.available_qty} / 总量: {parentInfo.quantity}
                </div>
                <div>
                  规格: {parentInfo.specification || '-'} | 宽幅: {parentInfo.width || '-'}
                </div>
              </div>
            )}
            <div>
              <Label>备注</Label>
              <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>分切明细</Label>
                <Button variant="outline" size="sm" onClick={addDetailRow}>
                  + 添加行
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>份数</TableHead>
                    <TableHead>单份数量</TableHead>
                    <TableHead>小计</TableHead>
                    <TableHead>宽幅</TableHead>
                    <TableHead>损耗</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          type="number"
                          value={d.pieces}
                          onChange={(e) => updateDetail(i, 'pieces', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={d.qtyPerPiece}
                          onChange={(e) =>
                            updateDetail(i, 'qtyPerPiece', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>{d.totalQty}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={d.width}
                          onChange={(e) =>
                            updateDetail(i, 'width', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={d.isWaste}
                          onChange={(e) => updateDetail(i, 'isWaste', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={d.remark || ''}
                          onChange={(e) => updateDetail(i, 'remark', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {details.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => removeDetailRow(i)}
                          >
                            ×
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建分切单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>分切单详情 - {currentOrder?.split_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              母料: {currentOrder?.material_name} | 出库: {currentOrder?.out_qty} | 损耗:{' '}
              {currentOrder?.total_waste}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>子批次号</TableHead>
                <TableHead>份数</TableHead>
                <TableHead>单份数量</TableHead>
                <TableHead>总数量</TableHead>
                <TableHead>宽幅</TableHead>
                <TableHead>分摊成本</TableHead>
                <TableHead>类型</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailList.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">{(d as Loose).child_batch_no || '-'}</TableCell>
                  <TableCell>{d.pieces}</TableCell>
                  <TableCell>{(d as Loose).qty_per_piece}</TableCell>
                  <TableCell>{(d as Loose).total_qty}</TableCell>
                  <TableCell>{d.width}</TableCell>
                  <TableCell>{(d as Loose).allocated_cost || '-'}</TableCell>
                  <TableCell>{(d as Loose).is_waste ? '损耗' : '正品'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
