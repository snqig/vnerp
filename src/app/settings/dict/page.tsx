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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DictType { id: number; dict_name: string; dict_type: string; status: number; remark: string; }

export default function DictTypePage() {
  const { toast } = useToast();
  const [list, setList] = useState<DictType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DictType>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', dictName: searchName }); const res = await fetch('/api/system/dict-type?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const res = await fetch('/api/system/dict-type', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/system/dict-type?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">字典管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索字典名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增字典</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">字典名称</TableHead><TableHead className="text-xs">字典类型</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">备注</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => (<TableRow key={item.id}><TableCell className="text-xs">{item.dict_name}</TableCell><TableCell className="text-xs font-mono">{item.dict_type}</TableCell><TableCell><Badge variant={item.status === 1 ? 'default' : 'destructive'} className="text-xs">{item.status === 1 ? '启用' : '禁用'}</Badge></TableCell><TableCell className="text-xs max-w-48 truncate">{item.remark || '-'}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>))}{list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-md" resizable><DialogHeader><DialogTitle>新增字典类型</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>字典名称</Label><Input value={editItem.dict_name || ''} onChange={e => setEditItem({ ...editItem, dict_name: e.target.value })} /></div><div><Label>字典类型</Label><Input value={editItem.dict_type || ''} onChange={e => setEditItem({ ...editItem, dict_type: e.target.value })} placeholder="如: sys_status" /></div><div><Label>备注</Label><Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
