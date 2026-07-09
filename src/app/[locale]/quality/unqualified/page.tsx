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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  unqualified_no: string;
  handle_no: string | null;
  inspection_id: number | null;
  source_type: string | null;
  source_no: string | null;
  material_id: number | null;
  material_code: string | null;
  material_name: string | null;
  quantity: number;
  defect_type: string | null;
  defect_desc: string | null;
  handle_type: number | null;
  handle_status: number;
  handle_result: number | null;
  responsible_dept: string | null;
  responsible_person: string | null;
  cost_amount: number | null;
  handler: string | null;
  handle_date: string | null;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
}

// 处理方式映射（DB 码：1-返工, 2-报废, 3-让步接收, 4-退货）
const typeMap: Record<number, string> = {
  1: 'rework',
  2: 'scrap',
  3: 'concessionAccept',
  4: 'return',
};

type ActionMode = 'create' | 'start' | 'complete';

export default function UnqualifiedPage() {
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: 'pending', variant: 'outline' },
    2: { label: 'processing', variant: 'default' },
    3: { label: 'completed', variant: 'secondary' },
  };

  const exportColumns = [
    { key: 'handle_no', header: t('handleNo') },
    { key: 'material_code', header: tc('materialCode') },
    { key: 'material_name', header: tc('materialName') },
    { key: 'quantity', header: t('unqualifiedQty') },
    { key: 'handle_type', header: t('handlingMethod') },
    { key: 'responsible_dept', header: t('responsibleDept') },
    { key: 'responsible_person', header: t('responsiblePerson') },
    { key: 'handle_status', header: tc('status') },
  ];

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>('create');
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(list, 'handle_no');

  // start/complete 表单状态
  const [startForm, setStartForm] = useState({
    handle_type: 1,
    responsible_dept: '',
    responsible_person: '',
  });
  const [completeForm, setCompleteForm] = useState({
    handler: '',
    handle_result: 1,
    cost_amount: 0,
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        handleNo: searchNo,
      });
      const res = await authFetch('/api/quality/unqualified?' + params);
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

  const openCreateDialog = () => {
    setActionMode('create');
    setEditItem({});
    setShowDialog(true);
  };

  const openStartDialog = (item: Item) => {
    setActionMode('start');
    setEditItem(item);
    setStartForm({
      handle_type: item.handle_type || 1,
      responsible_dept: item.responsible_dept || '',
      responsible_person: item.responsible_person || '',
    });
    setShowDialog(true);
  };

  const openCompleteDialog = (item: Item) => {
    setActionMode('complete');
    setEditItem(item);
    setCompleteForm({
      handler: item.handler || '',
      handle_result: item.handle_result || 1,
      cost_amount: item.cost_amount || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (actionMode === 'create') {
        const payload: Record<string, unknown> = {
          inspection_id: editItem.inspection_id,
          source_type: editItem.source_type,
          source_no: editItem.source_no,
          material_id: editItem.material_id,
          material_code: editItem.material_code,
          material_name: editItem.material_name,
          quantity: editItem.quantity,
          defect_type: editItem.defect_type,
          defect_desc: editItem.defect_desc,
          handle_type: editItem.handle_type,
          responsible_dept: editItem.responsible_dept,
          responsible_person: editItem.responsible_person,
          remark: editItem.remark,
        };
        const res = await authFetch('/api/quality/unqualified', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('createSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      } else if (actionMode === 'start') {
        const res = await authFetch('/api/quality/unqualified', {
          method: 'PUT',
          body: JSON.stringify({
            action: 'start',
            id: editItem.id,
            handle_type: ['rework', 'scrap', 'concession', 'return'][startForm.handle_type - 1],
            responsible_dept: startForm.responsible_dept,
            responsible_person: startForm.responsible_person,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('updateSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      } else if (actionMode === 'complete') {
        const res = await authFetch('/api/quality/unqualified', {
          method: 'PUT',
          body: JSON.stringify({
            action: 'complete',
            id: editItem.id,
            handler: completeForm.handler,
            handle_result: completeForm.handle_result,
            cost_amount: completeForm.cost_amount,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('updateSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/quality/unqualified?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const displayList = sortedData;

  return (
    <MainLayout title={t('unqualifiedProductHandling')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('unqualifiedProductHandling')}</h1>
          <div className="flex gap-2 items-center">
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
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t('addHandleOrder')}
            </Button>
            <GlobalExportToolbar
              filename="不合格品处理单"
              title="不合格品处理单"
              columns={[
                { key: 'handle_no', label: t('handleNo'), width: 18 },
                { key: 'material_code', label: tc('materialCode'), width: 15 },
                { key: 'material_name', label: tc('materialName'), width: 20 },
                { key: 'quantity', label: t('unqualifiedQty'), width: 10 },
                {
                  key: 'handle_type',
                  label: t('handlingMethod'),
                  width: 12,
                  formatter: (v) => (v ? t(typeMap[v] || '-') : '-'),
                },
                { key: 'responsible_dept', label: t('responsibleDept'), width: 12 },
                { key: 'responsible_person', label: t('responsiblePerson'), width: 12 },
                {
                  key: 'handle_status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => t(statusMap[v]?.label || '-'),
                },
              ]}
              data={
                selectedIds.length > 0
                  ? displayList.filter((i) => selectedIds.includes(i.id))
                  : displayList
              }
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === displayList.length && displayList.length > 0}
                      onCheckedChange={() =>
                        setSelectedIds(
                          selectedIds.length === displayList.length
                            ? []
                            : displayList.map((i) => i.id)
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs w-12 text-center">{tc('serialNo')}</TableHead>
                  <SortableTableHeader
                    field="handle_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    <span className="text-xs">{t('handleNo')}</span>
                  </SortableTableHeader>
                  <TableHead className="text-xs">{tc('materialCode')}</TableHead>
                  <SortableTableHeader
                    field="material_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    <span className="text-xs">{tc('materialName')}</span>
                  </SortableTableHeader>
                  <TableHead className="text-xs">{t('unqualifiedQty')}</TableHead>
                  <TableHead className="text-xs">{t('handlingMethod')}</TableHead>
                  <TableHead className="text-xs">{t('responsibleDept')}</TableHead>
                  <TableHead className="text-xs">{t('responsiblePerson')}</TableHead>
                  <SortableTableHeader
                    field="handle_status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    <span className="text-xs">{tc('status')}</span>
                  </SortableTableHeader>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((item, index) => {
                  const st = statusMap[item.handle_status] || statusMap[1];
                  const canStart = item.handle_status === 1;
                  const canComplete = item.handle_status === 2;
                  const canDelete = item.handle_status === 1;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((i) => i !== item.id)
                                : [...prev, item.id]
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-center text-muted-foreground">
                        {(page - 1) * 20 + index + 1}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.handle_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.material_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-xs">
                        {item.handle_type ? t(typeMap[item.handle_type] || '-') : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.responsible_dept || '-'}</TableCell>
                      <TableCell className="text-xs">{item.responsible_person || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {t(st.label)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canStart && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openStartDialog(item)}
                            >
                              {t('startHandle')}
                            </Button>
                          )}
                          {canComplete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openCompleteDialog(item)}
                            >
                              {tc('complete')}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {displayList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
              <DialogTitle>
                {actionMode === 'create' && t('addUnqualifiedOrder')}
                {actionMode === 'start' && t('startHandle')}
                {actionMode === 'complete' && tc('complete')}
              </DialogTitle>
            </DialogHeader>
            {actionMode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('inspectionId') || 'Inspection ID'} *</Label>
                  <Input
                    type="number"
                    value={editItem.inspection_id || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, inspection_id: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>{tc('materialCode')}</Label>
                  <Input
                    value={editItem.material_code || ''}
                    onChange={(e) => setEditItem({ ...editItem, material_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{tc('materialName')}</Label>
                  <Input
                    value={editItem.material_name || ''}
                    onChange={(e) => setEditItem({ ...editItem, material_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('unqualifiedQty')} *</Label>
                  <Input
                    type="number"
                    value={editItem.quantity || ''}
                    onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('handlingMethod')}</Label>
                  <Select
                    value={String(editItem.handle_type || 1)}
                    onValueChange={(v) => setEditItem({ ...editItem, handle_type: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('rework')}</SelectItem>
                      <SelectItem value="2">{tc('discard')}</SelectItem>
                      <SelectItem value="3">{t('concessionAccept')}</SelectItem>
                      <SelectItem value="4">{tc('returnOrder')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('responsibleDept')}</Label>
                  <Input
                    value={editItem.responsible_dept || ''}
                    onChange={(e) => setEditItem({ ...editItem, responsible_dept: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('responsiblePerson')}</Label>
                  <Input
                    value={editItem.responsible_person || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, responsible_person: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {actionMode === 'start' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>{t('handlingMethod')} *</Label>
                  <Select
                    value={String(startForm.handle_type)}
                    onValueChange={(v) => setStartForm({ ...startForm, handle_type: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('rework')}</SelectItem>
                      <SelectItem value="2">{tc('discard')}</SelectItem>
                      <SelectItem value="3">{t('concessionAccept')}</SelectItem>
                      <SelectItem value="4">{tc('returnOrder')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('responsibleDept')} *</Label>
                  <Input
                    value={startForm.responsible_dept}
                    onChange={(e) =>
                      setStartForm({ ...startForm, responsible_dept: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{t('responsiblePerson')} *</Label>
                  <Input
                    value={startForm.responsible_person}
                    onChange={(e) =>
                      setStartForm({ ...startForm, responsible_person: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {actionMode === 'complete' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>{t('handler') || 'Handler'} *</Label>
                  <Input
                    value={completeForm.handler}
                    onChange={(e) => setCompleteForm({ ...completeForm, handler: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('handleResult') || 'Result'} *</Label>
                  <Select
                    value={String(completeForm.handle_result)}
                    onValueChange={(v) =>
                      setCompleteForm({ ...completeForm, handle_result: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{tc('qualified') || 'Qualified'}</SelectItem>
                      <SelectItem value="2">{tc('unqualified') || 'Unqualified'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('costAmount') || 'Cost Amount'} *</Label>
                  <Input
                    type="number"
                    value={completeForm.cost_amount}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, cost_amount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
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
