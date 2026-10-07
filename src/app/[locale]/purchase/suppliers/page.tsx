'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Star, AlertTriangle, Loader2, RefreshCw, Printer, Building2, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchInput } from '@/components/ui/search-input';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { CurrencySelect } from '@/components/ui/currency-select';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';

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
  cooperation_status: number | string;
  settlement_method: string;
  payment_terms: string;
  status: number;
  remark: string;
  default_currency?: string;
}

const creditLevelMap: Record<string, { cls: string }> = {
  S: { cls: 'bg-yellow-500 text-white' },
  A: { cls: 'bg-gray-400 text-white' },
  B: { cls: 'bg-orange-400 text-white' },
  C: { cls: 'bg-orange-500 text-white' },
  D: { cls: 'bg-red-500 text-white' },
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
  status: 1,
  remark: '',
  default_currency: '',
};

export default function SuppliersPage() {
  const ts = useTranslations('Purchase');
  // 翻译钩子
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');

  const statusMap: Record<number, { label: string; cls: string }> = {
    1: { label: tc('enabled'), cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
    0: { label: tc('disabled'), cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
    2: { label: tc('blacklist'), cls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  };
  const supplierTypeLabels: Record<number, string> = {
    1: t('supplierTypeRaw'),
    2: t('supplierTypeInk'),
    3: t('supplierTypeAuxiliary'),
    4: t('supplierTypePackaging'),
    5: tc('equipment'),
    6: t('supplierTypeOutsource'),
  };
  const creditLevelLabels: Record<string, string> = {
    S: tc('strategic'),
    A: tc('preferred'),
    B: tc('qualified'),
    C: tc('conditional'),
    D: tc('disqualified'),
  };

  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const [list, setList] = useState<Supplier[]>([]);
  const [selectedRows, setSelectedRows] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const requiredFields: { key: keyof typeof emptyForm; label: string }[] = [
    { key: 'supplier_code', label: t('supplierCode') },
    { key: 'supplier_name', label: t('supplierName') },
    { key: 'supplier_type', label: t('supplierType') },
    { key: 'contact_name', label: tc('contact') },
    { key: 'contact_phone', label: tc('phone') },
    { key: 'address', label: tc('address') },
  ];

  const validate = (f: typeof emptyForm): Record<string, boolean> => {
    const e: Record<string, boolean> = {};
    for (const r of requiredFields) {
      const v = f[r.key];
      const empty =
        typeof v === 'string' ? v.trim() === '' : v === undefined || v === null || v === 0;
      if (empty) e[r.key] = true;
    }
    return e;
  };
  const sortedList = useMemo(() => list, [list]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      {
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
      }
    } catch (_error) {
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
    setErrors({});
    setShowDialog(true);
  };

  const handleOpenEdit = (item: Supplier) => {
    setEditId(item.id);
    setErrors({});
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
      settlement_method: item.settlement_method || ts('k_1n1l7qk'),
      payment_terms: item.payment_terms || ts('k_q1kx3h'),
      status: item.status ?? 1,
      remark: item.remark || '',
      default_currency: item.default_currency || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const firstMissing = requiredFields.find((r) => fieldErrors[r.key])?.label;
      toast({
        title: tc('k_1arc8l4') + (firstMissing ? `：${firstMissing}` : ''),
        variant: 'destructive',
      });
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
        toast({ title: editId ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: tc('saveFailed'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) {
      return;
    }
    try {
      const url = `/api/purchase/suppliers?id=${id}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: result.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const toggleSelect = (id: number) => {
    const item = list.find((s) => s.id === id);
    if (!item) return;
    setSelectedRows((prev) =>
      prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : [...prev, item]
    );
  };

  const toggleSelectAll = () => {
    setSelectedRows((prev) =>
      prev.length === sortedList.length ? [] : sortedList
    );
  };

  const handlePrint = () => {
    const recordsToPrint = selectedRows.length > 0 ? selectedRows : list;
    if (recordsToPrint.length === 0) {
      toast({ title: tc('noDataToPrint'), variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: tc('cannotOpenPrintWindow'), variant: 'destructive' });
      return;
    }
    const typeLabels: Record<number, string> = {
      1: t('supplierTypeRaw'),
      2: t('supplierTypeInk'),
      3: t('supplierTypeAuxiliary'),
      4: t('supplierTypePackaging'),
      5: t('supplierTypeEquipment'),
      6: t('supplierTypeOutsource'),
    };
    const levelLabels: Record<string, string> = {
      S: tc('strategic'),
      A: tc('preferred'),
      B: tc('qualified'),
      C: tc('conditional'),
      D: tc('disqualified'),
    };
    const rows = recordsToPrint
      .map((s) => {
        const _grade = creditLevelMap[s.credit_level] || creditLevelMap.B;
        const status = statusMap[s.status] || statusMap[1];
        return `<tr>
        <td>${s.supplier_code}</td>
        <td>${s.supplier_name}</td>
        <td>${typeLabels[s.supplier_type] || '-'}</td>
        <td>${s.credit_level} - ${levelLabels[s.credit_level] || '-'}</td>
        <td>${status.label}</td>
        <td>${s.contact_name || '-'}</td>
        <td>${s.contact_phone || '-'}</td>
      </tr>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('supplierManagement')}</title>
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
        <h1>${t('supplierManagement')}</h1>
        <div class="info">${tc('printTime')}：${new Date().toLocaleString()} | ${tc('total', { count: recordsToPrint.length })}</div>
        <table>
          <thead><tr><th>${tc('code')}</th><th>${tc('name')}</th><th>${tc('type')}</th><th>${tc('grade')}</th><th>${tc('status')}</th><th>${tc('contact')}</th><th>${tc('phone')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const columns: StandardTableColumn<Supplier>[] = [
    { key: 'supplier_code', title: t('supplierCode'), render: (s: Supplier) => <span className="font-mono">{s.supplier_code}</span> },
    { key: 'supplier_name', title: t('supplierName'), render: (s: Supplier) => (<div><div className="font-medium">{s.supplier_name}</div>{s.short_name && <div className="text-sm text-muted-foreground">{s.short_name}</div>}</div>) },
    { key: 'supplier_type', title: tc('type'), render: (s: Supplier) => supplierTypeLabels[s.supplier_type] || '-' },
    { key: 'credit_level', title: tc('grade'), render: (s: Supplier) => {
        const grade = creditLevelMap[s.credit_level] || creditLevelMap.B;
        return <Badge className={grade.cls}><Star className="h-3 w-3 mr-1" />{s.credit_level} - {creditLevelLabels[s.credit_level] || '-'}</Badge>;
      }},
    { key: 'status', title: tc('status'), render: (s: Supplier) => {
        const status = statusMap[s.status] || statusMap[1];
        return <Badge className={status.cls}>{s.status === 2 && <AlertTriangle className="h-3 w-3 mr-1" />}{status.label}</Badge>;
      }},
    { key: 'contact_name', title: tc('contact'), render: (s: Supplier) => s.contact_name || '-' },
    { key: 'contact_phone', title: tc('phone'), render: (s: Supplier) => s.contact_phone || '-' },
    { key: 'default_currency', title: tc('supplierDefaultCurrency'), render: (s: Supplier) => s.default_currency || 'CNY' },
    { key: 'actions', title: tc('actions'), align: 'right', render: (s: Supplier) => (<div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" /></Button></div>) },
  ];

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
        <StatsCards
          configs={[
            { key: 'total', label: t('totalSuppliers'), icon: Building2, ...StatsTheme.blue },
            { key: 'active', label: tc('active'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'pending', label: tc('pending'), icon: Clock, ...StatsTheme.orange },
            { key: 'warning', label: tc('warning'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'total', count: list.length },
            { key: 'active', count: list.length },
            { key: 'pending', count: list.length },
            { key: 'warning', count: list.length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
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
                  {tc('print')}
                </Button>
                <GlobalExportToolbar
                  filename={t('supplierManagement')}
                  title={t('supplierManagement')}
                  columns={[
                    { key: 'supplier_code', label: t('supplierCode'), width: 15 },
                    { key: 'supplier_name', label: t('supplierName'), width: 25 },
                    {
                      key: 'supplier_type',
                      label: tc('type'),
                      width: 10,
                      formatter: (v) => supplierTypeLabels[v] || '-',
                    },
                    { key: 'credit_level', label: tc('grade'), width: 8 },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) => (statusMap[v] || statusMap[1]).label,
                    },
                    { key: 'contact_name', label: tc('contact'), width: 12 },
                    { key: 'contact_phone', label: tc('phone'), width: 15 },
                    { key: 'contact_email', label: tc('email'), width: 20 },
                    { key: 'address', label: tc('address'), width: 30 },
                  ]}
                  data={
                    selectedRows.length > 0
                      ? list.filter((s) => selectedRows.some((sr) => sr.id === s.id))
                      : sortedList
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle>{t('supplierManagement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StandardTable<Supplier>
              columns={columns}
              dataSource={sortedList}
              total={total}
              page={page}
              pageSize={20}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading && list.length === 0}
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editId ? t('editSupplier') : t('newSupplier')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('supplierCode')} *</Label>
                <Input
                  value={form.supplier_code}
                  onChange={(e) => {
                    setForm({ ...form, supplier_code: e.target.value });
                    setErrors((p) => ({ ...p, supplier_code: false }));
                  }}
                  placeholder={t('supplierCodePlaceholder')}
                  disabled={!!editId}
                  aria-invalid={!!errors.supplier_code}
                  className={errors.supplier_code ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('supplierName')} *</Label>
                <Input
                  value={form.supplier_name}
                  onChange={(e) => {
                    setForm({ ...form, supplier_name: e.target.value });
                    setErrors((p) => ({ ...p, supplier_name: false }));
                  }}
                  placeholder={t('enterSupplierName')}
                  aria-invalid={!!errors.supplier_name}
                  className={errors.supplier_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('shortName')}</Label>
                <Input
                  value={form.short_name}
                  onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  placeholder={t('enterShortName')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('supplierType')} *</Label>
                <Select
                  value={String(form.supplier_type)}
                  onValueChange={(v) => {
                    setForm({ ...form, supplier_type: Number(v) });
                    setErrors((p) => ({ ...p, supplier_type: false }));
                  }}
                >
                  <SelectTrigger
                    className={errors.supplier_type ? 'border-red-500 focus:ring-red-500' : ''}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('supplierTypeRaw')}</SelectItem>
                    <SelectItem value="2">{t('supplierTypeInk')}</SelectItem>
                    <SelectItem value="3">{t('supplierTypeAuxiliary')}</SelectItem>
                    <SelectItem value="4">{t('supplierTypePackaging')}</SelectItem>
                    <SelectItem value="5">{tc('equipment')}</SelectItem>
                    <SelectItem value="6">{t('supplierTypeOutsource')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('contact')} *</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => {
                    setForm({ ...form, contact_name: e.target.value });
                    setErrors((p) => ({ ...p, contact_name: false }));
                  }}
                  placeholder={t('enterContact')}
                  aria-invalid={!!errors.contact_name}
                  className={errors.contact_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')} *</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => {
                    setForm({ ...form, contact_phone: e.target.value });
                    setErrors((p) => ({ ...p, contact_phone: false }));
                  }}
                  placeholder={tc('enterPhone')}
                  aria-invalid={!!errors.contact_phone}
                  className={errors.contact_phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
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
                <Label>{t('creditLevel')}</Label>
                <Select
                  value={form.credit_level}
                  onValueChange={(v) => setForm({ ...form, credit_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">{tc('strategic')}</SelectItem>
                    <SelectItem value="A">{tc('preferred')}</SelectItem>
                    <SelectItem value="B">{tc('qualified')}</SelectItem>
                    <SelectItem value="C">{tc('conditional')}</SelectItem>
                    <SelectItem value="D">{tc('disqualified')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('settlementMethod')}</Label>
                <Select
                  value={form.settlement_method || ts('k_1n1l7qk')}
                  onValueChange={(v) => setForm({ ...form, settlement_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_1n1l7qk')}>{t('settlementMonthly')}</SelectItem>
                    <SelectItem value={ts('k_1ixpodw')}>{t('settlementSpot')}</SelectItem>
                    <SelectItem value={ts('k_favaa9')}>{t('settlementPrepaid')}</SelectItem>
                    <SelectItem value={ts('k_16x2l80')}>{t('settlementCOD')}</SelectItem>
                    <SelectItem value={ts('k_19g1z5s')}>{t('settlementInstallment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('supplierDefaultCurrency')}</Label>
                <CurrencySelect
                  value={form.default_currency}
                  onChange={(v) => setForm({ ...form, default_currency: v })}
                  placeholder={tc('selectCurrency')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('paymentTerms')}</Label>
                <Select
                  value={form.payment_terms || ts('k_q1kx3h')}
                  onValueChange={(v) => setForm({ ...form, payment_terms: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_16x2l80')}>{t('settlementCOD')}</SelectItem>
                    <SelectItem value={ts('k_1p8l72e')}>{t('payment15Days')}</SelectItem>
                    <SelectItem value={ts('k_q1kx3h')}>{t('payment30Days')}</SelectItem>
                    <SelectItem value={ts('k_13s2nva')}>{t('payment60Days')}</SelectItem>
                    <SelectItem value={ts('k_1j86z5r')}>{t('payment90Days')}</SelectItem>
                    <SelectItem value={ts('k_1siq1dx')}>{t('payment120Days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('address')} *</Label>
                <Input
                  value={form.address}
                  onChange={(e) => {
                    setForm({ ...form, address: e.target.value });
                    setErrors((p) => ({ ...p, address: false }));
                  }}
                  placeholder={tc('enterAddress')}
                  aria-invalid={!!errors.address}
                  className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tc('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
