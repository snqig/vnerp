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
  1: tc('text_nld3bh'),
  2: tc('text_dehxv5'),
  3: tc('text_g6yorc'),
};

export default function EquipmentRepairPage() {
  // 翻译钩子
  const t = useTranslations('Equipment');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: '待维修', variant: 'outline' },
    2: { label: '维修中', variant: 'default' },
    3: { label: '已完成', variant: 'secondary' },
    4: { label: tc('closed'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

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
        toast({ title: '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
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
        toast({ title: '更新成功' });
        fetchData();
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch('/api/equipment/repair?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('text_i061qb')}</h1>
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
              {tc('text_gvv3wz')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('text_gck5do')}</TableHead>
                  <TableHead className="text-xs">{tc('text_i06agk')}</TableHead>
                  <TableHead className="text-xs">{tc('text_hzyzbg')}</TableHead>
                  <TableHead className="text-xs">{tc('text_dedt01')}</TableHead>
                  <TableHead className="text-xs">{tc('text_dedoag')}</TableHead>
                  <TableHead className="text-xs">{tc('text_gcr622')}</TableHead>
                  <TableHead className="text-xs">{tc('text_izg5c')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
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
                              {tc('text_cd4fb9')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3)}
                            >
                              {tc('text_g3yc')}
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
                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                      {tc('text_dd1mmb')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {tc('text_g35')}
            {total}
            {tc('text_kf5')}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('text_btlof')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('text_btmf4')}
            </Button>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{tc('text_gvv3wz')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('text_i06agk')}</Label>
                <Input
                  value={editItem.equipment_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_hzyzbg')}</Label>
                <Input
                  value={editItem.equipment_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_dedt01')}</Label>
                <Input
                  type="date"
                  value={editItem.fault_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, fault_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_gcr622')}</Label>
                <Select
                  value={String(editItem.repair_type || 2)}
                  onValueChange={(v) => setEditItem({ ...editItem, repair_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('text_nld3bh')}</SelectItem>
                    <SelectItem value="2">{tc('text_dehxv5')}</SelectItem>
                    <SelectItem value="3">{tc('text_g6yorc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('text_izg5c')}</Label>
                <UserSelect
                  value={editItem.repair_person || ''}
                  onChange={(v) => setEditItem({ ...editItem, repair_person: v })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('text_dedoag')}</Label>
                <Input
                  value={editItem.fault_desc || ''}
                  onChange={(e) => setEditItem({ ...editItem, fault_desc: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
