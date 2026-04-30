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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InkUsage {
  id: number;
  work_order_id: number;
  screen_plate_id: number;
  plate_code: string;
  ink_id: number;
  ink_code: string;
  ink_name: string;
  usage_qty: number;
  unit: string;
  usage_date: string;
  operator_name: string;
  remark: string;
  create_time: string;
}

interface Ink {
  id: number;
  ink_code: string;
  ink_name: string;
  unit: string;
}

export default function InkUsagePage() {
  const { toast } = useToast();
  const [list, setList] = useState<InkUsage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [plateId, setPlateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InkUsage>>({});
  const [inkList, setInkList] = useState<Ink[]>([]);

  const fetchInks = async () => {
    try {
      const res = await fetch('/api/base-inks');
      const result = await res.json();
      if (result.success) {
        setInkList(result.data.list || result.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (plateId) params.set('plateId', plateId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch('/api/ink-usages?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchInks(); }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/ink-usages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editItem,
          usageDate: editItem.usage_date || new Date().toISOString(),
          operatorName: '系统'
        })
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '记录成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch('/api/ink-usages?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">油墨耗用管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="网版ID" value={plateId} onChange={e => setPlateId(e.target.value)} className="w-24 h-8 text-sm" />
              <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-gray-400" /><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-28 h-8 text-sm" /></div>
              <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-gray-400" /><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-28 h-8 text-sm" /></div>
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增耗用</Button>
          </div>
        </div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">耗用日期</TableHead>
                <TableHead className="text-xs">网版编码</TableHead>
                <TableHead className="text-xs">油墨编码</TableHead>
                <TableHead className="text-xs">油墨名称</TableHead>
                <TableHead className="text-xs">耗用数量</TableHead>
                <TableHead className="text-xs">单位</TableHead>
                <TableHead className="text-xs">操作人</TableHead>
                <TableHead className="text-xs">备注</TableHead>
                <TableHead className="text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.usage_date}</TableCell>
                  <TableCell className="text-xs font-mono">{item.plate_code || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{item.ink_code}</TableCell>
                  <TableCell className="text-xs">{item.ink_name}</TableCell>
                  <TableCell className="text-xs font-bold">{item.usage_qty}</TableCell>
                  <TableCell className="text-xs">{item.unit}</TableCell>
                  <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                  <TableCell className="text-xs">{item.remark || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>新增油墨耗用</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>油墨</Label>
                <Select value={String(editItem.ink_id || '')} onValueChange={v => {
                  const ink = inkList.find(i => i.id === Number(v));
                  setEditItem({ ...editItem, ink_id: Number(v), ink_code: ink?.ink_code, ink_name: ink?.ink_name, unit: ink?.unit });
                }}>
                  <SelectTrigger><SelectValue placeholder="请选择油墨" /></SelectTrigger>
                  <SelectContent>
                    {inkList.map(ink => <SelectItem key={ink.id} value={String(ink.id)}>{ink.ink_code} - {ink.ink_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>耗用数量</Label><Input type="number" value={editItem.usage_qty ?? ''} onChange={e => setEditItem({ ...editItem, usage_qty: Number(e.target.value) })} /></div>
              <div><Label>网版ID（可选）</Label><Input type="number" value={editItem.screen_plate_id ?? ''} onChange={e => setEditItem({ ...editItem, screen_plate_id: Number(e.target.value) })} /></div>
              <div><Label>工单ID（可选）</Label><Input type="number" value={editItem.work_order_id ?? ''} onChange={e => setEditItem({ ...editItem, work_order_id: Number(e.target.value) })} /></div>
              <div><Label>耗用日期</Label><Input type="datetime-local" value={editItem.usage_date?.slice(0, 16) || ''} onChange={e => setEditItem({ ...editItem, usage_date: e.target.value })} /></div>
              <div><Label>备注</Label><Textarea value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
