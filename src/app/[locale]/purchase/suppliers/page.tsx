'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
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
  Edit,
  Trash2,
  Star,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchInput } from '@/components/ui/search-input';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';

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

const supplierTypeMap: Record<number, string> = {
  1: tc('text_es4a'),
  2: tc('text_iz9r'),
  3: tc('text_oywk'),
  4: tc('text_evds'),
  5: tc('text_o9ah'),
  6: tc('text_frnm'),
};
const creditLevelMap: Record<string, { label: string; cls: string }> = {
  S: { label: tc('text_hbv1'), cls: 'bg-yellow-500 text-white' },
  A: { label: tc('text_e8s1'), cls: 'bg-gray-400 text-white' },
  B: { label: tc('text_ev5g'), cls: 'bg-orange-400 text-white' },
  C: { label: tc('text_i0mt'), cls: 'bg-orange-500 text-white' },
  D: { label: tc('text_fqqz'), cls: 'bg-red-500 text-white' },
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
  settlement_method: tc('text_i7yj'),
  payment_terms: tc('text_1kks'),
  status: 1,
  remark: '',
};

export default function SuppliersPage() {
  // 翻译钩子
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');

  const statusMap: Record<number, { label: string; cls: string }> = {
    1: { label: tc('enabled'), cls: 'bg-green-100 text-green-800' },
    0: { label: tc('disabled'), cls: 'bg-yellow-100 text-yellow-800' },
    2: { label: tc('blacklist'), cls: 'bg-red-100 text-red-800' },
  };

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
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
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
      const res = await authFetch(`/api/purchase/suppliers?${params}`);
      const result = await res.json();
      if (result.success) {
        let data = Array.isArray(result.data) ? result.data : result.data?.list || [];
        if (gradeFilter !== 'all') {
          data = data.filter((s: Supplier) => {
            const level = s.credit_level || 'B';
            return level === gradeFilter;
          });
        }
        setList(data);
        setTotal(result.pagination?.total || result.data?.total || data.length);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, gradeFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      status: item.status ?? 1,
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
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editId ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/purchase/suppliers?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((s) => s.id));
    }
  };

  const handlePrint = () => {
    const recordsToPrint =
      selectedIds.length > 0 ? list.filter((s) => selectedIds.includes(s.id)) : list;
    if (recordsToPrint.length === 0) {
      toast({ title: '没有可打印的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开打印窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToPrint
      .map((s) => {
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
      })
      .join('');
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
          <thead><tr><th>编号</th><th>{tc("name")}</th><th>{tc("type")}</th><th>等级</th><th>{tc("status")}</th><th>联系人</th><th>{tc("phone")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportXLS = () => {
    const recordsToExport =
      selectedIds.length > 0 ? list.filter((s) => selectedIds.includes(s.id)) : list;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const headers = [
      '供应商编号',
      '供应商名称',
      tc('type'),
      '等级',
      tc('status'),
      '联系人',
      '联系电话',
      '邮箱',
      '地址',
    ];
    const rows = recordsToExport.map((s) => [
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
    const csvContent =
      BOM + [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `供应商列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'XLS导出成功' });
  };

  const handleExportPDF = () => {
    const recordsToExport =
      selectedIds.length > 0 ? list.filter((s) => selectedIds.includes(s.id)) : list;
    if (recordsToExport.length === 0) {
      toast({ title: '没有可导出的数据', variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '无法打开导出窗口', variant: 'destructive' });
      return;
    }
    const rows = recordsToExport
      .map((s) => {
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
      })
      .join('');
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
          <thead><tr><th>编号</th><th>{tc("name")}</th><th>{tc("type")}</th><th>等级</th><th>{tc("status")}</th><th>联系人</th><th>{tc("phone")}</th><th>{tc("email")}</th><th>{tc("address")}</th></tr></thead>
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
    S: list.filter((s) => s.credit_level === 'S').length,
    A: list.filter((s) => s.credit_level === 'A').length,
    B: list.filter((s) => s.credit_level === 'B' || !s.credit_level).length,
    C: list.filter((s) => s.credit_level === 'C').length,
    D: list.filter((s) => s.credit_level === 'D').length,
  };

  return (
    <MainLayout title={t('supplierManagement')}>
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.S}</div>
              <div className="text-sm text-muted-foreground">{tc('strategicSupplier')}(S)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.A}</div>
              <div className="text-sm text-muted-foreground">{tc('preferredSupplier')}(A)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-500">{stats.B}</div>
              <div className="text-sm text-muted-foreground">{tc('qualifiedSupplier')}(B)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.C}</div>
              <div className="text-sm text-muted-foreground">{tc('conditionalSupplier')}(C)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.D}</div>
              <div className="text-sm text-muted-foreground">{tc('disqualifiedSupplier')}(D)</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchSupplierPlaceholder')}
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={() => fetchData()}
                  className="flex-1 max-w-sm"
                />
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={tc('grade')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allGrades')}</SelectItem>
                    <SelectItem value="S">{tc('strategic')}(S)</SelectItem>
                    <SelectItem value="A">{tc('preferred')}(A)</SelectItem>
                    <SelectItem value="B">{tc('qualified')}(B)</SelectItem>
                    <SelectItem value="C">{tc('conditional')}(C)</SelectItem>
                    <SelectItem value="D">{tc('disqualified')}(D)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={tc('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allStatus')}</SelectItem>
                    <SelectItem value="1">{tc('enable')}</SelectItem>
                    <SelectItem value="0">{tc('disabled')}</SelectItem>
                    <SelectItem value="2">{tc('blacklist')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {t('newSupplier')}
              </Button>
              <div className="flex gap-1 ml-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                  <Printer className="h-4 w-4" />
                  {tc('text_h6kd')}
                </Button>
                <GlobalExportToolbar
                  filename="供应商列表"
                  title="供应商列表"
                  columns={[
                    { key: 'supplier_code', label: '供应商编号', width: 15 },
                    { key: 'supplier_name', label: '供应商名称', width: 25 },
                    {
                      key: 'supplier_type',
                      label: tc('type'),
                      width: 10,
                      formatter: (v) => supplierTypeMap[v] || '-',
                    },
                    { key: 'credit_level', label: '等级', width: 8 },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) => (statusMap[v] || statusMap[1]).label,
                    },
                    { key: 'contact_name', label: '联系人', width: 12 },
                    { key: 'contact_phone', label: tc('phone'), width: 15 },
                    { key: 'contact_email', label: tc('email'), width: 20 },
                    { key: 'address', label: tc('address'), width: 30 },
                  ]}
                  data={
                    selectedIds.length > 0
                      ? list.filter((s) => selectedIds.includes(s.id))
                      : sortedList
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc('text_vm0qgy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">{tc('text_27k1ha')}</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={list.length > 0 && selectedIds.length === list.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('supplier_code')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_vltdaq')}
                        {getSortIcon('supplier_code')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('supplier_name')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_vm0hbk')}
                        {getSortIcon('supplier_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('supplier_type')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_lnjk')}
                        {getSortIcon('supplier_type')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('credit_level')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_lny6')}
                        {getSortIcon('credit_level')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_k1e3')}
                        {getSortIcon('status')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('contact_name')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_jed0z')}
                        {getSortIcon('contact_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('contact_phone')}
                    >
                      <span className="inline-flex items-center">
                        {tc('text_gpkj3j')}
                        {getSortIcon('contact_phone')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {tc('text_dcv57g')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedList.map((item) => {
                      const grade = creditLevelMap[item.credit_level] || creditLevelMap.B;
                      const status = statusMap[item.status] || statusMap[1];
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono">{item.supplier_code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.supplier_name}</div>
                              {item.short_name && (
                                <div className="text-sm text-muted-foreground">
                                  {item.short_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{supplierTypeMap[item.supplier_type] || '-'}</TableCell>
                          <TableCell>
                            <Badge className={grade.cls}>
                              <Star className="h-3 w-3 mr-1" />
                              {item.credit_level} - {grade.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.cls}>
                              {item.status === 2 && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.contact_name || '-'}</TableCell>
                          <TableCell>{item.contact_phone || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                {tc('text_g35')}
                {total}
                {tc('text_kf5')}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('text_btlof')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('text_btmf4')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editId ? t('editSupplier') : t('newSupplier')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{tc('text_s0hk76')}</Label>
                <Input
                  value={form.supplier_code}
                  onChange={(e) => setForm({ ...form, supplier_code: e.target.value })}
                  placeholder="如 S-20240501-001"
                  disabled={!!editId}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('text_m9cun3')}</Label>
                <Input
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  placeholder="请输入供应商全称"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('text_vltrr7')}</Label>
                <Input
                  value={form.short_name}
                  onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  placeholder="请输入简称"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('text_vltsjn')}</Label>
                <Select
                  value={String(form.supplier_type)}
                  onValueChange={(v) => setForm({ ...form, supplier_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('text_es4a')}</SelectItem>
                    <SelectItem value="2">{tc('text_iz9r')}</SelectItem>
                    <SelectItem value="3">{tc('text_oywk')}</SelectItem>
                    <SelectItem value="4">{tc('text_evds')}</SelectItem>
                    <SelectItem value="5">{tc('equipment')}</SelectItem>
                    <SelectItem value="6">{tc('text_frnm')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('text_jed0z')}</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="请输入联系人"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')}</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="请输入联系电话"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('email')}</Label>
                <Input
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder={tc('enterEmail')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('text_akgm5h')}</Label>
                <Select
                  value={form.credit_level}
                  onValueChange={(v) => setForm({ ...form, credit_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">{tc('text_ru0etr')}</SelectItem>
                    <SelectItem value="A">{tc('text_rqcwv5')}</SelectItem>
                    <SelectItem value="B">{tc('text_dg2w6d')}</SelectItem>
                    <SelectItem value="C">{tc('text_c0l8br')}</SelectItem>
                    <SelectItem value="D">{tc('text_6q9bpe')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('text_gighi2')}</Label>
                <Select
                  value={form.settlement_method || '月结'}
                  onValueChange={(v) => setForm({ ...form, settlement_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="月结">{tc('text_i7yj')}</SelectItem>
                    <SelectItem value="现结">{tc('text_kdgj')}</SelectItem>
                    <SelectItem value="预付">{tc('text_qdhw')}</SelectItem>
                    <SelectItem value="货到付款">{tc('text_i5cgen')}</SelectItem>
                    <SelectItem value="分期付款">{tc('text_arxhq7')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('text_ae7hcr')}</Label>
                <Select
                  value={form.payment_terms || '30天'}
                  onValueChange={(v) => setForm({ ...form, payment_terms: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="货到付款">{tc('text_i5cgen')}</SelectItem>
                    <SelectItem value="15天">{tc('text_1j7p')}</SelectItem>
                    <SelectItem value="30天">{tc('text_1kks')}</SelectItem>
                    <SelectItem value="60天">{tc('text_1msv')}</SelectItem>
                    <SelectItem value="90天">{tc('text_1p0y')}</SelectItem>
                    <SelectItem value="120天">{tc('text_wu6y')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('address')}</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={tc('enterAddress')}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tc('text_e32z')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
