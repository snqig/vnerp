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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  handle_no: string;
  material_code: string;
  material_name: string;
  unqualified_qty: number;
  handle_type: number;
  handle_status: number;
  responsible_dept: string;
  responsible_person: string;
}
const typeMap: Record<number, string> = {
  1: 'rework',
  2: 'repair',
  3: 'concessionAccept',
  4: 'return',
  5: 'scrap',
};

export default function UnqualifiedPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: 'pending', variant: 'outline' },
    2: { label: 'processing', variant: 'default' },
    3: { label: 'completed', variant: 'secondary' },
    4: { label: tc('closed'), variant: 'destructive' },
  };

  const exportColumns = [
    { key: 'handle_no', header: t('handleNo') },
    { key: 'material_code', header: tc('materialCode') },
    { key: 'material_name', header: tc('materialName') },
    { key: 'unqualified_qty', header: t('unqualifiedQty') },
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
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(list, 'handle_no');

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
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/unqualified', {
        method,
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, handle_status: number) => {
    try {
      const res = await fetch('/api/quality/unqualified', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, handle_status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      }
    } catch (e) {
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
      }
    } catch (e) {
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
                placeholder={tc("searchOrderNo")}
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
              {t('addHandleOrder')}
            </Button>
            <TableExportToolbar
              selectedCount={selectedIds.length}
              totalCount={displayList.length}
              onSelectAll={() => setSelectedIds(displayList.map((i) => i.id))}
              onDeselectAll={() => setSelectedIds([])}
              onPrint={() => {}}
              onExportPDF={() =>
                exportTableToPDF(displayList, t('unqualifiedProductReport'), exportColumns, t('unqualifiedProductReport'))
              }
              onExportXLS={() => exportTableToXLS(displayList, t('unqualifiedProductReport'), exportColumns)}
              onExportWORD={() =>
                exportTableToWORD(
                  displayList,
                  t('unqualifiedProductReport'),
                  exportColumns,
                  t('unqualifiedProductReport')
                )
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
                  <TableHead className="text-xs w-12 text-center">{tc("serialNo")}</TableHead>
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
                    <span className="text-xs">{tc("status")}</span>
                  </SortableTableHeader>
                  <TableHead className="text-xs">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((item, index) => {
                  const st = statusMap[item.handle_status] || statusMap[1];
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
                      <TableCell className="text-xs font-mono">{item.handle_no}</TableCell>
                      <TableCell className="text-xs">{item.material_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.unqualified_qty}</TableCell>
                      <TableCell className="text-xs">{t(typeMap[item.handle_type] || '-')}</TableCell>
                      <TableCell className="text-xs">{item.responsible_dept || '-'}</TableCell>
                      <TableCell className="text-xs">{item.responsible_person || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {t(st.label)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.handle_status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 2)}
                            >
                              {t('startHandle')}
                            </Button>
                          )}
                          {item.handle_status === 2 && (
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
          <span className="text-sm text-muted-foreground">{tc('totalRecords', { count: total })}</span>
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
              <DialogTitle>{editItem.id ? t('editUnqualifiedOrder') : t('addUnqualifiedOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>{t('unqualifiedQty')}</Label>
                <Input
                  type="number"
                  value={editItem.unqualified_qty || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, unqualified_qty: Number(e.target.value) })
                  }
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
                    <SelectItem value="2">{t('repair')}</SelectItem>
                    <SelectItem value="3">{t('concessionAccept')}</SelectItem>
                    <SelectItem value="4">{tc("returnOrder")}</SelectItem>
                    <SelectItem value="5">{tc("discard")}</SelectItem>
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
                  onChange={(e) => setEditItem({ ...editItem, responsible_person: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
