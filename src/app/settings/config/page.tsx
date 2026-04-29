'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item { id: number; config_name: string; config_key: string; config_value: string; remark: string; }

export default function ConfigPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', configName: searchName }); const res = await fetch('/api/system/config?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/system/config?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">参数管理</h1>
          <div className="flex items-center gap-2"><Input placeholder="搜索参数名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">参数名称</TableHead><TableHead className="text-xs">参数键</TableHead><TableHead className="text-xs">参数值</TableHead><TableHead className="text-xs">备注</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => (<TableRow key={item.id}><TableCell className="text-xs">{item.config_name}</TableCell><TableCell className="text-xs font-mono">{item.config_key}</TableCell><TableCell className="text-xs font-mono">{item.config_value}</TableCell><TableCell className="text-xs max-w-48 truncate">{item.remark || '-'}</TableCell><TableCell><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>))}{list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
      </div>
    </MainLayout>
  );
}
