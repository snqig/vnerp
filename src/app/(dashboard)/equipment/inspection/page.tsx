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

interface InspectionRecord {
  id: number;
  inspection_no: string;
  equipment_id: number | null;
  equipment_code: string | null;
  equipment_name: string | null;
  inspection_type: number | null;
  inspection_date: string;
  inspector_name: string | null;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
  noise_level: number | null;
  oil_level: number | null;
  belt_tension: number | null;
  result: number | null;
  abnormal_desc: string | null;
  handling_advice: string | null;
  status: number;
  remark: string | null;
  create_time: string;
}

const resultMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '正常', variant: 'default' },
  2: { label: '异常', variant: 'destructive' },
};

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待点检', variant: 'outline' },
  2: { label: '点检中', variant: 'default' },
  3: { label: '已完成', variant: 'secondary' },
};

const inspectionTypeMap: Record<number, string> = {
  1: '日常点检',
  2: '周检',
  3: '月检',
  4: '年检',
};

export default function EquipmentInspectionPage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<InspectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ totalRecords: number; todayCount: number; abnormalCount: number; pendingCount: number }>({ totalRecords: 0, todayCount: 0, abnormalCount: 0, pendingCount: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterEquipmentId, setFilterEquipmentId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InspectionRecord>>({});
  const [saving, setSaving] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ id: number; equipment_code: string; equipment_name: string }>>([]);
  const [selectedRows, setSelectedRows] = useState<InspectionRecord[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        equipment_id: filterEquipmentId,
        inspection_type: filterType,
        result: filterResult,
        status: filterStatus,
      });
      const res = await authFetch('/api/equipment/inspection?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setStats(result.data.stats || { totalRecords: 0, todayCount: 0, abnormalCount: 0, pendingCount: 0 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    fetchEquipmentOptions();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const url = editItem.id ? `/api/equipment/inspection?id=${editItem.id}` : '/api/equipment/inspection';
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
      const res = await authFetch('/api/equipment/inspection?id=' + id, { method: 'DELETE' });
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
        const res = await authFetch(`/api/equipment/inspection?id=${id}`, { method: 'DELETE' });
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
    setEditItem({ inspection_type: 1, result: 1, status: 1 });
    setShowDialog(true);
  };

  const openEdit = (item: InspectionRecord) => {
    setEditItem(item);
    setShowDialog(true);
  };

  const columns: StandardTableColumn<InspectionRecord>[] = [
    {
      key: 'inspectionNo',
      title: tc('inspectionNo'),
      dataIndex: 'inspection_no',
      className: 'font-mono',
      width: 130,
    },
    {
      key: 'equipment',
      title: tc('equipment'),
      width: 180,
      render: (row) => (row.equipment_code ? `${row.equipment_code} - ${row.equipment_name}` : '-'),
    },
    {
      key: 'inspectionType',
      title: tc('inspectionType'),
      width: 90,
      render: (row) => inspectionTypeMap[row.inspection_type || 1] || '-',
    },
    {
      key: 'inspectionDate',
      title: tc('inspectionDate'),
      dataIndex: 'inspection_date',
      width: 110,
    },
    {
      key: 'inspector',
      title: tc('inspector'),
      dataIndex: 'inspector_name',
      width: 100,
    },
    {
      key: 'result',
      title: tc('result'),
      width: 80,
      render: (row) => {
        const rt = resultMap[row.result || 1] || resultMap[1];
        return <Badge variant={rt.variant} className="text-xs">{rt.label}</Badge>;
      },
    },
    {
      key: 'status',
      title: tc('status'),
      width: 90,
      render: (row) => {
        const st = statusMap[row.status] || statusMap[1];
        return <Badge variant={st.variant} className="text-xs">{st.label}</Badge>;
      },
    },
    {
      key: 'abnormalDesc',
      title: tc('abnormalDesc'),
      dataIndex: 'abnormal_desc',
      width: 160,
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={tc('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  <SelectItem value="1">{inspectionTypeMap[1]}</SelectItem>
                  <SelectItem value="2">{inspectionTypeMap[2]}</SelectItem>
                  <SelectItem value="3">{inspectionTypeMap[3]}</SelectItem>
                  <SelectItem value="4">{inspectionTypeMap[4]}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue placeholder={tc('result')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  <SelectItem value="1">{resultMap[1]?.label}</SelectItem>
                  <SelectItem value="2">{resultMap[2]?.label}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                  <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
                  <SelectItem value="3">{statusMap[3]?.label}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleSearch}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_add_inspection')}
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{tc('total')}</div>
              <div className="text-3xl font-bold mt-1">{stats.totalRecords}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{ts('k_inspect_title')}</span>
                <span className="text-green-500 text-xl">✓</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-green-600">{stats.todayCount}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{resultMap[2]?.label || '异常'}</span>
                <span className="text-red-500 text-xl">!</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-red-600">{stats.abnormalCount}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{ts('k_status_pending')}</span>
                <span className="text-yellow-500 text-xl">◷</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-yellow-600">{stats.pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {selectedRows.length > 0 && (
              <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} />
            )}
            <StandardTable<InspectionRecord>
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
              <DialogTitle>{editItem.id ? tc('edit') : ts('k_add_inspection')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
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
                <Label>{tc('inspectionType')}</Label>
                <Select
                  value={String(editItem.inspection_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, inspection_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{inspectionTypeMap[1]}</SelectItem>
                    <SelectItem value="2">{inspectionTypeMap[2]}</SelectItem>
                    <SelectItem value="3">{inspectionTypeMap[3]}</SelectItem>
                    <SelectItem value="4">{inspectionTypeMap[4]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('inspectionDate')}</Label>
                <Input
                  type="date"
                  value={editItem.inspection_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, inspection_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('inspector')}</Label>
                <Input
                  value={editItem.inspector_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, inspector_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('temperature')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editItem.temperature ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, temperature: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('pressure')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editItem.pressure ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, pressure: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('vibration')}</Label>
                <Input
                  value={editItem.vibration || ''}
                  onChange={(e) => setEditItem({ ...editItem, vibration: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('noiseLevel')}</Label>
                <Input
                  value={editItem.noise_level || ''}
                  onChange={(e) => setEditItem({ ...editItem, noise_level: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('oilLevel')}</Label>
                <Input
                  value={editItem.oil_level || ''}
                  onChange={(e) => setEditItem({ ...editItem, oil_level: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('beltTension')}</Label>
                <Input
                  value={editItem.belt_tension || ''}
                  onChange={(e) => setEditItem({ ...editItem, belt_tension: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>{tc('result')}</Label>
                <Select
                  value={String(editItem.result || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, result: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{resultMap[1]?.label}</SelectItem>
                    <SelectItem value="2">{resultMap[2]?.label}</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                    <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
                    <SelectItem value="3">{statusMap[3]?.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{tc('abnormalDesc')}</Label>
                <Input
                  value={editItem.abnormal_desc || ''}
                  onChange={(e) => setEditItem({ ...editItem, abnormal_desc: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('handlingAdvice')}</Label>
                <Input
                  value={editItem.handling_advice || ''}
                  onChange={(e) => setEditItem({ ...editItem, handling_advice: e.target.value })}
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