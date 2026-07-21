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
import { Badge } from '@/components/ui/badge';
import { Search, Upload, Package } from 'lucide-react';
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
}

const mockRecords: PieceWorkRecord[] = [
  { id: 1, date: '2024-03-01', employeeName: '张三', processCode: 'P001', productCode: 'PRD-001', quantity: 100, defectCount: 2, passRate: 98, unitPrice: 5, amount: 490 },
  { id: 2, date: '2024-03-01', employeeName: '李四', processCode: 'P002', productCode: 'PRD-002', quantity: 80, defectCount: 1, passRate: 98.75, unitPrice: 8, amount: 632 },
  { id: 3, date: '2024-03-02', employeeName: '王五', processCode: 'P001', productCode: 'PRD-001', quantity: 120, defectCount: 3, passRate: 97.5, unitPrice: 5, amount: 585 },
  { id: 4, date: '2024-03-02', employeeName: '张三', processCode: 'P003', productCode: 'PRD-003', quantity: 50, defectCount: 0, passRate: 100, unitPrice: 15, amount: 750 },
];

export default function PieceWorkPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

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
        setRecords(mockRecords);
      }
    } catch {
      setRecords(mockRecords);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const totalQuantity = records.reduce((s, r) => s + r.quantity, 0);
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);

  return (
    <MainLayout title={t('pieceWork') || '计件产量'}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('pieceWork') || '计件产量'}</h1>
          </div>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />{t('importCsv') || '导入CSV'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t('employeeId') || '员工ID'}</Label>
                <Input className="w-32" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('processCode') || '工序编号'}</Label>
                <Input className="w-32" value={processCode} onChange={(e) => setProcessCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('startDate') || '开始日期'}</Label>
                <Input type="date" className="w-36" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('endDate') || '结束日期'}</Label>
                <Input type="date" className="w-36" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button onClick={fetchRecords}>
                <Search className="h-4 w-4 mr-2" />{tc('search')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date') || '日期'}</TableHead>
                  <TableHead>{t('employeeName') || '员工'}</TableHead>
                  <TableHead>{t('processCode') || '工序编号'}</TableHead>
                  <TableHead>{t('productCode') || '产品编号'}</TableHead>
                  <TableHead className="text-right">{t('quantity') || '数量'}</TableHead>
                  <TableHead className="text-right">{t('defectCount') || '次品'}</TableHead>
                  <TableHead className="text-right">{t('passRate') || '合格率'}</TableHead>
                  <TableHead className="text-right">{t('unitPrice') || '单价'}</TableHead>
                  <TableHead className="text-right">{t('amount') || '金额'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell><Badge variant="outline">{r.processCode}</Badge></TableCell>
                    <TableCell>{r.productCode}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right text-red-500">{r.defectCount}</TableCell>
                    <TableCell className="text-right">{r.passRate}%</TableCell>
                    <TableCell className="text-right">¥{r.unitPrice}</TableCell>
                    <TableCell className="text-right font-medium">¥{r.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {records.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4} className="text-right">{tc('total') || '合计'}</TableCell>
                    <TableCell className="text-right">{totalQuantity}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                    <TableCell className="text-right">¥{totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {loading ? (tc('loading') || '加载中...') : (t('noData') || '暂无数据')}
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
