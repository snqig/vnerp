'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, RefreshCw, DollarSign, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Receivable {
  id: number; receivable_no: string; source_type: number; source_no: string;
  customer_id: number; customer_name: string; amount: number; received_amount: number;
  balance: number; due_date: string; status: number; remark: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '未收款', variant: 'outline' }, 2: { label: '部分收款', variant: 'secondary' },
  3: { label: '已收款', variant: 'default' }, 9: { label: '已取消', variant: 'destructive' },
};

export default function ReceivablePage() {
  const { toast } = useToast();
  const [list, setList] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [receiptForm, setReceiptForm] = useState({ amount: 0, receipt_date: '', remark: '' });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', keyword, status: statusFilter });
      const res = await fetch('/api/finance/receivable?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data?.list || []); setTotal(result.data?.total || 0); }
    } catch (e) { console.error(e); }
  }, [page, keyword, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/finance/receivable?id=${id}`);
      const result = await res.json();
      if (result.success) { setDetailItem(result.data); setShowDialog(true); }
    } catch (e) { toast({ title: '获取详情失败', variant: 'destructive' }); }
  };

  const handleReceipt = async () => {
    if (!detailItem) return;
    try {
      const res = await fetch('/api/finance/receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivable_id: detailItem.id, amount: receiptForm.amount, receipt_date: receiptForm.receipt_date, remark: receiptForm.remark }),
      });
      const result = await res.json();
      if (result.success) { toast({ title: '收款成功' }); setShowDialog(false); fetchData(); }
      else { toast({ title: '收款失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const formatAmount = (amount: number) => ((amount || 0) / 100).toFixed(2);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">应收款管理</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索单号/客户" value={keyword} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="状态筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="1">未收款</SelectItem>
                <SelectItem value="2">部分收款</SelectItem>
                <SelectItem value="3">已收款</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>应收单号</TableHead>
                  <TableHead>来源单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead className="text-right">应收金额</TableHead>
                  <TableHead className="text-right">已收金额</TableHead>
                  <TableHead className="text-right">余额</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : list.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.receivable_no}</TableCell>
                    <TableCell className="font-mono text-sm">{r.source_no}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell className="text-right">¥{formatAmount(r.amount)}</TableCell>
                    <TableCell className="text-right">¥{formatAmount(r.received_amount)}</TableCell>
                    <TableCell className={`text-right ${Number(r.balance) > 0 ? 'text-red-600 font-medium' : ''}`}>¥{formatAmount(r.balance)}</TableCell>
                    <TableCell>{r.due_date ? r.due_date.slice(0, 10) : ''}</TableCell>
                    <TableCell><Badge variant={statusMap[r.status]?.variant || 'outline'}>{statusMap[r.status]?.label || '未知'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {total} 条记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>应收款详情</DialogTitle></DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">单号：</span>{detailItem.receivable_no}</div>
                  <div><span className="text-muted-foreground">客户：</span>{detailItem.customer_name}</div>
                  <div><span className="text-muted-foreground">应收金额：</span>¥{formatAmount(detailItem.amount)}</div>
                  <div><span className="text-muted-foreground">已收金额：</span>¥{formatAmount(detailItem.received_amount)}</div>
                  <div><span className="text-muted-foreground">余额：</span>¥{formatAmount(detailItem.balance)}</div>
                  <div><span className="text-muted-foreground">到期日：</span>{detailItem.due_date?.slice(0, 10)}</div>
                </div>
                {Number(detailItem.balance) > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium">登记收款</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>收款金额(元)</Label><Input type="number" value={receiptForm.amount} onChange={e => setReceiptForm({ ...receiptForm, amount: Number(e.target.value) })} /></div>
                      <div><Label>收款日期</Label><Input type="date" value={receiptForm.receipt_date} onChange={e => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })} /></div>
                    </div>
                    <div><Label>备注</Label><Input value={receiptForm.remark} onChange={e => setReceiptForm({ ...receiptForm, remark: e.target.value })} /></div>
                  </div>
                )}
                {detailItem.receipts?.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">收款记录</h4>
                    {detailItem.receipts.map((rc: any) => (
                      <div key={rc.id} className="flex justify-between text-sm py-1 border-b">
                        <span>{rc.receipt_date?.slice(0, 10)}</span>
                        <span>¥{formatAmount(rc.amount)}</span>
                        <span className="text-muted-foreground">{rc.remark || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {detailItem && Number(detailItem.balance) > 0 && (
                <Button onClick={handleReceipt}>确认收款</Button>
              )}
              <Button variant="outline" onClick={() => setShowDialog(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
