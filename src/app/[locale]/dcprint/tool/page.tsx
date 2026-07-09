'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Wrench,
  Ban,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Tool {
  id: number;
  tool_type: number;
  tool_code: string;
  tool_name: string;
  spec: string | null;
  total_life: number;
  warning_threshold: number;
  used_count: number;
  remain_life: number;
  original_cost: string;
  accumulated_cost: string;
  net_value: string;
  unit_cost: string;
  status: number;
  manufacture_date: string | null;
  warehouse_location: string | null;
  remark: string | null;
}

interface UsageRecord {
  id: number;
  work_order_no: string | null;
  process_name: string | null;
  use_count: number;
  amortized_cost: string;
  operator_name: string | null;
  use_time: string;
}

interface MaintenanceRecord {
  id: number;
  maintenance_type: number;
  maintenance_cost: string;
  description: string | null;
  life_before: number;
  life_after: number;
  life_adjustment: number;
  status: number;
  start_time: string;
  end_time: string | null;
  operator_name: string | null;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: tc('text_gw1v'), variant: 'secondary' },
  2: { label: tc('text_fgu8'), variant: 'default' },
  3: { label: tc('text_izg1f'), variant: 'outline' },
  4: { label: tc('text_qpgi'), variant: 'destructive' },
  5: { label: tc('text_e8o3w'), variant: 'destructive' },
};

const TYPE_MAP: Record<number, string> = { 1: tc('text_ej35'), 2: tc('text_ma6v') };

