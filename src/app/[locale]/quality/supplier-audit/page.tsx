'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, ClipboardCheck, CheckCircle, Clock, AlertTriangle, Calendar, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  buildQualityFormMessages,
  buildSupplierAuditSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, StandardTableColumn } from '@/components/common';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface SupplierAuditRecord {
  id?: number;
  audit_no: string;
  supplier_id?: number;
  supplier_name: string;
  audit_type: string;
  audit_date: string;
  auditor: string;
  auditor_name?: string;
  audit_scope: string;
  quality_system_score: number;
  delivery_score: number;
  price_score: number;
  service_score: number;
  total_score: number;
  audit_result: string;
  improvement_items: string;
  follow_up_date: string;
  status: number;
  remark: string;
  create_time: string;
}

const auditTypeMap: Record<string, string> = {
  annual: 'auditTypeAnnual',
  initial: 'initialAudit',
  routine: 'routineAudit',
  follow_up: 'followUpAudit',
  special: 'specialAudit',
};
const auditResultMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  approved: { label: 'qualified', variant: 'default' },
  conditional: { label: 'conditionalPass', variant: 'secondary' },
  rejected: { label: 'unqualified', variant: 'destructive' },
  pending: { label: 'pendingJudgment', variant: 'outline' },
};
const _statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: 'planned', variant: 'outline' },
  2: { label: 'auditing', variant: 'secondary' },
  3: { label: 'completed', variant: 'default' },
};

