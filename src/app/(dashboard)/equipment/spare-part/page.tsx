'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { StandardTable, type StandardTableColumn } from '@/components/common';

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
  const [pageSize, setPageSize] = useState(20);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SparePart>>({});
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SparePart[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

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
    const ids = selectedRows.map((r) => r.id);
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
    setSelectedRows([]);
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

  const columns: StandardTableColumn<SparePart>[] = [
    {
      key: 'part_code',
      title: tc('code'),
      dataIndex: 'part_code',
      className: 'font-mono',
      width: 120,
    },
    {
      key: 'part_name',
      title: tc('name'),
      dataIndex: 'part_name',
      width: 150,
    },
    {
      key: 'specification',
      title: tc('specification'),
      dataIndex: 'specification',
      width: 110,
    },
    {
      key: 'unit',
      title: tc('unit'),
      dataIndex: 'unit',
      width: 70,
    },
    {
      key: 'stock_quantity',
      title: tc('stock'),
      dataIndex: 'stock_quantity',
      width: 90,
      align: 'right',
    },
    {
      key: 'safety_stock',
      title: tc('safetyStock'),
      dataIndex: 'safety_stock',
      width: 90,
      align: 'right',
    },
    {
      key: 'unit_price',
      title: tc('unitPrice'),
      dataIndex: 'unit_price',
      width: 100,
      align: 'right',
    },
    {
      key: 'status',
      title: tc('status'),
      width: 80,
      render: (row) => {
        const st = statusMap[row.status] || statusMap[1];
        return <Badge variant={st.variant} className="text-xs">{st.label}</Badge>;
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      width: 140,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={() => openEdit(row)}
          >
            <Edit className="h-3 w-3 mr-1" />
            {tc('edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

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
            {selectedRows.length > 0 && (
              <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} />
            )}
            <StandardTable<SparePart>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              rowSelectable={true}
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              rowKey="id"
              emptyText={tc('noRecords')}
            />
          </CardContent>
        </Card>
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