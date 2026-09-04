'use client';

import { useState, useEffect, useCallback } from 'react';
import { TOOL_TYPE_LABEL, TOOL_STATUS_LABEL } from '@/lib/status-labels';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Wrench,
  MoreHorizontal,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/auth-fetch';

interface Tool {
  id: number;
  tool_type: number;
  tool_code: string;
  tool_name: string;
  spec: string;
  total_life: number;
  used_count: number;
  remain_life: number;
  original_cost: number;
  unit_cost: number;
  net_value: number;
  status: number;
  mesh_count: string;
  mesh_material: string;
  size: string;
  tension_value: number;
  create_time: string;
}

const TOOL_TYPE_MAP = TOOL_TYPE_LABEL;
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

export default function ToolManagePage() {
  const ts = useTranslations('Dcprint');
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [form, setForm] = useState({
    tool_type: 1,
    tool_code: '',
    tool_name: '',
    spec: '',
    total_life: 0,
    original_cost: 0,
    mesh_count: '',
    mesh_material: '',
    size: '',
    tension_value: 0,
  });

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '200' });
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (filterType !== 'all') params.append('toolType', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await authFetch(`/api/dcprint/tool?${params}`);
      const data = await res.json();
      if (data.success) {
        setTools(data.data?.list || data.data || []);
      }
    } catch {
      toast.error(ts('k_qjlczt'));
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterType, filterStatus]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleSave = async () => {
    if (!form.tool_code || !form.tool_name) {
      toast.warning(ts('k_1ujtx2v'));
      return;
    }
    try {
      const url = editingTool ? `/api/dcprint/tool/${editingTool.id}` : '/api/dcprint/tool';
      const method = editingTool ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingTool ? ts('k_1795bzg') : ts('k_kiombh'));
        setIsDialogOpen(false);
        setEditingTool(null);
        fetchTools();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleActivate = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/tool/${id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_169ob6o'));
        fetchTools();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleScrap = async (id: number) => {
    if (!confirm(ts('k_iu3do0'))) return;
    try {
      const res = await authFetch(`/api/dcprint/tool/${id}/scrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: ts('k_1jghbzm') }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_15g5muj'));
        fetchTools();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const getLifeStatus = (tool: Tool) => {
    const remainPercent = tool.total_life > 0 ? (tool.remain_life / tool.total_life) * 100 : 0;
    if (remainPercent <= 5) return { color: 'text-red-500', label: ts('k_15ytcv3') };
    if (remainPercent <= 20) return { color: 'text-yellow-500', label: ts('k_894hs9') };
    return { color: 'text-green-500', label: ts('k_tt5vxa') };
  };

  return (
    <MainLayout title={t('toolManagement')}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t('toolList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder={tc('search')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTools()}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={ts('k_anh4cj')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts('k_zao217')}</SelectItem>
                  <SelectItem value="1">{ts('k_1c01k7u')}</SelectItem>
                  <SelectItem value="2">{ts('k_cu41ng')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={ts('k_1ccx4t4')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts('k_igzce8')}</SelectItem>
                  <SelectItem value="1">{ts('k_1nblm48')}</SelectItem>
                  <SelectItem value="2">{ts('k_16d9hd9')}</SelectItem>
                  <SelectItem value="3">{ts('k_v1x3nb')}</SelectItem>
                  <SelectItem value="4">{ts('k_1qswpkf')}</SelectItem>
                  <SelectItem value="5">{ts('k_19qx965')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => fetchTools()} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
              <Button
                onClick={() => {
                  setEditingTool(null);
                  setForm({
                    tool_type: 1,
                    tool_code: '',
                    tool_name: '',
                    spec: '',
                    total_life: 0,
                    original_cost: 0,
                    mesh_count: '',
                    mesh_material: '',
                    size: '',
                    tension_value: 0,
                  });
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {tc('add')}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
            ) : tools.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{tc('noData')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_1i0rj5g')}</TableHead>
                    <TableHead>{ts('k_mr44aa')}</TableHead>
                    <TableHead>{ts('k_anh4cj')}</TableHead>
                    <TableHead>{ts('k_1h40xod')}</TableHead>
                    <TableHead>{ts('k_pz2nya')}</TableHead>
                    <TableHead>{ts('k_1ymhc32')}</TableHead>
                    <TableHead>{ts('k_vrhoin')}</TableHead>
                    <TableHead>{ts('k_1ccx4t4')}</TableHead>
                    <TableHead>{ts('k_1twio04')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools.map((tool) => {
                    const lifeStatus = getLifeStatus(tool);
                    return (
                      <TableRow key={tool.id}>
                        <TableCell className="font-mono">{tool.tool_code}</TableCell>
                        <TableCell>{tool.tool_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TOOL_TYPE_MAP[tool.tool_type]}</Badge>
                        </TableCell>
                        <TableCell>{tool.spec || tool.mesh_count || '-'}</TableCell>
                        <TableCell>{tool.total_life}{ts('k_a5jtgs')}</TableCell>
                        <TableCell>
                          <span className={lifeStatus.color}>
                            {tool.used_count}/{tool.remain_life}
                          </span>
                        </TableCell>
                        <TableCell>¥{tool.unit_cost?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[tool.status]?.variant || 'secondary'}>
                            {STATUS_MAP[tool.status]?.label || ts('k_1lpnuh4')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={lifeStatus.color}>
                            {tool.status === 4 && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                            {lifeStatus.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingTool(tool);
                                  setForm({
                                    tool_type: tool.tool_type,
                                    tool_code: tool.tool_code,
                                    tool_name: tool.tool_name,
                                    spec: tool.spec || '',
                                    total_life: tool.total_life,
                                    original_cost: tool.original_cost,
                                    mesh_count: tool.mesh_count || '',
                                    mesh_material: tool.mesh_material || '',
                                    size: tool.size || '',
                                    tension_value: tool.tension_value || 0,
                                  });
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              {tool.status === 1 && (
                                <DropdownMenuItem onClick={() => handleActivate(tool.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {ts('k_5pm2ma')}</DropdownMenuItem>
                              )}
                              {tool.status !== 5 && (
                                <DropdownMenuItem onClick={() => handleScrap(tool.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                  {ts('k_19qx965')}</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTool ? ts('k_1fn4ph2') : ts('k_vojsqp')}</DialogTitle>
            <DialogDescription>{ts('k_4xkpm5')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                {ts('k_l1tjwl')}<span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(form.tool_type)}
                onValueChange={(v) => setForm({ ...form, tool_type: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{ts('k_1c01k7u')}</SelectItem>
                  <SelectItem value="2">{ts('k_cu41ng')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                {ts('k_1i0rj5g')}<span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.tool_code}
                onChange={(e) => setForm({ ...form, tool_code: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {ts('k_mr44aa')}<span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.tool_name}
                onChange={(e) => setForm({ ...form, tool_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{ts('k_1h40xod')}</Label>
              <Input
                value={form.spec}
                onChange={(e) => setForm({ ...form, spec: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{ts('k_1ysb1os')}</Label>
              <Input
                type="number"
                value={form.total_life}
                onChange={(e) => setForm({ ...form, total_life: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>{ts('k_m4f3yb')}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.original_cost}
                onChange={(e) => setForm({ ...form, original_cost: Number(e.target.value) })}
              />
            </div>
            {form.tool_type === 2 && (
              <>
                <div className="space-y-1">
                  <Label>{ts('k_1if2z7')}</Label>
                  <Input
                    value={form.mesh_count}
                    onChange={(e) => setForm({ ...form, mesh_count: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{ts('k_al17lw')}</Label>
                  <Input
                    value={form.mesh_material}
                    onChange={(e) => setForm({ ...form, mesh_material: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{ts('k_d1l9cf')}</Label>
                  <Input
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{tc('dcTensionHead')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.tension_value}
                    onChange={(e) => setForm({ ...form, tension_value: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave}>{tc('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
