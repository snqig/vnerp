'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface PieceWorkRecord {
  id: number;
  date: string;
  employeeName: string;
  processCode: string;
  productCode: string;
  quantity: number;
  defectCount: number;
  passRate: number;
  unitPrice: number;
  amount: number;
  machineId: string;
}

export default function PieceWorkPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [records, setRecords] = useState<PieceWorkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [processCode, setProcessCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (processCode) params.set('processCode', processCode);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await authFetch(`/api/hr/piece-work?${params.toString()}`);
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        setRecords(list);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const totalQuantity = records.reduce((s, r) => s + Number(r.quantity), 0);
  const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <MainLayout title={t('pieceWork')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">{t('pieceWork')}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{'员工姓名'}</Label>
                <Input className="w-32 h-8 text-sm" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{'工序代码'}</Label>
                <Input className="w-32 h-8 text-sm" value={processCode} onChange={(e) => setProcessCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('startDate')}</Label>
                <Input type="date" className="w-36 h-8 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('endDate')}</Label>
                <Input type="date" className="w-36 h-8 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button size="sm" onClick={fetchRecords}>
                <Search className="h-3 w-3 mr-1" />{tc('search')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{'日期'}</TableHead>
                  <TableHead className="text-xs">{'员工姓名'}</TableHead>
                  <TableHead className="text-xs">{'工序代码'}</TableHead>
                  <TableHead className="text-xs">{'产品编码'}</TableHead>
                  <TableHead className="text-xs">{'机台号'}</TableHead>
                  <TableHead className="text-xs text-right">{'数量'}</TableHead>
                  <TableHead className="text-xs text-right">{'次品数'}</TableHead>
                  <TableHead className="text-xs text-right">{'合格率'}</TableHead>
                  <TableHead className="text-xs text-right">{'单价'}</TableHead>
                  <TableHead className="text-xs text-right">{'金额'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell className="text-xs font-medium">{r.employeeName}</TableCell>
                    <TableCell className="text-xs font-mono">{r.processCode}</TableCell>
                    <TableCell className="text-xs">{r.productCode}</TableCell>
                    <TableCell className="text-xs">{r.machineId || '-'}</TableCell>
                    <TableCell className="text-xs text-right">{r.quantity}</TableCell>
                    <TableCell className="text-xs text-right text-red-500 dark:text-red-400">{r.defectCount}</TableCell>
                    <TableCell className="text-xs text-right">{r.passRate}%</TableCell>
                    <TableCell className="text-xs text-right font-mono">¥{Number(r.unitPrice).toFixed(4)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">¥{Number(r.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {records.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={5} className="text-xs text-right">{tc('total')}</TableCell>
                    <TableCell className="text-xs text-right">{totalQuantity}</TableCell>
                    <TableCell className="text-xs"></TableCell>
                    <TableCell className="text-xs"></TableCell>
                    <TableCell className="text-xs text-right">¥{totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                      {loading ? tc('loading') : tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
