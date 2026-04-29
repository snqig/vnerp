﻿﻿﻿﻿'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanyName } from '@/hooks/useCompanyName';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchInput } from '@/components/ui/search-input';

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  short_name: string;
  supplier_type: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  credit_level: string;
  cooperation_status: string;
  settlement_method: string;
  payment_terms: string;
  status: number;
  remark: string;
}

const supplierTypeMap: Record<number, string> = { 1: '原料', 2: '油墨', 3: '辅料', 4: '包装', 5: '设备', 6: '委外' };
const creditLevelMap: Record<string, { label: string; cls: string }> = {
  S: { label: '战略', cls: 'bg-yellow-500 text-white' },
  A: { label: '优选', cls: 'bg-gray-400 text-white' },
  B: { label: '合格', cls: 'bg-orange-400 text-white' },
  C: { label: '条件', cls: 'bg-orange-500 text-white' },
  D: { label: '失格', cls: 'bg-red-500 text-white' },
};
const statusMap: Record<number, { label: string; cls: string }> = {
  1: { label: '启用', cls: 'bg-green-100 text-green-800' },
  0: { label: '停用', cls: 'bg-yellow-100 text-yellow-800' },
  2: { label: '黑名单', cls: 'bg-red-100 text-red-800' },
};

const emptyForm = {
  supplier_code: '',
  supplier_name: '',
  short_name: '',
  supplier_type: 1,
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  credit_level: 'B',
  settlement_method: '月结',
  payment_terms: '30天',
  remark: '',
};

