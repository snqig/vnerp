'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AnimatedTabs } from '@/components/ui/animated-tabs';
import { Plus, Search, RefreshCw, AlertTriangle, Shield, Lock, Unlock, Eye, Edit, Trash2, Wrench, QrCode, Activity, BarChart3, Clock, WrenchIcon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface DieTemplate {
  id: number;
  template_code: string;
  template_name: string;
  template_type: number;
  asset_type: string;
  layout_type: string;
  pieces_per_impression: number;
  specification: string;
  material: string;
  max_usage: number;
  current_usage: number;
  remaining_usage: number;
  warning_usage: number;
  max_impressions: number;
  cumulative_impressions: number;
  warning_threshold: number;
  maintenance_interval: number;
  maintenance_count: number;
  last_maintenance_impressions: number;
  last_maintenance_date: string;
  last_used_date: string;
  unit_price: number;
  die_status: string;
  qr_code: string;
  status: number;
  storage_location: string;
  purchase_date: string;
  supplier_id: number;
  remark: string;
  create_time: string;
}

interface MaintenanceRecord {
  id: number;
  maintenance_no: string;
  die_id: number;
  die_code: string;
  template_name: string;
  maintenance_type: string;
  impressions_before: number;
  impressions_after: number;
  maintenance_date: string;
  next_maintenance_date: string;
  cost: number;
  technician_name: string;
  status: number;
  remark: string;
  create_time: string;
}

interface UsageLog {
  id: number;
  die_id: number;
  die_code: string;
  template_name: string;
  work_report_id: number;
  work_order_id: number;
  work_order_no: string;
  process_name: string;
  impressions: number;
  cumulative_after: number;
  operator_name: string;
  usage_date: string;
  create_time: string;
}

const TYPE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '刀模', color: 'bg-blue-100 text-blue-800' },
  2: { label: '丝网版', color: 'bg-purple-100 text-purple-800' },
};

const ASSET_TYPE_MAP: Record<string, { label: string; color: string }> = {
  die: { label: '刀模', color: 'bg-blue-100 text-blue-800' },
  flexo_plate: { label: '柔印版', color: 'bg-cyan-100 text-cyan-800' },
  screen_mesh: { label: '丝网版', color: 'bg-purple-100 text-purple-800' },
};

const DIE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: '可用', color: 'bg-green-100 text-green-800' },
  in_use: { label: '使用中', color: 'bg-blue-100 text-blue-800' },
  maintenance_needed: { label: '需保养', color: 'bg-yellow-100 text-yellow-800' },
  re_rule_needed: { label: '需重做', color: 'bg-orange-100 text-orange-800' },
  scrap: { label: '已报废', color: 'bg-gray-100 text-gray-800' },
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '正常', color: 'bg-green-100 text-green-800' },
  2: { label: '预警', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: '已锁定', color: 'bg-red-100 text-red-800' },
  4: { label: '报废', color: 'bg-gray-100 text-gray-800' },
};

const MAINTENANCE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  routine: { label: '常规保养', color: 'bg-green-100 text-green-800' },
  grinding: { label: '磨刃/修版', color: 'bg-blue-100 text-blue-800' },
  re_rule: { label: '重做/翻新', color: 'bg-orange-100 text-orange-800' },
  replace: { label: '更换', color: 'bg-red-100 text-red-800' },
};

const MAINTENANCE_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '待保养', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '保养中', color: 'bg-blue-100 text-blue-800' },
  3: { label: '已完成', color: 'bg-green-100 text-green-800' },
};

