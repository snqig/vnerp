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
import { Plus, Search, Edit, Trash2, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContractReviewRecord {
  id?: number;
  review_no: string;
  order_id?: number;
  order_no: string;
  customer_id?: number;
  customer_name: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  quantity: number;
  amount: number;
  delivery_date: string;
  sample_status: string;
  quality_requirement: string;
  production_capacity: string;
  material_availability: string;
  engineering_feasibility: string;
  biz_opinion: string;
  eng_opinion: string;
  quality_opinion: string;
  prod_opinion: string;
  purchase_opinion: string;
  review_date: string;
  status: number;
  remark: string;
  create_time: string;
}

const sampleStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'pending': { label: '未打样', variant: 'outline' },
  'sampling': { label: '打样中', variant: 'secondary' },
  'approved': { label: '样品OK', variant: 'default' },
  'rejected': { label: '样品NG', variant: 'destructive' },
  'not_required': { label: '无需打样', variant: 'secondary' },
};
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待评审', variant: 'outline' },
  2: { label: '评审中', variant: 'secondary' },
  3: { label: '已通过', variant: 'default' },
  4: { label: '已拒绝', variant: 'destructive' },
};

export default function ContractReviewPage() {
  const { toast } = useToast();
  const [list, setList] = useState<ContractReviewRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ContractReviewRecord>>({});
  const [activeReviewTab, setActiveReviewTab] = useState('biz');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '20',
        customerName: searchCustomer, productName: searchProduct, status: searchStatus
      });
      const res = await fetch('/api/business/contract-review?' + params);
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
      const res = await fetch('/api/business/contract-review', {
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

  const handleSaveReview = async () => {
    try {
      const res = await fetch('/api/business/contract-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '评审意见保存成功' });
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此评审记录？')) return;
    try {
      const res = await fetch('/api/business/contract-review?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const openReview = (item: ContractReviewRecord) => {
    setEditItem(item);
    setActiveReviewTab('biz');
    setShowReviewDialog(true);
  };

  return (
    <MainLayout title="合同评审管理">
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
              <Button onClick={() => { setEditItem({ sample_status: 'pending' }); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />新建评审
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>评审编号</TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>交期</TableHead>
                  <TableHead>样品状态</TableHead>
                  <TableHead>评审状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.review_no}</TableCell>
                    <TableCell>{item.order_no || '-'}</TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.amount ? '¥' + Number(item.amount).toLocaleString() : '-'}</TableCell>
                    <TableCell>{item.delivery_date?.substring(0, 10) || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sampleStatusMap[item.sample_status]?.variant || 'outline'}>
                        {sampleStatusMap[item.sample_status]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {statusMap[item.status]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openReview(item)}>
                          评审
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
              <DialogTitle>{editItem.id ? '编辑评审' : '新建评审'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><Label>订单号</Label><Input value={editItem.order_no || ''} onChange={e => setEditItem({ ...editItem, order_no: e.target.value })} /></div>
              <div><Label>客户名称 *</Label><Input value={editItem.customer_name || ''} onChange={e => setEditItem({ ...editItem, customer_name: e.target.value })} /></div>
              <div><Label>产品编码</Label><Input value={editItem.product_code || ''} onChange={e => setEditItem({ ...editItem, product_code: e.target.value })} /></div>
              <div><Label>产品名称 *</Label><Input value={editItem.product_name || ''} onChange={e => setEditItem({ ...editItem, product_name: e.target.value })} /></div>
              <div><Label>数量</Label><Input type="number" value={editItem.quantity || 0} onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })} /></div>
              <div><Label>金额</Label><Input type="number" value={editItem.amount || 0} onChange={e => setEditItem({ ...editItem, amount: Number(e.target.value) })} /></div>
              <div><Label>交货日期</Label><Input type="date" value={editItem.delivery_date || ''} onChange={e => setEditItem({ ...editItem, delivery_date: e.target.value })} /></div>
              <div>
                <Label>样品状态</Label>
                <Select value={editItem.sample_status || 'pending'} onValueChange={v => setEditItem({ ...editItem, sample_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sampleStatusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>质量要求</Label><Textarea rows={2} value={editItem.quality_requirement || ''} onChange={e => setEditItem({ ...editItem, quality_requirement: e.target.value })} /></div>
              <div className="col-span-2"><Label>备注</Label><Textarea rows={2} value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>合同评审 - {editItem.review_no}</DialogTitle>
            </DialogHeader>
            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">客户：</span>{editItem.customer_name}</div>
              <div><span className="text-muted-foreground">产品：</span>{editItem.product_name}</div>
              <div><span className="text-muted-foreground">数量：</span>{editItem.quantity}</div>
            </div>
            <Tabs value={activeReviewTab} onValueChange={setActiveReviewTab}>
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="biz">业务部</TabsTrigger>
                <TabsTrigger value="eng">工程技术部</TabsTrigger>
                <TabsTrigger value="quality">品质部</TabsTrigger>
                <TabsTrigger value="prod">生产部</TabsTrigger>
                <TabsTrigger value="purchase">采购部</TabsTrigger>
              </TabsList>
              <TabsContent value="biz" className="space-y-4 mt-4">
                <h3 className="font-semibold">业务部评审意见</h3>
                <div><Label>评审意见</Label><Textarea rows={4} value={editItem.biz_opinion || ''} onChange={e => setEditItem({ ...editItem, biz_opinion: e.target.value })} placeholder="业务部对合同条款、交期、价格等方面的评审意见" /></div>
              </TabsContent>
              <TabsContent value="eng" className="space-y-4 mt-4">
                <h3 className="font-semibold">工程技术部评审意见</h3>
                <div><Label>工程可行性评估</Label><Textarea rows={3} value={editItem.engineering_feasibility || ''} onChange={e => setEditItem({ ...editItem, engineering_feasibility: e.target.value })} placeholder="工艺可行性、打样状态、技术难点等评估" /></div>
                <div><Label>评审意见</Label><Textarea rows={3} value={editItem.eng_opinion || ''} onChange={e => setEditItem({ ...editItem, eng_opinion: e.target.value })} placeholder="工程技术部评审意见" /></div>
              </TabsContent>
              <TabsContent value="quality" className="space-y-4 mt-4">
                <h3 className="font-semibold">品质部评审意见</h3>
                <div><Label>质量要求评估</Label><Textarea rows={3} value={editItem.quality_requirement || ''} onChange={e => setEditItem({ ...editItem, quality_requirement: e.target.value })} placeholder="客户质量要求是否可达成、检验标准等评估" /></div>
                <div><Label>评审意见</Label><Textarea rows={3} value={editItem.quality_opinion || ''} onChange={e => setEditItem({ ...editItem, quality_opinion: e.target.value })} placeholder="品质部评审意见" /></div>
              </TabsContent>
              <TabsContent value="prod" className="space-y-4 mt-4">
                <h3 className="font-semibold">生产部评审意见</h3>
                <div><Label>产能评估</Label><Textarea rows={3} value={editItem.production_capacity || ''} onChange={e => setEditItem({ ...editItem, production_capacity: e.target.value })} placeholder="产能是否满足、排产计划等评估" /></div>
                <div><Label>评审意见</Label><Textarea rows={3} value={editItem.prod_opinion || ''} onChange={e => setEditItem({ ...editItem, prod_opinion: e.target.value })} placeholder="生产部评审意见" /></div>
              </TabsContent>
              <TabsContent value="purchase" className="space-y-4 mt-4">
                <h3 className="font-semibold">采购部评审意见</h3>
                <div><Label>物料供应评估</Label><Textarea rows={3} value={editItem.material_availability || ''} onChange={e => setEditItem({ ...editItem, material_availability: e.target.value })} placeholder="物料供应能力、交期等评估" /></div>
                <div><Label>评审意见</Label><Textarea rows={3} value={editItem.purchase_opinion || ''} onChange={e => setEditItem({ ...editItem, purchase_opinion: e.target.value })} placeholder="采购部评审意见" /></div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>关闭</Button>
              <Button onClick={handleSaveReview}>保存评审意见</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
