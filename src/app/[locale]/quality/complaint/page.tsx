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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
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

interface ComplaintRecord {
  id?: number;
  complaint_no: string;
  complaint_source: string;
  customer_id?: number;
  customer_name: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  order_no: string;
  defect_date: string;
  defect_qty: number;
  defect_desc: string;
  defect_type: string;
  severity: number;
  reporter: string;
  report_date: string;
  d1_team: string;
  d1_date: string;
  d2_desc: string;
  d2_date: string;
  d3_interim_action: string;
  d3_date: string;
  d4_root_cause: string;
  d4_date: string;
  d5_corrective_action: string;
  d5_date: string;
  d6_implement_verify: string;
  d6_date: string;
  d7_preventive_action: string;
  d7_date: string;
  d8_congratulations: string;
  d8_date: string;
  status: number;
  remark: string;
  create_time: string;
}

const sourceMap: Record<string, string> = {
  customer: 'customerComplaint',
  internal: 'internalDiscovery',
  audit: 'auditDiscovery',
  other: 'other',
};
const defectTypeMap: Record<string, string> = {
  appearance: 'appearanceDefect',
  dimension: 'dimensionDefect',
  function: 'functionDefect',
  color: 'colorDefect',
  adhesion: 'adhesionDefect',
  other: 'other',
};
const severityMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: 'minor', variant: 'outline' },
  2: { label: 'general', variant: 'secondary' },
  3: { label: 'serious', variant: 'destructive' },
};

