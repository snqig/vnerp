'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useMemo } from 'react';
import { useEmployeeOptions, employeeLabel } from '@/hooks/useEmployeeOptions';
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
import { Plus, Search, Edit, Trash2, FlaskConical, CheckCircle, Clock, AlertTriangle, Calendar, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  buildQualityFormMessages,
  buildLabTestSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, StandardTableColumn } from '@/components/common';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface LabTestRecord {
  id?: number;
  test_no: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  batch_no: string;
  test_type: string;
  test_items: string;
  test_standard: string;
  test_equipment: string;
  tester: string;
  test_date: string;
  result_summary: string;
  detail_data: string;
  conclusion: string;
  status: number;
  remark: string;
  create_time: string;
}

const testTypeMap: Record<string, string> = {
  physical: 'physicalTest',
  chemical: 'chemicalTest',
  environmental: 'environmentalTest',
  color: 'colorTest',
  adhesion: 'adhesionTest',
  wear: 'wearTest',
  tensile: 'tensileTest',
  thickness: 'thicknessTest',
  other: 'otherTest',
};
const conclusionMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pass: { label: 'qualified', variant: 'default' },
  fail: { label: 'unqualified', variant: 'destructive' },
  conditional: { label: 'conditionalPass', variant: 'secondary' },
  pending: { label: 'pendingJudgment', variant: 'outline' },
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: 'pendingTest', variant: 'outline' },
  2: { label: 'testing', variant: 'secondary' },
  3: { label: 'completed', variant: 'default' },
};

export default function LabTestPage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<LabTestRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchType, setSearchType] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    testing: 0,
    completed: 0,
    failed: 0,
    monthlyCount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<LabTestRecord>>({});
  // 测试人下拉：库内在职真实人员（禁手输，回退见表单区）
  const employeeOptions = useEmployeeOptions();
  const [selectedRows, setSelectedRows] = useState<LabTestRecord[]>([]);
  const [pageSize] = useState(20);
  const sortedList = useMemo(() => list, [list]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        productName: searchProduct,
        testType: searchType,
      });
      const res = await authFetch('/api/quality/lab-test?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/lab-test/stats');
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
    const parsed = buildLabTestSchema(buildQualityFormMessages((k) => tc(k))).safeParse(editItem);
    if (!parsed.success) {
      toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
      return;
    }
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/quality/lab-test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
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
    if (!confirm(t('confirmDeleteTest'))) return;
    try {
      const res = await authFetch('/api/quality/lab-test?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout title={t('labTestManagement')}>
      <div className="p-6 space-y-6">        <StatsCards
          configs={[
            { key: 'pending', label: '待检测', icon: Clock, ...StatsTheme.orange },
            { key: 'testing', label: '检测中', icon: FlaskConical, ...StatsTheme.blue },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'failed', label: '不合格数', icon: XCircle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月检测数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'testing', count: stats.testing },
            { key: 'completed', count: stats.completed },
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
                    placeholder={tc('searchProductName')}
                    className="pl-8 w-60"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('testType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allTypes')}</SelectItem>
                    {Object.entries(testTypeMap).map(([k, v]) => (
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
                  setEditItem({ test_type: 'physical', conclusion: 'pending' });
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('newTest')}
              </Button>
              <GlobalExportToolbar
                filename={ts('k_owvau6')}
                title={ts('k_owvau6')}
                columns={[
                  { key: 'test_no', label: t('testNo'), width: 18 },
                  { key: 'product_name', label: tc('productName'), width: 20 },
                  { key: 'batch_no', label: tc('batchNo'), width: 15 },
                  { key: 'test_type', label: t('testType'), width: 12 },
                  { key: 'conclusion', label: t('conclusion'), width: 12 },
                  { key: 'status', label: tc('status'), width: 12 },
                ]}
                data={
                  selectedRows.length > 0
                    ? list.filter((i) => selectedRows.some((sr) => sr.id === i.id))
                    : list
                }
              />
            </div>

            <StandardTable<LabTestRecord>
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
                { key: 'test_no', title: t('testNo') },
                { key: 'product_name', title: tc('productName') },
                { key: 'batch_no', title: tc('batchNo'), render: (row) => row.batch_no || '-' },
                {
                  key: 'test_type',
                  title: t('testType'),
                  render: (row) => t(testTypeMap[row.test_type] || row.test_type),
                },
                { key: 'test_items', title: t('testItem'), render: (row) => <span className="max-w-32 truncate block">{row.test_items || '-'}</span> },
                { key: 'tester', title: t('tester'), render: (row) => row.tester || '-' },
                { key: 'test_date', title: t('testDate'), render: (row) => row.test_date?.substring(0, 10) || '-' },
                {
                  key: 'conclusion',
                  title: t('conclusion'),
                  render: (row) => (
                    <Badge variant={conclusionMap[row.conclusion]?.variant || 'outline'}>
                      {t(conclusionMap[row.conclusion]?.label || 'pendingJudgment')}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  title: tc('status'),
                  render: (row) => (
                    <Badge variant={statusMap[row.status]?.variant || 'outline'}>
                      {t(statusMap[row.status]?.label || tc('unknown'))}
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
                          setEditItem(row);
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
              <DialogTitle>{editItem.id ? t('editTestRecord') : t('newTestRecord')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{tc('productCode')}</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('productName')} *</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('batchNo')}</Label>
                <Input
                  value={editItem.batch_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, batch_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('testType')}</Label>
                <Select
                  value={editItem.test_type || 'physical'}
                  onValueChange={(v) => setEditItem({ ...editItem, test_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(testTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('testItem')}</Label>
                <Input
                  value={editItem.test_items || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_items: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('testStandard')}</Label>
                <Input
                  value={editItem.test_standard || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_standard: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('testEquipment')}</Label>
                <Input
                  value={editItem.test_equipment || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_equipment: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('tester')}</Label>
                {employeeOptions.length > 0 ? (
                  <Select
                    value={editItem.tester || ''}
                    onValueChange={(value) => setEditItem({ ...editItem, tester: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('tester')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map((emp) => (
                        <SelectItem key={emp.employee_no} value={emp.name}>
                          {employeeLabel(emp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editItem.tester || ''}
                    onChange={(e) => setEditItem({ ...editItem, tester: e.target.value })}
                  />
                )}
              </div>
              <div>
                <Label>{t('testDate')}</Label>
                <Input
                  type="date"
                  value={editItem.test_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('conclusion')}</Label>
                <Select
                  value={editItem.conclusion || 'pending'}
                  onValueChange={(v) => setEditItem({ ...editItem, conclusion: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conclusionMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {t(v.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{t('resultSummary')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.result_summary || ''}
                  onChange={(e) => setEditItem({ ...editItem, result_summary: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('detailDataJSON')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.detail_data || ''}
                  onChange={(e) => setEditItem({ ...editItem, detail_data: e.target.value })}
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
