'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

interface Item {
  id: number;
  adjust_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  adjust_date: string;
  adjust_type: number;
  status: number;
  operator_name: string;
  remark: string;
}

export default function StockAdjustPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: t('completed'), variant: 'secondary' },
    4: { label: t('cancelled'), variant: 'destructive' },
  };
  const typeMap: Record<number, string> = { 1: t('surplus'), 2: t('deficit'), 3: t('otherAdjust') };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const exportColumns = [
    { key: t('adjustNo'), header: t('adjustNo') },
    { key: t('warehouse'), header: t('warehouse') },
    { key: t('adjustDate'), header: t('adjustDate') },
    { key: t('adjustType'), header: t('adjustType') },
    { key: t('operator'), header: t('operator') },
    { key: tc('status'), header: tc('status') },
  ];
  const getExportData = () =>
    list.map((item) => ({
      [t('adjustNo')]: item.adjust_no,
      [t('warehouse')]: item.warehouse_name || '-',
      [t('adjustDate')]: item.adjust_date || '-',
      [t('adjustType')]: typeMap[item.adjust_type] || '-',
      [t('operator')]: item.operator_name || '-',
      [tc('status')]: statusMap[item.status]?.label || '-',
    }));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        adjustNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/stock-adjust?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=1&all=true');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch {}
  };
  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/stock-adjust', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number, expectedStatus: number) => {
    try {
      const res = await authFetch('/api/warehouse/stock-adjust', {
        method: 'PUT',
        body: JSON.stringify({ id, status, expectedStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      } else if (res.status === 409) {
        // 乐观锁冲突：状态已被其他操作变更
        toast({
          title: tc('failed'),
          description: result.message || '并发冲突，请刷新后重试',
          variant: 'destructive',
        });
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/warehouse/stock-adjust?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('adjustDeleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('stockAdjustTitle')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <GlobalExportToolbar
              filename="库存调整"
              title="库存调整"
              columns={[
                { key: 'adjust_no', label: t('adjustNo'), width: 18 },
                {
                  key: 'warehouse_name',
                  label: t('warehouse'),
                  width: 15,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'adjust_date',
                  label: t('adjustDate'),
                  width: 12,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'adjust_type',
                  label: t('adjustType'),
                  width: 12,
                  formatter: (v) => typeMap[v] || '-',
                },
                {
                  key: 'operator_name',
                  label: t('operator'),
                  width: 12,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => statusMap[v]?.label || '-',
                },
              ]}
              data={selectedIds.size > 0 ? list.filter((i) => selectedIds.has(i.id)) : list}
            />
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addAdjust')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === list.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(list.map((i) => i.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-xs">{t('adjustNo')}</TableHead>
                  <TableHead className="text-xs">{tc('warehouse')}</TableHead>
                  <TableHead className="text-xs">{t('adjustDate')}</TableHead>
                  <TableHead className="text-xs">{t('adjustType')}</TableHead>
                  <TableHead className="text-xs">{t('operator')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds);
                            if (checked) next.add(item.id);
                            else next.delete(item.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.adjust_no}</TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.adjust_date || '-'}</TableCell>
                      <TableCell className="text-xs">{typeMap[item.adjust_type] || '-'}</TableCell>
                      <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 2, item.status)}
                            >
                              {tc('audit')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3, item.status)}
                            >
                              {t('complete')}
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
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('noStockAdjustRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{tc('total', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('previousPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addAdjustOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('warehouse')}</Label>
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
                    <SelectValue placeholder={t('warehousePlaceholder')} />
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
                <Label>{t('adjustDateLabel')}</Label>
                <Input
                  type="date"
                  value={editItem.adjust_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, adjust_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('adjustTypeLabel')}</Label>
                <Select
                  value={String(editItem.adjust_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, adjust_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('surplus')}</SelectItem>
                    <SelectItem value="2">{t('deficit')}</SelectItem>
                    <SelectItem value="3">{t('otherAdjust')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('operator')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
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
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
