'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BankItem {
  employeeName: string;
  bankCardNo: string;
  netPay: number;
}

export default function BankReportPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [data, setData] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchData = async () => {
    setLoading(true);
    try {
      // 列表数据走 /api/hr/salary：原调用 /api/hr/salary/calculate?status=&month= 的 GET
      // 只接受 employeeId（status 被忽略），恒返回 400，曾导致页面永远展示 mockBankData 假数据。
      // 返回 { list, total, page, pageSize }，list 为 snake_case 原始行。
      const res = await authFetch(
        `/api/hr/salary?month=${encodeURIComponent(month)}&pageSize=500`
      );
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        // actual_salary 为 DECIMAL，mysql2 返回 string：必须 Number() 强转后才能累加/格式化
        const mapped: BankItem[] = list.map((item: Record<string, unknown>) => ({
          employeeName: String(item.name || item.employeeName || item.employee_name || '-'),
          bankCardNo: String(item.bank_account || item.bankCardNo || item.bank_card_no || '-'),
          netPay: Number(item.actual_salary ?? item.actualSalary ?? item.netPay ?? 0),
        }));
        setData(mapped);
      } else {
        setData([]);
        toast.error(json.message || tc('fetchFailed'));
      }
    } catch {
      setData([]);
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalAmount = data.reduce((s, item) => s + item.netPay, 0);

  const columns: StandardTableColumn<BankItem>[] = [
    { key: 'employeeName', title: t('employeeName'), render: (r) => <span className="font-medium">{r.employeeName}</span> },
    { key: 'bankCardNo', title: t('bankCardNo'), render: (r) => <span className="font-mono">{r.bankCardNo}</span> },
    { key: 'netPay', title: t('netPay'), align: 'right', render: (r) => <span className="font-medium">¥{r.netPay.toLocaleString()}</span> },
  ];

  const generateBankFile = () => {
    // 单元格加引号并转义内部引号：姓名/卡号含逗号时避免 CSV 列错位
    const cell = (v: string | number) => JSON.stringify(String(v));
    const header = [t('employeeName'), t('bankCardNo'), t('netPay')].map(cell);
    const rows = data.map((item) => [
      cell(item.employeeName),
      cell(item.bankCardNo),
      cell(item.netPay.toFixed(2)),
    ]);
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
            <FileText className="h-6 w-6 text-blue-500 dark:text-blue-400" />
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
              <Button onClick={fetchData}>{tc('query')}</Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <StandardTable<BankItem>
              columns={columns}
              dataSource={data}
              rowKey="employeeName"
              rowSelectable={false}
              loading={loading}
              showPagination={false}
              emptyText={loading ? tc('loading') : t('noData')}
            />
          </CardContent>
          {data.length > 0 && (
            <div className="flex justify-end gap-6 px-4 py-2 text-sm border-t bg-muted/50 font-bold">
              <span>{t('total')}：</span>
              <span className="text-lg">¥{totalAmount.toLocaleString()}</span>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
