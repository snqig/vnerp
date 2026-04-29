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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Printer, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransferOrder {
  id: number; transfer_no: string; from_warehouse_id: number; to_warehouse_id: number;
  from_warehouse_name: string; to_warehouse_name: string; transfer_date: string;
  transfer_type: number; status: number; operator_name: string; remark: string;
}

interface Warehouse {
  id: number;
  warehouse_name: string;
  warehouse_code: string;
  warehouse_type: number;
  address?: string;
  status: number;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待审核', variant: 'outline' }, 2: { label: '已审核', variant: 'default' },
  3: { label: '已完成', variant: 'secondary' }, 4: { label: '已取消', variant: 'destructive' },
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', transferNo: searchNo });
      const res = await fetch('/api/warehouse/transfer?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); }
    } catch (e) { console.error(e); }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouse?status=active');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchWarehouses(); }, []);

  const handleSave = async () => {
    if (!editItem.from_warehouse_id) { toast({ title: '请选择源仓库', variant: 'destructive' }); return; }
    if (!editItem.to_warehouse_id) { toast({ title: '请选择目标仓库', variant: 'destructive' }); return; }
    if (!editItem.transfer_date) { toast({ title: '请选择调拨日期', variant: 'destructive' }); return; }
    if (!editItem.operator_name) { toast({ title: '请输入操作人', variant: 'destructive' }); return; }
    try {
      const res = await fetch('/api/warehouse/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
      const result = await res.json();
      if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); }
      else { toast({ title: '操作失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await fetch('/api/warehouse/transfer', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const result = await res.json();
      if (result.success) { toast({ title: '状态更新成功' }); fetchData(); }
    } catch (e) { toast({ title: '更新失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch('/api/warehouse/transfer?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '删除成功' }); fetchData(); }
    } catch (e) { toast({ title: '删除失败', variant: 'destructive' }); }
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
      className="cursor-pointer select-none border border-gray-300 bg-gray-100 text-center whitespace-nowrap hover:bg-gray-200 transition-colors"
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

  const handlePrint = () => {
    const printData = sortedList();
    const printContent = `
      <html><head><title>库存调拨</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 12px; }
        th { background: #f0f0f0; font-weight: bold; }
      </style></head><body>
      <h1>库存调拨记录</h1>
      <table>
        <thead><tr><th>调拨单号</th><th>源仓库</th><th>目标仓库</th><th>调拨日期</th><th>类型</th><th>操作人</th><th>状态</th><th>备注</th></tr></thead>
        <tbody>${printData.map(item => {
          const st = statusMap[item.status] || statusMap[1];
          return `<tr><td>${item.transfer_no}</td><td>${item.from_warehouse_name || '-'}</td><td>${item.to_warehouse_name || '-'}</td><td>${item.transfer_date || '-'}</td><td>${item.transfer_type === 1 ? '普通' : '紧急'}</td><td>${item.operator_name || '-'}</td><td>${st.label}</td><td>${item.remark || '-'}</td></tr>`;
        }).join('')}</tbody>
      </table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
  };

  const handleExportExcel = () => {
    const printData = sortedList();
    const headers = ['调拨单号', '源仓库', '目标仓库', '调拨日期', '类型', '操作人', '状态', '备注'];
    const rows = printData.map(item => {
      const st = statusMap[item.status] || statusMap[1];
      return [item.transfer_no, item.from_warehouse_name || '-', item.to_warehouse_name || '-', item.transfer_date || '-', item.transfer_type === 1 ? '普通' : '紧急', item.operator_name || '-', st.label, item.remark || '-'];
    });
    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `库存调拨_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportWord = () => {
    const printData = sortedList();
    const content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>库存调拨</title>
      <style>body{font-family:'Microsoft YaHei';}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #333;padding:6px;text-align:center;font-size:12px;}th{background:#f0f0f0;}</style></head>
      <body><h1 style="text-align:center">库存调拨记录</h1>
      <table><thead><tr><th>调拨单号</th><th>源仓库</th><th>目标仓库</th><th>调拨日期</th><th>类型</th><th>操作人</th><th>状态</th><th>备注</th></tr></thead>
      <tbody>${printData.map(item => {
        const st = statusMap[item.status] || statusMap[1];
        return `<tr><td>${item.transfer_no}</td><td>${item.from_warehouse_name || '-'}</td><td>${item.to_warehouse_name || '-'}</td><td>${item.transfer_date || '-'}</td><td>${item.transfer_type === 1 ? '普通' : '紧急'}</td><td>${item.operator_name || '-'}</td><td>${st.label}</td><td>${item.remark || '-'}</td></tr>`;
      }).join('')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `库存调拨_${new Date().toISOString().slice(0, 10)}.doc`;
    link.click();
  };

  const handleExportPDF = () => { window.print(); };

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
            <Button size="sm" variant="outline" onClick={handlePrint} title="打印"><Printer className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} title="导出Excel"><FileSpreadsheet className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={handleExportWord} title="导出Word"><FileText className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF} title="导出PDF"><BarChart3 className="h-3 w-3" /></Button>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增调拨</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table className="border-collapse border border-gray-300">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="border border-gray-300 bg-gray-100 text-center w-12">
                    <Checkbox checked={selectedIds.length === list.length && list.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <SortableHeader field="transfer_no">调拨单号</SortableHeader>
                  <SortableHeader field="from_warehouse_name">源仓库</SortableHeader>
                  <SortableHeader field="to_warehouse_name">目标仓库</SortableHeader>
                  <SortableHeader field="transfer_date">调拨日期</SortableHeader>
                  <SortableHeader field="transfer_type">类型</SortableHeader>
                  <SortableHeader field="operator_name">操作人</SortableHeader>
                  <SortableHeader field="status">状态</SortableHeader>
                  <TableHead className="border border-gray-300 bg-gray-100 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList().map(item => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id} className="hover:bg-blue-50 even:bg-gray-50/50">
                      <TableCell className="border border-gray-300 text-center">
                        <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                      <TableCell className="border border-gray-300 text-center font-mono text-xs">{item.transfer_no}</TableCell>
                      <TableCell className="border border-gray-300 text-center text-xs">{item.from_warehouse_name || '-'}</TableCell>
                      <TableCell className="border border-gray-300 text-center text-xs">{item.to_warehouse_name || '-'}</TableCell>
                      <TableCell className="border border-gray-300 text-center text-xs">{item.transfer_date || '-'}</TableCell>
                      <TableCell className="border border-gray-300 text-center text-xs">{item.transfer_type === 1 ? '普通' : '紧急'}</TableCell>
                      <TableCell className="border border-gray-300 text-center text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell className="border border-gray-300 text-center"><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell className="border border-gray-300 text-center">
                        <div className="flex gap-1 justify-center">
                          {item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>审核</Button>}
                          {item.status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>完成</Button>}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8 border border-gray-300">暂无调拨记录</TableCell></TableRow>}
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
              <div><Label>源仓库 <span className="text-red-500">*</span></Label><Select value={String(editItem.from_warehouse_id || '')} onValueChange={v => setEditItem({ ...editItem, from_warehouse_id: Number(v) })}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>目标仓库 <span className="text-red-500">*</span></Label><Select value={String(editItem.to_warehouse_id || '')} onValueChange={v => setEditItem({ ...editItem, to_warehouse_id: Number(v) })}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>调拨日期 <span className="text-red-500">*</span></Label><Input type="date" value={editItem.transfer_date || ''} onChange={e => setEditItem({ ...editItem, transfer_date: e.target.value })} /></div>
              <div><Label>调拨类型</Label><Select value={String(editItem.transfer_type || 1)} onValueChange={v => setEditItem({ ...editItem, transfer_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">普通调拨</SelectItem><SelectItem value="2">紧急调拨</SelectItem></SelectContent></Select></div>
              <div><Label>操作人 <span className="text-red-500">*</span></Label><Input value={editItem.operator_name || ''} onChange={e => setEditItem({ ...editItem, operator_name: e.target.value })} placeholder="请输入操作人" /></div>
              <div><Label>备注</Label><Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} placeholder="请输入备注" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
