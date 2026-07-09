'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, ArrowRightLeft, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface TransferRecord {
  id?: number;
  transfer_no: string;
  sample_order_id?: number;
  sample_order_no: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  customer_id?: number;
  customer_name: string;
  sample_params: string;
  mass_params: string;
  sop_file: string;
  bom_version: string;
  process_route: string;
  check_standard: string;
  special_note: string;
  sample_confirmer: string;
  sample_confirm_date: string;
  eng_confirmer: string;
  eng_confirm_date: string;
  prod_confirmer: string;
  prod_confirm_date: string;
  quality_confirmer: string;
  quality_confirm_date: string;
  status: number;
  remark: string;
  create_time: string;
}

export default function SampleToMassPage() {
  const t = useTranslations('Engineering');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('draft'), variant: 'outline' },
    2: { label: t('sampleConfirmed'), variant: 'secondary' },
    3: { label: t('engConfirmed'), variant: 'secondary' },
    4: { label: t('prodConfirmed'), variant: 'secondary' },
    5: { label: t('qualityConfirmed'), variant: 'secondary' },
    6: { label: t('transferredToMass'), variant: 'default' },
    7: { label: t('returned'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<TransferRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TransferRecord>>({});
  const [customers, setCustomers] = useState<
    { id: number; customer_name: string; customer_code: string }[]
  >([]);

  const fetchCustomers = async () => {
    try {
      const res = await authFetch('/api/customers?pageSize=999');
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        productName: searchProduct,
        status: searchStatus,
      });
      const res = await authFetch('/api/engineering/sample-to-mass?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/engineering/sample-to-mass', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/engineering/sample-to-mass?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleConfirm = async (id: number, currentStatus: number) => {
    try {
      const res = await authFetch('/api/engineering/sample-to-mass', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: currentStatus + 1 }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('confirmSuccess') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout title={t('sampleToMassManagement')}>
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchProductPlaceholder')}
                    className="pl-8 w-60"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                </div>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('statusFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  {tc('search')}
                </Button>
              </div>
              <Button
                onClick={() => {
                  setEditItem({});
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('newTransferRecord')}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transferNo')}</TableHead>
                  <TableHead>{t('sampleOrderNo')}</TableHead>
                  <TableHead>{t('productCode')}</TableHead>
                  <TableHead>{t('productName')}</TableHead>
                  <TableHead>{t('customerName')}</TableHead>
                  <TableHead>{t('bomVersion')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('createTime')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.transfer_no}</TableCell>
                    <TableCell>{item.sample_order_no || '-'}</TableCell>
                    <TableCell>{item.product_code || '-'}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.customer_name || '-'}</TableCell>
                    <TableCell>{item.bom_version || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {statusMap[item.status]?.label || tc('unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.create_time?.substring(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.status < 6 && item.status !== 7 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirm(item.id!, item.status)}
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            {tc('confirm')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">{tc('total', { count: total })}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>
                {editItem.id ? t('editTransferRecord') : t('newTransferRecord')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{t('sampleOrderNo')}</Label>
                <Input
                  value={editItem.sample_order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, sample_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('productCode')}</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('productName')} *</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('customerName')}</Label>
                <Select
                  value={editItem.customer_id ? String(editItem.customer_id) : ''}
                  onValueChange={(v) => {
                    const c = customers.find((c) => c.id === Number(v));
                    setEditItem({
                      ...editItem,
                      customer_id: Number(v),
                      customer_name: c?.customer_name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCustomer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('bomVersion')}</Label>
                <Input
                  value={editItem.bom_version || ''}
                  onChange={(e) => setEditItem({ ...editItem, bom_version: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('processRoute')}</Label>
                <Input
                  value={editItem.process_route || ''}
                  onChange={(e) => setEditItem({ ...editItem, process_route: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('sampleParams')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.sample_params || ''}
                  onChange={(e) => setEditItem({ ...editItem, sample_params: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('massParams')}</Label>
                <Textarea
                  rows={3}
                  value={editItem.mass_params || ''}
                  onChange={(e) => setEditItem({ ...editItem, mass_params: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('checkStandard')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.check_standard || ''}
                  onChange={(e) => setEditItem({ ...editItem, check_standard: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('specialNote')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.special_note || ''}
                  onChange={(e) => setEditItem({ ...editItem, special_note: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
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
      </div>
    </MainLayout>
  );
}
