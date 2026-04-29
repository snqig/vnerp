'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item { id: number; title: string; oper_name: string; oper_type: string; oper_method: string; oper_url: string; oper_ip: string; oper_time: string; status: number; }

export default function OperLogPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTitle, setSearchTitle] = useState('');

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', title: searchTitle }); const res = await fetch('/api/system/oper-log?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleClear = async () => { if (!confirm('确定清空所有操作日志？')) return; try { const res = await fetch('/api/system/oper-log', { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '清空成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">操作日志</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索操作标题" value={searchTitle} onChange={e => setSearchTitle(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" variant="destructive" onClick={handleClear}>清空日志</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">操作标题</TableHead><TableHead className="text-xs">操作人</TableHead><TableHead className="text-xs">操作类型</TableHead><TableHead className="text-xs">请求方式</TableHead><TableHead className="text-xs">操作URL</TableHead><TableHead className="text-xs">IP地址</TableHead><TableHead className="text-xs">操作时间</TableHead><TableHead className="text-xs">状态</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => (<TableRow key={item.id}><TableCell className="text-xs">{item.title || '-'}</TableCell><TableCell className="text-xs">{item.oper_name || '-'}</TableCell><TableCell className="text-xs">{item.oper_type || '-'}</TableCell><TableCell className="text-xs">{item.oper_method || '-'}</TableCell><TableCell className="text-xs max-w-40 truncate font-mono">{item.oper_url || '-'}</TableCell><TableCell className="text-xs font-mono">{item.oper_ip || '-'}</TableCell><TableCell className="text-xs">{item.oper_time || '-'}</TableCell><TableCell><Badge variant={item.status === 1 ? 'default' : 'destructive'} className="text-xs">{item.status === 1 ? '成功' : '失败'}</Badge></TableCell></TableRow>))}{list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
      </div>
    </MainLayout>
  );
}
