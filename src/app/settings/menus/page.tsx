'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, RefreshCw, Edit, Trash2, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: number;
  parent_id: number;
  menu_name: string;
  menu_code: string;
  menu_type: number;
  icon: string | null;
  path: string | null;
  component: string | null;
  permission: string;
  sort_order: number;
  status: number;
  is_visible: number;
  children?: MenuItem[];
}

export default function MenusPage() {
  const { toast } = useToast();
  const [list, setList] = useState<MenuItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<MenuItem> & { is_new?: boolean }>({});
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/menu');
      const result = await res.json();
      if (result.success && result.data) {
        const menuData = Array.isArray(result.data) ? result.data : [];
        setList(menuData);
        const parentIds = new Set<number>(menuData.filter((m: MenuItem) => m.menu_type === 1).map((m: MenuItem) => m.id));
        setExpandedIds(parentIds);
      }
    } catch (e) {
      console.error('获取菜单失败:', e);
      toast({ title: '获取菜单失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildTree = (items: MenuItem[]): MenuItem[] => {
    const roots = items.filter(i => !i.parent_id || i.parent_id === 0);
    const children = items.filter(i => i.parent_id && i.parent_id !== 0);
    const attach = (parents: MenuItem[]): MenuItem[] =>
      parents.map(p => ({ ...p, children: attach(children.filter(c => c.parent_id === p.id)) }));
    return attach(roots);
  };

  const tree = buildTree(list.filter(i => !searchName || i.menu_name.includes(searchName)));

  const renderTree = (items: MenuItem[], level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    items.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedIds.has(item.id);
      rows.push(
        <TableRow key={item.id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-1" onClick={() => toggleExpand(item.id)}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : <span className="w-7" />}
              {item.menu_name}
            </div>
          </TableCell>
          <TableCell className="font-mono text-sm">{item.menu_code}</TableCell>
          <TableCell><Badge variant={item.menu_type === 1 ? 'default' : 'secondary'}>{item.menu_type === 1 ? '目录' : item.menu_type === 2 ? '菜单' : '按钮'}</Badge></TableCell>
          <TableCell>{item.icon || '-'}</TableCell>
          <TableCell className="font-mono text-sm">{item.path || '-'}</TableCell>
          <TableCell className="font-mono text-sm">{item.permission || '-'}</TableCell>
          <TableCell>{item.sort_order}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setEditItem({ ...item, is_new: false }); setShowDialog(true); }}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </TableCell>
        </TableRow>
      );
      if (hasChildren && isExpanded) {
        rows.push(...renderTree(item.children!, level + 1));
      }
    });
    return rows;
  };

  const handleAdd = (parentId: number = 0) => {
    setEditItem({
      is_new: true,
      parent_id: parentId,
      menu_name: '',
      menu_code: '',
      menu_type: 2,
      icon: '',
      path: '',
      component: '',
      permission: '',
      sort_order: 0,
      is_visible: 1,
      status: 1,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!editItem.menu_name || !editItem.menu_code) {
      toast({ title: '菜单名称和编码不能为空', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = '/api/organization/menu';
      const method = editItem.is_new ? 'POST' : 'PUT';
      const body = editItem.is_new
        ? {
            parent_id: editItem.parent_id ?? 0,
            menu_name: editItem.menu_name,
            menu_code: editItem.menu_code,
            menu_type: editItem.menu_type ?? 2,
            icon: editItem.icon || null,
            path: editItem.path || null,
            component: editItem.component || null,
            permission: editItem.permission || null,
            sort_order: editItem.sort_order ?? 0,
            is_visible: editItem.is_visible ?? 1,
          }
        : {
            id: editItem.id,
            parent_id: editItem.parent_id ?? 0,
            menu_name: editItem.menu_name,
            menu_code: editItem.menu_code,
            menu_type: editItem.menu_type ?? 2,
            icon: editItem.icon || null,
            path: editItem.path || null,
            component: editItem.component || null,
            permission: editItem.permission || null,
            sort_order: editItem.sort_order ?? 0,
            is_visible: editItem.is_visible ?? 1,
            status: editItem.status ?? 1,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.is_new ? '菜单创建成功' : '菜单更新成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`确定删除菜单"${item.menu_name}"？`)) return;
    try {
      const res = await fetch(`/api/organization/menu?id=${item.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">菜单管理</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索菜单名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-10 h-9" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => handleAdd(0)}><Plus className="h-4 w-4 mr-1" />新增目录</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-400">加载中...</span></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>菜单名称</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>图标</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead>权限</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tree.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                  ) : renderTree(tree)}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>{editItem.is_new ? '新增菜单' : '编辑菜单'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>菜单名称</Label><Input value={editItem.menu_name || ''} onChange={e => setEditItem({ ...editItem, menu_name: e.target.value })} /></div>
              <div><Label>菜单编码</Label><Input value={editItem.menu_code || ''} onChange={e => setEditItem({ ...editItem, menu_code: e.target.value })} disabled={!editItem.is_new} /></div>
              <div><Label>菜单类型</Label><Select value={String(editItem.menu_type || 1)} onValueChange={v => setEditItem({ ...editItem, menu_type: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">目录</SelectItem><SelectItem value="2">菜单</SelectItem><SelectItem value="3">按钮</SelectItem></SelectContent>
              </Select></div>
              <div><Label>图标</Label><Input value={editItem.icon || ''} onChange={e => setEditItem({ ...editItem, icon: e.target.value })} /></div>
              <div><Label>路径</Label><Input value={editItem.path || ''} onChange={e => setEditItem({ ...editItem, path: e.target.value })} /></div>
              <div><Label>权限标识</Label><Input value={editItem.permission || ''} onChange={e => setEditItem({ ...editItem, permission: e.target.value })} /></div>
              <div><Label>排序</Label><Input type="number" value={editItem.sort_order || 0} onChange={e => setEditItem({ ...editItem, sort_order: Number(e.target.value) })} /></div>
              <div><Label>是否可见</Label><Select value={String(editItem.is_visible ?? 1)} onValueChange={v => setEditItem({ ...editItem, is_visible: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">可见</SelectItem><SelectItem value="0">隐藏</SelectItem></SelectContent>
              </Select></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
