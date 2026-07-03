'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Plus, RefreshCw, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BatchInventory {
  id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  warehouse_id: number;
  warehouse_name: string;
  inbound_no: string;
  inbound_date: string;
  inbound_quantity: number;
  outbound_quantity: number;
  available_quantity: number;
  supplier_name: string;
  qc_status: number;
  status: number;
}

export default function WarehousePage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const [batches, setBatches] = useState<BatchInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 入库表单
  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundForm, setInboundForm] = useState({
    warehouse_id: '',
    inbound_date: new Date().toISOString().split('T')[0],
    items: [
      {
        material_id: '',
        material_code: '',
        material_name: '',
        quantity: '',
        unit: '张',
        batch_no: '',
      },
    ],
  });

  // 出库表单
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [outboundForm, setOutboundForm] = useState({
    warehouse_id: '',
    customer_name: '',
    outbound_date: new Date().toISOString().split('T')[0],
    items: [
      {
        material_id: '',
        material_code: '',
        material_name: '',
        quantity: '',
        unit: '张',
        batch_inventory_id: '',
      },
    ],
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        materialKeyword: searchKeyword,
      });
      const res = await authFetch(`/api/warehouse/batch-inventory?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setBatches(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page]);

  const handleInbound = async () => {
    try {
      const items = inboundForm.items.filter((item) => item.material_id && item.quantity);
      if (items.length === 0) {
        toast.error(tc('addInboundItemFirst'));
        return;
      }

      const res = await authFetch('/api/warehouse/batch-inventory', {
        method: 'PUT',
        body: JSON.stringify({
          warehouse_id: inboundForm.warehouse_id,
          inbound_date: inboundForm.inbound_date,
          items: items.map((item) => ({
            material_id: parseInt(item.material_id),
            material_code: item.material_code,
            material_name: item.material_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            batch_no: item.batch_no || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success(tc('inboundSuccess'));
        setInboundOpen(false);
        fetchBatches();
      } else {
        toast.error(data.message || tc('inboundFailed'));
      }
    } catch (error) {
      toast.error(tc('inboundFailed'));
    }
  };

  const handleOutbound = async () => {
    try {
      const items = outboundForm.items.filter((item) => item.material_id && item.quantity);
      if (items.length === 0) {
        toast.error(tc('addOutboundItemFirst'));
        return;
      }

      const res = await authFetch('/api/warehouse/batch-inventory', {
        method: 'PATCH',
        body: JSON.stringify({
          warehouse_id: outboundForm.warehouse_id,
          customer_name: outboundForm.customer_name,
          outbound_date: outboundForm.outbound_date,
          items: items.map((item) => ({
            material_id: parseInt(item.material_id),
            material_code: item.material_code,
            material_name: item.material_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            batch_inventory_id: item.batch_inventory_id
              ? parseInt(item.batch_inventory_id)
              : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success(tc('outboundSuccess'));
        setOutboundOpen(false);
        fetchBatches();
      } else {
        toast.error(data.message || tc('outboundFailed'));
      }
    } catch (error) {
      toast.error(tc('outboundFailed'));
    }
  };

  const fetchAvailableBatches = async (materialId: number, warehouseId: number, index: number) => {
    try {
      const res = await authFetch('/api/warehouse/batch-inventory', {
        method: 'POST',
        body: JSON.stringify({ material_id: materialId, warehouse_id: warehouseId }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setAvailableBatches(data.data.batches || []);
      }
    } catch (error) {
      toast.error(tc('fetchBatchFailed'));
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="bg-green-500">{t('normal')}</Badge>;
      case 2:
        return <Badge className="bg-gray-500">{t('usedUp')}</Badge>;
      default:
        return <Badge variant="secondary">{t('unknown')}</Badge>;
    }
  };

  const getQcStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="destructive">{t('unqualified')}</Badge>;
      case 2:
        return <Badge variant="secondary">{t('pendingQc')}</Badge>;
      default:
        return <Badge variant="secondary">{t('unknown')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Dialog open={inboundOpen} onOpenChange={setInboundOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                {t('inbound')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" resizable>
              <DialogHeader>
                <DialogTitle>{t('productionInbound')}</DialogTitle>
              </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('warehouse')}</Label>
                      <Select
                        value={inboundForm.warehouse_id}
                        onValueChange={(v) => setInboundForm({ ...inboundForm, warehouse_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectWarehouse')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t('rawMaterialWarehouse')}</SelectItem>
                          <SelectItem value="2">{t('finishedWarehouse')}</SelectItem>
                          <SelectItem value="3">{t('semiFinishedWarehouse')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('inboundDate')}</Label>
                      <Input
                        type="date"
                        value={inboundForm.inbound_date}
                        onChange={(e) =>
                          setInboundForm({ ...inboundForm, inbound_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inboundItems')}</Label>
                    {inboundForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2">
                        <Input
                          placeholder={t('materialCode')}
                          value={item.material_code}
                          onChange={(e) => {
                            const newItems = [...inboundForm.items];
                            newItems[index].material_code = e.target.value;
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        />
                        <Input
                          placeholder={t('materialName')}
                          value={item.material_name}
                          onChange={(e) => {
                            const newItems = [...inboundForm.items];
                            newItems[index].material_name = e.target.value;
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        />
                        <Input
                          type="number"
                          placeholder={tc('quantity')}
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...inboundForm.items];
                            newItems[index].quantity = e.target.value;
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        />
                        <Input
                          placeholder={t('unit')}
                          value={item.unit}
                          onChange={(e) => {
                            const newItems = [...inboundForm.items];
                            newItems[index].unit = e.target.value;
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        />
                        <Input
                          placeholder={t('batchNoOptional')}
                          value={item.batch_no}
                          onChange={(e) => {
                            const newItems = [...inboundForm.items];
                            newItems[index].batch_no = e.target.value;
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = inboundForm.items.filter((_, i) => i !== index);
                            setInboundForm({ ...inboundForm, items: newItems });
                          }}
                        >
                          {tc('delete')}
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInboundForm({
                          ...inboundForm,
                          items: [
                            ...inboundForm.items,
                            {
                              material_id: '',
                              material_code: '',
                              material_name: '',
                              quantity: '',
                              unit: '张',
                              batch_no: '',
                            },
                          ],
                        });
                      }}
                    >
                      {t('addItem')}
                    </Button>
                  </div>
                  <Button onClick={handleInbound} className="w-full">
                    {t('confirmInbound')}
                  </Button>
                </div>
            </DialogContent>
          </Dialog>

          <Dialog open={outboundOpen} onOpenChange={setOutboundOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                {t('outbound')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" resizable>
              <DialogHeader>
                <DialogTitle>{t('salesOutboundTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('warehouse')}</Label>
                    <Select
                      value={outboundForm.warehouse_id}
                      onValueChange={(v) => setOutboundForm({ ...outboundForm, warehouse_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectWarehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('rawMaterialWarehouse')}</SelectItem>
                        <SelectItem value="2">{t('finishedWarehouse')}</SelectItem>
                        <SelectItem value="3">{t('semiFinishedWarehouse')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('customerName')}</Label>
                    <Input
                      placeholder={t('customerName')}
                      value={outboundForm.customer_name}
                      onChange={(e) =>
                        setOutboundForm({ ...outboundForm, customer_name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('outboundItems')}</Label>
                  {outboundForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2">
                      <Input
                        placeholder={t('materialCode')}
                        value={item.material_code}
                        onChange={(e) => {
                          const newItems = [...outboundForm.items];
                          newItems[index].material_code = e.target.value;
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      />
                      <Input
                        placeholder={t('materialName')}
                        value={item.material_name}
                        onChange={(e) => {
                          const newItems = [...outboundForm.items];
                          newItems[index].material_name = e.target.value;
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      />
                      <Input
                        type="number"
                        placeholder={tc('quantity')}
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...outboundForm.items];
                          newItems[index].quantity = e.target.value;
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      />
                      <Input
                        placeholder={t('unit')}
                        value={item.unit}
                        onChange={(e) => {
                          const newItems = [...outboundForm.items];
                          newItems[index].unit = e.target.value;
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      />
                      <Select
                        value={item.batch_inventory_id}
                        onValueChange={(v) => {
                          const newItems = [...outboundForm.items];
                          newItems[index].batch_inventory_id = v;
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectBatch')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBatches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id.toString()}>
                              {batch.batch_no} ({tc('available')}: {batch.available_quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (item.material_id && outboundForm.warehouse_id) {
                            fetchAvailableBatches(
                              parseInt(item.material_id),
                              parseInt(outboundForm.warehouse_id),
                              index
                            );
                          }
                          const newItems = outboundForm.items.filter((_, i) => i !== index);
                          setOutboundForm({ ...outboundForm, items: newItems });
                        }}
                      >
                        {t('loadBatch')}
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOutboundForm({
                        ...outboundForm,
                        items: [
                          ...outboundForm.items,
                          {
                            material_id: '',
                            material_code: '',
                            material_name: '',
                            quantity: '',
                            unit: '张',
                            batch_inventory_id: '',
                          },
                        ],
                      });
                    }}
                  >
                    {t('addItem')}
                  </Button>
                </div>
                <Button onClick={handleOutbound} className="w-full">
                  {t('confirmOutbound')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={fetchBatches}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('batchInventory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('searchMaterialPlaceholder')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchBatches}>{t('query')}</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('batchNoCol')}</TableHead>
                  <TableHead>{t('materialCode')}</TableHead>
                  <TableHead>{t('materialName')}</TableHead>
                  <TableHead>{t('specification')}</TableHead>
                  <TableHead>{t('warehouseShort')}</TableHead>
                  <TableHead>{t('inboundQty')}</TableHead>
                  <TableHead>{t('outboundQty')}</TableHead>
                  <TableHead>{t('availableStock')}</TableHead>
                  <TableHead>{t('inboundDate')}</TableHead>
                  <TableHead>{t('qcStatus')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">{batch.batch_no}</TableCell>
                    <TableCell>{batch.material_code}</TableCell>
                    <TableCell>{batch.material_name}</TableCell>
                    <TableCell>{batch.specification || '-'}</TableCell>
                    <TableCell>{batch.warehouse_name || '-'}</TableCell>
                    <TableCell>
                      {batch.inbound_quantity} {batch.unit}
                    </TableCell>
                    <TableCell>
                      {batch.outbound_quantity} {batch.unit}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {batch.available_quantity} {batch.unit}
                    </TableCell>
                    <TableCell>{batch.inbound_date}</TableCell>
                    <TableCell>{getQcStatusBadge(batch.qc_status)}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              {t('recordCount', { count: total })}，{t('pageOf', { page, pages: Math.ceil(total / pageSize) })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {tc('prevPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= total}
              >
                {tc('nextPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
