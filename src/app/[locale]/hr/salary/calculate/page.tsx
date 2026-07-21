'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Calculator, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';

interface SalaryResult {
  employeeId: number;
  employeeName: string;
  month: string;
  baseSalary: number;
  pieceSalary: number;
  overtimeSalary: number;
  performanceSalary: number;
  allowances: number;
  socialInsurancePersonal: number;
  housingFundPersonal: number;
  individualTax: number;
  attendanceDeduction: number;
  otherDeduction: number;
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  status: string;
}

export default function SalaryCalculatePage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [employeeId, setEmployeeId] = useState('');
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<SalaryResult[]>([]);

  useEffect(() => {

  useEffect(() => {
    // initialized - month defaults
  }, []);

  const handleCalculate = async () => {
    if (!employeeId || !month) { toast.error(t('fillEmployeeIdAndMonth')); return; }
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/salary/calculate', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId), month }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setResult(json.data);
        toast.success(t('calculationCompleted'));
      } else {
        toast.error(json.message || t('calculationFailed'));
      }
    } catch (error) {
      toast.error(t('calculationRequestFailed'));
    }
    setLoading(false);
  };

  const handleBatchCalculate = async () => {
    if (!month) { toast.error(t('selectMonth')); return; }
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/salary/calculate', {
        method: 'PUT',
        body: JSON.stringify({ employeeIds: [], month }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setBatchResults(json.data.results || []);
        toast.success(t('batchCalculationCompleted', { count: json.data.succeeded }));
      } else {
        toast.error(json.message || t('batchCalculationFailed'));
      }
    } catch (error) {
      toast.error(t('batchCalculationRequestFailed'));
    }
    setLoading(false);
  };

  const SalaryDetailCard = ({ data }: { data: SalaryResult }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{data.employeeName} - {data.month}</span>
          <Badge variant={data.status === 'confirmed' ? 'default' : 'secondary'}>
            {data.status === 'confirmed' ? t('confirmed') : t('draft')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('grossPay')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span>{t('baseSalary')}</span><span>{data.baseSalary.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('pieceSalary')}</span><span>{data.pieceSalary.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('overtimeSalary')}</span><span>{data.overtimeSalary.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('performanceBonus')}</span><span>{data.performanceSalary.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('allowances')}</span><span>{data.allowances.toFixed(2)}</span></div>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-bold">
            <span>{t('grossPayTotal')}</span><span className="text-green-600">{data.grossPay.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('deductions')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span>{t('socialInsurancePersonal')}</span><span>{data.socialInsurancePersonal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('housingFundPersonal')}</span><span>{data.housingFundPersonal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('individualTax')}</span><span>{data.individualTax.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('attendanceDeduction')}</span><span>{data.attendanceDeduction.toFixed(2)}</span></div>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-bold">
            <span>{t('deductionTotal')}</span><span className="text-red-600">{data.totalDeduction.toFixed(2)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>{t('netPay')}</span><span className="text-blue-600">{data.netPay.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">{t('salaryCalculation')}</h1>
        </div>

        {/* 计算控件 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setBatchMode(!batchMode)}>
                {batchMode ? t('batchMode') : t('singleMode')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-4">
            <div className="space-y-1">
              <Label>{t('calculationMonth')}</Label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            {!batchMode && (
              <div className="space-y-1">
                <Label>{t('employeeId')}</Label>
                <Input
                  type="number"
                  placeholder={t('enterEmployeeId')}
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                />
              </div>
            )}
            <Button
              onClick={batchMode ? handleBatchCalculate : handleCalculate}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
              {loading ? t('calculating') : t('executeCalculation')}
            </Button>
          </CardContent>
        </Card>

        {/* 单员工结果 */}
        {result && !batchMode && <SalaryDetailCard data={result} />}

        {/* 批量结果 */}
        {batchResults.length > 0 && batchMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {t('batchCalculationResults', { count: batchResults.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('employee')}</TableHead>
                    <TableHead>{t('baseSalary')}</TableHead>
                    <TableHead>{t('pieceSalary')}</TableHead>
                    <TableHead>{t('grossPayTotal')}</TableHead>
                    <TableHead>{t('deductionTotal')}</TableHead>
                    <TableHead className="font-bold">{t('netPay')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchResults.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.baseSalary.toFixed(2)}</TableCell>
                      <TableCell>{r.pieceSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">{r.grossPay.toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">{r.totalDeduction.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-blue-600">{r.netPay.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>
                          {r.status === 'confirmed' ? t('confirmed') : t('draft')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
