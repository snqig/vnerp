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
  const ts = useTranslations('Warehouse');
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
  // #21 分切物料类型限制：母料是否允许分切（不可切则禁用创建并提示）
  const [parentSplittable, setParentSplittable] = useState(true);
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
        const splittable = batch.is_splittable === 1;
        setParentSplittable(splittable);
        if (splittable) {
          toast({
            title: ts('k_16am7tf'),
            description: `${batch.material_name} (可用: ${batch.available_qty})`,
          });
        } else {
          toast({
            title: ts('k_1fm1c2h'),
            description: `【${batch.material_name}】非卷材类物料，不能创建分切单`,
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: ts('k_uz75cl'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_qoguk0'), variant: 'destructive' });
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
      toast({ title: ts('k_p6jf36'), variant: 'destructive' });
      return;
    }
    if (!parentSplittable) {
      toast({
        title: ts('k_1fm1c2h'),
        description: ts('k_1s1n0h4'),
        variant: 'destructive',
      });
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
        toast({ title: ts('k_kiombh'), description: `分切单 ${result.data.splitNo}` });
        setShowCreate(false);
        resetForm();
        fetchData();
      } else {
        toast({ title: ts('k_1jxltyq'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_1jxltyq'), variant: 'destructive' });
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
        toast({ title: ts('k_1wqkzrj'), description: `生成${result.data.childCount}个小料批次` });
        fetchData();
      } else {
        toast({ title: ts('k_rkq87q'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_rkq87q'), variant: 'destructive' });
    }
  };

  const handleVoid = async (id: number) => {
    if (!confirm(ts('k_1985cqh'))) return;
    try {
      const res = await authFetch('/api/warehouse/split-order', {
        method: 'PATCH',
        body: JSON.stringify({ splitId: id, action: 'void' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('k_1o0kows') });
        fetchData();
      } else {
        toast({ title: ts('k_agd11i'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_agd11i'), variant: 'destructive' });
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
    setParentSplittable(true);
    setWarehouseId(0);
    setRemark('');
    setDetails([{ pieces: 1, qtyPerPiece: 0, totalQty: 0, width: 0, isWaste: false }]);
  };

  return (
    <MainLayout>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{ts('k_1xvd5o6')}</h1>
            <Button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {ts('k_8r4lf')}</Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder={ts('k_15x9dnn')}
              value={searchNo}
              onChange={(e) => setSearchNo(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={ts('k_igzce8')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{ts('k_q6w6ul')}</SelectItem>
                <SelectItem value="0">{tc('draft')}</SelectItem>
                <SelectItem value="1">{ts('k_7j2xv0')}</SelectItem>
                <SelectItem value="3">{ts('k_1o0kows')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fetchData()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ts('k_1epfrdq')}</TableHead>
                <TableHead>{ts('k_1qbyx86')}</TableHead>
                <TableHead>{ts('k_cqonvx')}</TableHead>
                <TableHead>{tc('materialName')}</TableHead>
                <TableHead>{ts('k_1f04p8j')}</TableHead>
                <TableHead>{ts('k_1b2ia9n')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{ts('k_15sp2wy')}</TableHead>
                <TableHead>{tc('operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => {
                const cfg = STATUS_MAP[item.status] || { label: ts('k_1lpnuh4'), variant: 'outline' };
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
                    {ts('k_6tzr61')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">{ts('k_1vsm2qk')}{total} {ts('k_1rfm5gs')}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {tc('prevPage')}</Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                {tc('nextPage')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ts('k_8r4lf')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>{ts('k_rsru9a')}</Label>
                <Input
                  value={parentBatchNo}
                  onChange={(e) => setParentBatchNo(e.target.value)}
                  placeholder={ts('k_14l03tl')}
                />
              </div>
              <Button variant="outline" onClick={searchParentBatch}>
                {ts('k_16mfmhy')}</Button>
            </div>
            {parentInfo && (
              <div className="p-3 bg-muted rounded text-sm space-y-1">
                <div>
                  {ts('k_uq0zmv')}{parentInfo.material_name} {ts('k_1khtyf8')}{parentInfo.material_code})
                </div>
                <div>
                  {ts('k_tn41rr')}{parentInfo.available_qty} {ts('k_j9483u')}{parentInfo.quantity}
                </div>
                <div>
                  {ts('k_17gr6it')}{parentInfo.specification || '-'} {ts('k_1up8rq3')}{parentInfo.width || '-'}
                </div>
                {!parentSplittable && (
                  <div className="mt-1 text-red-600 font-medium">
                    {ts('k_enbil6')}{parentInfo.material_name}
                    {ts('k_21761g')}</div>
                )}
              </div>
            )}
            <div>
              <Label>{tc('remark')}</Label>
              <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{ts('k_1d53f9q')}</Label>
                <Button variant="outline" size="sm" onClick={addDetailRow}>
                  {ts('k_jvcsab')}</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_1o2ukqw')}</TableHead>
                    <TableHead>{ts('k_sximke')}</TableHead>
                    <TableHead>{ts('k_12g7a19')}</TableHead>
                    <TableHead>{ts('k_1kv361j')}</TableHead>
                    <TableHead>{ts('k_1b2ia9n')}</TableHead>
                    <TableHead>{tc('remark')}</TableHead>
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
              {tc('cancel')}</Button>
            <Button onClick={handleCreate} disabled={!parentSplittable}>
              {ts('k_i8yydq')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ts('k_g8w5d7')}{currentOrder?.split_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              {ts('k_rbxrez')}{currentOrder?.material_name} {ts('k_1xo9wf8')}{currentOrder?.out_qty} {ts('k_38pvfb')}{' '}
              {currentOrder?.total_waste}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ts('k_1mrrasq')}</TableHead>
                <TableHead>{ts('k_1o2ukqw')}</TableHead>
                <TableHead>{ts('k_sximke')}</TableHead>
                <TableHead>{ts('k_2tzyir')}</TableHead>
                <TableHead>{ts('k_1kv361j')}</TableHead>
                <TableHead>{ts('k_tkmy39')}</TableHead>
                <TableHead>{ts('k_anh4cj')}</TableHead>
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
                  <TableCell>{(d as Loose).is_waste ? ts('k_1b2ia9n') : ts('k_156cbqh')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
