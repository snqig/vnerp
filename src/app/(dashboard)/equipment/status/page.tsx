'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Activity, Pause, Wrench, Power } from 'lucide-react';
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

interface StatusStats {
  [key: number]: number;
  1: number;
  2: number;
  3: number;
  4: number;
}

const STATUS_CONFIG: Record<number, { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; icon: typeof Activity; color: string }> = {
  1: { labelKey: 'statusRunning', variant: 'default', icon: Activity, color: 'bg-green-500' },
  2: { labelKey: 'statusStandby', variant: 'secondary', icon: Pause, color: 'bg-yellow-500' },
  3: { labelKey: 'statusRepair', variant: 'destructive', icon: Wrench, color: 'bg-red-500' },
  4: { labelKey: 'statusShutdown', variant: 'outline', icon: Power, color: 'bg-gray-500' },
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

  const handleStatusChange = async (equipmentId: number, status: number) => {
    try {
      const res = await authFetch(
        `/api/equipment/status?id=${equipmentId}&status=${status}`,
        { method: 'PUT' }
      );
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('updateStatus') });
        fetchData();
      } else {
        toast({ title: tc('operationFailed'), description: result.message, variant: 'destructive' });
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

  return (
    <MainLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{ts('statusMonitor')}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{ts('lastUpdate')}:</span>
              <span className="font-mono">{lastUpdate}</span>
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">{ts('totalEquipment')}</div>
              <div className="text-3xl font-bold mt-1">{total}</div>
            </CardContent>
          </Card>
          {summaryCards.map(({ key, cfg, Icon, count }) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{ts(cfg.labelKey)}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                  <span className="text-3xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <TableHead>{ts('updateStatus')}</TableHead>
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
                          <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                          <Badge variant={cfg.variant === 'success' ? 'default' : cfg.variant}>
                            <Icon className="h-3 w-3 mr-1" />
                            {ts(cfg.labelKey)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{eq.oee != null ? `${eq.oee}%` : '-'}</TableCell>
                      <TableCell>
                        <Select
                          value={String(eq.current_status)}
                          onValueChange={(v) => handleStatusChange(eq.id, Number(v))}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{ts('statusRunning')}</SelectItem>
                            <SelectItem value="2">{ts('statusStandby')}</SelectItem>
                            <SelectItem value="3">{ts('statusRepair')}</SelectItem>
                            <SelectItem value="4">{ts('statusShutdown')}</SelectItem>
                          </SelectContent>
                        </Select>
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
      </div>
    </MainLayout>
  );
}
