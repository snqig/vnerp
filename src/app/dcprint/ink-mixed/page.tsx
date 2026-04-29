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

interface InkMixedRecord {
  id: number; record_no: string; base_ink_id: number; base_ink_code: string; base_ink_name: string;
  mix_ratio: string; color_name: string; color_code: string; company_id: number; company_name: string;
  mix_time: string; operator_id: number; operator_name: string; quantity: number; unit: string;
  warehouse_id: number; location_id: number; status: number; expire_time: string; remark: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  1: { label: '已入库', variant: 'default' },
  2: { label: '已使用', variant: 'secondary' },
  3: { label: '已过期', variant: 'destructive' },
};

export default function InkMixedPage() {
  const { toast } = useToast();
  const [list, setList] = useState<InkMixedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InkMixedRecord>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', recordNo: searchNo, colorName: searchColor });
      const res = await fetch('/api/dcprint/ink-mixed?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/dcprint/ink-mixed', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
      const result = await res.json();
      if (result.success) { toast({ title: editItem.id ? '更新成功' : '入库成功' }); setShowDialog(false); fetchData(); }
      else { toast({ title: '操作失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      const res = await fetch('/api/dcprint/ink-mixed?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '删除成功' }); fetchData(); }
    } catch (e) { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await fetch('/api/dcprint/ink-mixed', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const result = await res.json();
      if (result.success) { toast({ title: '状态更新成功' }); fetchData(); }
    } catch (e) { toast({ title: '更新失败', variant: 'destructive' }); }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">调色油墨入库管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" />
              <Input placeholder="搜索颜色" value={searchColor} onChange={e => setSearchColor(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => { setEditItem({ mix_time: new Date().toISOString().slice(0, 16), unit: 'kg' }); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增入库</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">记录单号</TableHead>
                  <TableHead className="text-xs">原油墨</TableHead>
                  <TableHead className="text-xs">调色比例</TableHead>
                  <TableHead className="text-xs">色彩名称</TableHead>
                  <TableHead className="text-xs">客户</TableHead>
                  <TableHead className="text-xs">数量</TableHead>
                  <TableHead className="text-xs">操作员</TableHead>
                  <TableHead className="text-xs">调色时间</TableHead>
                  <TableHead className="text-xs">过期时间</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.record_no}</TableCell>
                      <TableCell className="text-xs">{item.base_ink_name || item.base_ink_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.mix_ratio || '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          {item.color_code && <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.color_code }} />}
                          {item.color_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.company_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{item.mix_time || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{item.expire_time || '-'}</TableCell>
                      <TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>已使用</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-orange-600" onClick={() => handleStatusChange(item.id, 3)}>已过期</Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-gray-400 py-8">暂无调色油墨记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条记录</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader><DialogTitle>{editItem.id ? '编辑调色油墨' : '新增调色油墨入库'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>原油墨编号</Label><Input value={editItem.base_ink_code || ''} onChange={e => setEditItem({ ...editItem, base_ink_code: e.target.value })} /></div>
              <div><Label>原油墨名称</Label><Input value={editItem.base_ink_name || ''} onChange={e => setEditItem({ ...editItem, base_ink_name: e.target.value })} /></div>
              <div><Label>调色比例</Label><Input value={editItem.mix_ratio || ''} onChange={e => setEditItem({ ...editItem, mix_ratio: e.target.value })} placeholder="如: 3:1:0.5" /></div>
              <div><Label>色彩名称</Label><Input value={editItem.color_name || ''} onChange={e => setEditItem({ ...editItem, color_name: e.target.value })} /></div>
              <div><Label>色彩编码</Label><Input value={editItem.color_code || ''} onChange={e => setEditItem({ ...editItem, color_code: e.target.value })} placeholder="如: #FF5500" /></div>
              <div><Label>客户名称</Label><Input value={editItem.company_name || ''} onChange={e => setEditItem({ ...editItem, company_name: e.target.value })} /></div>
              <div><Label>调色时间</Label><Input type="datetime-local" value={editItem.mix_time || ''} onChange={e => setEditItem({ ...editItem, mix_time: e.target.value })} /></div>
              <div><Label>操作员</Label><Input value={editItem.operator_name || ''} onChange={e => setEditItem({ ...editItem, operator_name: e.target.value })} /></div>
              <div><Label>数量</Label><Input type="number" step="0.01" value={editItem.quantity || ''} onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })} /></div>
              <div><Label>单位</Label><Select value={editItem.unit || 'kg'} onValueChange={v => setEditItem({ ...editItem, unit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="g">g</SelectItem><SelectItem value="L">L</SelectItem><SelectItem value="mL">mL</SelectItem></SelectContent></Select></div>
              <div><Label>过期时间</Label><Input type="datetime-local" value={editItem.expire_time || ''} onChange={e => setEditItem({ ...editItem, expire_time: e.target.value })} /></div>
              <div><Label>备注</Label><Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