export default function Complaint8DPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: 'registered', variant: 'outline' },
    2: { label: 'analyzing', variant: 'secondary' },
    3: { label: 'countermeasure', variant: 'secondary' },
    4: { label: 'verifying', variant: 'secondary' },
    5: { label: tc('closed'), variant: 'default' },
    6: { label: 'returned', variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<ComplaintRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [show8DDialog, setShow8DDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ComplaintRecord>>({});
  const [active8DTab, setActive8DTab] = useState('d1');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(list, 'complaint_no');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        customerName: searchCustomer,
        productName: searchProduct,
        status: searchStatus,
      });
      const res = await authFetch('/api/quality/complaint?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/complaint', {
        method,
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleSave8D = async () => {
    try {
      const res = await fetch('/api/quality/complaint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('8DReportSaved') });
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteComplaint'))) return;
    try {
      const res = await authFetch('/api/quality/complaint?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const open8DReport = (item: ComplaintRecord) => {
    setEditItem(item);
    setActive8DTab('d1');
    setShow8DDialog(true);
  };

  return (
    <MainLayout title={t('complaint8DManagement')}>
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchCustomerName')}
                    className="pl-8 w-48"
                    value={searchCustomer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setSearchCustomer(e.target.value)
                    }
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tc("searchProductName")}
                    className="pl-8 w-48"
                    value={searchProduct}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setSearchProduct(e.target.value)
                    }
                  />
                </div>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={t('statusFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v.label)}
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
                  setEditItem({ complaint_source: 'customer', defect_type: 'other', severity: 2 });
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('newComplaint')}
              </Button>
              <GlobalExportToolbar
                filename="客诉8D报告"
                title="客诉8D报告"
                columns={[
                  { key: 'complaint_no', label: t('complaintNo'), width: 18 },
                  { key: 'customer_name', label: tc('customerName'), width: 20 },
                  { key: 'product_name', label: tc('productName'), width: 20 },
                  { key: 'defect_type', label: t('defectType'), width: 12, formatter: (v) => t(defectTypeMap[v] || v) },
                  { key: 'defect_qty', label: t('defectQty'), width: 10 },
                  { key: 'status', label: tc('status'), width: 12, formatter: (v) => t(statusMap[v]?.label || tc('unknown')) },
                ]}
                data={selectedIds.length > 0 ? sortedData.filter((i) => i.id && selectedIds.includes(i.id)) : sortedData}
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
                            : sortedData
                                .filter((i: ComplaintRecord) => i.id)
                                .map((i: ComplaintRecord) => i.id!)
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center">{tc("serialNo")}</TableHead>
                  <SortableTableHeader
                    field="complaint_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('complaintNo')}
                  </SortableTableHeader>
                  <TableHead>{tc("source")}</TableHead>
                  <SortableTableHeader
                    field="customer_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('customerName')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="product_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('productName')}
                  </SortableTableHeader>
                  <TableHead>{t('defectType')}</TableHead>
                  <TableHead>{t('severity')}</TableHead>
                  <TableHead>{t('defectQty')}</TableHead>
                  <SortableTableHeader
                    field="status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('status')}
                  </SortableTableHeader>
                  <TableHead>{t('registerDate')}</TableHead>
                  <TableHead>{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item: ComplaintRecord, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.id ? selectedIds.includes(item.id) : false}
                        onCheckedChange={() => {
                          if (item.id)
                            setSelectedIds((prev: number[]) =>
                              prev.includes(item.id!)
                                ? prev.filter((i: number) => i !== item.id!)
                                : [...prev, item.id!]
                            );
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {(page - 1) * 20 + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.complaint_no}</TableCell>
                    <TableCell>
                      {t(sourceMap[item.complaint_source] || item.complaint_source)}
                    </TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{t(defectTypeMap[item.defect_type] || item.defect_type)}</TableCell>
                    <TableCell>
                      <Badge variant={severityMap[item.severity]?.variant || 'outline'}>
                        {t(severityMap[item.severity]?.label || tc('unknown'))}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.defect_qty}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {t(statusMap[item.status]?.label || tc('unknown'))}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.report_date?.substring(0, 10) || item.create_time?.substring(0, 10)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => open8DReport(item)}>
                          8D
                        </Button>
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
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">{tc('totalRecords', { count: total })}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p: number) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p: number) => p + 1)}
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
              <DialogTitle>{editItem.id ? t('editComplaint') : t('newComplaint')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{t('complaintSource')}</Label>
                <Select
                  value={editItem.complaint_source || 'customer'}
                  onValueChange={(v: string) => setEditItem({ ...editItem, complaint_source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('customerName')} *</Label>
                <Input
                  value={editItem.customer_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, customer_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{tc('productCode')}</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, product_code: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{tc('productName')} *</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, product_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{tc('orderNo')}</Label>
                <Input
                  value={editItem.order_no || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, order_no: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('defectDate')}</Label>
                <Input
                  type="date"
                  value={editItem.defect_date || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, defect_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('defectQty')}</Label>
                <Input
                  type="number"
                  value={editItem.defect_qty || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, defect_qty: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t('defectType')}</Label>
                <Select
                  value={editItem.defect_type || 'other'}
                  onValueChange={(v: string) => setEditItem({ ...editItem, defect_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(defectTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('severity')}</Label>
                <Select
                  value={String(editItem.severity || 2)}
                  onValueChange={(v: string) => setEditItem({ ...editItem, severity: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(severityMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('reporter')}</Label>
                <Input
                  value={editItem.reporter || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, reporter: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{t('defectDesc')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.defect_desc || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, defect_desc: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{tc("remark")}</Label>
                <Textarea
                  rows={2}
                  value={editItem.remark || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setEditItem({ ...editItem, remark: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={show8DDialog} onOpenChange={setShow8DDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('8DReport')} - {editItem.complaint_no}</DialogTitle>
            </DialogHeader>
            <Tabs value={active8DTab} onValueChange={setActive8DTab}>
              <TabsList className="grid grid-cols-8">
                <TabsTrigger value="d1">D1</TabsTrigger>
                <TabsTrigger value="d2">D2</TabsTrigger>
                <TabsTrigger value="d3">D3</TabsTrigger>
                <TabsTrigger value="d4">D4</TabsTrigger>
                <TabsTrigger value="d5">D5</TabsTrigger>
                <TabsTrigger value="d6">D6</TabsTrigger>
                <TabsTrigger value="d7">D7</TabsTrigger>
                <TabsTrigger value="d8">D8</TabsTrigger>
              </TabsList>
              <TabsContent value="d1" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D1TeamFormation')}</h3>
                <div>
                  <Label>{t('teamMembers')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d1_team || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d1_team: e.target.value })
                    }
                    placeholder={t('teamMembersPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('formationDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d1_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d1_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d2" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D2ProblemDescription')}</h3>
                <div>
                  <Label>{t('problemDesc')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d2_desc || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d2_desc: e.target.value })
                    }
                    placeholder={t('5W2HPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('descDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d2_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d2_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d3" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D3InterimMeasures')}</h3>
                <div>
                  <Label>{t('interimMeasures')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d3_interim_action || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d3_interim_action: e.target.value })
                    }
                    placeholder={t('interimMeasuresPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('executionDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d3_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d3_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d4" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D4RootCauseAnalysis')}</h3>
                <div>
                  <Label>{t('rootCause')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d4_root_cause || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d4_root_cause: e.target.value })
                    }
                    placeholder={t('rootCausePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('analysisDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d4_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d4_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d5" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D5CorrectiveMeasures')}</h3>
                <div>
                  <Label>{t('correctiveMeasures')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d5_corrective_action || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d5_corrective_action: e.target.value })
                    }
                    placeholder={t('correctiveMeasuresPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('planDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d5_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d5_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d6" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D6ImplementVerify')}</h3>
                <div>
                  <Label>{t('implementVerify')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d6_implement_verify || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d6_implement_verify: e.target.value })
                    }
                    placeholder={t('implementVerifyPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('verifyDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d6_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d6_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d7" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D7PreventRecurrence')}</h3>
                <div>
                  <Label>{t('preventiveMeasures')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d7_preventive_action || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d7_preventive_action: e.target.value })
                    }
                    placeholder={t('preventiveMeasuresPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('preventDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d7_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d7_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="d8" className="space-y-4 mt-4">
                <h3 className="font-semibold">{t('D8CongratulateTeam')}</h3>
                <div>
                  <Label>{t('summaryRecognition')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.d8_congratulations || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d8_congratulations: e.target.value })
                    }
                    placeholder={t('summaryRecognitionPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('closeDate')}</Label>
                  <Input
                    type="date"
                    value={editItem.d8_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEditItem({ ...editItem, d8_date: e.target.value })
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShow8DDialog(false)}>
                {tc('close')}
              </Button>
              <Button onClick={handleSave8D}>{t('save8DReport')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
