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
import { Plus, Search, Edit, Trash2, Eye, Award, Star, Printer, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EvalItem {
  id?: number;
  category: string;
  item_name: string;
  weight: number;
  score: number;
  actual_value: string;
  target_value: string;
  remark: string;
}

interface EvalRecord {
  id?: number;
  eval_no: string;
  supplier_id: number;
  supplier_name: string;
  eval_period: string;
  period_start: string;
  period_end: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  service_score: number;
  total_score: number;
  quality_rate: number;
  on_time_rate: number;
  order_count: number;
  defect_count: number;
  supplier_level: string;
  status: number;
  evaluator: string;
  eval_time: string;
  remark: string;
  create_time: string;
  items?: EvalItem[];
}

const periodMap: Record<string, string> = { 'month': '月度', 'quarter': '季度', 'year': '年度' };
const levelMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'A': { label: '优秀', variant: 'default' },
  'B': { label: '良好', variant: 'secondary' },
  'C': { label: '合格', variant: 'outline' },
  'D': { label: '待改进', variant: 'destructive' },
};
const evalStatusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待评估', variant: 'outline' },
  2: { label: '已评估', variant: 'default' },
  3: { label: '已审核', variant: 'secondary' },
};
const categoryMap: Record<string, string> = { 'quality': '质量', 'delivery': '交付', 'price': '价格', 'service': '服务' };

const defaultItems: EvalItem[] = [
  { category: 'quality', item_name: '来料合格率', weight: 25, score: 0, actual_value: '', target_value: '≥98%', remark: '' },
  { category: 'quality', item_name: '不良品处理响应', weight: 10, score: 0, actual_value: '', target_value: '24h内', remark: '' },
  { category: 'delivery', item_name: '准时交付率', weight: 20, score: 0, actual_value: '', target_value: '≥95%', remark: '' },
  { category: 'delivery', item_name: '交货周期', weight: 10, score: 0, actual_value: '', target_value: '≤7天', remark: '' },
  { category: 'price', item_name: '价格竞争力', weight: 15, score: 0, actual_value: '', target_value: '市场中等偏下', remark: '' },
  { category: 'price', item_name: '价格稳定性', weight: 5, score: 0, actual_value: '', target_value: '年度波动≤5%', remark: '' },
  { category: 'service', item_name: '服务响应速度', weight: 10, score: 0, actual_value: '', target_value: '4h内响应', remark: '' },
  { category: 'service', item_name: '技术支持能力', weight: 5, score: 0, actual_value: '', target_value: '能提供技术方案', remark: '' },
];

