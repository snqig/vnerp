'use client';
import { useTranslations } from 'next-intl';

import { authFetch } from '@/lib/auth-fetch';
import { TOOL_TYPE_LABEL, TOOL_STATUS_LABEL } from '@/lib/status-labels';
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
  // 体系B 字段
  asset_type: string | null;
  layout_type: string | null;
  pieces_per_impression: number | null;
  material: string | null;
  qr_code: string | null;
  supplier_id: number | null;
  maintenance_interval: number | null;
  maintenance_count: number | null;
  last_used_date: string | null;
  // 体系C 字段
  mesh_count: string | null;
  mesh_material: string | null;
  size: string | null;
  tension_value: number | null;
  frame_type: string | null;
  customer_id: number | null;
  reclaim_count: number | null;
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
  1: { label: TOOL_STATUS_LABEL[1], variant: 'secondary' },
  2: { label: TOOL_STATUS_LABEL[2], variant: 'default' },
  3: { label: TOOL_STATUS_LABEL[3], variant: 'outline' },
  4: { label: TOOL_STATUS_LABEL[4], variant: 'destructive' },
  5: { label: TOOL_STATUS_LABEL[5], variant: 'destructive' },
};

const TYPE_MAP = TOOL_TYPE_LABEL;

export default function ToolManagementPage() {
  const tc = useTranslations('Common');
  const ts = useTranslations('Dcprint');
  const { toast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  const [_total, _setTotal] = useState(0);
  const [page, _setPage] = useState(1);
  const [pageSize] = useState(20);
  const [_loading, setLoading] = useState(false);
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
    // 体系B 字段 (刀模)
    asset_type: '',
    layout_type: '',
    pieces_per_impression: 0,
    material: '',
    qr_code: '',
    supplier_id: 0,
    maintenance_interval: 0,
    // 体系C 字段 (网版)
    mesh_count: '',
    mesh_material: '',
    size: '',
    tension_value: 0,
    frame_type: '',
    customer_id: 0,
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
        _setTotal(data.data?.total || 0);
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
      asset_type: '',
      layout_type: '',
      pieces_per_impression: 0,
      material: '',
      qr_code: '',
      supplier_id: 0,
      maintenance_interval: 0,
      mesh_count: '',
      mesh_material: '',
      size: '',
      tension_value: 0,
      frame_type: '',
      customer_id: 0,
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
      asset_type: tool.asset_type || '',
      layout_type: tool.layout_type || '',
      pieces_per_impression: tool.pieces_per_impression || 0,
      material: tool.material || '',
      qr_code: tool.qr_code || '',
      supplier_id: tool.supplier_id || 0,
      maintenance_interval: tool.maintenance_interval || 0,
      mesh_count: tool.mesh_count || '',
      mesh_material: tool.mesh_material || '',
      size: tool.size || '',
      tension_value: tool.tension_value || 0,
      frame_type: tool.frame_type || '',
      customer_id: tool.customer_id || 0,
      remark: tool.remark || '',
    });
    setCreateOpen(true);
  };

  const submitForm = async () => {
    const method = editTool ? 'PUT' : 'POST';
    const url = editTool ? `/api/dcprint/tool/${editTool.id}` : '/api/dcprint/tool';
    const commonFields = {
      toolName: formData.tool_name,
      spec: formData.spec,
      totalLife: formData.total_life,
      warningThreshold: formData.warning_threshold,
      warehouseLocation: formData.warehouse_location,
      assetType: formData.asset_type || undefined,
      layoutType: formData.layout_type || undefined,
      piecesPerImpression: formData.pieces_per_impression || undefined,
      material: formData.material || undefined,
      qrCode: formData.qr_code || undefined,
      supplierId: formData.supplier_id || undefined,
      maintenanceInterval: formData.maintenance_interval || undefined,
      meshCount: formData.mesh_count || undefined,
      meshMaterial: formData.mesh_material || undefined,
      size: formData.size || undefined,
      tensionValue: formData.tension_value || undefined,
      frameType: formData.frame_type || undefined,
      customerId: formData.customer_id || undefined,
      remark: formData.remark,
    };
    const body = editTool
      ? commonFields
      : {
          toolType: formData.tool_type,
          toolCode: formData.tool_code,
          originalCost: formData.original_cost,
          manufactureDate: formData.manufacture_date,
          ...commonFields,
        };
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: editTool ? ts('k_1795bzg') : ts('k_kiombh') });
      setCreateOpen(false);
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
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
      toast({ title: ts('k_1umgyqi') });
      setUsageDialogTool(null);
      setUsageForm({ useCount: 1, workOrderNo: '', processName: '', remark: '' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
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
      toast({ title: maintForm.completeAction ? ts('k_172ojqz') : ts('k_10kx2wi') });
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
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
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
      toast({ title: ts('k_15g5muj') });
      setScrapDialogTool(null);
      setScrapForm({ scrapReason: '' });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
    }
  };

  const activateTool = async (tool: Tool) => {
    const res = await authFetch(`/api/dcprint/tool/${tool.id}/activate`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      toast({ title: ts('k_77f5be') });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
    }
  };

  const deleteTool = async (tool: Tool) => {
    if (!confirm(`确认删除工装 ${tool.tool_code}？`)) return;
    const res = await authFetch(`/api/dcprint/tool/${tool.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast({ title: ts('k_1hlqs') });
      fetchTools();
      fetchDashboard();
    } else {
      toast({ title: ts('k_ydow7a'), description: data.message, variant: 'destructive' });
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
          <h1 className="text-2xl font-bold">{tc('dcDieMgmtTitle')}</h1>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {ts('k_l7139x')}</Button>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_p51e5n')}</p>
              <p className="text-2xl font-bold">{dashboard.totalTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_16d9hd9')}</p>
              <p className="text-2xl font-bold text-green-600">{dashboard.activeTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_1qswpkf')}</p>
              <p className="text-2xl font-bold text-orange-600">{dashboard.warningTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_1jvastq')}</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.maintenanceTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_oy744d')}</p>
              <p className="text-2xl font-bold text-red-600">{dashboard.scrappedTools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{ts('k_11rvyiu')}</p>
              <p className="text-2xl font-bold">¥{dashboard.totalNetValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-4 items-center">
          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList>
              <TabsTrigger value="">{ts('k_q6w6ul')}</TabsTrigger>
              <TabsTrigger value="1">{ts('k_1c01k7u')}</TabsTrigger>
              <TabsTrigger value="2">{ts('k_cu41ng')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={ts('k_igzce8')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{ts('k_igzce8')}</SelectItem>
              <SelectItem value="1">{ts('k_1uo0lr5')}</SelectItem>
              <SelectItem value="2">{ts('k_16d9hd9')}</SelectItem>
              <SelectItem value="3">{ts('k_1jvastq')}</SelectItem>
              <SelectItem value="4">{ts('k_1qswpkf')}</SelectItem>
              <SelectItem value="5">{ts('k_oy744d')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={ts('k_n1bcu2')}
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
                  <TableHead>{ts('k_anh4cj')}</TableHead>
                  <TableHead>{ts('k_1lqzgmw')}</TableHead>
                  <TableHead>{ts('k_hzx914')}</TableHead>
                  <TableHead>{ts('k_icsrfi')}</TableHead>
                  <TableHead>{ts('k_2dlv89')}</TableHead>
                  <TableHead>{ts('k_1ccx4t4')}</TableHead>
                  <TableHead>{ts('k_501w24')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {ts('k_6tzr61')}</TableCell>
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
                              title={ts('k_sgmlm4')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {(tool.status === 2 || tool.status === 4) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setUsageDialogTool(tool)}
                              title={ts('k_dbhsap')}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                          )}
                          {(tool.status === 2 || tool.status === 4) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMaintDialogTool(tool)}
                              title={ts('k_v1x3nb')}
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                          )}
                          {tool.status !== 5 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setScrapDialogTool(tool)}
                              title={ts('k_19qx965')}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(tool)}
                            title={ts('k_qreyeg')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTool(tool)}
                            title={ts('k_1t2vi4h')}
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
              <DialogTitle>{editTool ? ts('k_1fn4ph2') : ts('k_l7139x')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {!editTool && (
                <>
                  <div>
                    <Label>{ts('k_l1tjwl')}</Label>
                    <Select
                      value={String(formData.tool_type)}
                      onValueChange={(v) => setFormData({ ...formData, tool_type: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectContent>
                          <SelectItem value="1">{ts('k_1c01k7u')}</SelectItem>
                          <SelectItem value="2">{ts('k_cu41ng')}</SelectItem>
                        </SelectContent>
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label>{ts('k_1luw1xa')}</Label>
                    <Input
                      value={formData.tool_code}
                      onChange={(e) => setFormData({ ...formData, tool_code: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label>{ts('k_mr44aa')}</Label>
                <Input
                  value={formData.tool_name}
                  onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{ts('k_1h40xod')}</Label>
                <Input
                  value={formData.spec}
                  onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1oqt4so')}</Label>
                <Input
                  type="number"
                  value={formData.total_life}
                  onChange={(e) => setFormData({ ...formData, total_life: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{ts('k_oymdqb')}</Label>
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
                  <Label>{ts('k_1eoe4rx')}</Label>
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
                <Label>{ts('k_d69pno')}</Label>
                <Input
                  value={formData.warehouse_location}
                  onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1o091e7')}</Label>
                <Input
                  type="date"
                  value={formData.manufacture_date}
                  onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                />
              </div>
              {/* 体系B 字段 — 仅刀模显示 */}
              {formData.tool_type === 1 && (
                <>
                  <div>
                    <Label>{ts('k_1lx7ycq')}</Label>
                    <Input
                      value={formData.asset_type}
                      onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{ts('k_lplv3p')}</Label>
                    <Input
                      value={formData.layout_type}
                      onChange={(e) => setFormData({ ...formData, layout_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{ts('k_qtro5y')}</Label>
                    <Input
                      type="number"
                      value={formData.pieces_per_impression}
                      onChange={(e) =>
                        setFormData({ ...formData, pieces_per_impression: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{ts('k_1unntut')}</Label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{ts('k_ylv7q')}</Label>
                    <Input
                      type="number"
                      value={formData.maintenance_interval}
                      onChange={(e) =>
                        setFormData({ ...formData, maintenance_interval: Number(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}
              {/* 体系C 字段 — 仅网版显示 */}
              {formData.tool_type === 2 && (
                <>
                  <div>
                    <Label>{ts('k_1if2z7')}</Label>
                    <Input
                      value={formData.mesh_count}
                      onChange={(e) => setFormData({ ...formData, mesh_count: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{ts('k_i5tiuz')}</Label>
                    <Input
                      value={formData.mesh_material}
                      onChange={(e) => setFormData({ ...formData, mesh_material: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{ts('k_d1l9cf')}</Label>
                    <Input
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{tc('dcTensionHead')}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.tension_value}
                      onChange={(e) =>
                        setFormData({ ...formData, tension_value: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{ts('k_17500oc')}</Label>
                    <Input
                      value={formData.frame_type}
                      onChange={(e) => setFormData({ ...formData, frame_type: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label>{ts('k_b5m1l6')}</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={submitForm}>{tc('ok')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!detailTool} onOpenChange={(v) => !v && setDetailTool(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {ts('k_1mxcral')}
                {detailTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            {detailTool && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{ts('k_anh4cj')}</span>{' '}
                    {TYPE_MAP[detailTool.tool_type]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_hzx914')}</span> {detailTool.tool_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_1h40xod')}</span> {detailTool.spec || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_1ccx4t4')}</span>{' '}
                    <Badge variant={STATUS_MAP[detailTool.status]?.variant}>
                      {STATUS_MAP[detailTool.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_h6uj8m')}</span>{' '}
                    {detailTool.total_life}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_zss8zq')}</span>{' '}
                    {detailTool.used_count}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_537igf')}</span>{' '}
                    {detailTool.remain_life}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_8u838b')}</span>{' '}
                    {detailTool.warning_threshold}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_12o2s46')}</span> ¥
                    {Number(detailTool.original_cost).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_1xx8wuw')}</span> ¥
                    {Number(detailTool.accumulated_cost).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_2dlv89')}</span> ¥
                    {Number(detailTool.net_value).toFixed(2)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('unitCost')}</span> ¥
                    {Number(detailTool.unit_cost).toFixed(4)}
                  </div>
                </div>
                <Tabs defaultValue="usage">
                  <TabsList>
                    <TabsTrigger value="usage">{ts('k_1l1uap5')}</TabsTrigger>
                    <TabsTrigger value="maintenance">{ts('k_11672sw')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="usage">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ts('k_1f90xvr')}</TableHead>
                          <TableHead>{ts('k_jzt8aw')}</TableHead>
                          <TableHead>{ts('k_x2eipp')}</TableHead>
                          <TableHead>{ts('k_lk7ip5')}</TableHead>
                          <TableHead>{ts('k_14s86i5')}</TableHead>
                          <TableHead>{ts('k_15sp2wy')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-4"
                            >
                              {ts('k_11itye0')}</TableCell>
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
                          <TableHead>{ts('k_anh4cj')}</TableHead>
                          <TableHead>{ts('k_1j4app0')}</TableHead>
                          <TableHead>{ts('k_b5m1l6')}</TableHead>
                          <TableHead>{ts('k_1ccx4t4')}</TableHead>
                          <TableHead>{ts('k_1f90xvr')}</TableHead>
                          <TableHead>{ts('k_1kxyax6')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-4"
                            >
                              {ts('k_11itye0')}</TableCell>
                          </TableRow>
                        ) : (
                          maintenanceRecords.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.maintenance_type === 1 ? ts('k_v1x3nb') : ts('k_1ltui15')}</TableCell>
                              <TableCell>¥{Number(r.maintenance_cost).toFixed(2)}</TableCell>
                              <TableCell>
                                {r.life_before} → {r.life_after} (
                                {r.life_adjustment >= 0 ? '+' : ''}
                                {r.life_adjustment})
                              </TableCell>
                              <TableCell>
                                {r.status === 1 ? (
                                  <Badge variant="outline">{ts('k_1tclykd')}</Badge>
                                ) : (
                                  <Badge>{ts('k_19j4h')}</Badge>
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
                {ts('k_1l1uap5')}
                {usageDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>
                  {ts('k_537igf')}
                  {usageDialogTool?.remain_life})
                </Label>
                <Input
                  type="number"
                  value={usageForm.useCount}
                  onChange={(e) => setUsageForm({ ...usageForm, useCount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{ts('k_lk7ip5')}</Label>
                <Input
                  value={usageForm.workOrderNo}
                  onChange={(e) => setUsageForm({ ...usageForm, workOrderNo: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_2jnrc0')}</Label>
                <Input
                  value={usageForm.processName}
                  onChange={(e) => setUsageForm({ ...usageForm, processName: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_b5m1l6')}</Label>
                <Input
                  value={usageForm.remark}
                  onChange={(e) => setUsageForm({ ...usageForm, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogTool(null)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={submitUsage}>{tc('ok')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={!!maintDialogTool} onOpenChange={(v) => !v && setMaintDialogTool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {ts('k_153mfl6')}
                {maintDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={!maintForm.completeAction ? 'default' : 'outline'}
                  onClick={() => setMaintForm({ ...maintForm, completeAction: false })}
                >
                  {ts('k_1muy07r')}
                </Button>
                <Button
                  variant={maintForm.completeAction ? 'default' : 'outline'}
                  onClick={() => setMaintForm({ ...maintForm, completeAction: true })}
                >
                  {ts('k_1589w37')}
                </Button>
              </div>
              {!maintForm.completeAction ? (
                <>
                  <div>
                    <Label>{ts('k_1migccd')}</Label>
                    <Select
                      value={String(maintForm.maintenanceType)}
                      onValueChange={(v) =>
                        setMaintForm({ ...maintForm, maintenanceType: Number(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectContent>
                          <SelectItem value="1">{ts('k_v1x3nb')}</SelectItem>
                          <SelectItem value="2">{ts('k_1ltui15')}</SelectItem>
                        </SelectContent>
                      </SelectTrigger>
                    </Select>
                  </div>
                  <div>
                    <Label>{ts('k_b5m1l6')}</Label>
                    <Textarea
                      value={maintForm.description}
                      onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>{ts('k_1cy40a0')}</Label>
                    <Input
                      type="number"
                      value={maintForm.maintenanceId}
                      onChange={(e) =>
                        setMaintForm({ ...maintForm, maintenanceId: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{ts('k_m3ig3q')}</Label>
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
                    <Label>{ts('k_1jnzi')}</Label>
                    <Input
                      type="number"
                      value={maintForm.lifeAfter}
                      onChange={(e) =>
                        setMaintForm({ ...maintForm, lifeAfter: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>{ts('k_b5m1l6')}</Label>
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
                {ts('k_1589w37')}</Button>
              <Button onClick={submitMaintenance}>{tc('ok')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scrap Dialog */}
        <Dialog open={!!scrapDialogTool} onOpenChange={(v) => !v && setScrapDialogTool(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {ts('k_1fxm0bs')}
                {scrapDialogTool?.tool_code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{ts('k_1vmfys2')}</span>
              </div>
              <div>
                <Label>{ts('k_1h3xyle')}</Label>
                <Textarea
                  value={scrapForm.scrapReason}
                  onChange={(e) => setScrapForm({ ...scrapForm, scrapReason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScrapDialogTool(null)}>
                {ts('k_1589w37')}</Button>
              <Button variant="destructive" onClick={submitScrap}>
                {ts('k_1hma1hv')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
