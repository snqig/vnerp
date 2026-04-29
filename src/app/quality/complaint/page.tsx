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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComplaintRecord {
  id?: number;
  complaint_no: string;
  complaint_source: string;
  customer_id?: number;
  customer_name: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  order_no: string;
  defect_date: string;
  defect_qty: number;
  defect_desc: string;
  defect_type: string;
  severity: number;
  reporter: string;
  report_date: string;
  d1_team: string;
  d1_date: string;
  d2_desc: string;
  d2_date: string;
  d3_interim_action: string;
  d3_date: string;
  d4_root_cause: string;
  d4_date: string;
  d5_corrective_action: string;
  d5_date: string;
  d6_implement_verify: string;
  d6_date: string;
  d7_preventive_action: string;
  d7_date: string;
  d8_congratulations: string;
  d8_date: string;
  status: number;
  remark: string;
  create_time: string;
}

const sourceMap: Record<string, string> = {
  'customer': '客户投诉', 'internal': '内部发现', 'audit': '审核发现', 'other': '其他'
};
const defectTypeMap: Record<string, string> = {
  'appearance': '外观不良', 'dimension': '尺寸不良', 'function': '功能不良', 'color': '色差', 'adhesion': '附着力', 'other': '其他'
};
const severityMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '轻微', variant: 'outline' },
  2: { label: '一般', variant: 'secondary' },
  3: { label: '严重', variant: 'destructive' },
};
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '已登记', variant: 'outline' },
  2: { label: '分析中', variant: 'secondary' },
  3: { label: '对策中', variant: 'secondary' },
  4: { label: '验证中', variant: 'secondary' },
  5: { label: '已关闭', variant: 'default' },
  6: { label: '已退回', variant: 'destructive' },
};

