'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Activity, Pause, Wrench, Power, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface EquipmentStatus {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: number | null;
  model: string | null;
  manufacturer: string | null;
  workshop_id: number | null;
  location: string | null;
  current_status: number;
  enable_status: number;
  oee: number | null;
  availability: number | null;
  performance: number | null;
  quality_rate: number | null;
  total_run_hours: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  update_time: string;
}

interface StatusLog {
  id: number;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  from_status: number | null;
  to_status: number;
  operator_id: number | null;
  operator_name: string | null;
  remark: string | null;
  create_time: string;
}

interface StatusStats {
  [key: number]: number;
  1: number;
  2: number;
  3: number;
  4: number;
}

const STATUS_CONFIG: Record<number, { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; icon: typeof Activity; dotColor: string; iconColor: string }> = {
  1: { labelKey: 'statusRunning', variant: 'default', icon: Activity, dotColor: 'bg-green-500', iconColor: 'text-green-500' },
  2: { labelKey: 'statusStandby', variant: 'secondary', icon: Pause, dotColor: 'bg-yellow-500', iconColor: 'text-yellow-500' },
  3: { labelKey: 'statusRepair', variant: 'destructive', icon: Wrench, dotColor: 'bg-red-500', iconColor: 'text-red-500' },
  4: { labelKey: 'statusShutdown', variant: 'outline', icon: Power, dotColor: 'bg-gray-500', iconColor: 'text-gray-500' },
};