export default function SupplierAuditPage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<SupplierAuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchType, setSearchType] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    auditing: 0,
    passed: 0,
    failed: 0,
    monthlyCount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SupplierAuditRecord>>({});
  const [selectedRows, setSelectedRows] = useState<SupplierAuditRecord[]>([]);
  const [pageSize] = useState(20);
  const sortedList = useMemo(() => list, [list]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        supplierName: searchSupplier,
        auditType: searchType,
      });
      const res = await authFetch('/api/quality/supplier-audit?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/supplier-audit/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page]);

  const handleSave = async () => {
    const parsed = buildSupplierAuditSchema(buildQualityFormMessages((k) => tc(k))).safeParse(
      editItem
    );
    if (!parsed.success) {
      toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
      return;
    }
    try {
      const totalScore =
        (editItem.quality_system_score || 0) +
        (editItem.delivery_score || 0) +
        (editItem.price_score || 0) +
        (editItem.service_score || 0);
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/supplier-audit', {
        method,
        body: JSON.stringify({ ...parsed.data, total_score: totalScore }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteAudit'))) return;
    try {
      const res = await authFetch('/api/quality/supplier-audit?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default">{score}</Badge>;
    if (score >= 60) return <Badge variant="secondary">{score}</Badge>;
    return <Badge variant="destructive">{score}</Badge>;
  };

  return (
    <MainLayout title={t('supplierQualityAudit')}>
      <div className="p-6 space-y-6">        <StatsCards
          configs={[
            { key: 'pending', label: '待审核', icon: Clock, ...StatsTheme.orange },
            { key: 'auditing', label: '审核中', icon: ClipboardCheck, ...StatsTheme.blue },
            { key: 'passed', label: '已通过', icon: CheckCircle, ...StatsTheme.green },
            { key: 'failed', label: '未通过', icon: XCircle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月审核数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'auditing', count: stats.auditing },
            { key: 'passed', count: stats.passed },
            { key: 'failed', count: stats.failed },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchSupplierName')}
                    className="pl-8 w-60"
                    value={searchSupplier}
                    onChange={(e) => setSearchSupplier(e.target.value)}
                  />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('auditType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allTypes')}</SelectItem>
                    {Object.entries(auditTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  {tc('query')}
                </Button>
              </div>
              <Button
                onClick={() => {
                  setEditItem({
                    audit_type: 'annual',
                    audit_result: 'pending',
                    quality_system_score: 0,
                    delivery_score: 0,
                    price_score: 0,
                    service_score: 0,
                    total_score: 0,
                  });
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('newAudit')}
              </Button>
              <GlobalExportToolbar
                filename={ts('k_6eeeji')}
                title={ts('k_6eeeji')}
                columns={[
                  { key: 'audit_no', label: t('auditNo'), width: 18 },
                  { key: 'supplier_name', label: tc('supplier'), width: 20 },
                  { key: 'audit_type', label: t('auditType'), width: 12 },
                  { key: 'audit_date', label: t('auditDate'), width: 12 },
                  { key: 'total_score', label: t('totalScore'), width: 10 },
                  { key: 'audit_result', label: tc('result'), width: 12 },
                ]}
                data={
                  selectedRows.length > 0
                    ? list.filter((i) => selectedRows.some((sr) => sr.id === i.id))
                    : list
                }
              />
            </div>

            <StandardTable<SupplierAuditRecord>
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={(rows) => setSelectedRows(rows)}
              dataSource={sortedList}
              columns={[
                {
                  key: 'serialNo',
                  title: tc('serialNo'),
                  width: 60,
                  align: 'center',
                  render: (_row, index) => (
                    <span className="text-muted-foreground">{index + 1}</span>
                  ),
                },
                { key: 'audit_no', title: t('auditNo') },
                { key: 'supplier_name', title: tc('supplierName') },
                {
                  key: 'audit_type',
                  title: t('auditType'),
                  render: (row) => t(auditTypeMap[row.audit_type] || row.audit_type),
                },
                { key: 'audit_date', title: t('auditDate'), render: (row) => row.audit_date?.substring(0, 10) || '-' },
                {
                  key: 'quality_system_score',
                  title: t('qualitySystem'),
                  render: (row) => getScoreBadge(row.quality_system_score),
                },
                {
                  key: 'delivery_score',
                  title: t('delivery'),
                  render: (row) => getScoreBadge(row.delivery_score),
                },
                {
                  key: 'price_score',
                  title: t('price'),
                  render: (row) => getScoreBadge(row.price_score),
                },
                {
                  key: 'service_score',
                  title: t('service'),
                  render: (row) => getScoreBadge(row.service_score),
                },
                {
                  key: 'total_score',
                  title: t('totalScore'),
                  render: (row) => (
                    <Badge
                      variant={
                        row.total_score >= 240
                          ? 'default'
                          : row.total_score >= 180
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {row.total_score}
                    </Badge>
                  ),
                },
                {
                  key: 'audit_result',
                  title: tc('result'),
                  render: (row) => (
                    <Badge variant={auditResultMap[row.audit_result]?.variant || 'outline'}>
                      {t(auditResultMap[row.audit_result]?.label || 'pendingJudgment')}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  title: tc('actions'),
                  width: 80,
                  render: (row) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditItem({ ...row, auditor: (row.auditor ?? row.auditor_name ?? '') as string });
                          setShowDialog(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (row.id) handleDelete(row.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(p) => setPage(p)}
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? t('editAuditRecord') : t('newAuditRecord')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{tc('supplierName')} *</Label>
                <Input
                  value={editItem.supplier_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, supplier_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('auditType')}</Label>
                <Select
                  value={editItem.audit_type || 'annual'}
                  onValueChange={(v) => setEditItem({ ...editItem, audit_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(auditTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('auditDate')}</Label>
                <Input
                  type="date"
                  value={editItem.audit_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, audit_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('auditor')}</Label>
                <Input
                  value={editItem.auditor || ''}
                  onChange={(e) => setEditItem({ ...editItem, auditor: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('auditScope')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.audit_scope || ''}
                  onChange={(e) => setEditItem({ ...editItem, audit_scope: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('qualitySystemScore')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editItem.quality_system_score || 0}
                  onChange={(e) =>
                    setEditItem({ ...editItem, quality_system_score: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t('deliveryScore')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editItem.delivery_score || 0}
                  onChange={(e) =>
                    setEditItem({ ...editItem, delivery_score: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t('priceScore')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editItem.price_score || 0}
                  onChange={(e) =>
                    setEditItem({ ...editItem, price_score: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t('serviceScore')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editItem.service_score || 0}
                  onChange={(e) =>
                    setEditItem({ ...editItem, service_score: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t('auditResult')}</Label>
                <Select
                  value={editItem.audit_result || 'pending'}
                  onValueChange={(v) => setEditItem({ ...editItem, audit_result: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(auditResultMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('followUpDate')}</Label>
                <Input
                  type="date"
                  value={editItem.follow_up_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, follow_up_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('improvementItems')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.improvement_items || ''}
                  onChange={(e) => setEditItem({ ...editItem, improvement_items: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
