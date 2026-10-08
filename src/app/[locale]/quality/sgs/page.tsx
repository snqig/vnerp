'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useMemo } from 'react';
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
import { Plus, Search, Edit, Trash2, AlertTriangle, FileCheck, ShieldCheck, CheckCircle, Clock, FileSearch, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  buildQualityFormMessages,
  buildSgsSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, StandardTableColumn } from '@/components/common';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface CertItem {
  id?: number;
  test_item_name: string;
  test_standard: string;
  limit_value: string;
  test_value: string;
  unit: string;
  result: string;
}

interface Cert {
  id?: number;
  cert_no: string;
  material_id?: number;
  material_code: string;
  material_name: string;
  supplier_id?: number;
  supplier_name: string;
  cert_type: string;
  test_items?: string;
  test_result: string;
  test_report_no: string;
  test_org: string;
  issue_date: string;
  expire_date: string;
  status: number;
  file_url: string;
  remark: string;
  item_count?: number;
  days_remaining?: number;
  items?: CertItem[];
}

const _certTypeMap: Record<string, string> = {
  RoHS: 'RoHS',
  REACH: 'REACH',
  FDA: 'FDA',
  'EN71-3': 'EN71-3',
  其他: '其他',
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  0: { label: 'invalid', variant: 'destructive' },
  1: { label: 'valid', variant: 'default' },
  2: { label: 'pendingTest', variant: 'outline' },
  3: { label: 'expired', variant: 'destructive' },
};
const testResultMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PASS: { label: 'qualified', variant: 'default' },
  FAIL: { label: 'unqualified', variant: 'destructive' },
  PENDING: { label: 'pendingTest', variant: 'outline' },
  合格: { label: 'qualified', variant: 'default' },
  不合格: { label: 'unqualified', variant: 'destructive' },
};

const rohsTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  {
    test_item_name: '铅(Pb)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '1000',
    unit: 'mg/kg',
  },
  {
    test_item_name: '镉(Cd)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '100',
    unit: 'mg/kg',
  },
  {
    test_item_name: '汞(Hg)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '1000',
    unit: 'mg/kg',
  },
  {
    test_item_name: '六价铬(Cr6+)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '1000',
    unit: 'mg/kg',
  },
  {
    test_item_name: '多溴联苯(PBB)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '1000',
    unit: 'mg/kg',
  },
  {
    test_item_name: '多溴二苯醚(PBDE)',
    test_standard: 'RoHS 2011/65/EU',
    limit_value: '1000',
    unit: 'mg/kg',
  },
];

const reachTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  {
    test_item_name: 'SVHC物质',
    test_standard: 'REACH EC 1907/2006',
    limit_value: '1000',
    unit: 'mg/kg',
  },
  {
    test_item_name: '邻苯二甲酸酯',
    test_standard: 'REACH EC 1907/2006',
    limit_value: '1000',
    unit: 'mg/kg',
  },
];

const en71TestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  {
    test_item_name: '钡(Ba)',
    test_standard: 'EN71-3:2019',
    limit_value: '18750',
    unit: 'mg/kg',
  },
  {
    test_item_name: '镉(Cd)',
    test_standard: 'EN71-3:2019',
    limit_value: '17.9',
    unit: 'mg/kg',
  },
  {
    test_item_name: '铬(Cr)',
    test_standard: 'EN71-3:2019',
    limit_value: '460',
    unit: 'mg/kg',
  },
  {
    test_item_name: '铅(Pb)',
    test_standard: 'EN71-3:2019',
    limit_value: '2380',
    unit: 'mg/kg',
  },
  {
    test_item_name: '汞(Hg)',
    test_standard: 'EN71-3:2019',
    limit_value: '94',
    unit: 'mg/kg',
  },
  {
    test_item_name: '硒(Se)',
    test_standard: 'EN71-3:2019',
    limit_value: '460',
    unit: 'mg/kg',
  },
];

const fdaTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  {
    test_item_name: '总迁移量',
    test_standard: 'FDA 21 CFR 175.105',
    limit_value: '60',
    unit: 'mg/dm²',
  },
  {
    test_item_name: '重金属(以Pb计)',
    test_standard: 'FDA 21 CFR 175.105',
    limit_value: '1',
    unit: 'mg/dm²',
  },
];

