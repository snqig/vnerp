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
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface DocumentRecord {
  id: number;
  equipment_id: number | null;
  equipment_code: string | null;
  equipment_name: string | null;
  doc_type: string | null;
  doc_name: string;
  doc_no: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  remark: string | null;
  create_time: string;
  _file?: File | null;
}

const docTypeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  manual: { label: '说明书', variant: 'default' },
  certificate: { label: '合格证', variant: 'outline' },
  warranty: { label: '保修卡', variant: 'outline' },
  'repair-log': { label: '维修记录', variant: 'secondary' },
  'calibration-cert': { label: '检定证书', variant: 'outline' },
  other: { label: '其他', variant: 'secondary' },
};

export default function EquipmentDocumentPage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<DocumentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ typeStats: Record<string, number> }>({ typeStats: {} });
  const [page, setPage] = useState(1);
  const [filterEquipmentId, setFilterEquipmentId] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DocumentRecord>>({});
  const [saving, setSaving] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ id: number; equipment_code: string; equipment_name: string }>>([]);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        equipmentId: filterEquipmentId,
        docType: filterDocType,
      });
      const res = await authFetch('/api/equipment/document?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setStats(result.data.stats || { typeStats: {} });
      }
    } catch {}
  };

  const fetchEquipmentOptions = async () => {
    try {
      const res = await authFetch('/api/equipment?page=1&pageSize=1000');
      const result = await res.json();
      if (result.success) {
        setEquipmentOptions(
          (result.data.list || []).map((e: any) => ({
            id: e.id,
            equipment_code: e.equipment_code,
            equipment_name: e.equipment_name,
          }))
        );
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    fetchEquipmentOptions();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (editItem.id) {
        res = await authFetch(`/api/equipment/document?id=${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editItem.id, docType: editItem.doc_type, docName: editItem.doc_name, docNo: editItem.doc_no, remark: editItem.remark }),
        });
      } else {
        const form = new FormData();
        form.append('equipmentId', String(editItem.equipment_id || ''));
        form.append('docType', editItem.doc_type || '');
        form.append('docName', editItem.doc_name || '');
        form.append('docNo', editItem.doc_no || '');
        form.append('remark', editItem.remark || '');
        if (editItem._file) {
          form.append('file', editItem._file);
        }
        res = await authFetch('/api/equipment/document', {
          method: 'POST',
          body: form,
        });
      }
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
      const res = await authFetch('/api/equipment/document?id=' + id, { method: 'DELETE' });
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
        const res = await authFetch(`/api/equipment/document?id=${id}`, { method: 'DELETE' });
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

  const openEdit = (item: DocumentRecord) => {
    setEditItem({ ...item });
    setShowDialog(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('k_16d942o')}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Select value={filterEquipmentId} onValueChange={setFilterEquipmentId}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder={tc('equipment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  {equipmentOptions.map((eq) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>
                      {eq.equipment_code} - {eq.equipment_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDocType} onValueChange={setFilterDocType}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={tc('docType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  {Object.entries(docTypeMap).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleSearch}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_upload_document')}
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{tc('total')}</div>
              <div className="text-3xl font-bold mt-1">{total}</div>
            </CardContent>
          </Card>
          {Object.entries(docTypeMap).map(([key, val]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 truncate">{val.label}</div>
                <div className="text-3xl font-bold mt-1 text-blue-600">{stats.typeStats[key] || 0}</div>
              </CardContent>
            </Card>
          ))}
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
                  <TableHead className="text-xs">{tc('docNo')}</TableHead>
                  <TableHead className="text-xs">{tc('equipment')}</TableHead>
                  <TableHead className="text-xs">{tc('docType')}</TableHead>
                  <TableHead className="text-xs">{tc('docName')}</TableHead>
                  <TableHead className="text-xs">{tc('fileName')}</TableHead>
                  <TableHead className="text-xs">{tc('createTime')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const dt = docTypeMap[item.doc_type || ''] || docTypeMap['other'];
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
                      <TableCell className="text-xs font-mono">{item.doc_no || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {item.equipment_code ? `${item.equipment_code} - ${item.equipment_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dt.variant} className="text-xs">
                          {dt.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.doc_name}</TableCell>
                      <TableCell className="text-xs max-w-32 truncate">{item.file_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.create_time?.slice(0, 16) || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.file_path && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => window.open(item.file_path!, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              {tc('download')}
                            </Button>
                          )}
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
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
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
            {tc('totalRecord')}{total}{tc('records')}
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
          <DialogContent className="max-w-xl" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? tc('edit') : ts('k_upload_document')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{tc('equipment')} *</Label>
                <Select
                  value={String(editItem.equipment_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, equipment_id: v ? Number(v) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentOptions.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.equipment_code} - {eq.equipment_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('docType')} *</Label>
                <Select
                  value={editItem.doc_type || ''}
                  onValueChange={(v) => setEditItem({ ...editItem, doc_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(docTypeMap).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('docNo')}</Label>
                <Input
                  value={editItem.doc_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, doc_no: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('docName')} *</Label>
                <Input
                  value={editItem.doc_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, doc_name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('fileName')}</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setEditItem({ ...editItem, _file: e.target.files?.[0] })}
                />
                <p className="text-xs text-gray-500 mt-1">{tc('supportFileType')}</p>
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
