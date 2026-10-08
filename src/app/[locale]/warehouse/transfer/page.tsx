'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout, PageHeroHeader } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Search, Eye, Trash2, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { UserSelect } from '@/components/ui/user-select';

interface TransferOrder {
  id: number;
  transfer_no: string;
  type: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  status: number;
  applicant_id: number | null;
  remark?: string | null;
  operator_name?: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  type_name?: string;
  status_name?: string;
}

export default function TransferPage() {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [list, setList] = useState<TransferOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TransferOrder>>({});
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [currentTransfer, setCurrentTransfer] = useState<TransferOrder | null>(null);
  const [items, setItems] = useState<Loose[]>([]);

  const STATUS_MAP: Record<number, { label: string; variant: string }> = {
    0: { label: tc('draft'), variant: 'outline' },
    1: { label: tc('pending'), variant: 'secondary' },
    2: { label: t('outbound'), variant: 'default' },
    3: { label: t('inbound'), variant: 'default' },
    4: { label: t('cancelled'), variant: 'destructive' },
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        transferNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/transfer?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  // /api/warehouse/transfer 未支持 sortField / sortDirection，故不开列排序（需后端补排序参数）
  const columns: StandardTableColumn<TransferOrder>[] = [
    {
      key: 'transfer_no',
      title: t('transferNo'),
      width: 120,
      render: (r) => <span className="font-mono text-xs">{r.transfer_no}</span>,
    },
    {
      key: 'type_name',
      title: t('transferType'),
      width: 80,
      render: (r) => <span className="text-xs">{r.type_name || '-'}</span>,
    },
    {
      key: 'from_warehouse_name',
      title: t('sourceWarehouse'),
      render: (r) => <span className="text-xs">{r.from_warehouse_name || '-'}</span>,
    },
    {
      key: 'to_warehouse_name',
      title: t('targetWarehouse'),
      render: (r) => <span className="text-xs">{r.to_warehouse_name || '-'}</span>,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => {
        const st = STATUS_MAP[r.status] || STATUS_MAP[0];
        return (
          <Badge
            variant={st.variant as 'default' | 'secondary' | 'destructive' | 'outline'}
            className="text-xs"
          >
            {st.label}
          </Badge>
        );
      },
    },
    {
      key: 'operator_name',
      title: t('applicant'),
      render: (r) => <span className="text-xs">{r.operator_name || '-'}</span>,
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {[0, 1].includes(r.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => handleAction(r.id, 'cancel')}
            >
              {tc('cancel')}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(r)}>
            <Eye className="h-3 w-3" />
          </Button>
          {[0, 4].includes(r.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 dark:text-red-400"
              onClick={() => handleDelete(r.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = async () => {
    if (!editItem.from_warehouse_id) {
      toast({ title: t('selectSourceWarehouseFirst'), variant: 'destructive' });
      return;
    }
    if (!editItem.to_warehouse_id) {
      toast({ title: t('selectTargetWarehouseFirst'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/warehouse/transfer', {
        method: 'POST',
        body: JSON.stringify({
          type: Number(editItem.type || 2),
          from_warehouse_id: editItem.from_warehouse_id,
          to_warehouse_id: editItem.to_warehouse_id,
          applicant_id: editItem.applicant_id || null,
          remark: editItem.remark || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string) => {
    try {
      const res = await authFetch('/api/warehouse/transfer', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('success') });
        fetchData();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/warehouse/transfer?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: result.message || t('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const openDetail = async (order: TransferOrder) => {
    setCurrentTransfer(order);
    try {
      const res = await authFetch(`/api/warehouse/transfer/${order.id}/items`);
      const result = await res.json();
      if (result.success) {
        setItems(Array.isArray(result.data) ? result.data : result.data?.list || []);
        setShowDetailDialog(true);
      }
    } catch {}
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeroHeader
          icon={ArrowLeftRight}
          title={t('transfer')}
          action={
            <Button onClick={() => { setEditItem({ type: 2 }); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              {t('addTransfer')}
            </Button>
          }
        />

        {/* 搜索区域 */}
        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{tc('orderNo')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tc('searchOrderNo')}
                    className="pl-10"
                    value={searchNo}
                    onChange={(e) => setSearchNo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSearchNo(''); setPage(1); }}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t('reset')}
                </Button>
                <Button onClick={fetchData}>
                  <Search className="h-4 w-4 mr-1" />
                  {t('query')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 列表区域 */}
        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <div className="font-medium">{t('transferList')}</div>
                <div className="text-xs text-muted-foreground">{tc('total', { count: total })}</div>
              </div>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('refresh')}
              </Button>
            </div>
            <StandardTable<TransferOrder>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading}
              onRetry={fetchData}
              emptyText={t('noTransferRecords')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>

        {/* 新增/编辑对话框 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('addTransferOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('transferType')} <span className="text-red-500">*</span></Label>
                <Select
                  value={String(editItem.type || 2)}
                  onValueChange={(v) => setEditItem({ ...editItem, type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('locationTransfer')}</SelectItem>
                    <SelectItem value="2">{t('warehouseTransfer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('sourceWarehouse')} <span className="text-red-500">*</span></Label>
                <WarehouseSelect
                  value={editItem.from_warehouse_id ? String(editItem.from_warehouse_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, from_warehouse_id: Number(v) })}
                  placeholder={t('selectSourceWarehouse')}
                />
              </div>
              <div>
                <Label>{t('targetWarehouse')} <span className="text-red-500">*</span></Label>
                <WarehouseSelect
                  value={editItem.to_warehouse_id ? String(editItem.to_warehouse_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, to_warehouse_id: Number(v) })}
                  placeholder={t('selectTargetWarehouse')}
                />
              </div>
              <div>
                <Label>{t('applicant')}</Label>
                <UserSelect
                  value={editItem.applicant_id ? String(editItem.applicant_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, applicant_id: Number(v) })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>{tc('cancel')}</Button>
              <Button onClick={handleCreate}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 详情对话框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{t('transferDetailTitle', { transferNo: currentTransfer?.transfer_no || '' })}</DialogTitle>
              <DialogDescription>
                {t('transferDetail')}
              </DialogDescription>
            </DialogHeader>
            {currentTransfer && (
              <div className="grid grid-cols-4 gap-4 p-3 border rounded bg-muted/30 text-sm">
                <div><span className="text-muted-foreground">{tc('type')}：</span>{currentTransfer.type_name || '-'}</div>
                <div><span className="text-muted-foreground">{t('sourceWarehouse')}：</span>{currentTransfer.from_warehouse_name || '-'}</div>
                <div><span className="text-muted-foreground">{t('targetWarehouse')}：</span>{currentTransfer.to_warehouse_name || '-'}</div>
                <div><span className="text-muted-foreground">{tc('status')}：</span>
                  <Badge variant={(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).variant as any}>
                    {(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).label}
                  </Badge>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('materialName')}</TableHead>
                  <TableHead>{tc('batchNo')}</TableHead>
                  <TableHead>{t('qtyPlan')}</TableHead>
                  <TableHead>{tc('unit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">{t('noDetailData')}</TableCell>
                  </TableRow>
                ) : items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.material_name || '-'}</TableCell>
                    <TableCell>{item.batch_no || '-'}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity || 0).toLocaleString()}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>{tc('close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
