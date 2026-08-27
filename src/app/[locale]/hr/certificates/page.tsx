'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
  operation: 'certTypeOperation',
  safety: 'certTypeSafety',
  quality: 'certTypeQuality',
  skill: 'certTypeSkill',
};

const certTypeOptions = [
  { value: 'all', label: 'allTypes' },
  { value: 'operation', label: 'certTypeOperation' },
  { value: 'safety', label: 'certTypeSafety' },
  { value: 'quality', label: 'certTypeQuality' },
  { value: 'skill', label: 'certTypeSkill' },
];

const statusOptions = [
  { value: 'all', label: 'allStatus' },
  { value: 'active', label: 'valid' },
  { value: 'expired', label: 'expired' },
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
};

const getDaysUntilExpiry = (expiryDate: string) => {
  if (!expiryDate) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export default function CertificatesPage() {
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

  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (employeeId) params.append('employeeId', employeeId);
      if (certType) params.append('certType', certType);
      if (status) params.append('status', status);

      const res = await authFetch(`/api/hr/certificates?${params}`);
      const json = await res.json();
      if (json.code === 200) {
        setList(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      toast.error(tc('fetchFailed'));
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
        toast.success(isEdit ? tc('updateSuccess') : tc('createSuccess'));
        setShowDialog(false);
        fetchData();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/hr/certificates?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(tc('deleteSuccess'));
        fetchData();
      } else {
        toast.error(json.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const handleRowClick = (item: Certificate) => {
    setDetailItem(item);
    setShowDetail(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MainLayout title={t('certificateManage')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('certificateManage')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="员工ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-28 h-8 text-sm"
              />
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('certName')}</TableHead>
                  <TableHead className="text-xs">{t('certCode')}</TableHead>
                  <TableHead className="text-xs">{t('certType')}</TableHead>
                  <TableHead className="text-xs">{t('issueAuthority')}</TableHead>
                  <TableHead className="text-xs">{t('issueDate')}</TableHead>
                  <TableHead className="text-xs">{t('expiryDate')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{t('remindDays')}</TableHead>
                  <TableHead className="text-xs w-20">{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiry_date);
                  const isExpiring = daysLeft <= 30 && daysLeft > 0;
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell className="text-xs font-medium">{item.cert_name}</TableCell>
                      <TableCell className="text-xs font-mono">{item.cert_code}</TableCell>
                      <TableCell className="text-xs">
                        {t(certTypeMap[item.cert_type] || item.cert_type)}
                      </TableCell>
                      <TableCell className="text-xs">{item.issue_authority || '-'}</TableCell>
                      <TableCell className="text-xs">{formatDate(item.issue_date)}</TableCell>
                      <TableCell className="text-xs">{formatDate(item.expiry_date)}</TableCell>
                      <TableCell className="text-xs">
                        {item.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700 text-xs border-0">{tc('active')}</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-xs border-0">{tc('expired')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isExpiring ? (
                          <Badge className="bg-red-100 text-red-700 text-xs border-0 whitespace-nowrap">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysLeft}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
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
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('totalRecords', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}
            </Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">
              {page} / {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? tc('edit') : tc('add')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('employeeNo')}</Label>
                <Input
                  type="number"
                  value={editItem.employee_id || ''}
                  onChange={(e) => setEditItem({ ...editItem, employee_id: Number(e.target.value) })}
                />
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
                    {detailItem.status === 'active' ? (
                      <Badge className="bg-green-100 text-green-700 text-xs border-0">{tc('active')}</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 text-xs border-0">{tc('expired')}</Badge>
                    )}
                  </div>
                </div>
                {detailItem.remark && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{tc('remark')}：</span>
                    <p className="mt-1 bg-gray-50 p-2 rounded text-sm">{detailItem.remark}</p>
                  </div>
                )}
                {detailItem.file_url && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">附件：</span>
                    <a
                      href={detailItem.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline ml-2"
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