export default function SupplierEvalPage() {
  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const [records, setRecords] = useState<EvalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchLevel, setSearchLevel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EvalRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<EvalRecord | null>(null);
  const [form, setForm] = useState<Partial<EvalRecord>>({
    supplier_id: 0, supplier_name: '', eval_period: 'quarter',
    period_start: '', period_end: '', quality_score: 0, delivery_score: 0,
    price_score: 0, service_score: 0, total_score: 0,
    quality_rate: 0, on_time_rate: 0, order_count: 0, defect_count: 0,
    supplier_level: 'C', evaluator: '', remark: ''
  });
  const [formItems, setFormItems] = useState<EvalItem[]>([...defaultItems]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('supplierName', searchName);
      if (searchLevel) params.set('supplierLevel', searchLevel);
      const res = await fetch('/api/srm/evaluation?' + params);
      const data = await res.json();
      if (data.code === 200) { setRecords(data.data.list || []); setTotal(data.data.total || 0); }
    } catch { toast({ title: '获取数据失败', variant: 'destructive' }); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const fetchDetail = async (id: number) => {
    try {
      const res = await fetch('/api/srm/evaluation/' + id);
      const data = await res.json();
      if (data.code === 200) { setDetailRecord(data.data); setDetailOpen(true); }
    } catch { toast({ title: '获取详情失败', variant: 'destructive' }); }
  };

  const calcTotal = () => {
    const q = form.quality_score || 0;
    const d = form.delivery_score || 0;
    const p = form.price_score || 0;
    const s = form.service_score || 0;
    const total = Math.round((q * 0.35 + d * 0.30 + p * 0.20 + s * 0.15) * 10) / 10;
    let level = 'C';
    if (total >= 90) level = 'A';
    else if (total >= 75) level = 'B';
    else if (total >= 60) level = 'C';
    else level = 'D';
    setForm({ ...form, total_score: total, supplier_level: level });
  };

  const handleSave = async () => {
    if (!form.supplier_name) { toast({ title: '请输入供应商名称', variant: 'destructive' }); return; }
    try {
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form, items: formItems } : { ...form, items: formItems };
      const res = await fetch('/api/srm/evaluation', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.code === 200) { toast({ title: editRecord ? '更新成功' : '创建成功' }); setDialogOpen(false); fetchData(); }
      else { toast({ title: data.message || '操作失败', variant: 'destructive' }); }
    } catch { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除？')) return;
    try {
      const res = await fetch('/api/srm/evaluation?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) { toast({ title: '删除成功' }); fetchData(); }
    } catch { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const openEdit = (record: EvalRecord) => { setEditRecord(record); setForm({ ...record }); setFormItems(record.items || [...defaultItems]); setDialogOpen(true); };
  const openCreate = () => {
    setEditRecord(null);
    setForm({ supplier_id: 0, supplier_name: '', eval_period: 'quarter', period_start: '', period_end: '', quality_score: 0, delivery_score: 0, price_score: 0, service_score: 0, total_score: 0, quality_rate: 0, on_time_rate: 0, order_count: 0, defect_count: 0, supplier_level: 'C', evaluator: '', remark: '' });
    setFormItems([...defaultItems]);
    setDialogOpen(true);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...formItems];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setFormItems(newItems);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id!).filter(Boolean) as number[]);
    }
  };

  const handlePrint = () => {
    const recordsToPrint = selectedIds.length > 0 ? records.filter(r => selectedIds.includes(r.id!)) : records;
    if (recordsToPrint.length === 0) {
      toast({ title: '没有可打印的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开打印窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToPrint.map(r => `<tr>
      <td>${r.eval_no}</td>
      <td>${r.supplier_name}</td>
      <td>${periodMap[r.eval_period] || r.eval_period}</td>
      <td>${r.quality_score ?? '-'}</td>
      <td>${r.delivery_score ?? '-'}</td>
      <td>${r.price_score ?? '-'}</td>
      <td>${r.service_score ?? '-'}</td>
      <td>${r.total_score ?? '-'}</td>
      <td>${levelMap[r.supplier_level]?.label || r.supplier_level}</td>
      <td>${evalStatusMap[r.status]?.label || '-'}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>供应商评估列表</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>供应商评估列表</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToPrint.length} 条</div>
        <table>
          <thead><tr><th>评估编号</th><th>供应商</th><th>评估周期</th><th>质量分</th><th>交付分</th><th>价格分</th><th>服务分</th><th>综合分</th><th>等级</th><th>状态</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportXLS = () => {
    const recordsToExport = selectedIds.length > 0 ? records.filter(r => selectedIds.includes(r.id!)) : records;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const headers = ['评估编号', '供应商名称', '评估周期', '质量分', '交付分', '价格分', '服务分', '综合分', '等级', '状态'];
    const rows = recordsToExport.map(r => [
      r.eval_no,
      r.supplier_name,
      periodMap[r.eval_period] || r.eval_period,
      String(r.quality_score ?? ''),
      String(r.delivery_score ?? ''),
      String(r.price_score ?? ''),
      String(r.service_score ?? ''),
      String(r.total_score ?? ''),
      levelMap[r.supplier_level]?.label || r.supplier_level,
      evalStatusMap[r.status]?.label || '',
    ]);
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `供应商评估列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'XLS导出成功' });
  };

  const handleExportPDF = () => {
    const recordsToExport = selectedIds.length > 0 ? records.filter(r => selectedIds.includes(r.id!)) : records;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开导出窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToExport.map(r => `<tr>
      <td>${r.eval_no}</td>
      <td>${r.supplier_name}</td>
      <td>${periodMap[r.eval_period] || r.eval_period}</td>
      <td>${r.quality_score ?? '-'}</td>
      <td>${r.delivery_score ?? '-'}</td>
      <td>${r.price_score ?? '-'}</td>
      <td>${r.service_score ?? '-'}</td>
      <td>${r.total_score ?? '-'}</td>
      <td>${levelMap[r.supplier_level]?.label || r.supplier_level}</td>
      <td>${evalStatusMap[r.status]?.label || '-'}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>供应商评估列表</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>供应商评估列表</h1>
        <div class="info">导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToExport.length} 条</div>
        <table>
          <thead><tr><th>评估编号</th><th>供应商</th><th>评估周期</th><th>质量分</th><th>交付分</th><th>价格分</th><th>服务分</th><th>综合分</th><th>等级</th><th>状态</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast({ title: 'PDF导出成功，请在打印对话框中选择"另存为PDF"' });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6" />供应商评估管理</h1>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新建评估</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1"><Printer className="h-4 w-4" />打印</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" />导出</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportXLS}><FileSpreadsheet className="h-4 w-4 mr-2" />导出 XLS</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />导出 PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input placeholder="搜索供应商名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" onKeyDown={e => e.key === 'Enter' && fetchData()} />
              <Select value={searchLevel} onValueChange={v => setSearchLevel(v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder="供应商等级" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(levelMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}><Search className="h-4 w-4 mr-1" />搜索</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={records.length > 0 && selectedIds.length === records.length} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>评估编号</TableHead>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>评估周期</TableHead>
                  <TableHead>质量分</TableHead>
                  <TableHead>交付分</TableHead>
                  <TableHead>价格分</TableHead>
                  <TableHead>服务分</TableHead>
                  <TableHead>综合分</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(r.id!)} onCheckedChange={() => toggleSelect(r.id!)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.eval_no}</TableCell>
                    <TableCell>{r.supplier_name}</TableCell>
                    <TableCell>{periodMap[r.eval_period] || r.eval_period}</TableCell>
                    <TableCell>{r.quality_score ?? '-'}</TableCell>
                    <TableCell>{r.delivery_score ?? '-'}</TableCell>
                    <TableCell>{r.price_score ?? '-'}</TableCell>
                    <TableCell>{r.service_score ?? '-'}</TableCell>
                    <TableCell className="font-bold">{r.total_score ?? '-'}</TableCell>
                    <TableCell><Badge variant={levelMap[r.supplier_level]?.variant || 'outline'}>{levelMap[r.supplier_level]?.label || r.supplier_level}</Badge></TableCell>
                    <TableCell><Badge variant={evalStatusMap[r.status]?.variant || 'outline'}>{evalStatusMap[r.status]?.label || '-'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => fetchDetail(r.id!)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span>共 {total} 条</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            <DialogHeader><DialogTitle>供应商评估详情</DialogTitle></DialogHeader>
            {detailRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>评估编号: <span className="font-mono">{detailRecord.eval_no}</span></div>
                  <div>供应商: {detailRecord.supplier_name}</div>
                  <div>评估周期: {periodMap[detailRecord.eval_period] || detailRecord.eval_period}</div>
                  <div>来料合格率: {detailRecord.quality_rate ?? '-'}%</div>
                  <div>准时交付率: {detailRecord.on_time_rate ?? '-'}%</div>
                  <div>订单数量: {detailRecord.order_count}</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">质量评分</p><p className="text-xl font-bold">{detailRecord.quality_score ?? '-'}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">交付评分</p><p className="text-xl font-bold">{detailRecord.delivery_score ?? '-'}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">价格评分</p><p className="text-xl font-bold">{detailRecord.price_score ?? '-'}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">服务评分</p><p className="text-xl font-bold">{detailRecord.service_score ?? '-'}</p></CardContent></Card>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg">综合评分: <strong>{detailRecord.total_score ?? '-'}</strong></span>
                  <Badge variant={levelMap[detailRecord.supplier_level]?.variant || 'outline'} className="text-base px-3 py-1">
                    {levelMap[detailRecord.supplier_level]?.label || detailRecord.supplier_level}
                  </Badge>
                </div>
                {detailRecord.items && detailRecord.items.length > 0 && (
                  <Table>
                    <TableHeader><TableRow><TableHead>类别</TableHead><TableHead>评估项目</TableHead><TableHead>权重%</TableHead><TableHead>评分</TableHead><TableHead>实际值</TableHead><TableHead>目标值</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailRecord.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="outline">{categoryMap[item.category] || item.category}</Badge></TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.weight}</TableCell>
                          <TableCell>{item.score}</TableCell>
                          <TableCell>{item.actual_value || '-'}</TableCell>
                          <TableCell>{item.target_value || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader><DialogTitle>{editRecord ? '编辑供应商评估' : '新建供应商评估'}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>供应商名称 *</Label><Input value={form.supplier_name || ''} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></div>
                <div>
                  <Label>评估周期</Label>
                  <Select value={form.eval_period || 'quarter'} onValueChange={v => setForm({ ...form, eval_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(periodMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>评估人</Label><Input value={form.evaluator || ''} onChange={e => setForm({ ...form, evaluator: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>周期开始</Label><Input type="date" value={form.period_start || ''} onChange={e => setForm({ ...form, period_start: e.target.value })} /></div>
                <div><Label>周期结束</Label><Input type="date" value={form.period_end || ''} onChange={e => setForm({ ...form, period_end: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>质量评分(0-100)</Label><Input type="number" value={form.quality_score || 0} onChange={e => setForm({ ...form, quality_score: Number(e.target.value) })} onBlur={calcTotal} /></div>
                <div><Label>交付评分(0-100)</Label><Input type="number" value={form.delivery_score || 0} onChange={e => setForm({ ...form, delivery_score: Number(e.target.value) })} onBlur={calcTotal} /></div>
                <div><Label>价格评分(0-100)</Label><Input type="number" value={form.price_score || 0} onChange={e => setForm({ ...form, price_score: Number(e.target.value) })} onBlur={calcTotal} /></div>
                <div><Label>服务评分(0-100)</Label><Input type="number" value={form.service_score || 0} onChange={e => setForm({ ...form, service_score: Number(e.target.value) })} onBlur={calcTotal} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>来料合格率%</Label><Input type="number" value={form.quality_rate || 0} onChange={e => setForm({ ...form, quality_rate: Number(e.target.value) })} /></div>
                <div><Label>准时交付率%</Label><Input type="number" value={form.on_time_rate || 0} onChange={e => setForm({ ...form, on_time_rate: Number(e.target.value) })} /></div>
                <div><Label>订单数量</Label><Input type="number" value={form.order_count || 0} onChange={e => setForm({ ...form, order_count: Number(e.target.value) })} /></div>
                <div><Label>不良次数</Label><Input type="number" value={form.defect_count || 0} onChange={e => setForm({ ...form, defect_count: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted rounded">
                <span>综合评分: <strong className="text-lg">{form.total_score || 0}</strong></span>
                <Badge variant={levelMap[form.supplier_level || 'C']?.variant || 'outline'} className="text-base px-3 py-1">
                  {levelMap[form.supplier_level || 'C']?.label || 'C'}
                </Badge>
                <span className="text-xs text-muted-foreground">(质量35% + 交付30% + 价格20% + 服务15%)</span>
              </div>

              <div className="border-t pt-3">
                <Label className="text-base font-semibold">评估明细项</Label>
                <Table className="mt-2">
                  <TableHeader><TableRow><TableHead>类别</TableHead><TableHead>项目名称</TableHead><TableHead>权重%</TableHead><TableHead>评分</TableHead><TableHead>实际值</TableHead><TableHead>目标值</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {formItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Badge variant="outline" className="text-xs">{categoryMap[item.category] || item.category}</Badge></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs w-16" type="number" value={item.weight} onChange={e => updateItem(idx, 'weight', Number(e.target.value))} /></TableCell>
                        <TableCell><Input className="h-8 text-xs w-16" type="number" value={item.score} onChange={e => updateItem(idx, 'score', Number(e.target.value))} /></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.actual_value} onChange={e => updateItem(idx, 'actual_value', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.target_value} onChange={e => updateItem(idx, 'target_value', e.target.value)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div><Label>备注</Label><Textarea value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
