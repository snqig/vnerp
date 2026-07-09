'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { useTranslations } from 'next-intl';

interface SupplierAuditRecord {
  id?: number;
  audit_no: string;
  supplier_id?: number;
  supplier_name: string;
  audit_type: string;
  audit_date: string;
  auditor: string;
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
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: 'planned', variant: 'outline' },
  2: { label: 'auditing', variant: 'secondary' },
  3: { label: 'completed', variant: 'default' },
};

export default function SupplierAuditPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<SupplierAuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchType, setSearchType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SupplierAuditRecord>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(list, 'audit_no');

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

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const totalScore =
        (editItem.quality_system_score || 0) +
        (editItem.delivery_score || 0) +
        (editItem.price_score || 0) +
        (editItem.service_score || 0);
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/supplier-audit', {
        method,
        body: JSON.stringify({ ...editItem, total_score: totalScore }),
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
      <div className="p-6 space-y-6">
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
                    audit_type: 'initial',
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
                filename="供应商审核报告"
                title="供应商审核报告"
                columns={[
                  { key: 'audit_no', label: t('auditNo'), width: 18 },
                  { key: 'supplier_name', label: tc('supplier'), width: 20 },
                  { key: 'audit_type', label: t('auditType'), width: 12 },
                  { key: 'audit_date', label: t('auditDate'), width: 12 },
                  { key: 'total_score', label: t('totalScore'), width: 10 },
                  { key: 'audit_result', label: tc('result'), width: 12 },
                ]}
                data={
                  selectedIds.length > 0
                    ? sortedData.filter((i) => i.id && selectedIds.includes(i.id))
                    : sortedData
                }
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                      onCheckedChange={() =>
                        setSelectedIds(
                          selectedIds.length === sortedData.length
                            ? []
                            : sortedData.filter((i) => i.id).map((i) => i.id!)
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center">{tc('serialNo')}</TableHead>
                  <SortableTableHeader
                    field="audit_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('auditNo')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="supplier_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('supplierName')}
                  </SortableTableHeader>
                  <TableHead>{t('auditType')}</TableHead>
                  <TableHead>{t('auditDate')}</TableHead>
                  <TableHead>{t('qualitySystem')}</TableHead>
                  <TableHead>{t('delivery')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>{t('service')}</TableHead>
                  <TableHead>{t('totalScore')}</TableHead>
                  <TableHead>{tc('result')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.id ? selectedIds.includes(item.id) : false}
                        onCheckedChange={() => {
                          if (item.id)
                            setSelectedIds((prev) =>
                              prev.includes(item.id!)
                                ? prev.filter((i) => i !== item.id!)
                                : [...prev, item.id!]
                            );
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {(page - 1) * 20 + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.audit_no}</TableCell>
                    <TableCell>{item.supplier_name}</TableCell>
                    <TableCell>{t(auditTypeMap[item.audit_type] || item.audit_type)}</TableCell>
                    <TableCell>{item.audit_date?.substring(0, 10) || '-'}</TableCell>
                    <TableCell>{getScoreBadge(item.quality_system_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.delivery_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.price_score)}</TableCell>
                    <TableCell>{getScoreBadge(item.service_score)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.total_score >= 240
                            ? 'default'
                            : item.total_score >= 180
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {item.total_score}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={auditResultMap[item.audit_result]?.variant || 'outline'}>
                        {t(auditResultMap[item.audit_result]?.label || 'pendingJudgment')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (item.id) handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {tc('totalRecords', { count: total })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            </div>
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
                  value={editItem.audit_type || 'initial'}
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
