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
import { Plus, Search, Edit, Trash2, ClipboardCheck, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface Item {
  id: number;
  inspection_no: string;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  inspection_type: number;
  inspection_date: string;
  inspector: string;
  temperature: number | null;
  vibration: string | null;
  pressure: number | null;
  noise_level: string | null;
  oil_level: string | null;
  belt_tension: string | null;
  result: number;
  abnormal_desc: string | null;
  handling_advice: string | null;
  status: number;
}

const inspectionTypeMap: Record<number, string> = {
  1: '日常点检',
  2: '周点检',
  3: '月度点检',
  4: '年度点检',
};

const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '待点检', variant: 'outline' },
  2: { label: '点检中', variant: 'default' },
  3: { label: '已完成', variant: 'secondary' },
};

const resultMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '正常', variant: 'secondary' },
  2: { label: '异常', variant: 'destructive' },
};

interface EquipmentOption {
  id: number;
  equipment_code: string;
  equipment_name: string;
}

export default function EquipmentInspectionPage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [equipmentId, setEquipmentId] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const [result, setResult] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    totalCount: 0,
    abnormal: 0,
    monthlyCount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));

  const fetchEquipmentList = async () => {
    try {
      const res = await authFetch('/api/equipment?pageSize=200&status=1');
      const result = await res.json();
      if (result.success) {
        setEquipmentList(result.data.list || []);
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (equipmentId) params.set('equipment_id', equipmentId);
      if (inspectionType) params.set('inspection_type', inspectionType);
      if (result) params.set('result', result);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const res = await authFetch('/api/equipment/inspection?' + params);
      const data = await res.json();
      if (data.success) {
        setList(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/equipment/inspection/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchEquipmentList();
  }, [page]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/equipment/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({
          title: tc('operationFailed'),
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/equipment/inspection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDeleteMsg'))) return;
    try {
      const res = await authFetch('/api/equipment/inspection?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
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

  const handleEdit = (item: Partial<Item>) => {
    setEditItem(item);
    setShowDialog(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('k_inspect_title')}</h1>
          <div className="flex gap-2 flex-wrap">
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue placeholder={tc('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{tc('all')}</SelectItem>
                {equipmentList.map((eq) => (
                  <SelectItem key={eq.id} value={String(eq.id)}>
                    {eq.equipment_code} - {eq.equipment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={inspectionType} onValueChange={setInspectionType}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue placeholder={tc('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{tc('all')}</SelectItem>
                <SelectItem value="1">{ts('k_inspect_type_daily')}</SelectItem>
                <SelectItem value="2">{ts('k_inspect_type_weekly')}</SelectItem>
                <SelectItem value="3">{ts('k_inspect_type_monthly')}</SelectItem>
                <SelectItem value="4">{ts('k_inspect_type_annual')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger className="w-[100px] h-8 text-sm">
                <SelectValue placeholder={tc('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{tc('all')}</SelectItem>
                <SelectItem value="1">{ts('k_result_normal')}</SelectItem>
                <SelectItem value="2">{ts('k_result_abnormal')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={fetchData}>
              <Search className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_inspect_add')}
            </Button>
          </div>
        </div>
        <StatsCards
          configs={[
            { key: 'totalCount', label: '总点检数', icon: ClipboardCheck, ...StatsTheme.blue },
            { key: 'abnormal', label: '异常数', icon: AlertTriangle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月点检次数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'totalCount', count: stats.totalCount },
            { key: 'abnormal', count: stats.abnormal },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 3 }}
        />

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
                  <TableHead className="text-xs">{ts('k_inspect_no')}</TableHead>
                  <TableHead className="text-xs">{ts('k_equipment_code')}</TableHead>
                  <TableHead className="text-xs">{ts('k_equipment_name')}</TableHead>
                  <TableHead className="text-xs">{ts('k_inspect_type')}</TableHead>
                  <TableHead className="text-xs">{ts('k_inspect_date')}</TableHead>
                  <TableHead className="text-xs">{ts('k_inspector')}</TableHead>
                  <TableHead className="text-xs">{ts('k_result')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  const rt = resultMap[item.result] || resultMap[1];
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
                      <TableCell className="text-xs">{item.equipment_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.equipment_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {inspectionTypeMap[item.inspection_type] || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.inspection_date || '-'}</TableCell>
                      <TableCell className="text-xs">{item.inspector || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={rt.variant} className="text-xs">
                          {rt.label}
                        </Badge>
                      </TableCell>
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
                              {ts('k_start_inspect')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3)}
                            >
                              {ts('k_complete_inspect')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
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
                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
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
            {ts('k_total_records')}{total}{ts('k_count')}
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
              <DialogTitle>{editItem.id ? ts('k_inspect_edit') : ts('k_inspect_add')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ts('k_equipment_name')}</Label>
                <Select
                  value={String(editItem.equipment_id || '')}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, equipment_id: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectEquipment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentList.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.equipment_code} - {eq.equipment_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_inspect_type')}</Label>
                <Select
                  value={String(editItem.inspection_type || 1)}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, inspection_type: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_inspect_type_daily')}</SelectItem>
                    <SelectItem value="2">{ts('k_inspect_type_weekly')}</SelectItem>
                    <SelectItem value="3">{ts('k_inspect_type_monthly')}</SelectItem>
                    <SelectItem value="4">{ts('k_inspect_type_annual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_inspect_date')}</Label>
                <Input
                  type="date"
                  value={editItem.inspection_date || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, inspection_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_inspector')}</Label>
                <Input
                  value={editItem.inspector || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, inspector: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_temperature')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.temperature ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, temperature: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_pressure')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.pressure ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, pressure: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_vibration')}</Label>
                <Input
                  value={editItem.vibration || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, vibration: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_noise_level')}</Label>
                <Input
                  value={editItem.noise_level || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, noise_level: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_oil_level')}</Label>
                <Input
                  value={editItem.oil_level || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, oil_level: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_belt_tension')}</Label>
                <Input
                  value={editItem.belt_tension || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, belt_tension: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_result')}</Label>
                <Select
                  value={String(editItem.result ?? 1)}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, result: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_result_normal')}</SelectItem>
                    <SelectItem value="2">{ts('k_result_abnormal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <Select
                  value={String(editItem.status ?? 1)}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, status: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_status_pending')}</SelectItem>
                    <SelectItem value="2">{ts('k_status_in_progress')}</SelectItem>
                    <SelectItem value="3">{ts('k_status_completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{ts('k_abnormal_desc')}</Label>
                <Input
                  value={editItem.abnormal_desc || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, abnormal_desc: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{ts('k_handling_advice')}</Label>
                <Input
                  value={editItem.handling_advice || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, handling_advice: e.target.value })
                  }
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