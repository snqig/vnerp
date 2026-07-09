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

interface InkMixedRecord {
  id: number;
  record_no: string;
  base_ink_id: number;
  base_ink_code: string;
  base_ink_name: string;
  mix_ratio: string;
  color_name: string;
  color_code: string;
  company_id: number;
  company_name: string;
  mix_time: string;
  operator_id: number;
  operator_name: string;
  quantity: number;
  unit: string;
  warehouse_id: number;
  location_id: number;
  status: number;
  expire_time: string;
  remark: string;
}

const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  1: { label: tc('text_e5qgw'), variant: 'default' },
  2: { label: tc('text_e5jaz'), variant: 'secondary' },
  3: { label: tc('text_ege5m'), variant: 'destructive' },
};

export default function InkMixedPage() {
  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<InkMixedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InkMixedRecord>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        recordNo: searchNo,
        colorName: searchColor,
      });
      const res = await authFetch('/api/dcprint/ink-mixed?' + params);
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
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/dcprint/ink-mixed', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '入库成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      const res = await authFetch('/api/dcprint/ink-mixed?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/dcprint/ink-mixed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '状态更新成功' });
        fetchData();
      }
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('text_rnb4dt')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Input
                placeholder="搜索颜色"
                value={searchColor}
                onChange={(e) => setSearchColor(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({ mix_time: new Date().toISOString().slice(0, 16), unit: 'kg' });
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tc('text_d73pks')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('text_i0myef')}</TableHead>
                  <TableHead className="text-xs">{tc('text_crwtq')}</TableHead>
                  <TableHead className="text-xs">{tc('text_i7d8w6')}</TableHead>
                  <TableHead className="text-xs">{tc('text_guoy62')}</TableHead>
                  <TableHead className="text-xs">{tc('customer')}</TableHead>
                  <TableHead className="text-xs">{tc('quantity')}</TableHead>
                  <TableHead className="text-xs">{tc('text_f5hc9')}</TableHead>
                  <TableHead className="text-xs">{tc('text_i7cmvh')}</TableHead>
                  <TableHead className="text-xs">{tc('text_ikg3cm')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.record_no}</TableCell>
                      <TableCell className="text-xs">
                        {item.base_ink_name || item.base_ink_code || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.mix_ratio || '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          {item.color_code && (
                            <span
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: item.color_code }}
                            />
                          )}
                          {item.color_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.company_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {item.mix_time || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {item.expire_time || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2"
                                onClick={() => handleStatusChange(item.id, 2)}
                              >
                                {tc('text_e5jaz')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-orange-600"
                                onClick={() => handleStatusChange(item.id, 3)}
                              >
                                {tc('text_ege5m')}
                              </Button>
                            </>
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
                    <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                      {tc('text_7va1sv')}
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
            {tc('text_ftebq')}
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
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑调色油墨' : '新增调色油墨入库'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('text_e3uxo1')}</Label>
                <Input
                  value={editItem.base_ink_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, base_ink_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_e421ov')}</Label>
                <Input
                  value={editItem.base_ink_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, base_ink_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_i7d8w6')}</Label>
                <Input
                  value={editItem.mix_ratio || ''}
                  onChange={(e) => setEditItem({ ...editItem, mix_ratio: e.target.value })}
                  placeholder="如: 3:1:0.5"
                />
              </div>
              <div>
                <Label>{tc('text_guoy62')}</Label>
                <Input
                  value={editItem.color_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_guw9b6')}</Label>
                <Input
                  value={editItem.color_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_code: e.target.value })}
                  placeholder="如: #FF5500"
                />
              </div>
              <div>
                <Label>{tc('text_byvcwo')}</Label>
                <Input
                  value={editItem.company_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_i7cmvh')}</Label>
                <Input
                  type="datetime-local"
                  value={editItem.mix_time || ''}
                  onChange={(e) => setEditItem({ ...editItem, mix_time: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_f5hc9')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
              <div>
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.quantity || ''}
                  onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('unit')}</Label>
                <Select
                  value={editItem.unit || 'kg'}
                  onValueChange={(v) => setEditItem({ ...editItem, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('text_ikg3cm')}</Label>
                <Input
                  type="datetime-local"
                  value={editItem.expire_time || ''}
                  onChange={(e) => setEditItem({ ...editItem, expire_time: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
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
