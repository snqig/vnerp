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
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  training_no: string;
  training_name: string;
  training_type: number;
  training_date: string;
  training_hours: number;
  trainer: string;
  training_place: string;
  status: number;
}
const typeMap: Record<number, string> = {
  1: tc('text_bvzj0z'),
  2: tc('text_cykx01'),
  3: tc('text_ieqapn'),
  4: tc('text_g2s6jd'),
  5: tc('text_hk2alr'),
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  0: { label: tc('text_egbo0'), variant: 'outline' },
  1: { label: tc('text_lq5q4'), variant: 'default' },
  2: { label: tc('text_e7hbq'), variant: 'secondary' },
  3: { label: tc('text_e68dg'), variant: 'destructive' },
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
};

export default function TrainingPage() {
  // 翻译钩子
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        trainingName: searchName,
      });
      const res = await authFetch('/api/hr/training?' + params);
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
      const res = await fetch('/api/hr/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: t('operationFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('operationFailed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/hr/training', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('updateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: t('operationFailed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await fetch('/api/hr/training?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: t('operationFailed'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout title={t('trainingManagement')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('trainingManagement')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchTrainingPlaceholder')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
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
              {t('newTraining')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-12 text-center">{tc('serialNo')}</TableHead>
                  <TableHead className="text-xs">{tc('trainingNo')}</TableHead>
                  <TableHead className="text-xs">{tc('trainingName')}</TableHead>
                  <TableHead className="text-xs">{tc('trainingType')}</TableHead>
                  <TableHead className="text-xs">{tc('trainingDate')}</TableHead>
                  <TableHead className="text-xs">{tc('hours')}</TableHead>
                  <TableHead className="text-xs">{tc('trainer')}</TableHead>
                  <TableHead className="text-xs">{tc('location')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item, index) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-center text-muted-foreground">
                        {(page - 1) * 20 + index + 1}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.training_no}</TableCell>
                      <TableCell className="text-xs">{item.training_name}</TableCell>
                      <TableCell className="text-xs">
                        {typeMap[item.training_type] || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(item.training_date)}</TableCell>
                      <TableCell className="text-xs">{item.training_hours || '-'}h</TableCell>
                      <TableCell className="text-xs">{item.trainer || '-'}</TableCell>
                      <TableCell className="text-xs">{item.training_place || '-'}</TableCell>
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
                              {tc('start')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3)}
                            >
                              {tc('complete')}
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
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tc('totalRecords', { count: total })}
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
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addTrainingTitle')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('trainingName')}</Label>
                <Input
                  value={editItem.training_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, training_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('trainingType')}</Label>
                <Select
                  value={String(editItem.training_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, training_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('safetyTraining')}</SelectItem>
                    <SelectItem value="2">{tc('skillTraining')}</SelectItem>
                    <SelectItem value="3">{tc('qualityTraining')}</SelectItem>
                    <SelectItem value="4">{tc('managementTraining')}</SelectItem>
                    <SelectItem value="5">{tc('newEmployeeTraining')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('trainingDate')}</Label>
                <Input
                  type="date"
                  value={editItem.training_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, training_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('hours')}</Label>
                <Input
                  type="number"
                  value={editItem.training_hours ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, training_hours: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{tc('trainer')}</Label>
                <Input
                  value={editItem.trainer || ''}
                  onChange={(e) => setEditItem({ ...editItem, trainer: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('location')}</Label>
                <Input
                  value={editItem.training_place || ''}
                  onChange={(e) => setEditItem({ ...editItem, training_place: e.target.value })}
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
