'use client';

import { authFetch } from '@/lib/auth-fetch';
import { PAYMENT_METHOD_LABEL, RECEIVABLE_STATUS_LABEL, PAYABLE_STATUS_LABEL } from '@/lib/status-labels';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';

interface Receivable {
  id: number;
  receivable_no: string;
  source_type: number;
  source_no: string;
  customer_id: number;
  customer_name: string;
  amount: number;
  received_amount: number;
  balance: number;
  due_date: string;
  status: number;
  remark: string;
  create_time: string;
}

interface Payable {
  id: number;
  payable_no: string;
  source_type: number;
  source_no: string;
  supplier_id: number;
  supplier_name: string;
  amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: number;
  remark: string;
  create_time: string;
}

interface ReceiptRecord {
  id: number;
  receipt_no: string;
  receivable_id: number;
  customer_id: number;
  customer_name: string;
  amount: number;
  payment_method: string;
  receipt_date: string;
  remark: string;
  create_time: string;
}

interface PaymentRecord {
  id: number;
  payment_no: string;
  payable_id: number;
  supplier_id: number;
  supplier_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  remark: string;
  create_time: string;
}


const RECEIVABLE_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: RECEIVABLE_STATUS_LABEL[1], color: 'bg-yellow-100 text-yellow-800' },
  2: { label: RECEIVABLE_STATUS_LABEL[2], color: 'bg-blue-100 text-blue-800' },
  3: { label: RECEIVABLE_STATUS_LABEL[3], color: 'bg-green-100 text-green-800' },
};

const PAYABLE_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: PAYABLE_STATUS_LABEL[1], color: 'bg-yellow-100 text-yellow-800' },
  2: { label: PAYABLE_STATUS_LABEL[2], color: 'bg-blue-100 text-blue-800' },
  3: { label: PAYABLE_STATUS_LABEL[3], color: 'bg-green-100 text-green-800' },
};

const PAYMENT_METHODS = PAYMENT_METHOD_LABEL;

