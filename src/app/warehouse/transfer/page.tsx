'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, QrCode, PackageOpen, PackageCheck, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';

interface TransferOrder {
  id: number;
  transfer_no: string;
  type: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  from_location: string | null;
  to_location: string | null;
  status: number;
  applicant_id: number | null;
  approver_id: number | null;
  out_time: string | null;
  in_time: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  applicant_name?: string;
  approver_name?: string;
  type_name?: string;
  status_name?: string;
}

interface TransferItem {
  id: number;
  transfer_id: number;
  material_id: number;
  qr_code: string | null;
  quantity: number;
  out_quantity: number;
  in_quantity: number;
  unit: string | null;
  batch_no: string | null;
  material_name?: string;
}

interface Warehouse {
  id: number;
  name: string;
}

const STATUS_MAP: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  0: { label: '草稿', variant: 'outline' },
  1: { label: '待审批', variant: 'secondary' },
  2: { label: '已出库', variant: 'default' },
  3: { label: '已入库', variant: 'default' },
  4: { label: '已取消', variant: 'destructive' }
};

const TYPE_MAP: Record<number, string> = {
  1: '库位调拨',
  2: '仓库调拨'
};

export default function TransferPage() {
  const { toast } = useToast();
  const [list, setList] = useState<TransferOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TransferOrder>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<{ id: number; code: string; name: string; wh_id: number }[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showOutboundDialog, setShowOutboundDialog] = useState(false);
  const [showInboundDialog, setShowInboundDialog] = useState(false);
  const [currentTransferId, setCurrentTransferId] = useState<number | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [scanItems, setScanItems] = useState<{ material_id: number; qr_code: string; quantity: number }[]>([]);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItems, setDetailItems] = useState<TransferItem[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<TransferOrder | null>(null);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', transferNo: searchNo });
      const res = await fetch('/api/warehouse/transfer?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouse?status=active');
      const result = await res.json();
      if (result.success) {
        setWarehouses(result.data?.map((w: any) => ({ id: w.id, name: w.name })) || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLocations = async (whId: number) => {
    try {
      const res = await fetch(`/api/warehouse/locations?wh_id=${whId}`);
      const result = await res.json();
      if (result.success) {
        setLocations(result.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchWarehouses(); }, []);

  const handleSave = async () => {
    if (!editItem.from_warehouse_id) {
      toast({ title: '请选择源仓库', variant: 'destructive' });
      return;
    }
    if (!editItem.to_warehouse_id) {
      toast({ title: '请选择目标仓库', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editItem.type || 1,
          from_warehouse_id: editItem.from_warehouse_id,
          to_warehouse_id: editItem.to_warehouse_id,
          from_location: editItem.from_location,
          to_location: editItem.to_location,
          applicant_id: editItem.applicant_id,
          remark: editItem.remark
        })
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '操作失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string, extraData?: any) => {
    try {
      const body: any = { id, action };
      if (extraData) Object.assign(body, extraData);

      const res = await fetch('/api/warehouse/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: '操作成功' });
        fetchData();
      } else {
        toast({ title: '操作失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch(`/api/warehouse/transfer?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const openOutboundDialog = async (transfer: TransferOrder) => {
    setCurrentTransferId(transfer.id);
    try {
      const res = await fetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        setTransferItems(result.data || []);
        setScanItems([]);
        setShowOutboundDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeOutbound = async () => {
    if (!currentTransferId || scanItems.length === 0) {
      toast({ title: '请添加出库明细', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`/api/warehouse/transfer/${currentTransferId}/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: scanItems })
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: `出库成功！已出 ${result.data.out_quantity} 件` });
        setShowOutboundDialog(false);
        fetchData();
      } else {
        toast({ title: '出库失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '出库失败', variant: 'destructive' });
    }
  };

  const openInboundDialog = async (transfer: TransferOrder) => {
    setCurrentTransferId(transfer.id);
    try {
      const res = await fetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        setTransferItems(result.data || []);
        setScanItems([]);
        setShowInboundDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openDetailDialog = async (transfer: TransferOrder) => {
    setCurrentTransfer(transfer);
    try {
      const res = await fetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        setDetailItems(result.data || []);
        setShowDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeInbound = async () => {
    if (!currentTransferId || scanItems.length === 0) {
      toast({ title: '请添加入库明细', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`/api/warehouse/transfer/${currentTransferId}/inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: scanItems })
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: `入库成功！已入 ${result.data.in_quantity} 件` });
        setShowInboundDialog(false);
        fetchData();
      } else {
        toast({ title: '入库失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '入库失败', variant: 'destructive' });
    }
  };

  const addScanItem = () => {
    setScanItems([...scanItems, { material_id: 0, qr_code: '', quantity: 0 }]);
  };

  const updateScanItem = (index: number, field: 'material_id' | 'qr_code' | 'quantity', value: any) => {
    const updated = [...scanItems];
    updated[index] = { ...updated[index], [field]: value };
    setScanItems(updated);
  };

  const removeScanItem = (index: number) => {
    setScanItems(scanItems.filter((_, i) => i !== index));
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedList = useCallback(() => {
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'zh-CN') : bVal.localeCompare(aVal, 'zh-CN');
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [list, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length) { setSelectedIds([]); }
    else { setSelectedIds(list.map(item => item.id)); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none border border-border bg-muted/50 text-muted-foreground text-center whitespace-nowrap hover:bg-muted/70 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">库存调拨</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}>
              <Plus className="h-3 w-3 mr-1" />新增调拨
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table className="border-collapse border border-border">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center w-12">
                    <Checkbox checked={selectedIds.length === list.length && list.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <SortableHeader field="transfer_no">调拨单号</SortableHeader>
                  <SortableHeader field="type">类型</SortableHeader>
                  <SortableHeader field="from_warehouse_name">源仓库</SortableHeader>
                  <SortableHeader field="to_warehouse_name">目标仓库</SortableHeader>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">状态</TableHead>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">申请人</TableHead>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList().map(item => {
                  const st = STATUS_MAP[item.status] || STATUS_MAP[0];
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 even:bg-muted/20">
                      <TableCell className="border border-border text-center">
                        <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                      <TableCell className="border border-border text-center font-mono text-xs">{item.transfer_no}</TableCell>
                      <TableCell className="border border-border text-center text-xs">{TYPE_MAP[item.type] || '-'}</TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        <div>{item.from_warehouse_name || '-'}</div>
                        {item.from_location && <div className="text-muted-foreground text-[10px]">{item.from_location}</div>}
                      </TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        <div>{item.to_warehouse_name || '-'}</div>
                        {item.to_location && <div className="text-muted-foreground text-[10px]">{item.to_location}</div>}
                      </TableCell>
                      <TableCell className="border border-border text-center"><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell className="border border-border text-center text-xs">{item.applicant_name || '-'}</TableCell>
                      <TableCell className="border border-border text-center">
                        <div className="flex gap-1 justify-center">
                          {[0, 1].includes(item.status) && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleAction(item.id, 'cancel')}>
                              取消
                            </Button>
                          )}
                          {item.status === 1 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleAction(item.id, 'approve', { approver_id: 1 })}>
                              审批通过
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => openOutboundDialog(item)}>
                              <PackageOpen className="h-3 w-3 mr-1" />扫码出库
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => openInboundDialog(item)}>
                              <PackageCheck className="h-3 w-3 mr-1" />扫码入库
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openDetailDialog(item)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {[0, 4].includes(item.status) && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 border border-border">暂无调拨记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>新增调拨单</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>调拨类型 <span className="text-red-500">*</span></Label>
                <Select value={String(editItem.type || 1)} onValueChange={(v) => {
                  const type = Number(v);
                  setEditItem({ ...editItem, type });
                  if (type === 1 && editItem.from_warehouse_id) {
                    fetchLocations(editItem.from_warehouse_id);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">库位调拨</SelectItem>
                    <SelectItem value="2">仓库调拨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>源仓库 <span className="text-red-500">*</span></Label>
                <Select value={String(editItem.from_warehouse_id || '')} onValueChange={v => {
                  const whId = Number(v);
                  setEditItem({ ...editItem, from_warehouse_id: whId });
                  if (editItem.type === 1) {
                    fetchLocations(whId);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(editItem.type === 1) && (
                <>
                  <div>
                    <Label>调出库位 <span className="text-red-500">*</span></Label>
                    <Select value={editItem.from_location || ''} onValueChange={v => setEditItem({ ...editItem, from_location: v })}>
                      <SelectTrigger><SelectValue placeholder="选择库位" /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>调入库位 <span className="text-red-500">*</span></Label>
                    <Select value={editItem.to_location || ''} onValueChange={v => setEditItem({ ...editItem, to_location: v })}>
                      <SelectTrigger><SelectValue placeholder="选择库位" /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label>目标仓库 <span className="text-red-500">*</span></Label>
                <Select value={String(editItem.to_warehouse_id || '')} onValueChange={v => setEditItem({ ...editItem, to_warehouse_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>申请人</Label>
                <UserSelect value={editItem.applicant_id ? String(editItem.applicant_id) : ''} onChange={v => setEditItem({ ...editItem, applicant_id: Number(v) })} />
              </div>
              <div className="col-span-2">
                <Label>备注</Label>
                <Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOutboundDialog} onOpenChange={setShowOutboundDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader><DialogTitle>扫码出库</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">调拨明细</span>
                  <Button size="sm" variant="outline" onClick={addScanItem}><QrCode className="h-3 w-3 mr-1" />添加扫码项</Button>
                </div>
                {scanItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">点击上方按钮添加出库明细</p>
                ) : (
                  scanItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">二维码</Label>
                        <Input
                          value={item.qr_code}
                          onChange={e => updateScanItem(index, 'qr_code', e.target.value)}
                          placeholder="扫描或输入二维码"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">数量</Label>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={e => updateScanItem(index, 'quantity', Number(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">物料ID</Label>
                        <Input
                          type="number"
                          value={item.material_id || ''}
                          onChange={e => updateScanItem(index, 'material_id', Number(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => removeScanItem(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOutboundDialog(false)}>关闭</Button>
              <Button onClick={executeOutbound}><PackageOpen className="h-4 w-4 mr-1" />确认出库</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInboundDialog} onOpenChange={setShowInboundDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader><DialogTitle>扫码入库</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">入库明细</span>
                  <Button size="sm" variant="outline" onClick={addScanItem}><QrCode className="h-3 w-3 mr-1" />添加扫码项</Button>
                </div>
                {scanItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">点击上方按钮添加入库明细</p>
                ) : (
                  scanItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">二维码</Label>
                        <Input
                          value={item.qr_code}
                          onChange={e => updateScanItem(index, 'qr_code', e.target.value)}
                          placeholder="扫描或输入二维码"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">数量</Label>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={e => updateScanItem(index, 'quantity', Number(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">物料ID</Label>
                        <Input
                          type="number"
                          value={item.material_id || ''}
                          onChange={e => updateScanItem(index, 'material_id', Number(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => removeScanItem(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInboundDialog(false)}>关闭</Button>
              <Button onClick={executeInbound}><PackageCheck className="h-4 w-4 mr-1" />确认入库</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader><DialogTitle>调拨明细 - {currentTransfer?.transfer_no}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {currentTransfer && (
                <div className="grid grid-cols-4 gap-4 p-3 border rounded bg-muted/30 text-sm">
                  <div><span className="text-muted-foreground">类型：</span>{TYPE_MAP[currentTransfer.type]}</div>
                  <div><span className="text-muted-foreground">源仓库：</span>{currentTransfer.from_warehouse_name || '-'}</div>
                  <div><span className="text-muted-foreground">目标仓库：</span>{currentTransfer.to_warehouse_name || '-'}</div>
                  <div><span className="text-muted-foreground">状态：</span><Badge variant={(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).variant}>{(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).label}</Badge></div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料名称</TableHead>
                    <TableHead>二维码</TableHead>
                    <TableHead>批次号</TableHead>
                    <TableHead>计划数量</TableHead>
                    <TableHead>已出库</TableHead>
                    <TableHead>已入库</TableHead>
                    <TableHead>单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailItems.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">暂无明细数据</TableCell></TableRow>
                  ) : (
                    detailItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.material_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.qr_code || '-'}</TableCell>
                        <TableCell>{item.batch_no || '-'}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.out_quantity}</TableCell>
                        <TableCell className="text-center">{item.in_quantity}</TableCell>
                        <TableCell>{item.unit || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
