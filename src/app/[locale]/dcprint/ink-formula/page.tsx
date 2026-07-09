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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  GitCompare,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ===== 类型定义 =====
interface InkColor {
  id: number;
  color_code: string;
  color_name: string;
  color_series: string | null;
  base_ink_type: string | null;
  pantone_code: string | null;
  remark: string | null;
  status: number;
  active_version_no: string | null;
  version_count: number;
}

interface FormulaItem {
  id?: number;
  material_id: number | null;
  material_code: string;
  material_name: string;
  ink_type: string | null;
  brand: string | null;
  ratio: number;
  weight: number | null;
  unit: string;
  add_order: number;
  process_remark: string | null;
  sort: number;
  is_base: number;
  snapshot_unit_cost: number | null;
}

interface FormulaVersion {
  id: number;
  color_id: number;
  version_no: string;
  version_name: string | null;
  status: number;
  change_reason: string | null;
  source_version_id: number | null;
  process_note: string | null;
  total_weight: number | null;
  unit: string;
  shelf_life_hours: number;
  theoretical_cost: number | null;
  cost_snapshot_time: string | null;
  cost_calc_status: number;
  cost_warning: string | null;
  activate_by: number | null;
  activate_time: string | null;
  cancel_by: number | null;
  cancel_reason: string | null;
  cancel_time: string | null;
  create_time: string;
  items?: FormulaItem[];
  color_code?: string;
  color_name?: string;
  pantone_code?: string;
  base_ink_type?: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '草稿', variant: 'secondary' },
  2: { label: '启用', variant: 'default' },
  3: { label: '已作废', variant: 'outline' },
};

const COST_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '未核算', color: 'text-gray-500' },
  1: { label: '完成', color: 'text-green-600' },
  2: { label: '核算中', color: 'text-orange-500' },
};

