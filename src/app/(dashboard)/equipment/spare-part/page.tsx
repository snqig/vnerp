'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useRowSelection } from '@/lib/useRowSelection';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
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
import { useTranslations } from 'next-intl';

interface SparePart {
  id: number;
  part_code: string;
  part_name: string;
  specification: string | null;
  unit: string | null;
  stock_quantity: number;
  safety_stock: number;
  supplier_id: number | null;
  unit_price: number;
  location: string | null;
  status: number;
  remark: string | null;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '正常', variant: 'default' },
  2: { label: '停用', variant: 'destructive' },
};

const categoryOptions = ['轴承', '齿轮', '皮带', '密封圈', '传感器', '电路主板', '气缸', '阀', '其他'];

export default function EquipmentSparePartPage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<SparePart[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ totalParts: number; lowStockCount: number; inactiveCount: number }>({ totalParts: 0, lowStockCount: 0, inactiveCount: 0 });
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SparePart>>({});
  const [saving, setSaving] = useState(false);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword: searchKeyword,
        status: filterStatus,
      });
      const res = await authFetch('/api/equipment/spare-part?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setStats(result.data.stats || { totalParts: 0, lowStockCount: 0, inactiveCount: 0 });
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const url = editItem.id ? `/api/equipment/spare-part?id=${editItem.id}` : '/api/equipment/spare-part';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('operationFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDeleteMsg'))) return;
    try {
      const res = await authFetch('/api/equipment/spare-part?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/equipment/spare-part?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++;
        else failMsg = data.message || failMsg;
      } catch {
        failMsg = tc('error');
      }
    }
    if (okCount > 0)
      toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const openAdd = () => {
    setEditItem({});
    setShowDialog(true);
  };

  const openEdit = (item: SparePart) => {
    setEditItem(item);
    setShowDialog(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('k_15hkir8')}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-36 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  <SelectItem value="1">{ts('k_status_active')}</SelectItem>
                  <SelectItem value="2">{ts('k_status_inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleSearch}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_add_spare_part')}
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{tc('total')}</div>
              <div className="text-3xl font-bold mt-1">{stats.totalParts}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{tc('lowStock')}</span>
                <span className="text-red-500 text-xl">!</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-red-600">{stats.lowStockCount}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-gray-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{ts('k_status_inactive')}</span>
                <span className="text-gray-500 text-xl">—</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-gray-600">{stats.inactiveCount}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{tc('category')}</div>
              <div className="text-3xl font-bold mt-1">{categoryOptions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-blue-600"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={tc('selectAll')}
                    />
                  </TableHead>
                  <TableHead className="text-xs">{tc('code')}</TableHead>
                  <TableHead className="text-xs">{tc('name')}</TableHead>
                  <TableHead className="text-xs">{tc('specification')}</TableHead>
                  <TableHead className="text-xs">{tc('unit')}</TableHead>
                  <TableHead className="text-xs">{tc('stock')}</TableHead>
                  <TableHead className="text-xs">{tc('safetyStock')}</TableHead>
                  <TableHead className="text-xs">{tc('unitPrice')}</TableHead>
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
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                          checked={isSelected(String(item.id))}
                          onChange={() => toggle(String(item.id))}
                          aria-label={tc('selectRow', { id: item.id })}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.part_code}</TableCell>
                      <TableCell className="text-xs">{item.part_name}</TableCell>
                      <TableCell className="text-xs">{item.specification || '-'}</TableCell>
                      <TableCell className="text-xs">{item.unit || '-'}</TableCell>
                      <TableCell className="text-xs">{item.stock_quantity}</TableCell>
                      <TableCell className="text-xs">{item.safety_stock}</TableCell>
                      <TableCell className="text-xs">{item.unit_price ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {tc('edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
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
                    <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {ts('k_total_record')}{total}{ts('k_records')}
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
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? tc('edit') : ts('k_add_spare_part')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{tc('name')}</Label>
                <Input
                  value={editItem.part_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, part_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('specification')}</Label>
                <Select
                  value={editItem.specification || ''}
                  onValueChange={(v) => setEditItem({ ...editItem, specification: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('unit')}</Label>
                <Input
                  value={editItem.unit || ''}
                  onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('stock')}</Label>
                <Input
                  type="number"
                  value={editItem.stock_quantity ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, stock_quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('safetyStock')}</Label>
                <Input
                  type="number"
                  value={editItem.safety_stock ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, safety_stock: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('unitPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.unit_price ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, unit_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('location')}</Label>
                <Input
                  value={editItem.location || ''}
                  onChange={(e) => setEditItem({ ...editItem, location: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <Select
                  value={String(editItem.status || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_status_active')}</SelectItem>
                    <SelectItem value="2">{ts('k_status_inactive')}</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button onClick={handleSave} disabled={saving}>
                {tc('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