export default function ToolManagementPage() {
  const t = useTranslations();
  const { toast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [detailTool, setDetailTool] = useState<Tool | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  const [usageDialogTool, setUsageDialogTool] = useState<Tool | null>(null);
  const [maintDialogTool, setMaintDialogTool] = useState<Tool | null>(null);
  const [scrapDialogTool, setScrapDialogTool] = useState<Tool | null>(null);

  const [formData, setFormData] = useState({
    tool_type: 1,
    tool_code: '',
    tool_name: '',
    spec: '',
    total_life: 10000,
    warning_threshold: 8000,
    original_cost: 0,
    manufacture_date: '',
    warehouse_location: '',
    remark: '',
  });
  const [usageForm, setUsageForm] = useState({
    useCount: 1,
    workOrderNo: '',
    processName: '',
    remark: '',
  });
  const [maintForm, setMaintForm] = useState({
    maintenanceType: 1,
    description: '',
    completeAction: false,
    maintenanceId: 0,
    maintenanceCost: 0,
    lifeAfter: 0,
  });
  const [scrapForm, setScrapForm] = useState({ scrapReason: '' });

  const [dashboard, setDashboard] = useState({
    totalTools: 0,
    activeTools: 0,
    warningTools: 0,
    maintenanceTools: 0,
    scrappedTools: 0,
    totalNetValue: 0,
  });

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterType) params.set('toolType', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (keyword) params.set('keyword', keyword);
      const res = await authFetch(`/api/dcprint/tool?${params}`);
      const data = await res.json();
      if (data.success) {
        setTools(data.data?.list || []);
        setTotal(data.data?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterType, filterStatus, keyword]);

  const fetchDashboard = useCallback(async () => {
    const res = await authFetch('/api/dcprint/tool/dashboard');
    const data = await res.json();
    if (data.success) setDashboard(data.data);
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const openCreate = () => {
    setEditTool(null);
    setFormData({
      tool_type: 1,
      tool_code: '',
      tool_name: '',
      spec: '',
      total_life: 10000,
      warning_threshold: 8000,
      original_cost: 0,
      manufacture_date: '',
      warehouse_location: '',
      remark: '',
    });
    setCreateOpen(true);
  };

  const openEdit = (tool: Tool) => {
    setEditTool(tool);
    setFormData({
      tool_type: tool.tool_type,
      tool_code: tool.tool_code,
      tool_name: tool.tool_name,
      spec: tool.spec || '',
      total_life: tool.total_life,
      warning_threshold: tool.warning_threshold,
      original_cost: Number(tool.original_cost),
      manufacture_date: tool.manufacture_date || '',
      warehouse_location: tool.warehouse_location || '',
      remark: tool.remark || '',
    });
    setCreateOpen(true);
  };

  const submitForm = async () => {
    const method = editTool ? 'PUT' : 'POST';
    const url = editTool ? `/api/dcprint/tool/${editTool.id}` : '/api/dcprint/tool';
    const body = editTool
      ? {
          tool_name: formData.tool_name,
          spec: formData.spec,
          total_life: formData.total_life,
          warning_threshold: formData.warning_threshold,
          warehouse_location: formData.warehouse_location,
          remark: formData.remark,
        }
      : formData;
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: editTool ? '更新成功' : '创建成功' });
      setCreateOpen(false);
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const openDetail = async (tool: Tool) => {
    setDetailTool(tool);
    const [uRes, mRes] = await Promise.all([
      authFetch(`/api/dcprint/tool/${tool.id}/usage`),
      authFetch(`/api/dcprint/tool/${tool.id}/maintenance`),
    ]);
    const [uData, mData] = await Promise.all([uRes.json(), mRes.json()]);
    setUsageRecords(uData.data?.list || []);
    setMaintenanceRecords(mData.data?.list || []);
  };

  const submitUsage = async () => {
    if (!usageDialogTool) return;
    const res = await authFetch(`/api/dcprint/tool/${usageDialogTool.id}/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usageForm),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: '使用记录已登记' });
      setUsageDialogTool(null);
      setUsageForm({ useCount: 1, workOrderNo: '', processName: '', remark: '' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const submitMaintenance = async () => {
    if (!maintDialogTool) return;
    const body = maintForm.completeAction
      ? {
          action: 'complete',
          maintenanceId: maintForm.maintenanceId,
          maintenanceCost: maintForm.maintenanceCost,
          lifeAfter: maintForm.lifeAfter,
        }
      : { maintenanceType: maintForm.maintenanceType, description: maintForm.description };
    const res = await authFetch(`/api/dcprint/tool/${maintDialogTool.id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: maintForm.completeAction ? '维修已完成' : '维修已开始' });
      setMaintDialogTool(null);
      setMaintForm({
        maintenanceType: 1,
        description: '',
        completeAction: false,
        maintenanceId: 0,
        maintenanceCost: 0,
        lifeAfter: 0,
      });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const submitScrap = async () => {
    if (!scrapDialogTool) return;
    const res = await authFetch(`/api/dcprint/tool/${scrapDialogTool.id}/scrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapForm),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: '工装已报废' });
      setScrapDialogTool(null);
      setScrapForm({ scrapReason: '' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const activateTool = async (tool: Tool) => {
    const res = await authFetch(`/api/dcprint/tool/${tool.id}/activate`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      toast({ title: '工装已激活' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const deleteTool = async (tool: Tool) => {
    if (!confirm(`确认删除工装 ${tool.tool_code}？`)) return;
    const res = await authFetch(`/api/dcprint/tool/${tool.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast({ title: '删除成功' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: '操作失败', description: data.message, variant: 'destructive' });
    }
  };

  const lifePercent = (tool: Tool) => {
    if (tool.total_life <= 0) return 0;
    return Math.round((tool.used_count / tool.total_life) * 100);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('text_6oqc3w')}</h1>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {tc('text_d762ge')}
          </Button>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_ceubkl')}</p>
              <p className="text-2xl font-bold">{dashboard.totalTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_fgu8')}</p>
              <p className="text-2xl font-bold text-green-600">{dashboard.activeTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_qpgi')}</p>
              <p className="text-2xl font-bold text-orange-600">{dashboard.warningTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_izg1f')}</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.maintenanceTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_e8o3w')}</p>
              <p className="text-2xl font-bold text-red-600">{dashboard.scrappedTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tc('text_ifh114')}</p>
              <p className="text-2xl font-bold">¥{dashboard.totalNetValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-4 items-center">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{tc('text_avglbk')}</SelectItem>
              <SelectItem value="1">{tc('text_ej35')}</SelectItem>
              <SelectItem value="2">{tc('text_ma6v')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{tc('text_avez63')}</SelectItem>
              <SelectItem value="1">{tc('text_gw1v')}</SelectItem>
              <SelectItem value="2">{tc('text_fgu8')}</SelectItem>
              <SelectItem value="3">{tc('text_izg1f')}</SelectItem>
              <SelectItem value="4">{tc('text_qpgi')}</SelectItem>
              <SelectItem value="5">{tc('text_e8o3w')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="编码/名称搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64"
            onKeyDown={(e) => e.key === 'Enter' && fetchTools()}
          />
          <Button variant="outline" onClick={fetchTools}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('text_lnjk')}</TableHead>
                  <TableHead>{tc('text_m9wr')}</TableHead>
                  <TableHead>{tc('text_eyrn')}</TableHead>
                  <TableHead>{tc('text_bysdu1')}</TableHead>
                  <TableHead>{tc('text_ecfw')}</TableHead>
                  <TableHead>{tc('text_k1e3')}</TableHead>
                  <TableHead>{tc('text_hkxb')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {tc('text_dcv57g')}
                    </TableCell>
                  </TableRow>
                ) : (
                  tools.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell>
                        <Badge variant="outline">{TYPE_MAP[tool.tool_type]}</Badge>
                      </TableCell>
                      <TableCell
                        className="font-mono cursor-pointer hover:underline"
                        onClick={() => openDetail(tool)}
                      >
                        {tool.tool_code}
                      </TableCell>
                      <TableCell>{tool.tool_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${lifePercent(tool) >= 80 ? 'bg-red-500' : lifePercent(tool) >= 60 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${lifePercent(tool)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {tool.used_count}/{tool.total_life}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>¥{Number(tool.net_value).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_MAP[tool.status]?.variant || 'default'}>
                          {STATUS_MAP[tool.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tool.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => activateTool(tool)}
                              title="激活"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {(tool.status === 2 || tool.status === 4) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setUsageDialogTool(tool)}
                              title="登记使用"
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                          )}
                          {(tool.status === 2 || tool.status === 4) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMaintDialogTool(tool)}
                              title="维修"
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                          )}
                          {tool.status !== 5 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setScrapDialogTool(tool)}
                              title="报废"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(tool)}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTool(tool)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editTool ? '编辑工装' : '新增工装'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {!editTool && (
                <>
                  <div>
                    <Label>{tc('text_cez1tc')}</Label>
                    <Select
                      value={String(formData.tool_type)}
                      onValueChange={(v) => setFormData({ ...formData, tool_type: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectContent>
                          <SelectItem value="1">{tc('text_ej35')}</SelectItem>
                          <SelectItem value="2">{tc('text_ma6v')}</SelectItem>
                        </SelectContent>
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label>{tc('text_cezo6j')}</Label>
                    <Input
                      value={formData.tool_code}
                      onChange={(e) => setFormData({ ...formData, tool_code: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label>{tc('text_cesd1f')}</Label>
                <Input
                  value={formData.tool_name}
                  onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('text_o06w')}</Label>
                <Input
                  value={formData.spec}
                  onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_nktn4b')}</Label>
                <Input
                  type="number"
                  value={formData.total_life}
                  onChange={(e) => setFormData({ ...formData, total_life: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('text_hucgoq')}</Label>
                <Input
                  type="number"
                  value={formData.warning_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, warning_threshold: Number(e.target.value) })
                  }
                />
              </div>
              {!editTool && (
                <div>
                  <Label>{tc('text_avx7q1')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.original_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, original_cost: Number(e.target.value) })
                    }
                  />
                </div>
              )}
              <div>
                <Label>{tc('text_bxzajr')}</Label>
                <Input
                  value={formData.warehouse_location}
                  onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_apeqtc')}</Label>
                <Input
                  type="date"
                  value={formData.manufacture_date}
                  onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('text_fqo1')}</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={submitForm}>{tc('text_kzjg')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!detailTool} onOpenChange={(v) => !v && setDetailTool(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {tc('text_i35nw')}
                {detailTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            {detailTool && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{tc('text_in9vu')}</span>{' '}
                    {TYPE_MAP[detailTool.tool_type]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_cvxuf')}</span>{' '}
                    {detailTool.tool_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_ko5z6')}</span>{' '}
                    {detailTool.spec || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_h9767')}</span>{' '}
                    <Badge variant={STATUS_MAP[detailTool.status]?.variant}>
                      {STATUS_MAP[detailTool.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_umhogx')}</span>{' '}
                    {detailTool.total_life}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_re8gad')}</span>{' '}
                    {detailTool.used_count}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_mjeyd0')}</span>{' '}
                    {detailTool.remain_life}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_oqq97g')}</span>{' '}
                    {detailTool.warning_threshold}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_cmkwt')}</span> ¥
                    {Number(detailTool.original_cost).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_a7fw9w')}</span> ¥
                    {Number(detailTool.accumulated_cost).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_ccpq6')}</span> ¥
                    {Number(detailTool.net_value).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('text_fej5n2')}</span> ¥
                    {Number(detailTool.unit_cost).toFixed(4)}
                  </div>
                </div>
                <Tabs defaultValue="usage">
                  <TabsList>
                    <TabsTrigger value="usage">{tc('text_aisnou')}</TabsTrigger>
                    <TabsTrigger value="maintenance">{tc('text_gctspr')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="usage">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc('text_i5z2')}</TableHead>
                          <TableHead>{tc('text_e5qlj')}</TableHead>
                          <TableHead>{tc('text_ghmy')}</TableHead>
                          <TableHead>{tc('text_is1b')}</TableHead>
                          <TableHead>{tc('text_arlt0g')}</TableHead>
                          <TableHead>{tc('text_f5g8b')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-4"
                            >
                              {tc('text_dd1mmb')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          usageRecords.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{new Date(r.use_time).toLocaleString()}</TableCell>
                              <TableCell>{r.work_order_no || '-'}</TableCell>
                              <TableCell>{r.process_name || '-'}</TableCell>
                              <TableCell>{r.use_count}</TableCell>
                              <TableCell>¥{Number(r.amortized_cost).toFixed(4)}</TableCell>
                              <TableCell>{r.operator_name || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="maintenance">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc('text_lnjk')}</TableHead>
                          <TableHead>{tc('text_onwv')}</TableHead>
                          <TableHead>{tc('text_byrrn3')}</TableHead>
                          <TableHead>{tc('text_k1e3')}</TableHead>
                          <TableHead>{tc('text_i5z2')}</TableHead>
                          <TableHead>{tc('text_hrlt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-4"
                            >
                              {tc('text_dd1mmb')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          maintenanceRecords.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.maintenance_type === 1 ? '维修' : '保养'}</TableCell>
                              <TableCell>¥{Number(r.maintenance_cost).toFixed(2)}</TableCell>
                              <TableCell>
                                {r.life_before} → {r.life_after} (
                                {r.life_adjustment >= 0 ? '+' : ''}
                                {r.life_adjustment})
                              </TableCell>
                              <TableCell>
                                {r.status === 1 ? (
                                  <Badge variant="outline">{tc('text_lq5q4')}</Badge>
                                ) : (
                                  <Badge>{tc('text_e7hbq')}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {r.start_time} ~ {r.end_time || '-'}
                              </TableCell>
                              <TableCell>{r.description || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Usage Dialog */}
        <Dialog open={!!usageDialogTool} onOpenChange={(v) => !v && setUsageDialogTool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tc('text_14efe3')}
                {usageDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>
                  {tc('text_1xw61i')}
                  {usageDialogTool?.remain_life})
                </Label>
                <Input
                  type="number"
                  value={usageForm.useCount}
                  onChange={(e) => setUsageForm({ ...usageForm, useCount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('text_k3zlyy')}</Label>
                <Input
                  value={usageForm.workOrderNo}
                  onChange={(e) => setUsageForm({ ...usageForm, workOrderNo: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_c8ls99')}</Label>
                <Input
                  value={usageForm.processName}
                  onChange={(e) => setUsageForm({ ...usageForm, processName: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_fqo1')}</Label>
                <Input
                  value={usageForm.remark}
                  onChange={(e) => setUsageForm({ ...usageForm, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogTool(null)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={submitUsage}>{tc('text_kzjg')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={!!maintDialogTool} onOpenChange={(v) => !v && setMaintDialogTool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tc('text_gc5jbb')}
                {maintDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={!maintForm.completeAction ? 'default' : 'outline'}
                  onClick={() => setMaintForm({ ...maintForm, completeAction: false })}
                >
                  {tc('text_b5wslc')}
                </Button>
                <Button
                  variant={maintForm.completeAction ? 'default' : 'outline'}
                  onClick={() => setMaintForm({ ...maintForm, completeAction: true })}
                >
                  {tc('text_bynkou')}
                </Button>
              </div>
              {!maintForm.completeAction ? (
                <>
                  <div>
                    <Label>{tc('text_gcr622')}</Label>
                    <Select
                      value={String(maintForm.maintenanceType)}
                      onValueChange={(v) =>
                        setMaintForm({ ...maintForm, maintenanceType: Number(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectContent>
                          <SelectItem value="1">{tc('text_m16i')}</SelectItem>
                          <SelectItem value="2">{tc('text_e14u')}</SelectItem>
                        </SelectContent>
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label>{tc('text_gcjvta')}</Label>
                    <Textarea
                      value={maintForm.description}
                      onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>{tc('text_kljgmy')}</Label>
                    <Input
                      type="number"
                      value={maintForm.maintenanceId}
                      onChange={(e) =>
                        setMaintForm({ ...maintForm, maintenanceId: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tc('text_gcu6fd')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={maintForm.maintenanceCost}
                      onChange={(e) =>
                        setMaintForm({ ...maintForm, maintenanceCost: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tc('text_6ge4se')}</Label>
                    <Input
                      type="number"
                      value={maintForm.lifeAfter}
                      onChange={(e) =>
                        setMaintForm({ ...maintForm, lifeAfter: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{tc('text_gcjvta')}</Label>
                    <Input
                      value={maintForm.description}
                      onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaintDialogTool(null)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={submitMaintenance}>{tc('text_kzjg')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scrap Dialog */}
        <Dialog open={!!scrapDialogTool} onOpenChange={(v) => !v && setScrapDialogTool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tc('text_kdlsk9')}
                {scrapDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{tc('text_qz3ind')}</span>
              </div>
              <div>
                <Label>{tc('text_cu6am3')}</Label>
                <Textarea
                  value={scrapForm.scrapReason}
                  onChange={(e) => setScrapForm({ ...scrapForm, scrapReason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScrapDialogTool(null)}>
                {tc('text_ev02')}
              </Button>
              <Button variant="destructive" onClick={submitScrap}>
                {tc('text_frrbww')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