export default function DieTemplatePage() {
  const [list, setList] = useState<DieTemplate[]>([]);
  const [warningList, setWarningList] = useState<DieTemplate[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceRecord[]>([]);
  const [usageLogList, setUsageLogList] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dieStatusFilter, setDieStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailData, setDetailData] = useState<DieTemplate | null>(null);
  const [selectedItem, setSelectedItem] = useState<DieTemplate | null>(null);
  const [usageAmount, setUsageAmount] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: 'routine',
    cost: '',
    technician_name: '',
    remark: '',
    complete_immediately: true,
  });

  const [form, setForm] = useState({
    template_code: '',
    template_name: '',
    template_type: '1',
    asset_type: 'die',
    layout_type: 'single_row',
    pieces_per_impression: '1',
    specification: '',
    material: '',
    max_usage: '',
    current_usage: '0',
    warning_usage: '',
    max_impressions: '',
    cumulative_impressions: '0',
    warning_threshold: '80',
    maintenance_interval: '8000',
    unit_price: '',
    storage_location: '',
    purchase_date: '',
    remark: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (typeFilter !== 'all') params.set('template_type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dieStatusFilter !== 'all') params.set('die_status', dieStatusFilter);
      params.set('pageSize', '50');
      const res = await fetch(`/api/prepress/die-template?${params}`);
      const data = await res.json();
      if (data.success) {
        setList(data.data?.list || []);
        setWarningList(data.data?.warningList || []);
        setDashboardStats(data.data?.dashboardStats || {});
      }
    } catch (e) {
      toast.error('获取刀模/网版列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, typeFilter, statusFilter, dieStatusFilter]);

  const fetchMaintenanceList = useCallback(async () => {
    try {
      const res = await fetch('/api/prepress/die-maintenance?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setMaintenanceList(data.data?.list || []);
      }
    } catch (e) {
      toast.error('获取保养记录失败');
    }
  }, []);

  const fetchUsageLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/prepress/die-usage?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setUsageLogList(data.data?.list || []);
      }
    } catch (e) {
      toast.error('获取使用记录失败');
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (activeTab === 'maintenance') fetchMaintenanceList();
    if (activeTab === 'usage') fetchUsageLogs();
  }, [activeTab, fetchMaintenanceList, fetchUsageLogs]);

  const handleCreate = async () => {
    if (!form.template_code || !form.template_name) {
      toast.error('请填写编号和名称');
      return;
    }
    try {
      const res = await fetch('/api/prepress/die-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_code: form.template_code,
          template_name: form.template_name,
          template_type: parseInt(form.template_type),
          asset_type: form.asset_type,
          layout_type: form.layout_type,
          pieces_per_impression: parseInt(form.pieces_per_impression) || 1,
          specification: form.specification || null,
          material: form.material || null,
          max_usage: parseInt(form.max_usage) || 0,
          current_usage: parseInt(form.current_usage) || 0,
          warning_usage: form.warning_usage ? parseInt(form.warning_usage) : undefined,
          max_impressions: parseInt(form.max_impressions) || parseInt(form.max_usage) || 0,
          cumulative_impressions: parseInt(form.cumulative_impressions) || 0,
          warning_threshold: parseFloat(form.warning_threshold) || 80,
          maintenance_interval: parseInt(form.maintenance_interval) || 8000,
          unit_price: parseFloat(form.unit_price) || 0,
          storage_location: form.storage_location || null,
          purchase_date: form.purchase_date || null,
          remark: form.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('创建成功');
        setDialogOpen(false);
        resetForm();
        fetchList();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (e) {
      toast.error('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/prepress/die-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          template_name: form.template_name,
          template_type: parseInt(form.template_type),
          asset_type: form.asset_type,
          layout_type: form.layout_type,
          pieces_per_impression: parseInt(form.pieces_per_impression) || 1,
          specification: form.specification || null,
          material: form.material || null,
          max_usage: parseInt(form.max_usage) || 0,
          current_usage: parseInt(form.current_usage) || 0,
          warning_usage: form.warning_usage ? parseInt(form.warning_usage) : undefined,
          max_impressions: parseInt(form.max_impressions) || parseInt(form.max_usage) || 0,
          cumulative_impressions: parseInt(form.cumulative_impressions) || 0,
          warning_threshold: parseFloat(form.warning_threshold) || 80,
          maintenance_interval: parseInt(form.maintenance_interval) || 8000,
          unit_price: parseFloat(form.unit_price) || 0,
          storage_location: form.storage_location || null,
          remark: form.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('更新成功');
        setDialogOpen(false);
        setEditing(false);
        resetForm();
        fetchList();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (e) {
      toast.error('更新失败');
    }
  };

  const handleDeductUsage = async () => {
    if (!selectedItem || !usageAmount) {
      toast.error('请输入使用次数');
      return;
    }
    const deductCount = parseInt(usageAmount);
    if (deductCount <= 0) {
      toast.error('使用次数必须大于0');
      return;
    }
    try {
      const res = await fetch('/api/prepress/die-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          die_id: selectedItem.id,
          impressions: deductCount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`已记录${deductCount}次使用，累计${data.data?.cumulative_after || 0}次`);
        setUsageDialogOpen(false);
        setUsageAmount('');
        fetchList();
      } else {
        toast.error(data.message || '记录失败');
      }
    } catch (e) {
      toast.error('记录失败');
    }
  };

  const handleMaintenance = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/prepress/die-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          die_id: selectedItem.id,
          maintenance_type: maintenanceForm.maintenance_type,
          cost: parseFloat(maintenanceForm.cost) || 0,
          technician_name: maintenanceForm.technician_name || null,
          remark: maintenanceForm.remark || null,
          complete_immediately: maintenanceForm.complete_immediately,
          status: maintenanceForm.complete_immediately ? 3 : 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('保养记录创建成功');
        setMaintenanceDialogOpen(false);
        resetMaintenanceForm();
        fetchList();
        if (activeTab === 'maintenance') fetchMaintenanceList();
      } else {
        toast.error(data.message || '保养创建失败');
      }
    } catch (e) {
      toast.error('保养创建失败');
    }
  };

  const handleCompleteMaintenance = async (record: MaintenanceRecord) => {
    if (!confirm('确定完成此保养？')) return;
    try {
      const res = await fetch('/api/prepress/die-maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          status: 3,
          cost: record.cost,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('保养完成');
        fetchMaintenanceList();
        fetchList();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const handleLock = async (item: DieTemplate) => {
    const action = item.status === 3 ? '解锁' : '锁定';
    if (!confirm(`确定${action}此${TYPE_MAP[item.template_type]?.label || '模板'}？`)) return;
    try {
      const newStatus = item.status === 3 ? (item.current_usage >= item.warning_usage ? 2 : 1) : 3;
      const res = await fetch('/api/prepress/die-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          template_name: item.template_name,
          template_type: item.template_type,
          specification: item.specification,
          material: item.material,
          max_usage: item.max_usage,
          current_usage: item.current_usage,
          warning_usage: item.warning_usage,
          storage_location: item.storage_location,
          remark: item.remark,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${action}成功`);
        fetchList();
      } else {
        toast.error(data.message || `${action}失败`);
      }
    } catch (e) {
      toast.error(`${action}失败`);
    }
  };

  const handleScrap = async (item: DieTemplate) => {
    if (!confirm('确定报废此模板？报废后不可恢复！')) return;
    try {
      const res = await fetch('/api/prepress/die-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          template_name: item.template_name,
          template_type: item.template_type,
          specification: item.specification,
          material: item.material,
          max_usage: item.max_usage,
          current_usage: item.current_usage,
          warning_usage: item.warning_usage,
          storage_location: item.storage_location,
          remark: item.remark,
          status: 4,
          force_die_status: 'scrap',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('报废成功');
        fetchList();
      } else {
        toast.error(data.message || '报废失败');
      }
    } catch (e) {
      toast.error('报废失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      const res = await fetch(`/api/prepress/die-template?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        fetchList();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const resetForm = () => {
    setForm({
      template_code: '',
      template_name: '',
      template_type: '1',
      asset_type: 'die',
      layout_type: 'single_row',
      pieces_per_impression: '1',
      specification: '',
      material: '',
      max_usage: '',
      current_usage: '0',
      warning_usage: '',
      max_impressions: '',
      cumulative_impressions: '0',
      warning_threshold: '80',
      maintenance_interval: '8000',
      unit_price: '',
      storage_location: '',
      purchase_date: '',
      remark: '',
    });
    setSelectedItem(null);
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      maintenance_type: 'routine',
      cost: '',
      technician_name: '',
      remark: '',
      complete_immediately: true,
    });
    setSelectedItem(null);
  };

  const openEditDialog = (item: DieTemplate) => {
    setSelectedItem(item);
    setEditing(true);
    setForm({
      template_code: item.template_code,
      template_name: item.template_name,
      template_type: String(item.template_type),
      asset_type: item.asset_type || (item.template_type === 2 ? 'screen_mesh' : 'die'),
      layout_type: item.layout_type || 'single_row',
      pieces_per_impression: String(item.pieces_per_impression || 1),
      specification: item.specification || '',
      material: item.material || '',
      max_usage: String(item.max_usage),
      current_usage: String(item.current_usage),
      warning_usage: String(item.warning_usage),
      max_impressions: String(item.max_impressions || item.max_usage),
      cumulative_impressions: String(item.cumulative_impressions || item.current_usage),
      warning_threshold: String(item.warning_threshold || 80),
      maintenance_interval: String(item.maintenance_interval || 8000),
      unit_price: String(item.unit_price || 0),
      storage_location: item.storage_location || '',
      purchase_date: item.purchase_date || '',
      remark: item.remark || '',
    });
    setDialogOpen(true);
  };

  const getUsagePercent = (item: DieTemplate) => {
    const max = item.max_impressions || item.max_usage;
    const current = item.cumulative_impressions || item.current_usage;
    if (!max) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const getUsageBarColor = (item: DieTemplate) => {
    const pct = getUsagePercent(item);
    if (pct >= 95) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMaintenanceProgress = (item: DieTemplate) => {
    if (!item.maintenance_interval || item.maintenance_interval <= 0) return 0;
    const sinceLast = (item.cumulative_impressions || 0) - (item.last_maintenance_impressions || 0);
    return Math.min(100, Math.round((sinceLast / item.maintenance_interval) * 100));
  };

  const getMaintenanceBarColor = (item: DieTemplate) => {
    const pct = getMaintenanceProgress(item);
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <MainLayout title="刀模/网版寿命管理">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-500">总数</div>
              <div className="text-2xl font-bold">{dashboardStats.total_count || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-4">
              <div className="text-sm text-green-600">可用</div>
              <div className="text-2xl font-bold text-green-600">{dashboardStats.available_count || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-4">
              <div className="text-sm text-yellow-600">需保养</div>
              <div className="text-2xl font-bold text-yellow-600">{dashboardStats.warning_count || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="pt-4">
              <div className="text-sm text-orange-600">需重做</div>
              <div className="text-2xl font-bold text-orange-600">{dashboardStats.locked_count || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-500">已报废</div>
              <div className="text-2xl font-bold text-gray-500">{dashboardStats.scrap_count || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-600">待保养</div>
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.maintenance_due_count || 0}</div>
            </CardContent>
          </Card>
        </div>

        {warningList.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5" />
                寿命预警 ({warningList.length})
              </CardTitle>
              <CardDescription className="text-yellow-600">
                以下刀模/网版已达到预警使用次数，请注意及时保养或更换！
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编号</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>累计/最大</TableHead>
                    <TableHead>使用率</TableHead>
                    <TableHead>生命周期状态</TableHead>
                    <TableHead>距上次保养</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warningList.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.template_code}</TableCell>
                      <TableCell>{item.template_name}</TableCell>
                      <TableCell>
                        <Badge className={(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])?.color || 'bg-gray-100'}>
                          {(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])?.label || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.cumulative_impressions || item.current_usage} / {item.max_impressions || item.max_usage}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${getUsageBarColor(item)}`} style={{ width: `${getUsagePercent(item)}%` }} />
                          </div>
                          <span className="text-sm font-medium">{getUsagePercent(item)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.color || 'bg-gray-100'}>
                          {(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.label || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${getMaintenanceBarColor(item)}`} style={{ width: `${getMaintenanceProgress(item)}%` }} />
                          </div>
                          <span className="text-xs">{getMaintenanceProgress(item)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setMaintenanceDialogOpen(true); }}>
                            <Wrench className="h-3 w-3 mr-1" />
                            保养
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setUsageDialogOpen(true); }}>
                            <Activity className="h-3 w-3 mr-1" />
                            记录
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>刀模/网版管理</CardTitle>
                <CardDescription>管理刀模和丝网版的使用寿命、预警、保养和生命周期</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索编号/名称/二维码..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="1">刀模</SelectItem>
                    <SelectItem value="2">丝网版</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dieStatusFilter} onValueChange={setDieStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="生命周期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="available">可用</SelectItem>
                    <SelectItem value="in_use">使用中</SelectItem>
                    <SelectItem value="maintenance_needed">需保养</SelectItem>
                    <SelectItem value="re_rule_needed">需重做</SelectItem>
                    <SelectItem value="scrap">已报废</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchList}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
                <Button onClick={() => { resetForm(); setEditing(false); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <AnimatedTabs
                tabs={[
                  { label: '资产列表' },
                  { label: '保养记录' },
                  { label: '使用记录' },
                ]}
                activeTab={activeTab === 'list' ? '资产列表' : activeTab === 'maintenance' ? '保养记录' : '使用记录'}
                onTabChange={(label) => {
                  if (label === '资产列表') setActiveTab('list');
                  else if (label === '保养记录') setActiveTab('maintenance');
                  else if (label === '使用记录') setActiveTab('usage');
                }}
              />
            </div>

            {activeTab === 'list' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编号</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>资产类型</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>累计/最大</TableHead>
                    <TableHead>使用率</TableHead>
                    <TableHead>生命周期</TableHead>
                    <TableHead>保养进度</TableHead>
                    <TableHead>存放位置</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        暂无刀模/网版记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((item) => (
                      <TableRow key={item.id} className={
                        item.die_status === 'scrap' ? 'bg-gray-50' :
                        item.die_status === 're_rule_needed' ? 'bg-orange-50' :
                        item.die_status === 'maintenance_needed' ? 'bg-yellow-50' :
                        item.status === 3 ? 'bg-red-50' :
                        item.status === 2 ? 'bg-yellow-50' : ''
                      }>
                        <TableCell className="font-mono">{item.template_code}</TableCell>
                        <TableCell className="font-medium">{item.template_name}</TableCell>
                        <TableCell>
                          <Badge className={(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])?.color || 'bg-gray-100'}>
                            {(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])?.label || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.specification || '-'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{item.cumulative_impressions || item.current_usage}</span>
                            <span className="text-gray-400"> / {item.max_impressions || item.max_usage}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${getUsageBarColor(item)}`} style={{ width: `${getUsagePercent(item)}%` }} />
                            </div>
                            <span className="text-sm font-medium">{getUsagePercent(item)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.color || 'bg-gray-100'}>
                            {(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.label || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${getMaintenanceBarColor(item)}`} style={{ width: `${getMaintenanceProgress(item)}%` }} />
                            </div>
                            <span className="text-xs">{item.maintenance_count || 0}次</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.storage_location || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setDetailData(item); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setUsageDialogOpen(true); }} title="记录使用">
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setMaintenanceDialogOpen(true); }} title="保养">
                              <Wrench className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleLock(item)} title={item.status === 3 ? '解锁' : '锁定'}>
                              {item.status === 3 ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleScrap(item)} title="报废">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === 'maintenance' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">保养记录</h3>
                  <Button variant="outline" onClick={fetchMaintenanceList}>
                    <RefreshCw className="h-4 w-4 mr-2" />刷新
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>保养单号</TableHead>
                      <TableHead>刀模编码</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>保养类型</TableHead>
                      <TableHead>保养前次数</TableHead>
                      <TableHead>保养后次数</TableHead>
                      <TableHead>费用</TableHead>
                      <TableHead>保养人员</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          暂无保养记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenanceList.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.maintenance_no}</TableCell>
                          <TableCell className="font-mono">{record.die_code}</TableCell>
                          <TableCell>{record.template_name}</TableCell>
                          <TableCell>
                            <Badge className={MAINTENANCE_TYPE_MAP[record.maintenance_type]?.color || 'bg-gray-100'}>
                              {MAINTENANCE_TYPE_MAP[record.maintenance_type]?.label || record.maintenance_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.impressions_before}</TableCell>
                          <TableCell>{record.impressions_after}</TableCell>
                          <TableCell>{record.cost ? `¥${record.cost}` : '-'}</TableCell>
                          <TableCell>{record.technician_name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={MAINTENANCE_STATUS_MAP[record.status]?.color || 'bg-gray-100'}>
                              {MAINTENANCE_STATUS_MAP[record.status]?.label || record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.status !== 3 && (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteMaintenance(record)}>
                                完成保养
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}

            {activeTab === 'usage' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">使用记录</h3>
                  <Button variant="outline" onClick={fetchUsageLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />刷新
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>刀模编码</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>工单号</TableHead>
                      <TableHead>工序</TableHead>
                      <TableHead>本次次数</TableHead>
                      <TableHead>累计次数</TableHead>
                      <TableHead>操作员</TableHead>
                      <TableHead>使用日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          暂无使用记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      usageLogList.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono">{log.die_code}</TableCell>
                          <TableCell>{log.template_name}</TableCell>
                          <TableCell className="font-mono">{log.work_order_no || '-'}</TableCell>
                          <TableCell>{log.process_name || '-'}</TableCell>
                          <TableCell className="font-medium">{log.impressions}</TableCell>
                          <TableCell>{log.cumulative_after}</TableCell>
                          <TableCell>{log.operator_name || '-'}</TableCell>
                          <TableCell>{log.usage_date || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editing ? '编辑刀模/网版' : '新增刀模/网版'}</DialogTitle>
              <DialogDescription>{editing ? '修改刀模/网版信息' : '创建新的刀模/网版记录'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>编号 <span className="text-red-500">*</span></Label>
                  <Input value={form.template_code} onChange={(e) => setForm({ ...form, template_code: e.target.value })} disabled={editing} placeholder="如 DM-001" />
                </div>
                <div className="space-y-2">
                  <Label>名称 <span className="text-red-500">*</span></Label>
                  <Input value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} placeholder="刀模/网版名称" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>传统类型</Label>
                  <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v, asset_type: v === '2' ? 'screen_mesh' : 'die' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">刀模</SelectItem>
                      <SelectItem value="2">丝网版</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>资产类型</Label>
                  <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="die">刀模</SelectItem>
                      <SelectItem value="flexo_plate">柔印版</SelectItem>
                      <SelectItem value="screen_mesh">丝网版</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>布局类型</Label>
                  <Select value={form.layout_type} onValueChange={(v) => setForm({ ...form, layout_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_row">单排</SelectItem>
                      <SelectItem value="multi_row">多排</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>单次出件数</Label>
                  <Input type="number" value={form.pieces_per_impression} onChange={(e) => setForm({ ...form, pieces_per_impression: e.target.value })} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label>规格</Label>
                  <Input value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} placeholder="如 300x200mm" />
                </div>
                <div className="space-y-2">
                  <Label>材质</Label>
                  <Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="材质" />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2"><Activity className="h-4 w-4" />寿命参数</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>最大使用次数</Label>
                    <Input type="number" value={form.max_impressions || form.max_usage} onChange={(e) => setForm({ ...form, max_impressions: e.target.value, max_usage: e.target.value })} placeholder="如 50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>已使用次数</Label>
                    <Input type="number" value={form.cumulative_impressions || form.current_usage} onChange={(e) => setForm({ ...form, cumulative_impressions: e.target.value, current_usage: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>预警比例(%)</Label>
                    <Input type="number" value={form.warning_threshold} onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })} placeholder="80" />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2"><WrenchIcon className="h-4 w-4" />保养参数</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>保养间隔次数</Label>
                    <Input type="number" value={form.maintenance_interval} onChange={(e) => setForm({ ...form, maintenance_interval: e.target.value })} placeholder="8000" />
                  </div>
                  <div className="space-y-2">
                    <Label>单价(元)</Label>
                    <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>存放位置</Label>
                    <Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder="A区-01架" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注信息" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={editing ? handleUpdate : handleCreate} className="bg-blue-600 hover:bg-blue-700">
                {editing ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>记录使用</DialogTitle>
              <DialogDescription>
                {selectedItem && `为 ${selectedItem.template_name} (${selectedItem.template_code}) 记录使用次数`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">当前累计</span>
                    <span className="font-medium">{selectedItem.cumulative_impressions || selectedItem.current_usage} / {selectedItem.max_impressions || selectedItem.max_usage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">使用率</span>
                    <span className="font-medium">{getUsagePercent(selectedItem)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">生命周期</span>
                    <Badge className={(DIE_STATUS_MAP[selectedItem.die_status] || STATUS_MAP[selectedItem.status])?.color || 'bg-gray-100'}>
                      {(DIE_STATUS_MAP[selectedItem.die_status] || STATUS_MAP[selectedItem.status])?.label || '-'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>本次使用次数 <span className="text-red-500">*</span></Label>
                <Input type="number" value={usageAmount} onChange={(e) => setUsageAmount(e.target.value)} placeholder="输入使用次数" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>取消</Button>
              <Button onClick={handleDeductUsage} className="bg-blue-600 hover:bg-blue-700">确认记录</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>创建保养记录</DialogTitle>
              <DialogDescription>
                {selectedItem && `为 ${selectedItem.template_name} (${selectedItem.template_code}) 创建保养记录`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">累计使用</span>
                    <span className="font-medium">{selectedItem.cumulative_impressions || selectedItem.current_usage} / {selectedItem.max_impressions || selectedItem.max_usage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">已保养次数</span>
                    <span className="font-medium">{selectedItem.maintenance_count || 0}次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">距上次保养</span>
                    <span className="font-medium">{(selectedItem.cumulative_impressions || 0) - (selectedItem.last_maintenance_impressions || 0)}次</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>保养类型 <span className="text-red-500">*</span></Label>
                <Select value={maintenanceForm.maintenance_type} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">常规保养</SelectItem>
                    <SelectItem value="grinding">磨刃/修版</SelectItem>
                    <SelectItem value="re_rule">重做/翻新</SelectItem>
                    <SelectItem value="replace">更换</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>保养费用(元)</Label>
                  <Input type="number" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>保养人员</Label>
                  <Input value={maintenanceForm.technician_name} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technician_name: e.target.value })} placeholder="保养人员姓名" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={maintenanceForm.remark} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, remark: e.target.value })} placeholder="保养备注" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="complete_immediately"
                  checked={maintenanceForm.complete_immediately}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, complete_immediately: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="complete_immediately" className="text-sm">立即完成保养</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>取消</Button>
              <Button onClick={handleMaintenance} className="bg-blue-600 hover:bg-blue-700">创建保养</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>刀模/网版详情</DialogTitle>
            </DialogHeader>
            {detailData && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">编号：</span>{detailData.template_code}</div>
                  <div><span className="text-gray-500">名称：</span>{detailData.template_name}</div>
                  <div><span className="text-gray-500">资产类型：</span>
                    <Badge className={(ASSET_TYPE_MAP[detailData.asset_type] || TYPE_MAP[detailData.template_type])?.color || 'bg-gray-100'}>
                      {(ASSET_TYPE_MAP[detailData.asset_type] || TYPE_MAP[detailData.template_type])?.label || '-'}
                    </Badge>
                  </div>
                  <div><span className="text-gray-500">生命周期：</span>
                    <Badge className={(DIE_STATUS_MAP[detailData.die_status] || STATUS_MAP[detailData.status])?.color || 'bg-gray-100'}>
                      {(DIE_STATUS_MAP[detailData.die_status] || STATUS_MAP[detailData.status])?.label || '-'}
                    </Badge>
                  </div>
                  <div><span className="text-gray-500">规格：</span>{detailData.specification || '-'}</div>
                  <div><span className="text-gray-500">材质：</span>{detailData.material || '-'}</div>
                  <div><span className="text-gray-500">布局：</span>{detailData.layout_type === 'multi_row' ? '多排' : '单排'}</div>
                  <div><span className="text-gray-500">单次出件：</span>{detailData.pieces_per_impression || 1}</div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">寿命信息</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">使用率</span>
                      <span className="text-sm font-medium">{getUsagePercent(detailData)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${getUsageBarColor(detailData)}`} style={{ width: `${getUsagePercent(detailData)}%` }} />
                    </div>
                    <div className="text-xs text-gray-400">
                      {detailData.cumulative_impressions || detailData.current_usage} / {detailData.max_impressions || detailData.max_usage} 次
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">保养信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">已保养：</span>{detailData.maintenance_count || 0}次</div>
                    <div><span className="text-gray-500">间隔：</span>{detailData.maintenance_interval || '-'}次</div>
                    <div><span className="text-gray-500">上次保养：</span>{detailData.last_maintenance_date || '-'}</div>
                    <div><span className="text-gray-500">最后使用：</span>{detailData.last_used_date || '-'}</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">保养进度</span>
                      <span className="text-sm">{getMaintenanceProgress(detailData)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className={`h-full ${getMaintenanceBarColor(detailData)}`} style={{ width: `${getMaintenanceProgress(detailData)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">单价：</span>¥{detailData.unit_price || 0}</div>
                  <div><span className="text-gray-500">存放位置：</span>{detailData.storage_location || '-'}</div>
                  <div><span className="text-gray-500">购买日期：</span>{detailData.purchase_date || '-'}</div>
                  <div><span className="text-gray-500">二维码：</span>{detailData.qr_code || '-'}</div>
                </div>
                {detailData.remark && (
                  <div className="border-t pt-3 text-sm">
                    <span className="text-gray-500">备注：</span>{detailData.remark}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
