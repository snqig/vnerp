'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BankItem {
  employeeName: string;
  bankCardNo: string;
  netPay: number;
}

const mockBankData: BankItem[] = [
  { employeeName: '张三', bankCardNo: '6222****1234', netPay: 10800 },
  { employeeName: '李四', bankCardNo: '6222****5678', netPay: 6700 },
  { employeeName: '王五', bankCardNo: '6222****9012', netPay: 6890 },
  { employeeName: '赵六', bankCardNo: '6222****3456', netPay: 13300 },
  { employeeName: '孙七', bankCardNo: '6222****7890', netPay: 13420 },
  { employeeName: '周八', bankCardNo: '6222****2345', netPay: 7470 },
];

export default function BankReportPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [data, setData] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('confirmed');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/salary/calculate?status=${statusFilter}&month=${month}`);
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        const mapped = list.map((item: Record<string, unknown>) => ({
          employeeName: item.employeeName || item.employee_name || item.name,
          bankCardNo: item.bankCardNo || item.bank_card_no || item.bankCard || '-',
          netPay: item.netPay ?? item.actualSalary ?? item.actual_salary ?? item.netPay ?? 0,
        }));
        setData(mapped);
      } else {
        setData(mockBankData);
      }
    } catch {
      setData(mockBankData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalAmount = data.reduce((s, item) => s + item.netPay, 0);

  const generateBankFile = () => {
    const header = [t('employeeName'), t('bankCardNo'), t('netPay')];
    const rows = data.map((item) => [item.employeeName, item.bankCardNo, item.netPay.toFixed(2)]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${t('bankReport')}_${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('bankFileGenerated'));
  };

  return (
    <MainLayout title={t('bankReport')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('bankReport')}</h1>
          </div>
          <Button onClick={generateBankFile} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            {t('generateBankFile')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t('month')}</Label>
                <Input
                  type="month"
                  className="w-40"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tc('status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchData}>{tc('query')}</Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('employeeName')}</TableHead>
                  <TableHead>{t('bankCardNo')}</TableHead>
                  <TableHead className="text-right">{t('netPay')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.employeeName}</TableCell>
                    <TableCell className="font-mono">{item.bankCardNo}</TableCell>
                    <TableCell className="text-right font-medium">
                      ¥{item.netPay.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-right">
                      {tc('total')}
                    </TableCell>
                    <TableCell className="text-right text-lg">
                      ¥{totalAmount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {loading ? tc('loading') : t('noData')}
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
