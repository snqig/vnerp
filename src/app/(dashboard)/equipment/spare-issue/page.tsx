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

interface SpareIssue {
  id: number;
  issue_no: string;
  part_id: number;
  part_name: string;
  part_code: string;
  equipment_id: number | null;
  equipment_name: string | null;
  equipment_code: string | null;
  quantity: number;
  issue_date: string;
  applicant_name: string | null;
  reason: string | null;
  status: number;
  remark: string | null;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待审批', variant: 'outline' },
  2: { label: '已审批', variant: 'default' },
  3: { label: '已完成', variant: 'secondary' },
  4: { label: '已取消', variant: 'destructive' },
};

export default function EquipmentSpareIssuePage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<SpareIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ totalIssues: number; pendingCount: number; todayCount: number }>({ totalIssues: 0, pendingCount: 0, todayCount: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterEquipmentId, setFilterEquipmentId] = useState('');
  const [filterPartId, setFilterPartId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SpareIssue>>({});
  const [saving, setSaving] = useState(false);
  const [partOptions, setPartOptions] = useState<Array<{ id: number; part_code: string; part_name: string; stock_quantity: number }>>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ id: number; equipment_code: string; equipment_name: string }>>([]);
  const [selectedRows, setSelectedRows] = useState<SpareIssue[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        equipment_id: filterEquipmentId,
        part_id: filterPartId,
        status: filterStatus,
      });
      const res = await authFetch('/api/equipment/spare-issue?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setStats(result.data.stats || { totalIssues: 0, pendingCount: 0, todayCount: 0 });
      }
    } catch {}
  };

  const fetchPartOptions = async () => {
    try {
      const res = await authFetch('/api/equipment/spare-part?page=1&pageSize=1000');
      const result = await res.json();
      if (result.success) {
        setPartOptions(
          (result.data.list || []).map((p: any) => ({
            id: p.id,
            part_code: p.part_code,
            part_name: p.part_name,
            stock_quantity: p.stock_quantity,
          }))
        );
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
    fetchPartOptions();
    fetchEquipmentOptions();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/equipment/spare-issue', {
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
      const res = await authFetch('/api/equipment/spare-issue?id=' + id, { method: 'DELETE' });
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
        const res = await authFetch(`/api/equipment/spare-issue?id=${id}`, { method: 'DELETE' });
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
    setEditItem({ status: 1 });
    setShowDialog(true);
  };

  const openEdit = (item: SpareIssue) => {
    setEditItem(item);
    setShowDialog(true);
  };

  const columns: StandardTableColumn<SpareIssue>[] = [
    {
      key: 'issue_no',
      title: tc('issueNo'),
      dataIndex: 'issue_no',
      className: 'font-mono',
      width: 130,
    },
    {
      key: 'sparePart',
      title: tc('sparePart'),
      width: 180,
      render: (row) => (row.part_code ? `${row.part_code} - ${row.part_name}` : '-'),
    },
    {
      key: 'equipment',
      title: tc('equipment'),
      width: 180,
      render: (row) => (row.equipment_code ? `${row.equipment_code} - ${row.equipment_name}` : '-'),
    },
    {
      key: 'quantity',
      title: tc('quantity'),
      dataIndex: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      key: 'issue_date',
      title: tc('issueDate'),
      dataIndex: 'issue_date',
      width: 110,
    },
    {
      key: 'applicant_name',
      title: tc('requester'),
      dataIndex: 'applicant_name',
      width: 100,
    },
    {
      key: 'reason',
      title: tc('purpose'),
      dataIndex: 'reason',
      width: 160,
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
          <h1 className="text-2xl font-bold">{ts('k_spare_issue_management')}</h1>
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
              <Select value={filterPartId} onValueChange={setFilterPartId}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder={tc('sparePart')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  {partOptions.map((part) => (
                    <SelectItem key={part.id} value={String(part.id)}>
                      {part.part_code} - {part.part_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                  <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
                  <SelectItem value="3">{statusMap[3]?.label}</SelectItem>
                  <SelectItem value="4">{statusMap[4]?.label}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleSearch}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_add_spare_issue')}
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{tc('total')}</div>
              <div className="text-3xl font-bold mt-1">{stats.totalIssues}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{statusMap[1]?.label || '待审批'}</span>
                <span className="text-yellow-500 text-xl">◷</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-yellow-600">{stats.pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">今日发料</span>
                <span className="text-green-500 text-xl">✓</span>
              </div>
              <div className="text-3xl font-bold mt-1 text-green-600">{stats.todayCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {selectedRows.length > 0 && (
              <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} />
            )}
            <StandardTable<SpareIssue>
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
              <DialogTitle>{editItem.id ? tc('edit') : ts('k_add_spare_issue')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('sparePart')} *</Label>
                <Select
                  value={String(editItem.part_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, part_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {partOptions.map((part) => (
                      <SelectItem key={part.id} value={String(part.id)}>
                        {part.part_code} - {part.part_name} (库存: {part.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('equipment')}</Label>
                <Select
                  value={String(editItem.equipment_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, equipment_id: v ? Number(v) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{tc('none')}</SelectItem>
                    {equipmentOptions.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.equipment_code} - {eq.equipment_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('quantity')} *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editItem.quantity ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('issueDate')}</Label>
                <Input
                  type="date"
                  value={editItem.issue_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('requester')}</Label>
                <Input
                  value={editItem.applicant_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, applicant_name: e.target.value })}
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
                    <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                    <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
                    <SelectItem value="3">{statusMap[3]?.label}</SelectItem>
                    <SelectItem value="4">{statusMap[4]?.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{tc('purpose')}</Label>
                <Input
                  value={editItem.reason || ''}
                  onChange={(e) => setEditItem({ ...editItem, reason: e.target.value })}
                />
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