function getDefaultItems(certType: string): CertItem[] {
  let templates: Omit<CertItem, 'test_value' | 'result'>[] = [];
  switch (certType) {
    case 'RoHS':
      templates = rohsTestItems;
      break;
    case 'REACH':
      templates = reachTestItems;
      break;
    case 'EN71-3':
      templates = en71TestItems;
      break;
    case 'FDA':
      templates = fdaTestItems;
      break;
    default:
      templates = [];
      break;
  }
  return templates.map((t) => ({ ...t, test_value: '', result: 'N/A' }));
}

export default function SGSManagementPage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const displayCertType = (type: string) => type === '其他' ? t('other') : type;

  const { toast } = useToast();
  const [list, setList] = useState<Cert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCertNo, setSearchCertNo] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchCertType, setSearchCertType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    inspecting: 0,
    passed: 0,
    failed: 0,
    monthlyCount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Cert>>({});
  const [detailItem, setDetailItem] = useState<Cert | null>(null);
  const [warningData, setWarningData] = useState<{
    expired: Cert[];
    expiring: Cert[];
    total: number;
  }>({ expired: [], expiring: [], total: 0 });
  const [selectedRows, setSelectedRows] = useState<Cert[]>([]);
  const [pageSize] = useState(20);
  const sortedList = useMemo(() => list, [list]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        certNo: searchCertNo,
        materialName: searchMaterial,
        certType: searchCertType,
        status: searchStatus,
      });
      const res = await fetch('/api/quality/sgs?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchWarning = async () => {
    try {
      const res = await authFetch('/api/quality/sgs/expiry-warning?days=90');
      const result = await res.json();
      if (result.success) {
        setWarningData(result.data);
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/sgs/stats');
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
  useEffect(() => {
    fetchWarning();
  }, []);

  const handleSave = async () => {
    const parsed = buildSgsSchema(buildQualityFormMessages((k) => tc(k))).safeParse(editItem);
    if (!parsed.success) {
      toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
      return;
    }
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/sgs', {
        method,
        body: JSON.stringify(parsed.data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
        fetchWarning();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteSGS'))) return;
    try {
      const res = await authFetch('/api/quality/sgs?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
        fetchWarning();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await fetch('/api/quality/sgs/' + id);
      const result = await res.json();
      if (result.success) {
        setDetailItem(result.data);
        setShowDetailDialog(true);
      }
    } catch {}
  };

  const handleCertTypeChange = (certType: string) => {
    const newItems = getDefaultItems(certType);
    setEditItem({ ...editItem, cert_type: certType, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof CertItem, value: string) => {
    if (!editItem.items) return;
    const newItems = [...editItem.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItem({ ...editItem, items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [
      ...(editItem.items || []),
      {
        test_item_name: '',
        test_standard: '',
        limit_value: '',
        test_value: '',
        unit: '',
        result: 'N/A',
      },
    ];
    setEditItem({ ...editItem, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!editItem.items) return;
    const newItems = editItem.items.filter((_, i) => i !== index);
    setEditItem({ ...editItem, items: newItems });
  };

  const isExpiring = (expireDate: string) => {
    if (!expireDate) return false;
    const diff = (new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  };

  const isExpired = (expireDate: string) => {
    if (!expireDate) return false;
    return new Date(expireDate).getTime() < Date.now();
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">{t('sgsCertManagement')}</h1>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('certNo')}
                value={searchCertNo}
                onChange={(e) => setSearchCertNo(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Input
                placeholder={tc('materialName')}
                value={searchMaterial}
                onChange={(e) => setSearchMaterial(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Select
                value={searchCertType}
                onValueChange={(v) => setSearchCertType(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={t('certType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('all')}</SelectItem>
                  <SelectItem value="RoHS">RoHS</SelectItem>
                  <SelectItem value="REACH">REACH</SelectItem>
                  <SelectItem value="FDA">FDA</SelectItem>
                  <SelectItem value="EN71-3">EN71-3</SelectItem>
                  <SelectItem value={ts('k_dcd4ul')}>{tc('other')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={searchStatus}
                onValueChange={(v) => setSearchStatus(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('all')}</SelectItem>
                  <SelectItem value="1">{t('valid')}</SelectItem>
                  <SelectItem value="2">{t('pendingTest')}</SelectItem>
                  <SelectItem value="3">{t('expired')}</SelectItem>
                  <SelectItem value="0">{t('invalid')}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({
                  cert_type: 'RoHS',
                  test_result: 'PENDING',
                  test_org: 'SGS',
                  status: 2,
                  items: getDefaultItems('RoHS'),
                });
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addCert')}
            </Button>
            <GlobalExportToolbar
              filename={ts('k_l4lyhc')}
              title={ts('k_l4lyhc')}
              columns={[
                { key: 'cert_no', label: t('certNo'), width: 18 },
                { key: 'material_name', label: tc('materialName'), width: 20 },
                { key: 'supplier_name', label: tc('supplier'), width: 18 },
                { key: 'cert_type', label: t('certType'), width: 12 },
                { key: 'test_result', label: t('testResult'), width: 12 },
                { key: 'expire_date', label: t('validUntil'), width: 12 },
              ]}
              data={
                selectedRows.length > 0
                  ? list.filter((i) => selectedRows.some((sr) => sr.id === i.id))
                  : list
              }
            />
          </div>
        </div>

        <StatsCards
          configs={[
            { key: 'pending', label: '待检验', icon: Clock, ...StatsTheme.orange },
            { key: 'inspecting', label: '检验中', icon: FileSearch, ...StatsTheme.blue },
            { key: 'passed', label: '已通过', icon: CheckCircle, ...StatsTheme.green },
            { key: 'failed', label: '未通过', icon: XCircle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月检验次数', icon: FileCheck, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'inspecting', count: stats.inspecting },
            { key: 'passed', count: stats.passed },
            { key: 'failed', count: stats.failed },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />

        {warningData.total > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('sgsCertWarning', {
                    expired: warningData.expired.length,
                    expiring: warningData.expiring.length,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <StandardTable<Cert>
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
                { key: 'cert_no', title: t('certNo') },
                { key: 'material_name', title: tc('materialName') },
                { key: 'supplier_name', title: tc('supplier') },
                {
                  key: 'cert_type',
                  title: t('certType'),
                  render: (row) => <Badge variant="outline" className="text-xs">{displayCertType(row.cert_type)}</Badge>,
                },
                {
                  key: 'test_result',
                  title: t('testResult'),
                  render: (row) => (
                    <Badge variant={testResultMap[row.test_result]?.variant || 'outline'} className="text-xs">
                      {t(testResultMap[row.test_result]?.label || 'pendingTest')}
                    </Badge>
                  ),
                },
                { key: 'test_org', title: t('testOrg') },
                { key: 'issue_date', title: t('issueDate') },
                {
                  key: 'expire_date',
                  title: t('validUntil'),
                  render: (row) => (
                    <span
                      className={
                        isExpired(row.expire_date)
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : isExpiring(row.expire_date)
                            ? 'text-amber-600 dark:text-amber-400'
                            : ''
                      }
                    >
                      {row.expire_date || '-'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  title: tc('status'),
                  render: (row) => (
                    <Badge variant={statusMap[row.status]?.variant || 'outline'} className="text-xs">
                      {t(statusMap[row.status]?.label || tc('unknown'))}
                    </Badge>
                  ),
                },
                { key: 'item_count', title: t('testItems'), render: (row) => <>{row.item_count ?? 0} {t('items')}</> },
                {
                  key: 'actions',
                  title: tc('actions'),
                  width: 100,
                  render: (row) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          if (row.id) handleViewDetail(row.id);
                        }}
                      >
                        <FileCheck className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditItem(row);
                          setShowDialog(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
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
              emptyText={t('noSGSCertRecords')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? t('editSGSCert') : t('addSGSCert')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('certNo')}</Label>
                <Input
                  value={editItem.cert_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, cert_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('materialCode')}</Label>
                <Input
                  value={editItem.material_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, material_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('materialName')}</Label>
                <Input
                  value={editItem.material_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, material_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('supplierName')}</Label>
                <Input
                  value={editItem.supplier_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, supplier_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('certType')}</Label>
                <Select value={editItem.cert_type || 'RoHS'} onValueChange={handleCertTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RoHS">RoHS</SelectItem>
                    <SelectItem value="REACH">REACH</SelectItem>
                    <SelectItem value="FDA">FDA</SelectItem>
                    <SelectItem value="EN71-3">EN71-3</SelectItem>
                    <SelectItem value={ts('k_dcd4ul')}>{tc('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('testResult')}</Label>
                <Select
                  value={editItem.test_result || 'PENDING'}
                  onValueChange={(v) => setEditItem({ ...editItem, test_result: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">{tc('qualified')}</SelectItem>
                    <SelectItem value="FAIL">{tc('unqualified')}</SelectItem>
                    <SelectItem value="PENDING">{t('pendingTest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('testReportNo')}</Label>
                <Input
                  value={editItem.test_report_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_report_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('testOrg')}</Label>
                <Input
                  value={editItem.test_org || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_org: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <Select
                  value={String(editItem.status ?? 2)}
                  onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('valid')}</SelectItem>
                    <SelectItem value="2">{t('pendingTest')}</SelectItem>
                    <SelectItem value="0">{t('invalid')}</SelectItem>
                    <SelectItem value="3">{t('expired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('issueDate')}</Label>
                <Input
                  type="date"
                  value={editItem.issue_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('validUntil')}</Label>
                <Input
                  type="date"
                  value={editItem.expire_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, expire_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('certFile')}</Label>
                <Input
                  value={editItem.file_url || ''}
                  onChange={(e) => setEditItem({ ...editItem, file_url: e.target.value })}
                  placeholder={t('filePathOrURL')}
                />
              </div>
              <div className="col-span-3">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{t('testItemDetails')}</Label>
                <Button size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('addItem')}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-36">{t('testItem')}</TableHead>
                    <TableHead className="text-xs w-36">{t('testStandard')}</TableHead>
                    <TableHead className="text-xs w-20">{t('limitValue')}</TableHead>
                    <TableHead className="text-xs w-20">{t('testValue')}</TableHead>
                    <TableHead className="text-xs w-16">{tc('unit')}</TableHead>
                    <TableHead className="text-xs w-20">{tc('result')}</TableHead>
                    <TableHead className="text-xs w-12">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editItem.items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          value={item.test_item_name}
                          onChange={(e) => handleItemChange(idx, 'test_item_name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          value={item.test_standard}
                          onChange={(e) => handleItemChange(idx, 'test_standard', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          value={item.limit_value}
                          onChange={(e) => handleItemChange(idx, 'limit_value', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          value={item.test_value}
                          onChange={(e) => handleItemChange(idx, 'test_value', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.result}
                          onValueChange={(v) => handleItemChange(idx, 'result', v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PASS">PASS</SelectItem>
                            <SelectItem value="FAIL">FAIL</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!editItem.items || editItem.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-4 text-xs">
                        {t('noTestItemsHint')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>
                {t('sgsCertDetail')} - {detailItem?.cert_no}
              </DialogTitle>
            </DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">{tc('materialName')}：</span>
                    {detailItem.material_name || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('materialCode')}：</span>
                    {detailItem.material_code || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('supplier')}：</span>
                    {detailItem.supplier_name || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{t('certType')}：</span>
                    {displayCertType(detailItem.cert_type)}
                  </div>
                  <div>
                    <span className="text-gray-500">{t('testResult')}：</span>
                    <Badge
                      variant={testResultMap[detailItem.test_result]?.variant || 'outline'}
                      className="text-xs"
                    >
                      {t(testResultMap[detailItem.test_result]?.label || 'pendingTest')}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('testOrg')}：</span>
                    {detailItem.test_org || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{t('reportNo')}：</span>
                    {detailItem.test_report_no || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{t('issueDate')}：</span>
                    {detailItem.issue_date || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{t('validUntil')}：</span>
                    <span
                      className={
                        isExpired(detailItem.expire_date)
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : isExpiring(detailItem.expire_date)
                            ? 'text-amber-600 dark:text-amber-400'
                            : ''
                      }
                    >
                      {detailItem.expire_date || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('status')}：</span>
                    <Badge
                      variant={statusMap[detailItem.status]?.variant || 'outline'}
                      className="text-xs"
                    >
                      {t(statusMap[detailItem.status]?.label || tc('unknown'))}
                    </Badge>
                  </div>
                </div>
                {detailItem.remark && (
                  <div className="text-sm">
                    <span className="text-gray-500">{tc('remark')}：</span>
                    {detailItem.remark}
                  </div>
                )}

                {detailItem.items && detailItem.items.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t('testItemDetails')}</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t('testItem')}</TableHead>
                          <TableHead className="text-xs">{t('testStandard')}</TableHead>
                          <TableHead className="text-xs">{t('limitValue')}</TableHead>
                          <TableHead className="text-xs">{t('testValue')}</TableHead>
                          <TableHead className="text-xs">{tc('unit')}</TableHead>
                          <TableHead className="text-xs">{tc('result')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItem.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{item.test_item_name}</TableCell>
                            <TableCell className="text-xs">{item.test_standard}</TableCell>
                            <TableCell className="text-xs font-mono">{item.limit_value}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {item.test_value || '-'}
                            </TableCell>
                            <TableCell className="text-xs">{item.unit}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.result === 'PASS'
                                    ? 'default'
                                    : item.result === 'FAIL'
                                      ? 'destructive'
                                      : 'outline'
                                }
                                className="text-xs"
                              >
                                {item.result}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
