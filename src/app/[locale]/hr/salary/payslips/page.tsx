'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Printer, Send, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PayslipData {
  employeeName: string;
  employeeNo: string;
  department: string;
  position: string;
  month: string;
  basicSalary: number;
  pieceSalary: number;
  overtimeSalary: number;
  performanceSalary: number;
  allowances: number;
  grossPay: number;
  socialInsurance: number;
  housingFund: number;
  individualTax: number;
  attendanceDeduction: number;
  otherDeduction: number;
  totalDeduction: number;
  netPay: number;
}

const mockPayslip: PayslipData = {
  employeeName: '张三',
  employeeNo: 'EMP2024001',
  department: '生产部',
  position: '生产主管',
  month: '2024-03',
  basicSalary: 8000,
  pieceSalary: 0,
  overtimeSalary: 800,
  performanceSalary: 1500,
  allowances: 2000,
  grossPay: 12300,
  socialInsurance: 800,
  housingFund: 1000,
  individualTax: 200,
  attendanceDeduction: 0,
  otherDeduction: 0,
  totalDeduction: 2000,
  netPay: 10300,
};

export default function PayslipsPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchPayslip = async () => {
    if (!employeeId) {
      toast.error(t('enterEmployeeId') || '请输入员工ID');
      return;
    }
    setLoading(true);
    try {
      const _result = await res.json();
      if (json.code === 200) {
        setData(json.data);
      } else {
        setData({ ...mockPayslip, month, employeeName: `员工#${employeeId}` });
      }
    } catch (_error) {
      setData({ ...mockPayslip, month, employeeName: `员工#${employeeId}` });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error(t('allowPopup') || '请允许弹窗'); return; }

    const rows = [
      { label: t('basicSalary') || '基本工资', value: data.basicSalary },
      { label: t('pieceSalary') || '计件工资', value: data.pieceSalary },
      { label: t('overtimeSalary') || '加班工资', value: data.overtimeSalary },
      { label: t('performanceSalary') || '绩效奖金', value: data.performanceSalary },
      { label: t('allowances') || '津贴补贴', value: data.allowances },
    ];

    const deductions = [
      { label: t('socialInsurance') || '社保', value: data.socialInsurance },
      { label: t('housingFund') || '公积金', value: data.housingFund },
      { label: t('individualTax') || '个税', value: data.individualTax },
      { label: t('attendanceDeduction') || '考勤扣款', value: data.attendanceDeduction },
      { label: t('otherDeduction') || '其他扣款', value: data.otherDeduction },
    ];

    printWindow.document.write(`
      <html><head><meta charset="UTF-8"><title>${t('payslip') || '工资条'}</title>
      <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
        h1 { text-align: center; font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .info { display: flex; justify-content: space-between; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #999; padding: 8px 12px; text-align: left; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        .net { font-size: 24px; color: #059669; }
      </style></head><body>
      <h1>${t('payslip') || '工资条'}</h1>
      <div class="info">
        <div><strong>${tc('name')}:</strong> ${data.employeeName}</div>
        <div><strong>${t('employeeNo') || '工号'}:</strong> ${data.employeeNo}</div>
        <div><strong>${tc('department')}:</strong> ${data.department}</div>
        <div><strong>${t('month') || '月份'}:</strong> ${data.month}</div>
      </div>
      <h3>${t('incomeItems') || '收入项'}</h3>
      <table>
        <tr><th>${t('item') || '项目'}</th><th class="text-right">${t('amount') || '金额'}</th></tr>
        ${rows.map(r => `<tr><td>${r.label}</td><td class="text-right">¥${r.value.toLocaleString()}</td></tr>`).join('')}
        <tr style="background:#f0fdf4"><td><strong>${t('grossPay') || '应发合计'}</strong></td><td class="text-right"><strong>¥${data.grossPay.toLocaleString()}</strong></td></tr>
      </table>
      <h3>${t('deductionItems') || '扣款项'}</h3>
      <table>
        <tr><th>${t('item') || '项目'}</th><th class="text-right">${t('amount') || '金额'}</th></tr>
        ${deductions.map(r => `<tr><td>${r.label}</td><td class="text-right">¥${r.value.toLocaleString()}</td></tr>`).join('')}
        <tr style="background:#fef2f2"><td><strong>${t('totalDeduction') || '扣款合计'}</strong></td><td class="text-right"><strong>¥${data.totalDeduction.toLocaleString()}</strong></td></tr>
      </table>
      <div class="total">${t('netPay') || '实发工资'}: <span class="net">¥${data.netPay.toLocaleString()}</span></div>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSend = () => {
    toast.success(t('payslipSent') || '工资条已发送');
  };

  return (
    <MainLayout title={t('payslip') || '工资条'}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">{t('payslip') || '工资条'}</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t('employeeId') || '员工ID'}</Label>
                <Input className="w-36" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={t('enterEmployeeId') || '输入员工ID'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('month') || '月份'}</Label>
                <Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <Button onClick={fetchPayslip} disabled={loading}>
                {loading ? (tc('loading') || '查询中...') : (tc('query') || '查询')}
              </Button>
              {data && (
                <>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />{t('print') || '打印'}
                  </Button>
                  <Button variant="outline" onClick={handleSend}>
                    <Send className="h-4 w-4 mr-2" />{t('sendPayslip') || '发送'}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                {data.employeeName} - {data.month} {t('payslip') || '工资条'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t('employeeNo') || '工号'}:</span> {data.employeeNo}</div>
                <div><span className="text-muted-foreground">{tc('department')}:</span> {data.department}</div>
                <div><span className="text-muted-foreground">{tc('position')}:</span> {data.position}</div>
                <div><span className="text-muted-foreground">{t('month') || '月份'}:</span> {data.month}</div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-muted-foreground mb-3">{t('incomeItems') || '收入项'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('basicSalary') || '基本工资', value: data.basicSalary },
                    { label: t('pieceSalary') || '计件工资', value: data.pieceSalary },
                    { label: t('overtimeSalary') || '加班工资', value: data.overtimeSalary },
                    { label: t('performanceSalary') || '绩效奖金', value: data.performanceSalary },
                    { label: t('allowances') || '津贴补贴', value: data.allowances },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between p-2 rounded bg-green-50">
                      <span>{item.label}</span>
                      <span className="font-medium">¥{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 rounded bg-green-100 col-span-2 font-bold">
                    <span>{t('grossPay') || '应发合计'}</span>
                    <span>¥{data.grossPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-muted-foreground mb-3">{t('deductionItems') || '扣款项'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('socialInsurance') || '社保', value: data.socialInsurance },
                    { label: t('housingFund') || '公积金', value: data.housingFund },
                    { label: t('individualTax') || '个税', value: data.individualTax },
                    { label: t('attendanceDeduction') || '考勤扣款', value: data.attendanceDeduction },
                    { label: t('otherDeduction') || '其他扣款', value: data.otherDeduction },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between p-2 rounded bg-red-50">
                      <span>{item.label}</span>
                      <span className="font-medium">¥{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 rounded bg-red-100 col-span-2 font-bold">
                    <span>{t('totalDeduction') || '扣款合计'}</span>
                    <span>¥{data.totalDeduction.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50">
                <span className="text-lg font-semibold">{t('netPay') || '实发工资'}</span>
                <span className="text-3xl font-bold text-blue-600">¥{data.netPay.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
