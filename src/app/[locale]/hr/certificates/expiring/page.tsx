'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface ExpiringCert {
  id: number;
  employee_id: number;
  employee_name: string;
  cert_name: string;
  cert_code: string;
  expiry_date: string;
  days_remaining: number;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
};

const getExpiryBadge = (days: number) => {
  if (days < 15) {
    return <Badge className="bg-red-100 text-red-700 border-0 whitespace-nowrap font-bold">{days}</Badge>;
  }
  if (days < 30) {
    return <Badge className="bg-orange-100 text-orange-700 border-0 whitespace-nowrap">{days}</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-700 border-0 whitespace-nowrap">{days}</Badge>;
};

const getRowClass = (days: number) => {
  if (days < 15) return 'bg-red-50/50';
  if (days < 30) return 'bg-orange-50/30';
  return '';
};

export default function ExpiringCertificatesPage() {
  const [list, setList] = useState<ExpiringCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewItem, setRenewItem] = useState<ExpiringCert | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');

  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/hr/certificates/expiring?days=90');
      const json = await res.json();
      if (json.code === 200) {
        setList(json.data.list || []);
      }
    } catch {
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRenew = async () => {
    if (!renewItem || !newExpiryDate) {
      toast.error(tc('select'));
      return;
    }
    try {
      const res = await authFetch('/api/hr/certificates', {
        method: 'PUT',
        body: JSON.stringify({ id: renewItem.id, expiry_date: newExpiryDate }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(tc('success'));
        setShowRenewDialog(false);
        setRenewItem(null);
        setNewExpiryDate('');
        fetchData();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const openRenewDialog = (item: ExpiringCert) => {
    setRenewItem(item);
    setNewExpiryDate('');
    setShowRenewDialog(true);
  };

  const expiringCount = list.length;
  const criticalCount = list.filter((item) => item.days_remaining < 15).length;
  const warningCount = list.filter(
    (item) => item.days_remaining >= 15 && item.days_remaining < 30
  ).length;

  return (
    <MainLayout title={t('certExpiryAlert')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('certExpiryAlert')}</h1>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            {tc('refresh')}
          </Button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {t('expiringCert')}：<span className="font-bold">{expiringCount}</span>
            </p>
            <p className="text-sm text-red-600 mt-1">
              <span className="font-bold">{criticalCount}</span> {tc('critical')}，
              <span className="font-bold">{warningCount}</span> {tc('warning')}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                {tc('loading')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('employeeName')}</TableHead>
                    <TableHead className="text-xs">{t('certName')}</TableHead>
                    <TableHead className="text-xs">{t('certCode')}</TableHead>
                    <TableHead className="text-xs">{t('expiryDate')}</TableHead>
                    <TableHead className="text-xs">{t('daysUntilExpiry')}</TableHead>
                    <TableHead className="text-xs w-24">{tc('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item) => (
                    <TableRow key={item.id} className={getRowClass(item.days_remaining)}>
                      <TableCell className="text-xs font-medium">
                        {item.employee_name}
                      </TableCell>
                      <TableCell className="text-xs">{item.cert_name}</TableCell>
                      <TableCell className="text-xs font-mono">{item.cert_code}</TableCell>
                      <TableCell className="text-xs">
                        {formatDate(item.expiry_date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {getExpiryBadge(item.days_remaining)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openRenewDialog(item)}
                        >
                          {t('renew')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('renew')}</DialogTitle>
            </DialogHeader>
            {renewItem && (
              <div className="space-y-4">
                <div className="text-sm space-y-2 bg-gray-50 p-3 rounded">
                  <div>
                    <span className="text-muted-foreground">{t('certName')}：</span>
                    <span className="font-medium">{renewItem.cert_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('certCode')}：</span>
                    <span className="font-mono">{renewItem.cert_code}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('employeeName')}：</span>
                    <span>{renewItem.employee_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('expiryDate')}：</span>
                    <span className="text-red-600 font-medium">
                      {formatDate(renewItem.expiry_date)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('expiryDate')}</Label>
                  <Input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenewDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleRenew}>{t('renew')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
