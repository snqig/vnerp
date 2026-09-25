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
import { useTranslations } from 'next-intl';

interface InspectionRecord {
  id: number;
  inspection_no: string;
  equipment_id: number | null;
  equipment_code: string | null;
  equipment_name: string | null;
  inspection_type: number | null;
  inspection_date: string;
  inspector: string | null;
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

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '正常', variant: 'default' },
  2: { label: '异常', variant: 'destructive' },
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
  const [page, setPage] = useState(1);
  const [filterEquipmentId, setFilterEquipmentId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InspectionRecord>>({});
  const [saving, setSaving] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ id: number; equipment_code: string; equipment_name: string }>>([]);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        equipment_id: filterEquipmentId,
        inspection_type: filterType,
        result: filterResult,
      });
      const res = await authFetch('/api/equipment/inspection?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
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
    const ids = Array.from(selected);
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
    clear();
    fetchData();
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const openAdd = () => {
    setEditItem({ inspection_type: 1, result: 1 });
    setShowDialog(true);
  };

  const openEdit = (item: InspectionRecord) => {
    setEditItem(item);
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
                  <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                  <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
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
                  <TableHead className="text-xs">{tc('inspectionNo')}</TableHead>
                  <TableHead className="text-xs">{tc('equipment')}</TableHead>
                  <TableHead className="text-xs">{tc('inspectionType')}</TableHead>
                  <TableHead className="text-xs">{tc('inspectionDate')}</TableHead>
                  <TableHead className="text-xs">{tc('inspector')}</TableHead>
                  <TableHead className="text-xs">{tc('result')}</TableHead>
                  <TableHead className="text-xs">{tc('abnormalDesc')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.result || 1] || statusMap[1];
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
                      <TableCell className="text-xs font-mono">{item.inspection_no}</TableCell>
                      <TableCell className="text-xs">
                        {item.equipment_code ? `${item.equipment_code} - ${item.equipment_name}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{inspectionTypeMap[item.inspection_type || 1] || '-'}</TableCell>
                      <TableCell className="text-xs">{item.inspection_date || '-'}</TableCell>
                      <TableCell className="text-xs">{item.inspector || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-32 truncate">{item.abnormal_desc || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
                  value={editItem.inspector || ''}
                  onChange={(e) => setEditItem({ ...editItem, inspector: e.target.value })}
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
                    <SelectItem value="1">{statusMap[1]?.label}</SelectItem>
                    <SelectItem value="2">{statusMap[2]?.label}</SelectItem>
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