export default function EquipmentStatusPage() {
  const ts = useTranslations('Equipment');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<EquipmentStatus[]>([]);
  const [stats, setStats] = useState<StatusStats>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 状态变更对话框
  const [showDialog, setShowDialog] = useState(false);
  const [targetEquipment, setTargetEquipment] = useState<EquipmentStatus | null>(null);
  const [newStatus, setNewStatus] = useState<number>(1);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  // 状态历史对话框
  const [showHistory, setShowHistory] = useState(false);
  const [historyEquipment, setHistoryEquipment] = useState<EquipmentStatus | null>(null);
  const [historyList, setHistoryList] = useState<StatusLog[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('currentStatus', filterStatus);
      const url = '/api/equipment/status' + (params.toString() ? '?' + params : '');
      const res = await authFetch(url);
      const result = await res.json();
      if (result.success) {
        const all = (result.data.list || []) as EquipmentStatus[];
        const filtered = keyword
          ? all.filter(
              (e) =>
                e.equipment_code.toLowerCase().includes(keyword.toLowerCase()) ||
                e.equipment_name.toLowerCase().includes(keyword.toLowerCase())
            )
          : all;
        setList(filtered);
        setStats(result.data.stats || { 1: 0, 2: 0, 3: 0, 4: 0 });
        setTotal(result.data.total || 0);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(fetchData, 30000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh]);

  const openStatusDialog = (eq: EquipmentStatus) => {
    setTargetEquipment(eq);
    setNewStatus(eq.current_status);
    setRemark('');
    setShowDialog(true);
  };

  const handleStatusUpdate = async () => {
    if (!targetEquipment) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/equipment/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetEquipment.id,
          status: newStatus,
          remark: remark || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('updateStatus') });
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

  const openHistory = async (eq: EquipmentStatus) => {
    setHistoryEquipment(eq);
    setShowHistory(true);
    setHistoryList([]);
    try {
      const res = await authFetch(`/api/equipment/status?log=1&equipmentId=${eq.id}`);
      const result = await res.json();
      if (result.success) {
        setHistoryList(result.data.list || []);
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const summaryCards = [1, 2, 3, 4].map((s) => {
    const cfg = STATUS_CONFIG[s];
    const Icon = cfg.icon;
    return { key: s, cfg, Icon, count: stats[s] || 0 };
  });

  const statusLabel = (s: number | null) => {
    const cfg = STATUS_CONFIG[s || 4];
    return ts(cfg.labelKey);
  };

  return (
    <MainLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('statusMonitor')}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <span className="text-sm">{ts('autoRefresh')}</span>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 状态概览卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{ts('totalEquipment')}</div>
              <div className="text-3xl font-bold mt-1">{total}</div>
              <div className="text-xs text-gray-400 mt-1">{lastUpdate ? ts('lastUpdate') + ': ' + lastUpdate : ''}</div>
            </CardContent>
          </Card>
          {summaryCards.map(({ key, cfg, Icon, count }) => {
            const borderColors: Record<number, string> = { 1: 'border-t-green-500', 2: 'border-t-yellow-500', 3: 'border-t-red-500', 4: 'border-t-gray-500' };
            return (
              <Card key={key} className={`border-t-4 ${borderColors[key] || ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{ts(cfg.labelKey)}</span>
                    <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-3 w-3 rounded-full ${cfg.dotColor}`} />
                    <span className="text-3xl font-bold">{count}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 筛选 */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder={tc('search') || '搜索...'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={ts('currentStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{tc('all') || '全部'}</SelectItem>
              <SelectItem value="1">{ts('statusRunning')}</SelectItem>
              <SelectItem value="2">{ts('statusStandby')}</SelectItem>
              <SelectItem value="3">{ts('statusRepair')}</SelectItem>
              <SelectItem value="4">{ts('statusShutdown')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 设备列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ts('equipmentCode')}</TableHead>
                  <TableHead>{ts('equipmentName')}</TableHead>
                  <TableHead>{ts('equipmentType')}</TableHead>
                  <TableHead>{ts('location')}</TableHead>
                  <TableHead>{ts('currentStatus')}</TableHead>
                  <TableHead>{ts('oee')}</TableHead>
                  <TableHead className="text-right">{ts('updateStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((eq) => {
                  const cfg = STATUS_CONFIG[eq.current_status] || STATUS_CONFIG[4];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono">{eq.equipment_code}</TableCell>
                      <TableCell>{eq.equipment_name}</TableCell>
                      <TableCell>{eq.model || '-'}</TableCell>
                      <TableCell>{eq.location || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
                          <Badge variant={cfg.variant === 'success' ? 'default' : cfg.variant}>
                            <Icon className="h-3 w-3 mr-1" />
                            {ts(cfg.labelKey)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{eq.oee != null ? `${eq.oee}%` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openHistory(eq)}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => openStatusDialog(eq)}>
                            {ts('updateStatus')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      {tc('noData') || '暂无数据'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 状态变更对话框 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{ts('updateStatus')}</DialogTitle>
            </DialogHeader>
            {targetEquipment && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  {targetEquipment.equipment_code} — {targetEquipment.equipment_name}
                </div>
                <div>
                  <Label>{ts('currentStatus')}</Label>
                  <Select value={String(newStatus)} onValueChange={(v) => setNewStatus(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{ts('statusRunning')}</SelectItem>
                      <SelectItem value="2">{ts('statusStandby')}</SelectItem>
                      <SelectItem value="3">{ts('statusRepair')}</SelectItem>
                      <SelectItem value="4">{ts('statusShutdown')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{ts('changeReason') || '变更原因'}</Label>
                  <Textarea
                    placeholder={ts('changeReasonPlaceholder') || '请输入变更原因（可选）'}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel') || '取消'}
              </Button>
              <Button onClick={handleStatusUpdate} disabled={saving}>
                {saving ? tc('saving') || '保存中...' : tc('confirm') || '确认'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 状态变更历史对话框 */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {historyEquipment ? `${historyEquipment.equipment_code} — ${historyEquipment.equipment_name}` : ''}
                {' '}{ts('statusHistory') || '状态变更历史'}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {historyList.length === 0 ? (
                <div className="text-center py-8 text-gray-400">{tc('noData') || '暂无数据'}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ts('fromStatus') || '变更前'}</TableHead>
                      <TableHead>{ts('toStatus') || '变更后'}</TableHead>
                      <TableHead>{ts('operator') || '操作人'}</TableHead>
                      <TableHead>{ts('changeReason') || '原因'}</TableHead>
                      <TableHead>{ts('changeTime') || '时间'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyList.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{statusLabel(log.from_status)}</TableCell>
                        <TableCell>
                          <Badge variant={(STATUS_CONFIG[log.to_status] || STATUS_CONFIG[4]).variant === 'success' ? 'default' : (STATUS_CONFIG[log.to_status] || STATUS_CONFIG[4]).variant}>
                            {statusLabel(log.to_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.operator_name || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={log.remark || ''}>
                          {log.remark || '-'}
                        </TableCell>
                        <TableCell className="text-xs">{log.create_time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
