'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState, useCallback } from 'react';
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
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StandardTable, StandardTableColumn } from '@/components/common';

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
  const pageSize = 20;
  const [filterEquipmentId, setFilterEquipmentId] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DocumentRecord>>({});
  const [saving, setSaving] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ id: number; equipment_code: string; equipment_name: string }>>([]);
  const [selectedRows, setSelectedRows] = useState<DocumentRecord[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
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
  }, [page, filterEquipmentId, filterDocType]);

  const fetchEquipmentOptions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchEquipmentOptions();
  }, [fetchEquipmentOptions]);

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
    const ids = selectedRows.map(r => r.id);
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

  const openEdit = (item: DocumentRecord) => {
    setEditItem({ ...item });
    setShowDialog(true);
  };

  const columns: StandardTableColumn<DocumentRecord>[] = [
    {
      key: 'docNo',
      title: tc('docNo'),
      dataIndex: 'doc_no',
      width: 100,
    },
    {
      key: 'equipment',
      title: tc('equipment'),
      render: (row) => row.equipment_code ? `${row.equipment_code} - ${row.equipment_name}` : '-',
      width: 180,
    },
    {
      key: 'docType',
      title: tc('docType'),
      render: (row) => {
        const dt = docTypeMap[row.doc_type || ''] || docTypeMap['other'];
        return <Badge variant={dt.variant} className="text-xs">{dt.label}</Badge>;
      },
      width: 100,
    },
    {
      key: 'docName',
      title: tc('docName'),
      dataIndex: 'doc_name',
      width: 150,
    },
    {
      key: 'fileName',
      title: tc('fileName'),
      dataIndex: 'file_name',
      width: 150,
    },
    {
      key: 'createTime',
      title: tc('createTime'),
      render: (row) => row.create_time?.slice(0, 16) || '-',
      width: 140,
    },
    {
      key: 'actions',
      title: tc('actions'),
      render: (row) => (
        <div className="flex gap-1">
          {row.file_path && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => window.open(row.file_path!, '_blank')}
            >
              <Download className="h-3 w-3 mr-1" />
              {tc('download')}
            </Button>
          )}
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
      width: 180,
      align: 'right',
    },
  ];

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
            {selectedRows.length > 0 && (
              <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} />
            )}
            <StandardTable<DocumentRecord>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              rowSelectable={true}
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              rowKey="id"
              loading={list.length === 0 && total > 0}
              emptyText={tc('noRecords')}
              showPagination={total > pageSize}
            />
          </CardContent>
        </Card>
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