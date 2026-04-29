'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Plus, RefreshCw, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface BatchInventory {
  id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  warehouse_id: number;
  warehouse_name: string;
  inbound_no: string;
  inbound_date: string;
  inbound_quantity: number;
  outbound_quantity: number;
  available_quantity: number;
  supplier_name: string;
  qc_status: number;
  status: number;
}

export default function WarehousePage() {
  const [batches, setBatches] = useState<BatchInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 入库表单
  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundForm, setInboundForm] = useState({
    warehouse_id: '',
    inbound_date: new Date().toISOString().split('T')[0],
    items: [{ material_id: '', material_code: '', material_name: '', quantity: '', unit: '张', batch_no: '' }]
  });

  // 出库表单
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [outboundForm, setOutboundForm] = useState({
    warehouse_id: '',
    customer_name: '',
    outbound_date: new Date().toISOString().split('T')[0],
    items: [{ material_id: '', material_code: '', material_name: '', quantity: '', unit: '张', batch_inventory_id: '' }]
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        materialKeyword: searchKeyword
      });
      const res = await fetch(`/api/warehouse/batch-inventory?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setBatches(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      toast.error('获取批次库存失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page]);

  const handleInbound = async () => {
    try {
      const items = inboundForm.items.filter(item => item.material_id && item.quantity);
      if (items.length === 0) {
        toast.error('请至少添加一个入库明细');
        return;
      }

      const res = await fetch('/api/warehouse/batch-inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: inboundForm.warehouse_id,
          inbound_date: inboundForm.inbound_date,
          items: items.map(item => ({
            material_id: parseInt(item.material_id),
            material_code: item.material_code,
            material_name: item.material_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            batch_no: item.batch_no || undefined
          }))
        })
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success('入库成功');
        setInboundOpen(false);
        fetchBatches();
      } else {
        toast.error(data.message || '入库失败');
      }
    } catch (error) {
      toast.error('入库失败');
    }
  };

  const handleOutbound = async () => {
    try {
      const items = outboundForm.items.filter(item => item.material_id && item.quantity);
      if (items.length === 0) {
        toast.error('请至少添加一个出库明细');
        return;
      }

      const res = await fetch('/api/warehouse/batch-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: outboundForm.warehouse_id,
          customer_name: outboundForm.customer_name,
          outbound_date: outboundForm.outbound_date,
          items: items.map(item => ({
            material_id: parseInt(item.material_id),
            material_code: item.material_code,
            material_name: item.material_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            batch_inventory_id: item.batch_inventory_id ? parseInt(item.batch_inventory_id) : undefined
          }))
        })
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success('出库成功');
        setOutboundOpen(false);
        fetchBatches();
      } else {
        toast.error(data.message || '出库失败');
      }
    } catch (error) {
      toast.error('出库失败');
    }
  };

  const fetchAvailableBatches = async (materialId: number, warehouseId: number, index: number) => {
    try {
      const res = await fetch('/api/warehouse/batch-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, warehouse_id: warehouseId })
      });
      const data = await res.json();
      if (data.code === 200) {
        setAvailableBatches(data.data.batches || []);
      }
    } catch (error) {
      toast.error('获取可用批次失败');
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1: return <Badge className="bg-green-500">正常</Badge>;
      case 2: return <Badge className="bg-gray-500">已用完</Badge>;
      default: return <Badge variant="secondary">未知</Badge>;
    }
  };

  const getQcStatusBadge = (status: number) => {
    switch (status) {
      case 1: return <Badge className="bg-green-500">合格</Badge>;
      case 0: return <Badge variant="destructive">不合格</Badge>;
      case 2: return <Badge variant="secondary">待检</Badge>;
      default: return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">仓库管理</h1>
        <div className="flex gap-2">
          <Dialog open={inboundOpen} onOpenChange={setInboundOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                入库
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" resizable>
              <DialogHeader>
                <DialogTitle>生产入库</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>仓库</Label>
                    <Select value={inboundForm.warehouse_id} onValueChange={(v) => setInboundForm({...inboundForm, warehouse_id: v})}>
                      <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">原材料仓</SelectItem>
                        <SelectItem value="2">成品仓</SelectItem>
                        <SelectItem value="3">半成品仓</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>入库日期</Label>
                    <Input type="date" value={inboundForm.inbound_date} onChange={(e) => setInboundForm({...inboundForm, inbound_date: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>入库明细</Label>
                  {inboundForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2">
                      <Input placeholder="物料编码" value={item.material_code} onChange={(e) => {
                        const newItems = [...inboundForm.items];
                        newItems[index].material_code = e.target.value;
                        setInboundForm({...inboundForm, items: newItems});
                      }} />
                      <Input placeholder="物料名称" value={item.material_name} onChange={(e) => {
                        const newItems = [...inboundForm.items];
                        newItems[index].material_name = e.target.value;
                        setInboundForm({...inboundForm, items: newItems});
                      }} />
                      <Input type="number" placeholder="数量" value={item.quantity} onChange={(e) => {
                        const newItems = [...inboundForm.items];
                        newItems[index].quantity = e.target.value;
                        setInboundForm({...inboundForm, items: newItems});
                      }} />
                      <Input placeholder="单位" value={item.unit} onChange={(e) => {
                        const newItems = [...inboundForm.items];
                        newItems[index].unit = e.target.value;
                        setInboundForm({...inboundForm, items: newItems});
                      }} />
                      <Input placeholder="批次号（可选）" value={item.batch_no} onChange={(e) => {
                        const newItems = [...inboundForm.items];
                        newItems[index].batch_no = e.target.value;
                        setInboundForm({...inboundForm, items: newItems});
                      }} />
                      <Button variant="outline" size="sm" onClick={() => {
                        const newItems = inboundForm.items.filter((_, i) => i !== index);
                        setInboundForm({...inboundForm, items: newItems});
                      }}>删除</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    setInboundForm({
                      ...inboundForm,
                      items: [...inboundForm.items, { material_id: '', material_code: '', material_name: '', quantity: '', unit: '张', batch_no: '' }]
                    });
                  }}>添加明细</Button>
                </div>
                <Button onClick={handleInbound} className="w-full">确认入库</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={outboundOpen} onOpenChange={setOutboundOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                出库
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" resizable>
              <DialogHeader>
                <DialogTitle>销售出库</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>仓库</Label>
                    <Select value={outboundForm.warehouse_id} onValueChange={(v) => setOutboundForm({...outboundForm, warehouse_id: v})}>
                      <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">原材料仓</SelectItem>
                        <SelectItem value="2">成品仓</SelectItem>
                        <SelectItem value="3">半成品仓</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>客户名称</Label>
                    <Input placeholder="客户名称" value={outboundForm.customer_name} onChange={(e) => setOutboundForm({...outboundForm, customer_name: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>出库明细</Label>
                  {outboundForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2">
                      <Input placeholder="物料编码" value={item.material_code} onChange={(e) => {
                        const newItems = [...outboundForm.items];
                        newItems[index].material_code = e.target.value;
                        setOutboundForm({...outboundForm, items: newItems});
                      }} />
                      <Input placeholder="物料名称" value={item.material_name} onChange={(e) => {
                        const newItems = [...outboundForm.items];
                        newItems[index].material_name = e.target.value;
                        setOutboundForm({...outboundForm, items: newItems});
                      }} />
                      <Input type="number" placeholder="数量" value={item.quantity} onChange={(e) => {
                        const newItems = [...outboundForm.items];
                        newItems[index].quantity = e.target.value;
                        setOutboundForm({...outboundForm, items: newItems});
                      }} />
                      <Input placeholder="单位" value={item.unit} onChange={(e) => {
                        const newItems = [...outboundForm.items];
                        newItems[index].unit = e.target.value;
                        setOutboundForm({...outboundForm, items: newItems});
                      }} />
                      <Select value={item.batch_inventory_id} onValueChange={(v) => {
                        const newItems = [...outboundForm.items];
                        newItems[index].batch_inventory_id = v;
                        setOutboundForm({...outboundForm, items: newItems});
                      }}>
                        <SelectTrigger><SelectValue placeholder="选择批次" /></SelectTrigger>
                        <SelectContent>
                          {availableBatches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id.toString()}>
                              {batch.batch_no} (可用: {batch.available_quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (item.material_id && outboundForm.warehouse_id) {
                          fetchAvailableBatches(parseInt(item.material_id), parseInt(outboundForm.warehouse_id), index);
                        }
                        const newItems = outboundForm.items.filter((_, i) => i !== index);
                        setOutboundForm({...outboundForm, items: newItems});
                      }}>加载批次</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    setOutboundForm({
                      ...outboundForm,
                      items: [...outboundForm.items, { material_id: '', material_code: '', material_name: '', quantity: '', unit: '张', batch_inventory_id: '' }]
                    });
                  }}>添加明细</Button>
                </div>
                <Button onClick={handleOutbound} className="w-full">确认出库</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={fetchBatches}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            批次库存管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索物料名称/编码..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchBatches}>搜索</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>批次号</TableHead>
                  <TableHead>物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>仓库</TableHead>
                  <TableHead>入库数量</TableHead>
                  <TableHead>已出库</TableHead>
                  <TableHead>可用库存</TableHead>
                  <TableHead>入库日期</TableHead>
                  <TableHead>质检</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">{batch.batch_no}</TableCell>
                    <TableCell>{batch.material_code}</TableCell>
                    <TableCell>{batch.material_name}</TableCell>
                    <TableCell>{batch.specification || '-'}</TableCell>
                    <TableCell>{batch.warehouse_name || '-'}</TableCell>
                    <TableCell>{batch.inbound_quantity} {batch.unit}</TableCell>
                    <TableCell>{batch.outbound_quantity} {batch.unit}</TableCell>
                    <TableCell className="font-semibold text-green-600">{batch.available_quantity} {batch.unit}</TableCell>
                    <TableCell>{batch.inbound_date}</TableCell>
                    <TableCell>{getQcStatusBadge(batch.qc_status)}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} 页
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
