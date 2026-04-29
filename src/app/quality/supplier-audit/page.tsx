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
import { Plus, Search, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierAuditRecord {
  id?: number;
  audit_no: string;
  supplier_id?: number;
  supplier_name: string;
  audit_type: string;
  audit_date: string;
  auditor: string;
  audit_scope: string;
  quality_system_score: number;
  delivery_score: number;
  price_score: number;
  service_score: number;
  total_score: number;
  audit_result: string;
  improvement_items: string;
  follow_up_date: string;
  status: number;
  remark: string;
  create_time: string;
}

const auditTypeMap: Record<string, string> = {
  'initial': '初次审核', 'routine': '例行审核', 'follow_up': '跟踪审核', 'special': '专项审核'
};
const auditResultMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'approved': { label: '合格', variant: 'default' },
  'conditional': { label: '有条件合格', variant: 'secondary' },
  'rejected': { label: '不合格', variant: 'destructive' },
  'pending': { label: '待评定', variant: 'outline' },
};
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '计划中', variant: 'outline' },
  2: { label: '审核中', variant: 'secondary' },
  3: { label: '已完成', variant: 'default' },
};

export default function SupplierAuditPage() {
  const { toast } = useToast();
  const [list, setList] = useState<SupplierAuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchType, setSearchType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SupplierAuditRecord>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '20',
        supplierName: searchSupplier, auditType: searchType
      });
      const res = await fetch('/api/quality/supplier-audit?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => {
    try {
      const totalScore = (editItem.quality_system_score || 0) + (editItem.delivery_score || 0) + (editItem.price_score || 0) + (editItem.service_score || 0);
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/quality/supplier-audit', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editItem, total_score: totalScore })
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
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
    if (!confirm('确定删除此审核记录？')) return;
    try {
      const res = await fetch('/api/quality/supplier-audit?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default">{score}</Badge>;
    if (score >= 60) return <Badge variant="secondary">{score}</Badge>;
    return <Badge variant="destructive">{score}</Badge>;
  };

  return (
    <MainLayout title="供应商质量审核">
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索供应商名称" className="pl-8 w-60" value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="审核类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {Object.entries(auditTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>查询</Button>
              </div>
              <Button onClick={() => { setEditItem({ audit_type: 'initial', audit_result: 'pending', quality_system_score: 0, delivery_score: 0, price_score: 0, service_score: 0, total_score: 0 }); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />新建审核
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>审核编号</TableHead>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>审核类型</TableHead>
                  <TableHead>审核日期</TableHead>
                  <TableHead>质量体系</TableHead>
                  <TableHead>交付</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>服务</TableHead>
                  <TableHead>总分</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.audit_no}</TableCell>
                    <TableCell>{item.supplier_name}</TableCell>
                    <TableCell>{auditTypeMap[item.audit_type] || item.audit_type}</TableCell>
                    <TableCell>{item.audit_date?.substring(0, 10) || '-'}</TableCell>
                    <TableCell>{getScoreBadge(item.quality_system_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.delivery_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.price_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.service_score)}</TableCell>
                    <TableCell><Badge variant={item.total_score >= 240 ? 'default' : item.total_score >= 180 ? 'secondary' : 'destructive'}>{item.total_score}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={auditResultMap[item.audit_result]?.variant || 'outline'}>
                        {auditResultMap[item.audit_result]?.label || '待评定'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditItem(item); setShowDialog(true); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">共 {total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑审核记录' : '新建审核记录'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><Label>供应商名称 *</Label><Input value={editItem.supplier_name || ''} onChange={e => setEditItem({ ...editItem, supplier_name: e.target.value })} /></div>
              <div>
                <Label>审核类型</Label>
                <Select value={editItem.audit_type || 'initial'} onValueChange={v => setEditItem({ ...editItem, audit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(auditTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>审核日期</Label><Input type="date" value={editItem.audit_date || ''} onChange={e => setEditItem({ ...editItem, audit_date: e.target.value })} /></div>
              <div><Label>审核人</Label><Input value={editItem.auditor || ''} onChange={e => setEditItem({ ...editItem, auditor: e.target.value })} /></div>
              <div className="col-span-2"><Label>审核范围</Label><Textarea rows={2} value={editItem.audit_scope || ''} onChange={e => setEditItem({ ...editItem, audit_scope: e.target.value })} /></div>
              <div><Label>质量体系评分(0-100)</Label><Input type="number" min={0} max={100} value={editItem.quality_system_score || 0} onChange={e => setEditItem({ ...editItem, quality_system_score: Number(e.target.value) })} /></div>
              <div><Label>交付评分(0-100)</Label><Input type="number" min={0} max={100} value={editItem.delivery_score || 0} onChange={e => setEditItem({ ...editItem, delivery_score: Number(e.target.value) })} /></div>
              <div><Label>价格评分(0-100)</Label><Input type="number" min={0} max={100} value={editItem.price_score || 0} onChange={e => setEditItem({ ...editItem, price_score: Number(e.target.value) })} /></div>
              <div><Label>服务评分(0-100)</Label><Input type="number" min={0} max={100} value={editItem.service_score || 0} onChange={e => setEditItem({ ...editItem, service_score: Number(e.target.value) })} /></div>
              <div>
                <Label>审核结果</Label>
                <Select value={editItem.audit_result || 'pending'} onValueChange={v => setEditItem({ ...editItem, audit_result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(auditResultMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>跟进日期</Label><Input type="date" value={editItem.follow_up_date || ''} onChange={e => setEditItem({ ...editItem, follow_up_date: e.target.value })} /></div>
              <div className="col-span-2"><Label>改进项目</Label><Textarea rows={3} value={editItem.improvement_items || ''} onChange={e => setEditItem({ ...editItem, improvement_items: e.target.value })} /></div>
              <div className="col-span-2"><Label>备注</Label><Textarea rows={2} value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