export default function FinancePage() {
  // 翻译钩子
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState('receivable');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [_loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);
  const [payableDialogOpen, setPayableDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailData, setDetailData] = useState<Loose>(null);
  const [detailType, setDetailType] = useState<'receivable' | 'payable'>('receivable');

  const [customers, setCustomers] = useState<Loose[]>([]);
  const [suppliers, setSuppliers] = useState<Loose[]>([]);

  const [receivableForm, setReceivableForm] = useState({
    customer_id: '',
    amount: '',
    source_no: '',
    due_date: '',
    remark: '',
  });
  const [payableForm, setPayableForm] = useState({
    supplier_id: '',
    amount: '',
    source_no: '',
    due_date: '',
    remark: '',
  });
  const [receiptForm, setReceiptForm] = useState({
    receivable_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    receipt_date: '',
    remark: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    payable_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: '',
    remark: '',
  });

  const [summary, setSummary] = useState({
    receivable: { total_amount: 0, total_received: 0, total_balance: 0, overdue_balance: 0 },
    payable: { total_amount: 0, total_paid: 0, total_balance: 0, overdue_balance: 0 },
  });

  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('pageSize', '50');
      const res = await authFetch(`/api/finance/receivable?${params}`);
      const data = await res.json();
      if (data.success) {
        setReceivables(data.data?.list || []);
        if (data.data?.summary) {
          setSummary((prev) => ({ ...prev, receivable: data.data.summary }));
        }
      }
    } catch (_e) {
      toast.error(tc('fetchReceivableListFailed'));
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  const fetchPayables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('pageSize', '50');
      const res = await authFetch(`/api/finance/payable?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayables(data.data?.list || []);
        if (data.data?.summary) {
          setSummary((prev) => ({ ...prev, payable: data.data.summary }));
        }
      }
    } catch (_e) {
      toast.error(tc('fetchPayableListFailed'));
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/finance/receipt?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setReceipts(data.data?.list || []);
      }
    } catch (_e) {
      toast.error(tc('fetchReceiptListFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/finance/payment?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setPayments(data.data?.list || []);
      }
    } catch (_e) {
      toast.error(tc('fetchPaymentListFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await authFetch('/api/customers?pageSize=100');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data?.list || data.data || []);
      }
    } catch (_e) {}
  };

  const fetchSuppliers = async () => {
    try {
      const res = await authFetch('/api/purchase/suppliers?pageSize=100');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data?.list || data.data || []);
      }
    } catch (_e) {}
  };

  useEffect(() => {
    fetchCustomers();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (activeTab === 'receivable') fetchReceivables();
    else if (activeTab === 'payable') fetchPayables();
    else if (activeTab === 'receipt') fetchReceipts();
    else if (activeTab === 'payment') fetchPayments();
  }, [activeTab, fetchReceivables, fetchPayables, fetchReceipts, fetchPayments]);

  const handleCreateReceivable = async () => {
    if (!receivableForm.customer_id || !receivableForm.amount) {
      toast.error(tc('fillCustomerAndAmount'));
      return;
    }
    try {
      const res = await authFetch('/api/finance/receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(receivableForm.customer_id),
          amount: parseFloat(receivableForm.amount),
          source_no: receivableForm.source_no || null,
          due_date: receivableForm.due_date || null,
          remark: receivableForm.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('receivableCreated'));
        setReceivableDialogOpen(false);
        setReceivableForm({ customer_id: '', amount: '', source_no: '', due_date: '', remark: '' });
        fetchReceivables();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (_e) {
      toast.error(tc('createReceivableFailed'));
    }
  };

  const handleCreatePayable = async () => {
    if (!payableForm.supplier_id || !payableForm.amount) {
      toast.error(tc('fillSupplierAndAmount'));
      return;
    }
    try {
      const res = await authFetch('/api/finance/payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: parseInt(payableForm.supplier_id),
          amount: parseFloat(payableForm.amount),
          source_no: payableForm.source_no || null,
          due_date: payableForm.due_date || null,
          remark: payableForm.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('payableCreated'));
        setPayableDialogOpen(false);
        setPayableForm({ supplier_id: '', amount: '', source_no: '', due_date: '', remark: '' });
        fetchPayables();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (_e) {
      toast.error(tc('createPayableFailed'));
    }
  };

  const handleCreateReceipt = async () => {
    if (!receiptForm.receivable_id || !receiptForm.amount) {
      toast.error(tc('selectReceivableAndAmount'));
      return;
    }
    try {
      const res = await authFetch('/api/finance/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivable_id: parseInt(receiptForm.receivable_id),
          amount: parseFloat(receiptForm.amount),
          payment_method: receiptForm.payment_method,
          receipt_date: receiptForm.receipt_date || null,
          remark: receiptForm.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('receiptCreated'));
        setReceiptDialogOpen(false);
        setReceiptForm({
          receivable_id: '',
          amount: '',
          payment_method: 'bank_transfer',
          receipt_date: '',
          remark: '',
        });
        fetchReceipts();
        fetchReceivables();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (_e) {
      toast.error(tc('createReceiptFailed'));
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.payable_id || !paymentForm.amount) {
      toast.error(tc('selectPayableAndAmount'));
      return;
    }
    try {
      const res = await authFetch('/api/finance/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payable_id: parseInt(paymentForm.payable_id),
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date || null,
          remark: paymentForm.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('paymentCreated'));
        setPaymentDialogOpen(false);
        setPaymentForm({
          payable_id: '',
          amount: '',
          payment_method: 'bank_transfer',
          payment_date: '',
          remark: '',
        });
        fetchPayments();
        fetchPayables();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (_e) {
      toast.error(tc('createPaymentFailed'));
    }
  };

  const handleDeleteReceivable = async (id: number) => {
    if (!confirm(tc('confirmDeleteReceivable'))) return;
    try {
      const res = await authFetch(`/api/finance/receivable?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('deleteSuccess'));
        fetchReceivables();
      } else {
        toast.error(data.message || tc('deleteFailed'));
      }
    } catch (_e) {
      toast.error('删除失败');
    }
  };

  const handleDeletePayable = async (id: number) => {
    if (!confirm(tc('confirmDeletePayable'))) return;
    try {
      const res = await authFetch(`/api/finance/payable?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(tc('deleteSuccess'));
        fetchPayables();
      } else {
        toast.error(data.message || tc('deleteFailed'));
      }
    } catch (_e) {
      toast.error('删除失败');
    }
  };

  const handleViewDetail = async (id: number, type: 'receivable' | 'payable') => {
    try {
      const url =
        type === 'receivable'
          ? `/api/finance/receivable?id=${id}`
          : `/api/finance/payable?id=${id}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setDetailData(data.data);
        setDetailType(type);
        setDetailDialogOpen(true);
      }
    } catch (_e) {
      toast.error(tc('fetchDetailFailed'));
    }
  };

  const formatAmount = (val: Loose) => {
    const num = parseFloat(val || 0);
    return isNaN(num)
      ? '0.00'
      : num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <MainLayout title={t('title')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalReceivable')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ¥{formatAmount(summary.receivable.total_amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tc('outstandingReceivableBalance')}
                {formatAmount(summary.receivable.total_balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalPayable')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ¥{formatAmount(summary.payable.total_amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tc('outstandingPayableBalance')}
                {formatAmount(summary.payable.total_balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tc('receivedAmount')}</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ¥{formatAmount(summary.receivable.total_received)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tc('overdueBalance')}
                {formatAmount(summary.receivable.overdue_balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tc('paidAmount')}</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ¥{formatAmount(summary.payable.total_paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tc('overdueBalance')}
                {formatAmount(summary.payable.overdue_balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="receivable">{tc('tabReceivable')}</TabsTrigger>
              <TabsTrigger value="payable">{tc('tabPayable')}</TabsTrigger>
              <TabsTrigger value="receipt">{tc('tabReceipt')}</TabsTrigger>
              <TabsTrigger value="payment">{tc('tabPayment')}</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tc('searchPlaceholder')}
                  className="pl-10"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (activeTab === 'receivable' ? fetchReceivables() : fetchPayables())
                  }
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={tc('statusFilterLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('allStatus')}</SelectItem>
                  {activeTab === 'receivable' || activeTab === 'receipt' ? (
                    <>
                      <SelectItem value="1">{t('notReceived')}</SelectItem>
                      <SelectItem value="2">{t('partialReceived')}</SelectItem>
                      <SelectItem value="3">{t('fullyReceived')}</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="1">{t('unpaid')}</SelectItem>
                      <SelectItem value="2">{t('partial')}</SelectItem>
                      <SelectItem value="3">{t('paid')}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  if (activeTab === 'receivable') {
                    fetchReceivables();
                  } else if (activeTab === 'payable') {
                    fetchPayables();
                  } else if (activeTab === 'receipt') {
                    fetchReceipts();
                  } else {
                    fetchPayments();
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc('refresh')}
              </Button>
              {activeTab === 'receivable' && (
                <Button onClick={() => setReceivableDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {tc('addReceivable')}
                </Button>
              )}
              {activeTab === 'payable' && (
                <Button onClick={() => setPayableDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {tc('addPayable')}
                </Button>
              )}
              {activeTab === 'receipt' && (
                <Button onClick={() => setReceiptDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {tc('addReceipt')}
                </Button>
              )}
              {activeTab === 'payment' && (
                <Button onClick={() => setPaymentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {tc('addPayment')}
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="receivable" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('receivableNoLabel')}</TableHead>
                      <TableHead>{tc('customer')}</TableHead>
                      <TableHead>{tc('sourceNo')}</TableHead>
                      <TableHead>{t('receivableAmount')}</TableHead>
                      <TableHead>{tc('receivedAmount')}</TableHead>
                      <TableHead>{tc('balance')}</TableHead>
                      <TableHead>{tc('dueDate')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {tc('noReceivableRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      receivables.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.receivable_no}</TableCell>
                          <TableCell>{r.customer_name || '-'}</TableCell>
                          <TableCell>{r.source_no || '-'}</TableCell>
                          <TableCell className="text-green-600">
                            ¥{formatAmount(r.amount)}
                          </TableCell>
                          <TableCell>¥{formatAmount(r.received_amount)}</TableCell>
                          <TableCell
                            className={Number(r.balance) > 0 ? 'text-red-600 font-medium' : ''}
                          >
                            ¥{formatAmount(r.balance)}
                          </TableCell>
                          <TableCell>{r.due_date || '-'}</TableCell>
                          <TableCell>
                            <Badge className={RECEIVABLE_STATUS[r.status]?.color || 'bg-gray-100'}>
                              {RECEIVABLE_STATUS[r.status]?.label || r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(r.id, 'receivable')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {r.status !== 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReceivable(r.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payable" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('payableNoLabel')}</TableHead>
                      <TableHead>{tc('supplier')}</TableHead>
                      <TableHead>{tc('sourceNo')}</TableHead>
                      <TableHead>{tc('amount')}</TableHead>
                      <TableHead>{tc('paidAmount')}</TableHead>
                      <TableHead>{tc('balance')}</TableHead>
                      <TableHead>{tc('dueDate')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {tc('noPayableRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payables.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.payable_no}</TableCell>
                          <TableCell>{p.supplier_name || '-'}</TableCell>
                          <TableCell>{p.source_no || '-'}</TableCell>
                          <TableCell className="text-red-600">¥{formatAmount(p.amount)}</TableCell>
                          <TableCell>¥{formatAmount(p.paid_amount)}</TableCell>
                          <TableCell
                            className={Number(p.balance) > 0 ? 'text-orange-600 font-medium' : ''}
                          >
                            ¥{formatAmount(p.balance)}
                          </TableCell>
                          <TableCell>{p.due_date || '-'}</TableCell>
                          <TableCell>
                            <Badge className={PAYABLE_STATUS[p.status]?.color || 'bg-gray-100'}>
                              {PAYABLE_STATUS[p.status]?.label || p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(p.id, 'payable')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {p.status !== 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePayable(p.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('receiptNo')}</TableHead>
                      <TableHead>{tc('customer')}</TableHead>
                      <TableHead>{tc('receiptAmount')}</TableHead>
                      <TableHead>{tc('paymentMethod')}</TableHead>
                      <TableHead>{tc('receiptDate')}</TableHead>
                      <TableHead>{tc('remark')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {tc('noReceiptRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.receipt_no}</TableCell>
                          <TableCell>{r.customer_name || '-'}</TableCell>
                          <TableCell className="text-green-600">
                            ¥{formatAmount(r.amount)}
                          </TableCell>
                          <TableCell>
                            {PAYMENT_METHODS[r.payment_method] || r.payment_method || '-'}
                          </TableCell>
                          <TableCell>{r.receipt_date || '-'}</TableCell>
                          <TableCell>{r.remark || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('paymentNo')}</TableHead>
                      <TableHead>{tc('supplier')}</TableHead>
                      <TableHead>{tc('paymentAmount')}</TableHead>
                      <TableHead>{tc('paymentMethod')}</TableHead>
                      <TableHead>{tc('paymentDate')}</TableHead>
                      <TableHead>{tc('remark')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          暂无付款记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.payment_no}</TableCell>
                          <TableCell>{p.supplier_name || '-'}</TableCell>
                          <TableCell className="text-red-600">¥{formatAmount(p.amount)}</TableCell>
                          <TableCell>
                            {PAYMENT_METHODS[p.payment_method] || p.payment_method || '-'}
                          </TableCell>
                          <TableCell>{p.payment_date || '-'}</TableCell>
                          <TableCell>{p.remark || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={receivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('newReceivableTitle')}</DialogTitle>
              <DialogDescription>{tc('newReceivableDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('customer')}</Label>
                <Select
                  value={receivableForm.customer_id}
                  onValueChange={(v) => setReceivableForm((prev) => ({ ...prev, customer_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectCustomer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: Loose) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receivableForm.amount}
                  onChange={(e) =>
                    setReceivableForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder={tc('enterAmount')}
                />
              </div>
              <div>
                <Label>{tc('sourceNo')}</Label>
                <Input
                  value={receivableForm.source_no}
                  onChange={(e) =>
                    setReceivableForm((prev) => ({ ...prev, source_no: e.target.value }))
                  }
                  placeholder={tc('sourceNoPlaceholder')}
                />
              </div>
              <div>
                <Label>{tc('dueDate')}</Label>
                <Input
                  type="date"
                  value={receivableForm.due_date}
                  onChange={(e) =>
                    setReceivableForm((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={receivableForm.remark}
                  onChange={(e) =>
                    setReceivableForm((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceivableDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCreateReceivable}>{tc('create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={payableDialogOpen} onOpenChange={setPayableDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('newPayableTitle')}</DialogTitle>
              <DialogDescription>{tc('newPayableDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('supplier')}</Label>
                <Select
                  value={payableForm.supplier_id}
                  onValueChange={(v) => setPayableForm((prev) => ({ ...prev, supplier_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: Loose) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payableForm.amount}
                  onChange={(e) => setPayableForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder={tc('enterAmount')}
                />
              </div>
              <div>
                <Label>{tc('sourceNo')}</Label>
                <Input
                  value={payableForm.source_no}
                  onChange={(e) =>
                    setPayableForm((prev) => ({ ...prev, source_no: e.target.value }))
                  }
                  placeholder={tc('sourceNoPlaceholder')}
                />
              </div>
              <div>
                <Label>{tc('dueDate')}</Label>
                <Input
                  type="date"
                  value={payableForm.due_date}
                  onChange={(e) =>
                    setPayableForm((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={payableForm.remark}
                  onChange={(e) => setPayableForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayableDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCreatePayable}>{tc('create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('newReceiptTitle')}</DialogTitle>
              <DialogDescription>{tc('newReceiptDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('selectReceivable')}</Label>
                <Select
                  value={receiptForm.receivable_id}
                  onValueChange={(v) => setReceiptForm((prev) => ({ ...prev, receivable_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectReceivable')} />
                  </SelectTrigger>
                  <SelectContent>
                    {receivables
                      .filter((r) => r.status !== 3)
                      .map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.receivable_no} - {r.customer_name}
                          {tc('balance')}
                          {formatAmount(r.balance)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('receiptAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder={tc('enterAmount')}
                />
              </div>
              <div>
                <Label>{tc('paymentMethod')}</Label>
                <Select
                  value={receiptForm.payment_method}
                  onValueChange={(v) => setReceiptForm((prev) => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('receiptDate')}</Label>
                <Input
                  type="date"
                  value={receiptForm.receipt_date}
                  onChange={(e) =>
                    setReceiptForm((prev) => ({ ...prev, receipt_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={receiptForm.remark}
                  onChange={(e) => setReceiptForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCreateReceipt}>{tc('createReceipt')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('newPaymentTitle')}</DialogTitle>
              <DialogDescription>{tc('newPaymentDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('selectPayable')}</Label>
                <Select
                  value={paymentForm.payable_id}
                  onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, payable_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('selectPayable')} />
                  </SelectTrigger>
                  <SelectContent>
                    {payables
                      .filter((p) => p.status !== 3)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.payable_no} - {p.supplier_name}
                          {tc('balance')}
                          {formatAmount(p.balance)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('paymentAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder={tc('enterAmount')}
                />
              </div>
              <div>
                <Label>{tc('paymentMethod')}</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('paymentDate')}</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={paymentForm.remark}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={tc('enterRemark')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCreatePayment}>{tc('createPayment')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" resizable>
            <DialogHeader>
              <DialogTitle>
                {detailType === 'receivable'
                  ? tc('detailReceivableTitle')
                  : tc('detailPayableTitle')}
              </DialogTitle>
            </DialogHeader>
            {detailData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {detailType === 'receivable' ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">{tc('receivableNoLabel')}：</span>
                        {detailData.receivable_no}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('customer')}：</span>
                        {detailData.customer_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('sourceNo')}</span>
                        {detailData.source_no || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('dueDate')}</span>
                        {detailData.due_date || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('amount')}</span>¥
                        {formatAmount(detailData.amount)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('receivedAmount')}</span>¥
                        {formatAmount(detailData.received_amount)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('balance')}</span>¥
                        {formatAmount(detailData.balance)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('status')}：</span>
                        <Badge
                          className={RECEIVABLE_STATUS[detailData.status]?.color || 'bg-gray-100'}
                        >
                          {RECEIVABLE_STATUS[detailData.status]?.label || detailData.status}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground">{tc('payableNoLabel')}：</span>
                        {detailData.payable_no}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('supplier')}：</span>
                        {detailData.supplier_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('sourceNo')}</span>
                        {detailData.source_no || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('dueDate')}</span>
                        {detailData.due_date || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('amount')}</span>¥
                        {formatAmount(detailData.amount)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('paidAmount')}</span>¥
                        {formatAmount(detailData.paid_amount)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('balance')}</span>¥
                        {formatAmount(detailData.balance)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('status')}：</span>
                        <Badge
                          className={PAYABLE_STATUS[detailData.status]?.color || 'bg-gray-100'}
                        >
                          {PAYABLE_STATUS[detailData.status]?.label || detailData.status}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                {detailData.receipts && detailData.receipts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{tc('receiptRecords')}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc('receiptNo')}</TableHead>
                          <TableHead>{tc('amount')}</TableHead>
                          <TableHead>{tc('paymentMethod')}</TableHead>
                          <TableHead>{tc('date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.receipts.map((r: Loose) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.receipt_no}</TableCell>
                            <TableCell>¥{formatAmount(r.amount)}</TableCell>
                            <TableCell>
                              {PAYMENT_METHODS[r.payment_method] || r.payment_method}
                            </TableCell>
                            <TableCell>{r.receipt_date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {detailData.payments && detailData.payments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{tc('paymentRecords')}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc('paymentNo')}</TableHead>
                          <TableHead>{tc('amount')}</TableHead>
                          <TableHead>{tc('paymentMethod')}</TableHead>
                          <TableHead>{tc('date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.payments.map((p: Loose) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.payment_no}</TableCell>
                            <TableCell>¥{formatAmount(p.amount)}</TableCell>
                            <TableCell>
                              {PAYMENT_METHODS[p.payment_method] || p.payment_method}
                            </TableCell>
                            <TableCell>{p.payment_date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
