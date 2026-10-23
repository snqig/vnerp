'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Plus, Search, Edit, Trash2, AlertTriangle, Award, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface Certificate {
  id: number;
  employee_id: number;
  employee_name: string;
  cert_name: string;
  cert_code: string;
  cert_type: string;
  issue_authority: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  remind_days: number;
  file_url: string;
  remark: string;
}

const certTypeMap: Record<string, string> = {
  '职业资格证': 'certTypeQualification',
  '安全证书': 'certTypeSafety',
  '技能等级证': 'certTypeSkill',
  '体系认证': 'certTypeSystem',
};

const certTypeOptions = [
  { value: 'all', label: 'allTypes' },
  { value: '职业资格证', label: 'certTypeQualification' },
  { value: '安全证书', label: 'certTypeSafety' },
  { value: '技能等级证', label: 'certTypeSkill' },
  { value: '体系认证', label: 'certTypeSystem' },
];

const statusOptions = [
  { value: 'all', label: 'allStatus' },
  { value: '1', label: 'valid' },
  { value: '0', label: 'expired' },
];


const getDaysUntilExpiry = (expiryDate: string) => {
  if (!expiryDate) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export default function CertificatesPage() {
  const ts = useTranslations('Common');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [list, setList] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [employeeId, setEmployeeId] = useState('');
  const [certType, setCertType] = useState('all');
  const [status, setStatus] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Certificate>>({});
  const [detailItem, setDetailItem] = useState<Certificate | null>(null);

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState<{id: number; name: string; employee_no: string}[]>([]);

  const handleBatchDelete = async () => {
    const ids = selectedRows;
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/hr/certificates?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    fetchData();
  };

  const t = useTranslations('Hr');

  // 加载员工列表
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await authFetch('/api/organization/employee?pageSize=1000');
        const json = await res.json();
        if (json.code === 200) {
          setEmployees(json.data.list || []);
        }
      } catch {
        // 忽略错误
      }
    };
    fetchEmployees();
  }, []);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (employeeId) params.append('employeeId', employeeId);
      if (certType && certType !== 'all') params.append('certType', certType);
      if (status && status !== 'all') params.append('status', status);

      const res = await authFetch(`/api/hr/certificates?${params}`);
      const json = await res.json();
      if (json.code === 200) {
        setList(json.data.list || []);
        setTotal(json.data.total || 0);
      } else {
        toast({ title: tc('error'), description: json.message || tc('fetchFailed'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({ title: tc('error'), description: tc('fetchFailed'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const isEdit = !!editItem.id;
      const res = await authFetch('/api/hr/certificates', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(editItem),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast({ title: tc('success'), description: isEdit ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: json.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/hr/certificates?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast({ title: tc('success'), description: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: json.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleRowClick = (item: Certificate) => {
    setDetailItem(item);
    setShowDetail(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns: StandardTableColumn<Certificate>[] = [
    { key: 'employee_name', title: '员工姓名', render: (row) => row.employee_name || '-' },
    { key: 'cert_name', title: t('certName'), render: (row) => <span className="font-medium">{row.cert_name}</span> },
    { key: 'cert_code', title: t('certCode'), render: (row) => <span className="font-mono">{row.cert_code}</span> },
    { key: 'cert_type', title: t('certType'), render: (row) => row.cert_type || '-' },
    { key: 'issue_authority', title: t('issueAuthority'), render: (row) => row.issue_authority || '-' },
    { key: 'issue_date', title: t('issueDate'), render: (row) => formatDate(row.issue_date) },
    { key: 'expiry_date', title: t('expiryDate'), render: (row) => formatDate(row.expiry_date) },
    {
      key: 'status',
      title: tc('status'),
      render: (row) =>
        Number(row.status) === 1 ? (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs border-0">{tc('active')}</Badge>
        ) : (
          <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs border-0">{tc('expired')}</Badge>
        ),
    },
    {
      key: 'remind_days',
      title: t('remindDays'),
      render: (row) => {
        const daysLeft = getDaysUntilExpiry(row.expiry_date);
        const isExpiring = daysLeft <= 30 && daysLeft > 0;
        return isExpiring ? (
          <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs border-0 whitespace-nowrap">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {daysLeft}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: 'actions',
      title: tc('operation'),
      align: 'right',
      width: 100,
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleRowClick(row)}>
            <Eye className="h-3 w-3" />
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
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout title={t('certificateManage')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('certificateManage')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={employeeId || 'all'}
                onValueChange={(v) => setEmployeeId(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder={t('selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts('all')}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.employee_no} {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={certType} onValueChange={setCertType}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={t('certType')} />
                </SelectTrigger>
                <SelectContent>
                  {certTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tc('add')}
            </Button>
          </div>
        </div>

        
        {/* 统计卡片 */}
        <StatsCards
          configs={[
            { key: 'total', label: '证书总数', icon: Award, ...StatsTheme.blue },
            { key: 'valid', label: t('valid'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'expiring', label: '即将到期', icon: Clock, ...StatsTheme.orange },
            { key: 'expired', label: '已过期', icon: XCircle, ...StatsTheme.red }
          ]}
          stats={[ 
            { key: 'total', count: total }, 
            { key: 'valid', count: list.filter(item => Number(item.status) === 1).length }, 
            { key: 'expiring', count: list.filter(item => getDaysUntilExpiry(item.expiry_date) <= 30 && getDaysUntilExpiry(item.expiry_date) > 0).length }, 
            { key: 'expired', count: list.filter(item => Number(item.status) === 0).length } 
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />
<Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable<Certificate>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              showPagination={totalPages > 1}
              onPageChange={setPage}
              rowSelectable
              selectedRows={list.filter((r) => selectedRows.includes(r.id))}
              onRowSelectedChange={(rows) => setSelectedRows(rows.map((r) => r.id))}
              rowKey="id"
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? tc('edit') : tc('add')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('employeeName')}</Label>
                <Select
                  value={String(editItem.employee_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, employee_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.employee_no} {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('certName')}</Label>
                <Input
                  value={editItem.cert_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, cert_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('certCode')}</Label>
                <Input
                  value={editItem.cert_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, cert_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('certType')}</Label>
                <Select
                  value={editItem.cert_type || ''}
                  onValueChange={(v) => setEditItem({ ...editItem, cert_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operation">{t('certTypeOperation')}</SelectItem>
                    <SelectItem value="safety">{t('certTypeSafety')}</SelectItem>
                    <SelectItem value="quality">{t('certTypeQuality')}</SelectItem>
                    <SelectItem value="skill">{t('certTypeSkill')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('issueAuthority')}</Label>
                <Input
                  value={editItem.issue_authority || ''}
                  onChange={(e) => setEditItem({ ...editItem, issue_authority: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('remindDays')}</Label>
                <Input
                  type="number"
                  value={editItem.remind_days ?? 30}
                  onChange={(e) => setEditItem({ ...editItem, remind_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('issueDate')}</Label>
                <Input
                  type="date"
                  value={editItem.issue_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('expiryDate')}</Label>
                <Input
                  type="date"
                  value={editItem.expiry_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t('attachmentUrl')}</Label>
                <Input
                  value={editItem.file_url || ''}
                  onChange={(e) => setEditItem({ ...editItem, file_url: e.target.value })}
                  placeholder={t('urlPlaceholder')}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                  rows={3}
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

        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{tc('detail')}</DialogTitle>
              <DialogDescription>{tc('view')}</DialogDescription>
            </DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('certName')}：</span>
                    <span className="font-medium">{detailItem.cert_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('certCode')}：</span>
                    <span className="font-mono">{detailItem.cert_code}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('employeeName')}：</span>
                    <span>{detailItem.employee_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('certType')}：</span>
                    <span>{certTypeMap[detailItem.cert_type] || detailItem.cert_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('issueAuthority')}：</span>
                    <span>{detailItem.issue_authority || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('issueDate')}：</span>
                    <span>{formatDate(detailItem.issue_date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('expiryDate')}：</span>
                    <span>{formatDate(detailItem.expiry_date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('remindDays')}：</span>
                    <span>{detailItem.remind_days || 30}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('status')}：</span>
                    {Number(detailItem.status) === 1 ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs border-0">{tc('active')}</Badge>
                    ) : (
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs border-0">{tc('expired')}</Badge>
                    )}
                  </div>
                </div>
                {detailItem.remark && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{tc('remark')}：</span>
                    <p className="mt-1 bg-muted p-2 rounded text-sm">{detailItem.remark}</p>
                  </div>
                )}
                {detailItem.file_url && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{ts('k_17kj27z')}</span>
                    <a
                      href={detailItem.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline ml-2"
                    >
                      {tc('view')}
                    </a>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