export default function Complaint8DPage() {
  const { toast } = useToast();
  const [list, setList] = useState<ComplaintRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [show8DDialog, setShow8DDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ComplaintRecord>>({});
  const [active8DTab, setActive8DTab] = useState('d1');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '20',
        customerName: searchCustomer, productName: searchProduct, status: searchStatus
      });
      const res = await fetch('/api/quality/complaint?' + params);
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
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/quality/complaint', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
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

  const handleSave8D = async () => {
    try {
      const res = await fetch('/api/quality/complaint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '8D报告保存成功' });
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此客诉记录？')) return;
    try {
      const res = await fetch('/api/quality/complaint?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const open8DReport = (item: ComplaintRecord) => {
    setEditItem(item);
    setActive8DTab('d1');
    setShow8DDialog(true);
  };

  return (
    <MainLayout title="客诉8D管理">
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索客户名称" className="pl-8 w-48" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索产品名称" className="pl-8 w-48" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
                </div>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>查询</Button>
              </div>
              <Button onClick={() => { setEditItem({ complaint_source: 'customer', defect_type: 'other', severity: 2 }); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />新建客诉
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客诉编号</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>不良类型</TableHead>
                  <TableHead>严重程度</TableHead>
                  <TableHead>不良数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>登记日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.complaint_no}</TableCell>
                    <TableCell>{sourceMap[item.complaint_source] || item.complaint_source}</TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{defectTypeMap[item.defect_type] || item.defect_type}</TableCell>
                    <TableCell>
                      <Badge variant={severityMap[item.severity]?.variant || 'outline'}>
                        {severityMap[item.severity]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.defect_qty}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {statusMap[item.status]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.report_date?.substring(0, 10) || item.create_time?.substring(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => open8DReport(item)}>
                          8D
                        </Button>
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
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
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
              <DialogTitle>{editItem.id ? '编辑客诉' : '新建客诉'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>投诉来源</Label>
                <Select value={editItem.complaint_source || 'customer'} onValueChange={v => setEditItem({ ...editItem, complaint_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>客户名称 *</Label><Input value={editItem.customer_name || ''} onChange={e => setEditItem({ ...editItem, customer_name: e.target.value })} /></div>
              <div><Label>产品编码</Label><Input value={editItem.product_code || ''} onChange={e => setEditItem({ ...editItem, product_code: e.target.value })} /></div>
              <div><Label>产品名称 *</Label><Input value={editItem.product_name || ''} onChange={e => setEditItem({ ...editItem, product_name: e.target.value })} /></div>
              <div><Label>订单号</Label><Input value={editItem.order_no || ''} onChange={e => setEditItem({ ...editItem, order_no: e.target.value })} /></div>
              <div><Label>不良日期</Label><Input type="date" value={editItem.defect_date || ''} onChange={e => setEditItem({ ...editItem, defect_date: e.target.value })} /></div>
              <div><Label>不良数量</Label><Input type="number" value={editItem.defect_qty || 0} onChange={e => setEditItem({ ...editItem, defect_qty: Number(e.target.value) })} /></div>
              <div>
                <Label>不良类型</Label>
                <Select value={editItem.defect_type || 'other'} onValueChange={v => setEditItem({ ...editItem, defect_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(defectTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>严重程度</Label>
                <Select value={String(editItem.severity || 2)} onValueChange={v => setEditItem({ ...editItem, severity: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(severityMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>登记人</Label><Input value={editItem.reporter || ''} onChange={e => setEditItem({ ...editItem, reporter: e.target.value })} /></div>
              <div className="col-span-2"><Label>不良描述</Label><Textarea rows={3} value={editItem.defect_desc || ''} onChange={e => setEditItem({ ...editItem, defect_desc: e.target.value })} /></div>
              <div className="col-span-2"><Label>备注</Label><Textarea rows={2} value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={show8DDialog} onOpenChange={setShow8DDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>8D报告 - {editItem.complaint_no}</DialogTitle>
            </DialogHeader>
            <Tabs value={active8DTab} onValueChange={setActive8DTab}>
              <TabsList className="grid grid-cols-8">
                <TabsTrigger value="d1">D1</TabsTrigger>
                <TabsTrigger value="d2">D2</TabsTrigger>
                <TabsTrigger value="d3">D3</TabsTrigger>
                <TabsTrigger value="d4">D4</TabsTrigger>
                <TabsTrigger value="d5">D5</TabsTrigger>
                <TabsTrigger value="d6">D6</TabsTrigger>
                <TabsTrigger value="d7">D7</TabsTrigger>
                <TabsTrigger value="d8">D8</TabsTrigger>
              </TabsList>
              <TabsContent value="d1" className="space-y-4 mt-4">
                <h3 className="font-semibold">D1 - 成立团队</h3>
                <div><Label>团队成员</Label><Textarea rows={4} value={editItem.d1_team || ''} onChange={e => setEditItem({ ...editItem, d1_team: e.target.value })} placeholder="列出团队成员及其职责" /></div>
                <div><Label>成立日期</Label><Input type="date" value={editItem.d1_date || ''} onChange={e => setEditItem({ ...editItem, d1_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d2" className="space-y-4 mt-4">
                <h3 className="font-semibold">D2 - 描述问题</h3>
                <div><Label>问题描述</Label><Textarea rows={4} value={editItem.d2_desc || ''} onChange={e => setEditItem({ ...editItem, d2_desc: e.target.value })} placeholder="5W2H方法描述问题：What/When/Where/Who/Why/How/How many" /></div>
                <div><Label>描述日期</Label><Input type="date" value={editItem.d2_date || ''} onChange={e => setEditItem({ ...editItem, d2_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d3" className="space-y-4 mt-4">
                <h3 className="font-semibold">D3 - 临时遏制措施</h3>
                <div><Label>临时措施</Label><Textarea rows={4} value={editItem.d3_interim_action || ''} onChange={e => setEditItem({ ...editItem, d3_interim_action: e.target.value })} placeholder="描述为防止问题扩大采取的临时措施" /></div>
                <div><Label>执行日期</Label><Input type="date" value={editItem.d3_date || ''} onChange={e => setEditItem({ ...editItem, d3_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d4" className="space-y-4 mt-4">
                <h3 className="font-semibold">D4 - 根本原因分析</h3>
                <div><Label>根本原因</Label><Textarea rows={4} value={editItem.d4_root_cause || ''} onChange={e => setEditItem({ ...editItem, d4_root_cause: e.target.value })} placeholder="使用鱼骨图/5Why等方法分析根本原因" /></div>
                <div><Label>分析日期</Label><Input type="date" value={editItem.d4_date || ''} onChange={e => setEditItem({ ...editItem, d4_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d5" className="space-y-4 mt-4">
                <h3 className="font-semibold">D5 - 制定永久纠正措施</h3>
                <div><Label>纠正措施</Label><Textarea rows={4} value={editItem.d5_corrective_action || ''} onChange={e => setEditItem({ ...editItem, d5_corrective_action: e.target.value })} placeholder="针对根本原因制定的永久纠正措施" /></div>
                <div><Label>制定日期</Label><Input type="date" value={editItem.d5_date || ''} onChange={e => setEditItem({ ...editItem, d5_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d6" className="space-y-4 mt-4">
                <h3 className="font-semibold">D6 - 实施并验证纠正措施</h3>
                <div><Label>实施与验证</Label><Textarea rows={4} value={editItem.d6_implement_verify || ''} onChange={e => setEditItem({ ...editItem, d6_implement_verify: e.target.value })} placeholder="描述纠正措施的实施情况及验证结果" /></div>
                <div><Label>验证日期</Label><Input type="date" value={editItem.d6_date || ''} onChange={e => setEditItem({ ...editItem, d6_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d7" className="space-y-4 mt-4">
                <h3 className="font-semibold">D7 - 预防再发生</h3>
                <div><Label>预防措施</Label><Textarea rows={4} value={editItem.d7_preventive_action || ''} onChange={e => setEditItem({ ...editItem, d7_preventive_action: e.target.value })} placeholder="系统性的预防措施，如修改SOP、增加检验等" /></div>
                <div><Label>预防日期</Label><Input type="date" value={editItem.d7_date || ''} onChange={e => setEditItem({ ...editItem, d7_date: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="d8" className="space-y-4 mt-4">
                <h3 className="font-semibold">D8 - 祝贺团队</h3>
                <div><Label>总结与表彰</Label><Textarea rows={4} value={editItem.d8_congratulations || ''} onChange={e => setEditItem({ ...editItem, d8_congratulations: e.target.value })} placeholder="总结本次8D活动的成果，表彰团队贡献" /></div>
                <div><Label>关闭日期</Label><Input type="date" value={editItem.d8_date || ''} onChange={e => setEditItem({ ...editItem, d8_date: e.target.value })} /></div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShow8DDialog(false)}>关闭</Button>
              <Button onClick={handleSave8D}>保存8D报告</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