export default function InkFormulaVersionPage() {
  const { toast } = useToast();

  // 色号管理状态
  const [colors, setColors] = useState<InkColor[]>([]);
  const [colorTotal, setColorTotal] = useState(0);
  const [colorPage, setColorPage] = useState(1);
  const [colorKeyword, setColorKeyword] = useState('');
  const [selectedColor, setSelectedColor] = useState<InkColor | null>(null);
  const [colorDialog, setColorDialog] = useState(false);
  const [editingColor, setEditingColor] = useState<Partial<InkColor>>({});

  // 版本管理状态
  const [versions, setVersions] = useState<FormulaVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<FormulaVersion | null>(null);
  const [versionDialog, setVersionDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState<
    Partial<FormulaVersion> & { items?: FormulaItem[] }
  >({});
  const [compareDialog, setCompareDialog] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [compareResult, setCompareResult] = useState<any>(null);

  // 获取色号列表
  const fetchColors = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(colorPage),
        pageSize: '20',
        keyword: colorKeyword,
      });
      const res = await authFetch(`/api/dcprint/formula/color?${params}`);
      const result = await res.json();
      if (result.success) {
        setColors(result.data.list || []);
        setColorTotal(result.data.total || 0);
      }
    } catch {
      // ignore
    }
  }, [colorPage, colorKeyword]);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  // 获取版本列表
  const fetchVersions = useCallback(async (colorId: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version?colorId=${colorId}`);
      const result = await res.json();
      if (result.success) {
        setVersions(result.data.list || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // 获取版本详情
  const fetchVersionDetail = useCallback(async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version?id=${id}`);
      const result = await res.json();
      if (result.success) {
        setSelectedVersion(result.data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 选择色号
  const handleSelectColor = (color: InkColor) => {
    setSelectedColor(color);
    setSelectedVersion(null);
    fetchVersions(color.id);
  };

  // 返回色号列表
  const handleBackToColors = () => {
    setSelectedColor(null);
    setSelectedVersion(null);
    setVersions([]);
  };

  // ===== 色号 CRUD =====
  const handleSaveColor = async () => {
    if (!editingColor.color_code || !editingColor.color_name) {
      toast({ title: '请填写色号编码和名称', variant: 'destructive' });
      return;
    }
    try {
      const method = editingColor.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/dcprint/formula/color', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingColor),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editingColor.id ? '更新成功' : '创建成功' });
        setColorDialog(false);
        fetchColors();
      } else {
        toast({ title: '操作失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDeleteColor = async (id: number) => {
    if (!confirm('确认删除此色号？关联的配方版本也会被保留但无法新建。')) return;
    try {
      const res = await authFetch(`/api/dcprint/formula/color?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchColors();
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // ===== 版本操作 =====
  const handleCreateVersion = async () => {
    if (!selectedColor) return;
    if (!editingVersion.items || editingVersion.items.length === 0) {
      toast({ title: '请至少添加一条配方明细', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/dcprint/formula/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingVersion,
          color_id: selectedColor.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '草稿版本创建成功' });
        setVersionDialog(false);
        setEditingVersion({});
        fetchVersions(selectedColor.id);
      } else {
        toast({ title: '创建失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (versionId: number) => {
    const major = confirm('是否升级主版本号？(取消则仅升级次版本号)');
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ major_version: major }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '一键复用成功', description: `新版本ID: ${result.data.id}` });
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: '复用失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '复用失败', variant: 'destructive' });
    }
  };

  const handleActivate = async (versionId: number) => {
    if (!confirm('确认生效此版本？生效后旧版本将自动归档，且此版本不可再编辑。')) return;
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '版本已生效' });
        if (selectedColor) {
          fetchVersions(selectedColor.id);
          fetchColors();
        }
      } else {
        toast({ title: '生效失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '生效失败', variant: 'destructive' });
    }
  };

  const handleCancel = async (versionId: number) => {
    const reason = prompt('请输入作废原因:');
    if (!reason) return;
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '版本已作废' });
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: '作废失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '作废失败', variant: 'destructive' });
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('确认删除此草稿版本？')) return;
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '版本已删除' });
        setSelectedVersion(null);
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // ===== 成本预览 =====
  const handlePreviewCost = async () => {
    if (!editingVersion.items || editingVersion.items.length === 0) return;
    try {
      const res = await authFetch('/api/dcprint/formula/version?previewCost=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editingVersion.items }),
      });
      const result = await res.json();
      if (result.success) {
        const data = result.data;
        toast({
          title: `理论成本: ${data.totalCost}`,
          description: data.warnings.length > 0 ? data.warnings.join('; ') : '所有物料成本完整',
        });
      }
    } catch {
      toast({ title: '成本预览失败', variant: 'destructive' });
    }
  };

  // ===== 版本对比 =====
  const handleCompare = async () => {
    if (!compareLeftId || !compareRightId) {
      toast({ title: '请选择两个版本进行对比', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch(
        `/api/dcprint/formula/version?compare=1&leftId=${compareLeftId}&rightId=${compareRightId}`
      );
      const result = await res.json();
      if (result.success) {
        setCompareResult(result.data);
      } else {
        toast({ title: '对比失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '对比失败', variant: 'destructive' });
    }
  };

  // ===== 明细编辑 =====
  const addItem = () => {
    const items = editingVersion.items || [];
    setEditingVersion({
      ...editingVersion,
      items: [
        ...items,
        {
          material_id: null,
          material_code: '',
          material_name: '',
          ink_type: null,
          brand: null,
          ratio: 0,
          weight: null,
          unit: 'kg',
          add_order: items.length + 1,
          process_remark: null,
          sort: items.length + 1,
          is_base: 0,
          snapshot_unit_cost: null,
        },
      ],
    });
  };

  const updateItem = (index: number, field: keyof FormulaItem, value: any) => {
    const items = [...(editingVersion.items || [])];
    (items[index] as any)[field] = value;
    setEditingVersion({ ...editingVersion, items });
  };

  const removeItem = (index: number) => {
    const items = [...(editingVersion.items || [])];
    items.splice(index, 1);
    items.forEach((item, i) => {
      item.sort = i + 1;
      item.add_order = i + 1;
    });
    setEditingVersion({ ...editingVersion, items });
  };

  // ===== 渲染 =====
  if (selectedVersion) {
    return (
      <MainLayout>
        <VersionDetail
          version={selectedVersion}
          onBack={() => {
            setSelectedVersion(null);
            if (selectedColor) fetchVersions(selectedColor.id);
          }}
          onDuplicate={handleDuplicate}
          onActivate={handleActivate}
          onCancel={handleCancel}
          onDelete={handleDeleteVersion}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        {!selectedColor ? (
          <>
            {/* 色号管理 */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">油墨配方版本管理</h1>
              <Button
                size="sm"
                onClick={() => {
                  setEditingColor({});
                  setColorDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                新增色号
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="搜索色号编码/名称/Pantone"
                    value={colorKeyword}
                    onChange={(e) => setColorKeyword(e.target.value)}
                    className="w-64 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && fetchColors()}
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={fetchColors}>
                    <Search className="h-3 w-3 mr-1" />
                    搜索
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">序号</TableHead>
                      <TableHead className="text-xs">{'色号'}</TableHead>
                      <TableHead className="text-xs">{'颜色名称'}</TableHead>
                      <TableHead className="text-xs">{'色系'}</TableHead>
                      <TableHead className="text-xs">基墨类型</TableHead>
                      <TableHead className="text-xs">Pantone</TableHead>
                      <TableHead className="text-xs">{'当前版本'}</TableHead>
                      <TableHead className="text-xs">{'版本数'}</TableHead>
                      <TableHead className="text-xs">状态</TableHead>
                      <TableHead className="text-xs">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colors.map((color, index) => (
                      <TableRow
                        key={color.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectColor(color)}
                      >
                        <TableCell className="text-xs">{index + 1}</TableCell>
                        <TableCell className="text-xs font-mono">{color.color_code}</TableCell>
                        <TableCell className="text-xs font-medium">{color.color_name}</TableCell>
                        <TableCell className="text-xs">{color.color_series || '-'}</TableCell>
                        <TableCell className="text-xs">{color.base_ink_type || '-'}</TableCell>
                        <TableCell className="text-xs">{color.pantone_code || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {color.active_version_no ? (
                            <Badge variant="default">{color.active_version_no}</Badge>
                          ) : (
                            <span className="text-gray-400">无</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{color.version_count}</TableCell>
                        <TableCell>
                          <Badge
                            variant={color.status === 1 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {color.status === 1 ? '启用' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditingColor(color);
                                setColorDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleDeleteColor(color.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {colors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                          {'暂无色号数据'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">共{colorTotal}条</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={colorPage <= 1}
                      onClick={() => setColorPage((p) => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={colorPage * 20 >= colorTotal}
                      onClick={() => setColorPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* 版本管理 */}
            <div className="flex items-center gap-4">
              <Button size="sm" variant="ghost" onClick={handleBackToColors}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回色号列表
              </Button>
              <h1 className="text-xl font-bold">
                {selectedColor.color_name}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {selectedColor.color_code} | {selectedColor.pantone_code || '无Pantone'}
                </span>
              </h1>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditingVersion({
                    version_name: '',
                    change_reason: '',
                    process_note: '',
                    total_weight: null,
                    unit: 'kg',
                    shelf_life_hours: 168,
                    items: [],
                  });
                  setVersionDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {'新增版本'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCompareLeftId('');
                  setCompareRightId('');
                  setCompareResult(null);
                  setCompareDialog(true);
                }}
              >
                <GitCompare className="h-3 w-3 mr-1" />
                {'版本对比'}
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">版本号</TableHead>
                      <TableHead className="text-xs">{'版本名称'}</TableHead>
                      <TableHead className="text-xs">状态</TableHead>
                      <TableHead className="text-xs">变更原因</TableHead>
                      <TableHead className="text-xs">理论成本</TableHead>
                      <TableHead className="text-xs">{'成本状态'}</TableHead>
                      <TableHead className="text-xs">来源</TableHead>
                      <TableHead className="text-xs">创建时间</TableHead>
                      <TableHead className="text-xs">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <TableRow
                        key={version.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => fetchVersionDetail(version.id)}
                      >
                        <TableCell className="text-xs font-mono font-medium">
                          {version.version_no}
                        </TableCell>
                        <TableCell className="text-xs">{version.version_name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_MAP[version.status]?.variant || 'secondary'}
                            className="text-xs"
                          >
                            {STATUS_MAP[version.status]?.label || '未知'}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-xs max-w-32 truncate"
                          title={version.change_reason || ''}
                        >
                          {version.change_reason || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {version.theoretical_cost != null ? (
                            <span className="font-medium">
                              {Number(version.theoretical_cost).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={COST_STATUS_MAP[version.cost_calc_status]?.color || ''}>
                            {COST_STATUS_MAP[version.cost_calc_status]?.label || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {version.source_version_id ? '复用' : '原始'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {version.create_time?.substring(0, 16)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {version.status === 2 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                title="一键复用"
                                onClick={() => handleDuplicate(version.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                            {version.status === 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600"
                                title="生效"
                                onClick={() => handleActivate(version.id)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {version.status === 2 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-orange-600"
                                title="作废"
                                onClick={() => handleCancel(version.id)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {version.status === 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600"
                                title="删除"
                                onClick={() => handleDeleteVersion(version.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {versions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                          {'暂无版本数据'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 色号编辑弹窗 */}
      <Dialog open={colorDialog} onOpenChange={setColorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingColor.id ? '编辑色号' : '新增色号'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{'色号'}</Label>
              <Input
                value={editingColor.color_code || ''}
                onChange={(e) => setEditingColor({ ...editingColor, color_code: e.target.value })}
                disabled={!!editingColor.id}
              />
            </div>
            <div>
              <Label>{'颜色名称'}</Label>
              <Input
                value={editingColor.color_name || ''}
                onChange={(e) => setEditingColor({ ...editingColor, color_name: e.target.value })}
              />
            </div>
            <div>
              <Label>{'色系'}</Label>
              <Input
                value={editingColor.color_series || ''}
                onChange={(e) => setEditingColor({ ...editingColor, color_series: e.target.value })}
              />
            </div>
            <div>
              <Label>基墨类型</Label>
              <Select
                value={editingColor.base_ink_type || '_none'}
                onValueChange={(v) =>
                  setEditingColor({ ...editingColor, base_ink_type: v === '_none' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-</SelectItem>
                  <SelectItem value="UV">UV</SelectItem>
                  <SelectItem value="solvent">溶剂型</SelectItem>
                  <SelectItem value="water">水性</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pantone色号</Label>
              <Input
                value={editingColor.pantone_code || ''}
                onChange={(e) => setEditingColor({ ...editingColor, pantone_code: e.target.value })}
              />
            </div>
            <div>
              <Label>状态</Label>
              <Select
                value={String(editingColor.status || 1)}
                onValueChange={(v) => setEditingColor({ ...editingColor, status: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="2">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>备注</Label>
              <Textarea
                value={editingColor.remark || ''}
                onChange={(e) => setEditingColor({ ...editingColor, remark: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColorDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveColor}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本编辑弹窗 */}
      <Dialog open={versionDialog} onOpenChange={setVersionDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{'新增版本'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{'版本名称'}</Label>
                <Input
                  value={editingVersion.version_name || ''}
                  onChange={(e) =>
                    setEditingVersion({ ...editingVersion, version_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{'变更原因'}</Label>
                <Input
                  type="number"
                  value={editingVersion.total_weight ?? ''}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      total_weight: Number(e.target.value) || null,
                    })
                  }
                />
              </div>
              <div>
                <Label>保质期(小时)</Label>
                <Input
                  type="number"
                  value={editingVersion.shelf_life_hours ?? 168}
                  onChange={(e) =>
                    setEditingVersion({
                      ...editingVersion,
                      shelf_life_hours: Number(e.target.value) || 168,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>变更原因</Label>
              <Input
                value={editingVersion.change_reason || ''}
                onChange={(e) =>
                  setEditingVersion({ ...editingVersion, change_reason: e.target.value })
                }
              />
            </div>
            <div>
              <Label>{'工艺说明'}</Label>
              <Textarea
                value={editingVersion.process_note || ''}
                onChange={(e) =>
                  setEditingVersion({ ...editingVersion, process_note: e.target.value })
                }
                rows={2}
              />
            </div>

            {/* 明细编辑 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{'配方明细'}</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handlePreviewCost}>
                    <DollarSign className="h-3 w-3 mr-1" />
                    成本预览
                  </Button>
                  <Button size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    {'添加物料'}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">{'序号'}</TableHead>
                    <TableHead className="text-xs">物料编码</TableHead>
                    <TableHead className="text-xs">物料名称</TableHead>
                    <TableHead className="text-xs">品牌</TableHead>
                    <TableHead className="text-xs">{'比例'}</TableHead>
                    <TableHead className="text-xs">重量</TableHead>
                    <TableHead className="text-xs">{'单位'}</TableHead>
                    <TableHead className="text-xs">{'加料顺序'}</TableHead>
                    <TableHead className="text-xs">{'工艺备注'}</TableHead>
                    <TableHead className="text-xs">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editingVersion.items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-24"
                          value={item.material_code}
                          onChange={(e) => updateItem(index, 'material_code', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-32"
                          value={item.material_name}
                          onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-20"
                          value={item.brand || ''}
                          onChange={(e) => updateItem(index, 'brand', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          value={item.ratio}
                          onChange={(e) => updateItem(index, 'ratio', Number(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          value={item.weight ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'weight', Number(e.target.value) || null)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.is_base === 1}
                          onChange={(e) => updateItem(index, 'is_base', e.target.checked ? 1 : 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-xs w-12"
                          value={item.add_order}
                          onChange={(e) =>
                            updateItem(index, 'add_order', Number(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-24"
                          value={item.process_remark || ''}
                          onChange={(e) => updateItem(index, 'process_remark', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!editingVersion.items || editingVersion.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-400 py-4">
                        {'暂无配方明细'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateVersion}>{'创建草稿'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本对比弹窗 */}
      <Dialog open={compareDialog} onOpenChange={setCompareDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{'版本对比'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>{'对比版本'}</Label>
                <Select value={compareLeftId} onValueChange={setCompareLeftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.version_no} - {v.version_name || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <GitCompare className="h-5 w-5 text-gray-400 mt-6" />
              <div className="flex-1">
                <Label>{'被对比版本'}</Label>
                <Select value={compareRightId} onValueChange={setCompareRightId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.version_no} - {v.version_name || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="mt-6" onClick={handleCompare}>
                <Search className="h-3 w-3 mr-1" />
                对比
              </Button>
            </div>

            {compareResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">
                        {compareResult.baseInfo.left.version_no}
                      </div>
                      <div className="text-xs text-gray-500">
                        {compareResult.baseInfo.left.version_name || ''}
                      </div>
                      <div className="text-xs mt-1">
                        {'理论成本'}
                        {compareResult.baseInfo.left.theoretical_cost ?? '-'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">
                        {compareResult.baseInfo.right.version_no}
                      </div>
                      <div className="text-xs text-gray-500">
                        {compareResult.baseInfo.right.version_name || ''}
                      </div>
                      <div className="text-xs mt-1">
                        {'理论成本'}
                        {compareResult.baseInfo.right.theoretical_cost ?? '-'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {compareResult.baseInfo.diffFields.length > 0 && (
                  <div className="text-xs text-orange-600">
                    {'差异字段'}
                    {compareResult.baseInfo.diffFields.join(', ')}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {compareResult.summary.addedCount}
                    </div>
                    <div className="text-xs">新增</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {compareResult.summary.removedCount}
                    </div>
                    <div className="text-xs">删除</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-600">
                      {compareResult.summary.modifiedCount}
                    </div>
                    <div className="text-xs">修改</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-600">
                      {compareResult.summary.unchangedCount}
                    </div>
                    <div className="text-xs">{'版本差异'}</div>
                  </div>
                </div>

                {compareResult.items.modified.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">{'物料对比'}</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">物料</TableHead>
                          <TableHead className="text-xs">{'比例'}</TableHead>
                          <TableHead className="text-xs">{'重量'}</TableHead>
                          <TableHead className="text-xs">{'差异'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compareResult.items.modified.map((m: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{m.right.material_name}</TableCell>
                            <TableCell className="text-xs text-orange-600">
                              {m.fields.join(', ')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {m.fields
                                .map((f: string) => `${f}: ${(m.left as any)[f]}`)
                                .join('; ')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {m.fields
                                .map((f: string) => `${f}: ${(m.right as any)[f]}`)
                                .join('; ')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {compareResult.items.added.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-green-600 mb-1">新增物料</div>
                    <div className="text-xs">
                      {compareResult.items.added
                        .map((a: FormulaItem) => a.material_name)
                        .join(', ')}
                    </div>
                  </div>
                )}
                {compareResult.items.removed.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-1">删除物料</div>
                    <div className="text-xs">
                      {compareResult.items.removed
                        .map((r: FormulaItem) => r.material_name)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// ===== 版本详情组件 =====
function VersionDetail({
  version,
  onBack,
  onDuplicate,
  onActivate,
  onCancel,
  onDelete,
}: {
  version: FormulaVersion;
  onBack: () => void;
  onDuplicate: (id: number) => void;
  onActivate: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const isDraft = version.status === 1;
  const isActive = version.status === 2;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {'返回色号列表'}
        </Button>
        <h1 className="text-xl font-bold">
          {version.version_no}
          {version.version_name && (
            <span className="text-sm font-normal text-gray-500 ml-2">{version.version_name}</span>
          )}
        </h1>
        <Badge variant={STATUS_MAP[version.status]?.variant || 'secondary'}>
          {STATUS_MAP[version.status]?.label || '未知'}
        </Badge>
      </div>

      {/* 基础信息 */}
      <Card>
        <CardContent className="p-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{'色号'}</span>
            <span className="ml-2">
              {version.color_code} {version.color_name}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Pantone:</span>
            <span className="ml-2">{version.pantone_code || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">{'颜色名称'}</span>
            <span className="ml-2">
              {version.total_weight ? `${version.total_weight} ${version.unit}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">{'色系'}</span>
            <span className="ml-2">
              {version.shelf_life_hours}
              小时
            </span>
          </div>
          <div>
            <span className="text-gray-500">{'变更原因'}</span>
            <span className="ml-2">{version.change_reason || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">{'来源版本'}</span>
            <span className="ml-2">
              {version.source_version_id ? `ID:${version.source_version_id}` : '原始版本'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">{'创建时间'}</span>
            <span className="ml-2">{version.create_time?.substring(0, 19)}</span>
          </div>
          {version.activate_time && (
            <div>
              <span className="text-gray-500">{'生效时间'}</span>
              <span className="ml-2">{version.activate_time.substring(0, 19)}</span>
            </div>
          )}
          {version.cancel_time && (
            <div>
              <span className="text-gray-500">{'作废时间'}</span>
              <span className="ml-2">{version.cancel_time.substring(0, 19)}</span>
            </div>
          )}
          <div className="col-span-4">
            <span className="text-gray-500">{'工艺说明'}</span>
            <span className="ml-2">{version.process_note || '-'}</span>
          </div>
        </CardContent>
      </Card>

      {/* 成本信息 */}
      {version.theoretical_cost != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <span className="text-sm text-gray-500">{'理论成本'}</span>
                <span className="ml-2 text-lg font-bold text-green-600">
                  {Number(version.theoretical_cost).toFixed(4)}元
                </span>
                <span className="ml-4 text-xs text-gray-400">
                  {'成本快照时间'}
                  {version.cost_snapshot_time?.substring(0, 19) || '-'}
                </span>
              </div>
              {version.cost_calc_status === 2 && (
                <div className="flex items-center gap-1 text-orange-600 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {version.cost_warning || '暂无成本预警'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 明细表格 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {'配方明细'}
              {version.items?.length || 0}
              {'项'}
            </h3>
            {isActive && (
              <Button size="sm" variant="outline" onClick={() => onDuplicate(version.id)}>
                <Copy className="h-3 w-3 mr-1" />
                一键复用
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">序号</TableHead>
                <TableHead className="text-xs">物料编码</TableHead>
                <TableHead className="text-xs">物料名称</TableHead>
                <TableHead className="text-xs">类型</TableHead>
                <TableHead className="text-xs">品牌</TableHead>
                <TableHead className="text-xs">{'比例'}</TableHead>
                <TableHead className="text-xs">重量</TableHead>
                <TableHead className="text-xs">{'单位'}</TableHead>
                <TableHead className="text-xs">{'加料顺序'}</TableHead>
                <TableHead className="text-xs">单位成本</TableHead>
                <TableHead className="text-xs">{'工艺备注'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(version.items || []).map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="text-xs">{index + 1}</TableCell>
                  <TableCell className="text-xs font-mono">{item.material_code}</TableCell>
                  <TableCell className="text-xs">{item.material_name}</TableCell>
                  <TableCell className="text-xs">{item.ink_type || '-'}</TableCell>
                  <TableCell className="text-xs">{item.brand || '-'}</TableCell>
                  <TableCell className="text-xs font-medium">{item.ratio}%</TableCell>
                  <TableCell className="text-xs">
                    {item.weight ? `${item.weight} ${item.unit}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{item.is_base === 1 ? '是' : '否'}</TableCell>
                  <TableCell className="text-xs">{item.add_order}</TableCell>
                  <TableCell className="text-xs">
                    {item.snapshot_unit_cost ? Number(item.snapshot_unit_cost).toFixed(4) : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{item.process_remark || '-'}</TableCell>
                </TableRow>
              ))}
              {(!version.items || version.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-gray-400 py-4">
                    {'暂无配方明细'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 操作栏 */}
      <div className="flex gap-2">
        {isDraft && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onActivate(version.id)}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {'生效'}
          </Button>
        )}
        {isActive && (
          <Button
            size="sm"
            variant="outline"
            className="text-orange-600"
            onClick={() => onCancel(version.id)}
          >
            <XCircle className="h-3 w-3 mr-1" />
            作废
          </Button>
        )}
        {isDraft && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600"
            onClick={() => onDelete(version.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {'删除'}
          </Button>
        )}
      </div>
    </div>
  );
}
