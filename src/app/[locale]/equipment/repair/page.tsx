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
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  repair_no: string;
  equipment_code: string;
  equipment_name: string;
  fault_date: string;
  fault_desc: string;
  repair_type: number;
  repair_person: string;
  status: number;
}
const typeMap: Record<number, string> = {
  1: '预防性维修',
  2: '故障维修',
  3: '紧急维修',
};

export default function EquipmentRepairPage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: ts('k_kv3w6u'), variant: 'outline' },
    2: { label: ts('k_1jvastq'), variant: 'default' },
    3: { label: ts('k_19j4h'), variant: 'secondary' },
    4: { label: tc('closed'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        repairNo: searchNo,
      });
      const res = await authFetch('/api/equipment/repair?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/equipment/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({
          title: tc('operationFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/equipment/repair', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDeleteMsg'))) return;
    try {
      const res = await authFetch('/api/equipment/repair?id=' + id, { method: 'DELETE' });
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
        const res = await authFetch(`/api/equipment/repair?id=${id}`, { method: 'DELETE' });
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

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('k_15hkir8')}</h1>
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
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_1f62jlo')}</Button>
          </div>
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
                  <TableHead className="text-xs">{ts('k_1j82wwz')}</TableHead>
                  <TableHead className="text-xs">{ts('k_17s4qyf')}</TableHead>
                  <TableHead className="text-xs">{ts('k_eb1q6f')}</TableHead>
                  <TableHead className="text-xs">{ts('k_3s4z78')}</TableHead>
                  <TableHead className="text-xs">{ts('k_784d9f')}</TableHead>
                  <TableHead className="text-xs">{ts('k_1migccd')}</TableHead>
                  <TableHead className="text-xs">{ts('k_gquu0n')}</TableHead>
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
                      <TableCell className="text-xs font-mono">{item.repair_no}</TableCell>
                      <TableCell className="text-xs">{item.equipment_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.equipment_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.fault_date || '-'}</TableCell>
                      <TableCell className="text-xs max-w-32 truncate">
                        {item.fault_desc || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{typeMap[item.repair_type] || '-'}</TableCell>
                      <TableCell className="text-xs">{item.repair_person || '-'}</TableCell>
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
                              onClick={() => handleStatusChange(item.id, 2)}
                            >
                              {ts('k_r6qw02')}</Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3)}
                            >
                              {ts('k_8cfjmp')}</Button>
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
                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                      {tc('noRecords')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{ts('k_1vsm2qk')}{total}{ts('k_1rfm5gs')}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}</Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}</Button>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{ts('k_1f62jlo')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ts('k_17s4qyf')}</Label>
                <Input
                  value={editItem.equipment_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_eb1q6f')}</Label>
                <Input
                  value={editItem.equipment_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_3s4z78')}</Label>
                <Input
                  type="date"
                  value={editItem.fault_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, fault_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1migccd')}</Label>
                <Select
                  value={String(editItem.repair_type || 2)}
                  onValueChange={(v) => setEditItem({ ...editItem, repair_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_1s9r742')}</SelectItem>
                    <SelectItem value="2">{ts('k_4ebikq')}</SelectItem>
                    <SelectItem value="3">{ts('k_xa2tkr')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_gquu0n')}</Label>
                <UserSelect
                  value={editItem.repair_person || ''}
                  onChange={(v) => setEditItem({ ...editItem, repair_person: v })}
                />
              </div>
              <div className="col-span-2">
                <Label>{ts('k_784d9f')}</Label>
                <Input
                  value={editItem.fault_desc || ''}
                  onChange={(e) => setEditItem({ ...editItem, fault_desc: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