export default function SuppliersPage() {
  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const [list, setList] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') { setSortField(null); setSortOrder(null); }
    } else { setSortField(field); setSortOrder('asc'); }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };
  const sortedList = useMemo(() => {
    if (!sortField || !sortOrder) return list;
    return [...list].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [list, sortField, sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword: debouncedKeyword,
      });
      if (gradeFilter !== 'all') params.set('keyword', debouncedKeyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/purchase/suppliers?${params}`);
      const result = await res.json();
      if (result.success) {
        let data = result.data || [];
        if (gradeFilter !== 'all') {
          data = data.filter((s: Supplier) => s.credit_level === gradeFilter);
        }
        setList(data);
        setTotal(result.pagination?.total || data.length);
      }
    } catch (e) {
      console.error('获取供应商失败:', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, gradeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (item: Supplier) => {
    setEditId(item.id);
    setForm({
      supplier_code: item.supplier_code,
      supplier_name: item.supplier_name,
      short_name: item.short_name || '',
      supplier_type: item.supplier_type || 1,
      contact_name: item.contact_name || '',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
      address: item.address || '',
      credit_level: item.credit_level || 'B',
      settlement_method: item.settlement_method || '月结',
      payment_terms: item.payment_terms || '30天',
      remark: item.remark || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.supplier_code || !form.supplier_name) {
      toast({ title: '供应商编码和名称不能为空', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = '/api/purchase/suppliers';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editId ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个供应商吗？')) return;
    try {
      const res = await fetch(`/api/purchase/suppliers?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map(s => s.id));
    }
  };

  const handlePrint = () => {
    const recordsToPrint = selectedIds.length > 0 ? list.filter(s => selectedIds.includes(s.id)) : list;
    if (recordsToPrint.length === 0) {
      toast({ title: '没有可打印的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开打印窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToPrint.map(s => {
      const grade = creditLevelMap[s.credit_level] || creditLevelMap.B;
      const status = statusMap[s.status] || statusMap[1];
      return `<tr>
        <td>${s.supplier_code}</td>
        <td>${s.supplier_name}</td>
        <td>${supplierTypeMap[s.supplier_type] || '-'}</td>
        <td>${s.credit_level} - ${grade.label}</td>
        <td>${status.label}</td>
        <td>${s.contact_name || '-'}</td>
        <td>${s.contact_phone || '-'}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>供应商列表</title>
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
        <h1>供应商列表</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToPrint.length} 条</div>
        <table>
          <thead><tr><th>编号</th><th>名称</th><th>类型</th><th>等级</th><th>状态</th><th>联系人</th><th>联系电话</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportXLS = () => {
    const recordsToExport = selectedIds.length > 0 ? list.filter(s => selectedIds.includes(s.id)) : list;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const headers = ['供应商编号', '供应商名称', '类型', '等级', '状态', '联系人', '联系电话', '邮箱', '地址'];
    const rows = recordsToExport.map(s => [
      s.supplier_code,
      s.supplier_name,
      supplierTypeMap[s.supplier_type] || '',
      s.credit_level,
      (statusMap[s.status] || statusMap[1]).label,
      s.contact_name || '',
      s.contact_phone || '',
      s.contact_email || '',
      s.address || '',
    ]);
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `供应商列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'XLS导出成功' });
  };

  const handleExportPDF = () => {
    const recordsToExport = selectedIds.length > 0 ? list.filter(s => selectedIds.includes(s.id)) : list;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开导出窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToExport.map(s => {
      const grade = creditLevelMap[s.credit_level] || creditLevelMap.B;
      const status = statusMap[s.status] || statusMap[1];
      return `<tr>
        <td>${s.supplier_code}</td>
        <td>${s.supplier_name}</td>
        <td>${supplierTypeMap[s.supplier_type] || '-'}</td>
        <td>${s.credit_level} - ${grade.label}</td>
        <td>${status.label}</td>
        <td>${s.contact_name || '-'}</td>
        <td>${s.contact_phone || '-'}</td>
        <td>${s.contact_email || '-'}</td>
        <td>${s.address || '-'}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>供应商列表</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>供应商列表</h1>
        <div class="info">导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToExport.length} 条</div>
        <table>
          <thead><tr><th>编号</th><th>名称</th><th>类型</th><th>等级</th><th>状态</th><th>联系人</th><th>联系电话</th><th>邮箱</th><th>地址</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast({ title: 'PDF导出成功，请在打印对话框中选择"另存为PDF"' });
  };

  const stats = {
    S: list.filter(s => s.credit_level === 'S').length,
    A: list.filter(s => s.credit_level === 'A').length,
    B: list.filter(s => s.credit_level === 'B').length,
    C: list.filter(s => s.credit_level === 'C').length,
    D: list.filter(s => s.credit_level === 'D').length,
  };

  return (
    <MainLayout title="供应商管理">
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{stats.S}</div><div className="text-sm text-muted-foreground">战略供应商(S)</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-gray-600">{stats.A}</div><div className="text-sm text-muted-foreground">优选供应商(A)</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-500">{stats.B}</div><div className="text-sm text-muted-foreground">合格供应商(B)</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{stats.C}</div><div className="text-sm text-muted-foreground">条件供应商(C)</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{stats.D}</div><div className="text-sm text-muted-foreground">失格供应商(D)</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder="搜索供应商编号、名称..."
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={() => fetchData()}
                  className="flex-1 max-w-sm"
                />
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="等级" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    <SelectItem value="S">战略(S)</SelectItem>
                    <SelectItem value="A">优选(A)</SelectItem>
                    <SelectItem value="B">合格(B)</SelectItem>
                    <SelectItem value="C">条件(C)</SelectItem>
                    <SelectItem value="D">失格(D)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">停用</SelectItem>
                    <SelectItem value="2">黑名单</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              <Button onClick={handleOpenAdd}><Plus className="h-4 w-4 mr-2" />新建供应商</Button>
              <div className="flex gap-1 ml-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>供应商列表</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-400">加载中...</span></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={list.length > 0 && selectedIds.length === list.length} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('supplier_code')}>
                      <span className="inline-flex items-center">供应商编号{getSortIcon('supplier_code')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('supplier_name')}>
                      <span className="inline-flex items-center">供应商名称{getSortIcon('supplier_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('supplier_type')}>
                      <span className="inline-flex items-center">类型{getSortIcon('supplier_type')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('credit_level')}>
                      <span className="inline-flex items-center">等级{getSortIcon('credit_level')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('contact_name')}>
                      <span className="inline-flex items-center">联系人{getSortIcon('contact_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('contact_phone')}>
                      <span className="inline-flex items-center">联系电话{getSortIcon('contact_phone')}</span>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                  ) : sortedList.map(item => {
                    const grade = creditLevelMap[item.credit_level] || creditLevelMap.B;
                    const status = statusMap[item.status] || statusMap[1];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                        </TableCell>
                        <TableCell className="font-mono">{item.supplier_code}</TableCell>
                        <TableCell>
                          <div><div className="font-medium">{item.supplier_name}</div>{item.short_name && <div className="text-sm text-muted-foreground">{item.short_name}</div>}</div>
                        </TableCell>
                        <TableCell>{supplierTypeMap[item.supplier_type] || '-'}</TableCell>
                        <TableCell>
                          <Badge className={grade.cls}><Star className="h-3 w-3 mr-1" />{item.credit_level} - {grade.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.cls}>{item.status === 2 && <AlertTriangle className="h-3 w-3 mr-1" />}{status.label}</Badge>
                        </TableCell>
                        <TableCell>{item.contact_name || '-'}</TableCell>
                        <TableCell>{item.contact_phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">共 {total} 条</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader><DialogTitle>{editId ? '编辑供应商' : '新建供应商'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>供应商编码 *</Label><Input value={form.supplier_code} onChange={e => setForm({ ...form, supplier_code: e.target.value })} placeholder="如 S-20240501-001" disabled={!!editId} /></div>
              <div className="space-y-2"><Label>供应商全称 *</Label><Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="请输入供应商全称" /></div>
              <div className="space-y-2"><Label>供应商简称</Label><Input value={form.short_name} onChange={e => setForm({ ...form, short_name: e.target.value })} placeholder="请输入简称" /></div>
              <div className="space-y-2"><Label>供应商类型</Label><Select value={String(form.supplier_type)} onValueChange={v => setForm({ ...form, supplier_type: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">原料</SelectItem><SelectItem value="2">油墨</SelectItem><SelectItem value="3">辅料</SelectItem>
                  <SelectItem value="4">包装</SelectItem><SelectItem value="5">设备</SelectItem><SelectItem value="6">委外</SelectItem>
                </SelectContent>
              </Select></div>
              <div className="space-y-2"><Label>联系人</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="请输入联系人" /></div>
              <div className="space-y-2"><Label>联系电话</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="请输入联系电话" /></div>
              <div className="space-y-2"><Label>邮箱</Label><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="请输入邮箱" /></div>
              <div className="space-y-2"><Label>信用等级</Label><Select value={form.credit_level} onValueChange={v => setForm({ ...form, credit_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">战略(S)</SelectItem><SelectItem value="A">优选(A)</SelectItem><SelectItem value="B">合格(B)</SelectItem>
                  <SelectItem value="C">条件(C)</SelectItem><SelectItem value="D">失格(D)</SelectItem>
                </SelectContent>
              </Select></div>
              <div className="space-y-2"><Label>结算方式</Label><Select value={form.settlement_method || '月结'} onValueChange={v => setForm({ ...form, settlement_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="月结">月结</SelectItem><SelectItem value="现结">现结</SelectItem><SelectItem value="预付">预付</SelectItem><SelectItem value="货到付款">货到付款</SelectItem><SelectItem value="分期付款">分期付款</SelectItem>
                </SelectContent>
              </Select></div>
              <div className="space-y-2"><Label>付款条件</Label><Select value={form.payment_terms || '30天'} onValueChange={v => setForm({ ...form, payment_terms: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="货到付款">货到付款</SelectItem><SelectItem value="15天">15天</SelectItem><SelectItem value="30天">30天</SelectItem><SelectItem value="60天">60天</SelectItem><SelectItem value="90天">90天</SelectItem><SelectItem value="120天">120天</SelectItem>
                </SelectContent>
              </Select></div>
              <div className="space-y-2 col-span-2"><Label>地址</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="请输入地址" /></div>
              <div className="space-y-2 col-span-2"><Label>备注</Label><Input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="备注信息" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
