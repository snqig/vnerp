'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, ArrowLeft, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: number;
  template_no: string;
  template_name: string;
  category: string | null;
  tags: string | null;
  total_cost: number;
  usage_count: number;
  status: number;
  create_time: string;
}

interface TemplateFormData {
  template_name: string;
  category: string;
  tags: string;
  remark: string;
}

const emptyForm: TemplateFormData = {
  template_name: '',
  category: '',
  tags: '',
  remark: '',
};

export default function SampleTemplateListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [list, setList] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
        category,
      });
      const res = await authFetch(`/api/dcprint/sample-card/template?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/template/${id}`);
      const result = await res.json();
      if (result.success && result.data) {
        const t = result.data;
        setEditingId(id);
        setFormData({
          template_name: t.template_name || '',
          category: t.category || '',
          tags: t.tags || '',
          remark: t.remark || '',
        });
        setDialogOpen(true);
      }
    } catch {
      toast({ title: '加载模板失败', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast({ title: '模板名称不能为空', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        template_name: formData.template_name,
        category: formData.category || undefined,
        tags: formData.tags || undefined,
        remark: formData.remark || undefined,
      };
      const url = editingId
        ? `/api/dcprint/sample-card/template/${editingId}`
        : '/api/dcprint/sample-card/template';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editingId ? '模板已更新' : '模板已创建' });
        setDialogOpen(false);
        fetchList();
      } else {
        toast({ title: '保存失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此模板？删除后不可恢复。')) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/template/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '已删除' });
        fetchList();
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sample/standard-card')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Library className="h-5 w-5" />
            标准工艺模板库
          </h1>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新建模板
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8"
              placeholder="搜索模板编号、名称、标签..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Input
            className="w-40"
            placeholder="分类"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          />
          <Button variant="outline" onClick={fetchList} disabled={loading}>
            刷新
          </Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板编号</TableHead>
              <TableHead>模板名称</TableHead>
              <TableHead>分类</TableHead>
              <TableHead className="text-right">总成本</TableHead>
              <TableHead className="text-center">使用次数</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                  暂无模板，点击「新建模板」或从已确认工艺卡「存为模板」
                </TableCell>
              </TableRow>
            )}
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.template_no}</TableCell>
                <TableCell className="font-medium">{t.template_name}</TableCell>
                <TableCell>
                  {t.category ? <Badge variant="outline">{t.category}</Badge> : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ¥{(t.total_cost || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{t.usage_count || 0}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t.create_time ? new Date(t.create_time).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="编辑"
                      onClick={() => handleOpenEdit(t.id)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="删除"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-600">
            第 {page} / {totalPages} 页，共 {total} 项
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑模板' : '新建模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="template_name">模板名称 *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="如：标签类标准工艺模板"
              />
            </div>
            <div>
              <Label htmlFor="category">分类</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="如：标签 / 软包装 / 纸盒"
              />
            </div>
            <div>
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="如：哑银纸,卷装,四色"
              />
            </div>
            <div>
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="模板说明..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
