'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item { id: number; category_code: string; category_name: string; parent_id: number; category_type: number; sort_order: number; status: number; remark: string; }
const typeMap: Record<number, string> = { 1: '原材料', 2: '半成品', 3: '成品', 4: '辅料', 5: '包材', 6: '油墨', 7: '溶剂/洗网水', 8: '网版/丝网', 9: '刀具/刀模', 10: '设备配件' };

export default function MaterialCategoryPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '50', categoryName: searchName }); const res = await fetch('/api/base-data/material-category?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const method = editItem.id ? 'PUT' : 'POST'; const res = await fetch('/api/base-data/material-category', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: editItem.id ? '更新成功' : '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/base-data/material-category?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">物料分类</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索分类名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增分类</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">分类编码</TableHead><TableHead className="text-xs">分类名称</TableHead><TableHead className="text-xs">分类类型</TableHead><TableHead className="text-xs">排序</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">备注</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.category_code}</TableCell><TableCell className="text-xs">{item.category_name}</TableCell><TableCell className="text-xs">{typeMap[item.category_type] || '-'}</TableCell><TableCell className="text-xs">{item.sort_order}</TableCell><TableCell><Badge variant={item.status === 1 ? 'default' : 'destructive'} className="text-xs">{item.status === 1 ? '启用' : '禁用'}</Badge></TableCell><TableCell className="text-xs max-w-32 truncate">{item.remark || '-'}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>))}{list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>{editItem.id ? '编辑分类' : '新增分类'}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>分类编码</Label><Input value={editItem.category_code || ''} onChange={e => setEditItem({ ...editItem, category_code: e.target.value })} /></div><div><Label>分类名称</Label><Input value={editItem.category_name || ''} onChange={e => setEditItem({ ...editItem, category_name: e.target.value })} /></div><div><Label>分类类型</Label><Select value={String(editItem.category_type || 1)} onValueChange={v => setEditItem({ ...editItem, category_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">原材料</SelectItem><SelectItem value="2">半成品</SelectItem><SelectItem value="3">成品</SelectItem><SelectItem value="4">辅料</SelectItem><SelectItem value="5">包材</SelectItem><SelectItem value="6">油墨</SelectItem><SelectItem value="7">溶剂/洗网水</SelectItem><SelectItem value="8">网版/丝网</SelectItem><SelectItem value="9">刀具/刀模</SelectItem><SelectItem value="10">设备配件</SelectItem></SelectContent></Select></div><div><Label>排序</Label><Input type="number" value={editItem.sort_order ?? 0} onChange={e => setEditItem({ ...editItem, sort_order: Number(e.target.value) })} /></div><div className="col-span-2"><Label>备注</Label><Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
