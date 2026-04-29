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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, RefreshCw, QrCode, Eye, Printer, ScanLine, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRRecord {
  id: number; qr_code: string; qr_type: string; ref_id: number; ref_no: string;
  batch_no: string; material_id: number; material_code: string; material_name: string;
  specification: string; quantity: number; unit: string; warehouse_name: string;
  supplier_name: string; customer_name: string; work_order_no: string;
  production_date: string; expiry_date: string; print_count: number;
  scan_count: number; status: number; create_time: string; remark: string;
}

const typeMap: Record<string, string> = {
  material: '原料', product: '成品', workorder: '工单', ink: '油墨',
  screen_plate: '网版', die: '刀具', shipment: '出货', ink_open: '开罐', ink_mixed: '调色',
};

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '有效', variant: 'default' }, 2: { label: '已使用', variant: 'secondary' },
  3: { label: '已失效', variant: 'outline' }, 9: { label: '已作废', variant: 'destructive' },
};

export default function QRCodePage() {
  const { toast } = useToast();
  const [list, setList] = useState<QRRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [form, setForm] = useState<any>({});
  const [traceData, setTraceData] = useState<any>(null);
  const [traceInput, setTraceInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', keyword, qr_type: typeFilter });
      const res = await fetch('/api/qrcode?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data?.list || []); setTotal(result.data?.total || 0); }
    } catch (e) { console.error(e); }
  }, [page, keyword, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async () => {
    try {
      const res = await fetch('/api/qrcode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) { toast({ title: '二维码生成成功', description: result.data?.qr_code }); setShowDialog(false); setForm({}); fetchData(); }
      else { toast({ title: '生成失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handlePrint = async (id: number) => {
    try {
      await fetch('/api/qrcode', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'print' }),
      });
      toast({ title: '打印记录已更新' });
      fetchData();
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleTrace = async () => {
    if (!traceInput) { toast({ title: '请输入二维码编码或单号' }); return; }
    try {
      const params = new URLSearchParams();
      if (traceInput.startsWith('MA-') || traceInput.startsWith('PR-') || traceInput.startsWith('WO-') || traceInput.startsWith('IN-') || traceInput.startsWith('SP-') || traceInput.startsWith('DI-') || traceInput.startsWith('SH-') || traceInput.startsWith('IK-')) {
        params.set('qr_code', traceInput);
      } else if (traceInput.startsWith('SO') || traceInput.startsWith('PO') || traceInput.startsWith('WO')) {
        params.set('ref_no', traceInput);
      } else {
        params.set('qr_code', traceInput);
      }
      const res = await fetch('/api/qrcode/trace?' + params);
      const result = await res.json();
      if (result.success) { setTraceData(result.data); setShowTrace(true); }
      else { toast({ title: '查询失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '查询失败', variant: 'destructive' }); }
  };

  const handleInvalidate = async (id: number) => {
    if (!confirm('确认使该二维码失效？')) return;
    try {
      await fetch('/api/qrcode', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'invalidate' }),
      });
      toast({ title: '二维码已失效' }); fetchData();
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">二维码管理</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索编码/单号/物料" value={keyword} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="material">原料</SelectItem>
                <SelectItem value="product">成品</SelectItem>
                <SelectItem value="workorder">工单</SelectItem>
                <SelectItem value="ink">油墨</SelectItem>
                <SelectItem value="screen_plate">网版</SelectItem>
                <SelectItem value="die">刀具</SelectItem>
                <SelectItem value="shipment">出货</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => { setShowDialog(true); setForm({}); }}><Plus className="h-4 w-4 mr-1" />生成二维码</Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <ScanLine className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">追溯查询</CardTitle>
              <div className="flex-1 flex gap-2">
                <Input placeholder="输入二维码编码、单号、批次号进行追溯查询" value={traceInput} onChange={e => setTraceInput(e.target.value)} className="max-w-md" />
                <Button onClick={handleTrace}><History className="h-4 w-4 mr-1" />追溯</Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>二维码编码</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>关联单号</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead>仓库</TableHead>
                  <TableHead>打印</TableHead>
                  <TableHead>扫描</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : list.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.qr_code}</TableCell>
                    <TableCell><Badge variant="outline">{typeMap[r.qr_type] || r.qr_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{r.ref_no || '-'}</TableCell>
                    <TableCell>{r.material_name || '-'}</TableCell>
                    <TableCell className="text-sm">{r.specification || '-'}</TableCell>
                    <TableCell className="text-right">{r.quantity}{r.unit}</TableCell>
                    <TableCell className="text-sm">{r.warehouse_name || '-'}</TableCell>
                    <TableCell className="text-center">{r.print_count}</TableCell>
                    <TableCell className="text-center">{r.scan_count}</TableCell>
                    <TableCell><Badge variant={statusMap[r.status]?.variant || 'outline'}>{statusMap[r.status]?.label || '未知'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(r.id)} title="打印"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setTraceInput(r.qr_code); handleTrace(); }} title="追溯"><Eye className="h-4 w-4" /></Button>
                        {r.status === 1 && (
                          <Button variant="ghost" size="sm" onClick={() => handleInvalidate(r.id)} title="失效"><QrCode className="h-4 w-4 text-muted-foreground" /></Button>
                        )}
                      </div>
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
            <DialogHeader><DialogTitle>生成二维码</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>二维码类型</Label>
                <Select value={form.qr_type || ''} onValueChange={v => setForm({ ...form, qr_type: v })}>
                  <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">原料</SelectItem>
                    <SelectItem value="product">成品</SelectItem>
                    <SelectItem value="workorder">工单</SelectItem>
                    <SelectItem value="ink">油墨</SelectItem>
                    <SelectItem value="screen_plate">网版</SelectItem>
                    <SelectItem value="die">刀具</SelectItem>
                    <SelectItem value="shipment">出货</SelectItem>
                    <SelectItem value="ink_open">开罐</SelectItem>
                    <SelectItem value="ink_mixed">调色</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>关联单号</Label><Input value={form.ref_no || ''} onChange={e => setForm({ ...form, ref_no: e.target.value })} placeholder="如PO2024001" /></div>
              <div><Label>物料编码</Label><Input value={form.material_code || ''} onChange={e => setForm({ ...form, material_code: e.target.value })} /></div>
              <div><Label>物料名称</Label><Input value={form.material_name || ''} onChange={e => setForm({ ...form, material_name: e.target.value })} /></div>
              <div><Label>规格型号</Label><Input value={form.specification || ''} onChange={e => setForm({ ...form, specification: e.target.value })} /></div>
              <div><Label>批次号</Label><Input value={form.batch_no || ''} onChange={e => setForm({ ...form, batch_no: e.target.value })} /></div>
              <div><Label>数量</Label><Input type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
              <div><Label>单位</Label><Input value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label>仓库名称</Label><Input value={form.warehouse_name || ''} onChange={e => setForm({ ...form, warehouse_name: e.target.value })} /></div>
              <div><Label>供应商</Label><Input value={form.supplier_name || ''} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></div>
              <div><Label>客户</Label><Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>工单编号</Label><Input value={form.work_order_no || ''} onChange={e => setForm({ ...form, work_order_no: e.target.value })} /></div>
              <div><Label>生产日期</Label><Input type="date" value={form.production_date || ''} onChange={e => setForm({ ...form, production_date: e.target.value })} /></div>
              <div><Label>有效期</Label><Input type="date" value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div className="col-span-2"><Label>备注</Label><Textarea value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleGenerate}>生成二维码</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTrace} onOpenChange={setShowTrace}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader><DialogTitle>二维码追溯详情</DialogTitle></DialogHeader>
            {traceData && (
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="timeline">追溯时间线</TabsTrigger>
                  <TabsTrigger value="related">关联记录</TabsTrigger>
                  <TabsTrigger value="inventory">库存信息</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">二维码编码：</span><span className="font-mono">{traceData.record?.qr_code}</span></div>
                    <div><span className="text-muted-foreground">类型：</span>{typeMap[traceData.record?.qr_type] || traceData.record?.qr_type}</div>
                    <div><span className="text-muted-foreground">关联单号：</span>{traceData.record?.ref_no || '-'}</div>
                    <div><span className="text-muted-foreground">批次号：</span>{traceData.record?.batch_no || '-'}</div>
                    <div><span className="text-muted-foreground">物料编码：</span>{traceData.record?.material_code || '-'}</div>
                    <div><span className="text-muted-foreground">物料名称：</span>{traceData.record?.material_name || '-'}</div>
                    <div><span className="text-muted-foreground">规格：</span>{traceData.record?.specification || '-'}</div>
                    <div><span className="text-muted-foreground">数量：</span>{traceData.record?.quantity}{traceData.record?.unit}</div>
                    <div><span className="text-muted-foreground">仓库：</span>{traceData.record?.warehouse_name || '-'}</div>
                    <div><span className="text-muted-foreground">供应商：</span>{traceData.record?.supplier_name || '-'}</div>
                    <div><span className="text-muted-foreground">客户：</span>{traceData.record?.customer_name || '-'}</div>
                    <div><span className="text-muted-foreground">工单：</span>{traceData.record?.work_order_no || '-'}</div>
                    <div><span className="text-muted-foreground">生产日期：</span>{traceData.record?.production_date?.slice(0, 10) || '-'}</div>
                    <div><span className="text-muted-foreground">有效期：</span>{traceData.record?.expiry_date?.slice(0, 10) || '-'}</div>
                    <div><span className="text-muted-foreground">打印次数：</span>{traceData.record?.print_count}</div>
                    <div><span className="text-muted-foreground">扫描次数：</span>{traceData.record?.scan_count}</div>
                  </div>
                  {traceData.order && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">关联订单</h4>
                      <pre className="text-xs overflow-auto">{JSON.stringify(traceData.order, null, 2)}</pre>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="timeline">
                  {traceData.timeline?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">暂无追溯记录</div>
                  ) : (
                    <div className="space-y-3">
                      {traceData.timeline?.map((t: any, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center">
                            <div className={`h-3 w-3 rounded-full ${t.result === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            {i < traceData.timeline.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex justify-between">
                              <span className="font-medium">{t.event}</span>
                              <span className="text-xs text-muted-foreground">{new Date(t.time).toLocaleString('zh-CN')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">操作人: {t.operator}</div>
                            {t.message && <div className="text-sm text-muted-foreground">{t.message}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="related">
                  {traceData.related_records?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">暂无关联记录</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>二维码</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>单号</TableHead>
                          <TableHead>物料</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceData.related_records?.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.qr_code}</TableCell>
                            <TableCell><Badge variant="outline">{typeMap[r.qr_type] || r.qr_type}</Badge></TableCell>
                            <TableCell className="font-mono text-sm">{r.ref_no || '-'}</TableCell>
                            <TableCell>{r.material_name || '-'}</TableCell>
                            <TableCell>{r.quantity}</TableCell>
                            <TableCell><Badge variant={statusMap[r.status]?.variant || 'outline'}>{statusMap[r.status]?.label}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
                <TabsContent value="inventory">
                  {traceData.inventory?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">暂无库存信息</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>仓库</TableHead>
                          <TableHead>物料编码</TableHead>
                          <TableHead>物料名称</TableHead>
                          <TableHead className="text-right">库存数量</TableHead>
                          <TableHead>单位</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceData.inventory?.map((inv: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{inv.warehouse_name || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{inv.material_code}</TableCell>
                            <TableCell>{inv.material_name}</TableCell>
                            <TableCell className="text-right">{inv.quantity}</TableCell>
                            <TableCell>{inv.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrace(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
