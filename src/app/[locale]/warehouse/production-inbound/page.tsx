'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { PageHeader, StatusBadge, usePaginatedList } from '@/components/common';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  inbound_no: string;
  work_order_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  inbound_date: string;
  qc_status: number;
  status: number;
  operator_name: string;
  remark?: string;
}

export default function ProductionInboundPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const statusMap = {
    1: { label: tc('pendingInbound'), variant: 'outline' as const },
    2: { label: tc('received'), variant: 'default' as const },
    3: { label: tc('cancelled'), variant: 'destructive' as const },
  };
  const qcMap = {
    0: { label: tc('qcUnchecked'), variant: 'secondary' as const },
    1: { label: tc('qcQualified'), variant: 'default' as const },
    2: { label: tc('qcUnqualified'), variant: 'destructive' as const },
  };

  const { toast } = useToast();
  const { list, total, page, setPage, search, setSearch, refresh } = usePaginatedList<Item>({
    fetchUrl: '/api/warehouse/production-inbound',
    searchKey: 'inboundNo',
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);

  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=1&all=true');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/production-inbound', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '创建成功' });
        setShowDialog(false);
        refresh();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/warehouse/production-inbound', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '更新成功' });
        refresh();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch('/api/warehouse/production-inbound?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        refresh();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('productionInbound')}
          actions={
            <>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={tc("searchOrderNo")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={refresh}>
                  <Search className="h-3 w-3" />
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditItem({});
                  setShowDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                新增入库
              </Button>
            </>
          }
        />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">入库单号</TableHead>
                  <TableHead className="text-xs">工单号</TableHead>
                  <TableHead className="text-xs">{tc("warehouse")}</TableHead>
                  <TableHead className="text-xs">入库日期</TableHead>
                  <TableHead className="text-xs">质检状态</TableHead>
                  <TableHead className="text-xs">操作人</TableHead>
                  <TableHead className="text-xs">{tc("status")}</TableHead>
                  <TableHead className="text-xs">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-mono">{item.inbound_no}</TableCell>
                    <TableCell className="text-xs">{item.work_order_no || '-'}</TableCell>
                    <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                    <TableCell className="text-xs">{item.inbound_date || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.qc_status} statusMap={qcMap} />
                    </TableCell>
                    <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} statusMap={statusMap} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.status === 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => handleStatusChange(item.id, 2)}
                          >
                            确认入库
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
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
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      暂无记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tc('total', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {tc('previousPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addInboundOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc("warehouse")}</Label>
                <Select
                  value={String(editItem.warehouse_id || '')}
                  onValueChange={(v) => {
                    const wh = warehouses.find((w) => w.id === Number(v));
                    setEditItem({
                      ...editItem,
                      warehouse_id: Number(v),
                      warehouse_name: wh?.name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>入库日期</Label>
                <Input
                  type="date"
                  value={editItem.inbound_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, inbound_date: e.target.value })}
                />
              </div>
              <div>
                <Label>工单号</Label>
                <Input
                  value={editItem.work_order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, work_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>操作人</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
