'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { MoneyDisplay } from '@/components/ui/money-display';
import { Plus, Search, RefreshCw, Truck, Eye, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { mockShipments, mockCustomers, USE_MOCK } from '@/lib/mock-data';
import { WarehouseSelect } from '@/components/ui/warehouse-select';

// ============================================================
// 发货类型定义（符合设计文档 3.1 节）
// ============================================================
type ShipmentType = 'normal' | 'partial' | 'return' | 're_ship';

// ============================================================
// 数据接口定义（符合设计文档第4节数据结构）
// ============================================================

// 发货单主表接口（shipments 表）
interface Shipment {
  id?: number;
  shipment_no?: string; // 格式：SH+YYYYMMDD+4位序号
  delivery_no?: string; // 送货单号
  sales_order_id: number; // 关联销售订单 ID
  sales_order_no?: string; // 销售订单编号
  order_no?: string; // 订单编号
  type: ShipmentType; // 发货类型：normal/partial/return/re_ship
  status: number; // 状态：1=待发货 2=已发货 3=已签收 9=已取消
  customer_id: number; // 客户 ID
  customer_name?: string; // 客户名称（冗余字段）
  warehouse_id: number; // 仓库 ID
  warehouse_name?: string; // 仓库名称
  total_quantity: number; // 发货总数量
  total_qty?: number; // 总数量（API 返回）
  shipped_quantity: number; // 已发货数量
  total_amount?: number; // 总金额
  currency?: string; // 币种
  base_total_amount?: number; // 本位币总金额
  base_currency?: string; // 本位币币种
  sign_status?: number; // 签收状态
  sign_person?: string; // 签收人
  sign_time?: string; // 签收时间
  contact_name?: string; // 收货联系人
  contact_phone?: string; // 联系人电话
  delivery_address?: string; // 收货地址
  logistics_company?: string; // 物流公司
  tracking_no?: string; // 物流单号
  applicant_id?: number; // 申请人 ID
  approver_id?: number; // 审批人 ID
  ship_time?: string; // 发货时间
  remark?: string; // 备注
  parent_shipment_id?: number; // 父发货单 ID（补发时关联）
  delivery_date?: string; // 交货日期
  create_time?: string;
  update_time?: string;
}

// 发货单明细表接口（shipment_items 表）
interface ShipmentItem {
  id?: number;
  shipment_id?: number; // 发货单 ID
  material_id: number; // 成品 ID
  material_name?: string; // 成品名称
  specification?: string; // 规格
  material_spec?: string; // 物料规格
  quantity: number; // 发货数量
  shipped_quantity: number; // 已发货数量
  unit?: string; // 单位
  unit_price?: number; // 单价
  qr_code?: string; // 成品二维码编码
  batch_no?: string; // 成品批次号
  warehouse_location?: string; // 库位
  recommended_qr_codes?: string[]; // FIFO 推荐的二维码列表
  amount?: number; // 金额
}

interface Customer {
  id: number;
  customer_name: string;
  customer_code: string;
}

// ============================================================
// 常量映射（符合设计文档要求）
// ============================================================

// 发货类型映射
// 发货状态映射（符合设计文档 4.1 节：6种状态）

export default function DeliveryPage() {
  // 翻译钩子
  const t = useTranslations('Sales');
  const tc = useTranslations('Common');

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: {
      label: t('pendingDelivery'),
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    2: {
      label: t('delivered'),
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    3: {
      label: t('signed'),
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    9: {
      label: tc('cancelled'),
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const SIGN_STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: {
      label: t('notSigned'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    },
    1: {
      label: t('partialSigned'),
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    2: {
      label: t('allSigned'),
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    3: {
      label: t('rejected'),
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const SHIPMENT_TYPE_MAP: Record<ShipmentType, { label: string; color: string }> = {
    normal: {
      label: t('normalShip'),
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    partial: {
      label: t('partialShip'),
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    return: {
      label: t('returnShip'),
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    re_ship: {
      label: t('reShip'),
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const [list, setList] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false); // 扫码发货对话框
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Shipment> & { items: ShipmentItem[] }>({
    type: 'normal',
    items: [
      {
        material_id: 0,
        material_name: '',
        specification: '',
        quantity: 0,
        unit: 'pcs',
        shipped_quantity: 0,
      },
    ],
  });
  const [detailData, setDetailData] = useState<Shipment | null>(null);
  const [detailItems, setDetailItems] = useState<ShipmentItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<
    Array<{ id: number; order_no: string; customer_id: number; customer_name: string }>
  >([]);
  const [total, setTotal] = useState(0);
  const [shipForm, setShipForm] = useState<{
    // 扫码发货表单
    shipment_id?: number;
    items: Array<{ material_id: number; qr_code: string; quantity: number }>;
    logistics_company: string;
    tracking_no: string;
  }>({ items: [], logistics_company: '', tracking_no: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    logger.info({ module: 'Sales', action: 'fetchDelivery' }, '开始获取发货单列表', {
      keyword,
      statusFilter,
      typeFilter,
    });
    try {
      if (USE_MOCK) {
        logger.info({ module: 'Sales', action: 'fetchDelivery' }, '使用 mock 数据');
        const filtered = keyword
          ? mockShipments.filter(
              (s) => s.shipment_no?.includes(keyword) || s.customer_name?.includes(keyword)
            )
          : mockShipments;
        setList(filtered);
        setTotal(filtered.length);
        return;
      }

      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      const res = await authFetch(`/api/sales/delivery?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
        logger.info({ module: 'Sales', action: 'fetchDelivery' }, '发货单列表获取成功', {
          count: (result.data?.list || []).length,
        });
      }
    } catch (e) {
      logger.error({ module: 'Sales', action: 'fetchDelivery' }, '获取发货单列表失败', {
        error: (e as Error).message,
      });
      toast.error('获取发货单列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, typeFilter]);

  const fetchCustomers = useCallback(async () => {
    logger.info({ module: 'Sales', action: 'fetchCustomers' }, '开始获取客户列表');
    try {
      if (USE_MOCK) {
        logger.info({ module: 'Sales', action: 'fetchCustomers' }, '使用 mock 数据');
        setCustomers(mockCustomers);
        return;
      }

      const res = await authFetch('/api/customers');
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data?.list || result.data || []);
        logger.info({ module: 'Sales', action: 'fetchCustomers' }, '客户列表获取成功', {
          count: (result.data?.list || []).length,
        });
      }
    } catch (e) {
      logger.error({ module: 'Sales', action: 'fetchCustomers' }, '获取客户列表失败', {
        error: (e as Error).message,
      });
    }
  }, []);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders/sales?status=2&pageSize=200');
      const result = await res.json();
      if (result.success) {
        setSalesOrders(result.data?.list || result.data || []);
      }
    } catch (e) {
      logger.error({ module: 'Sales', action: 'fetchSalesOrders' }, '获取销售订单列表失败', {
        error: (e as Error).message,
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCustomers();
    fetchSalesOrders();
  }, [fetchData, fetchCustomers, fetchSalesOrders]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          material_id: 0,
          material_name: '',
          specification: '',
          quantity: 0,
          unit: 'pcs',
          shipped_quantity: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: Loose) => {
    setForm((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const saveDelivery = async () => {
    if (!form.sales_order_id) {
      toast.error('请选择销售订单');
      return;
    }
    if (!form.customer_id) {
      toast.error('请选择客户');
      return;
    }
    if (!form.warehouse_id) {
      toast.error('请选择仓库');
      return;
    }
    if (
      !form.items ||
      form.items.length === 0 ||
      form.items.some((i) => !i.material_id || !i.quantity)
    ) {
      toast.error('请完善发货明细（成品和数量不能为空）');
      return;
    }
    try {
      const res = await authFetch('/api/sales/delivery', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('发货单创建成功');
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch {
      toast.error('保存发货单失败');
    }
  };

  // 扫码发货功能（符合设计文档 5.2 节）
  const openShipDialog = (shipment: Shipment) => {
    setDetailData(shipment);
    setShipForm({
      shipment_id: shipment.id,
      items:
        (shipment as Loose).items?.map((item: ShipmentItem) => ({
          material_id: item.material_id,
          qr_code: '',
          quantity: item.quantity - item.shipped_quantity,
        })) || [],
      logistics_company: shipment.logistics_company || '',
      tracking_no: shipment.tracking_no || '',
    });
    setShipDialogOpen(true);
  };

  const addShipItem = () => {
    setShipForm((prev) => ({
      ...prev,
      items: [...prev.items, { material_id: 0, qr_code: '', quantity: 1 }],
    }));
  };

  const updateShipItem = (index: number, field: string, value: Loose) => {
    setShipForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeShipItem = (index: number) => {
    setShipForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const executeShipping = async () => {
    if (!shipForm.items.length || shipForm.items.some((i) => !i.qr_code || !i.quantity)) {
      toast.error('请填写完整的扫码信息（二维码和数量）');
      return;
    }

    try {
      const res = await authFetch(`/api/sales/delivery/${shipForm.shipment_id}/ship`, {
        method: 'POST',
        body: JSON.stringify({
          items: shipForm.items,
          logistics_company: shipForm.logistics_company,
          tracking_no: shipForm.tracking_no,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`发货成功！已发 ${result.data.shipped_quantity} 件`);
        setShipDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || '发货失败');
      }
    } catch {
      toast.error('执行发货操作失败');
    }
  };

  // 提交部分发货申请（符合设计文档 5.3 节）
  const submitPartialShipment = async () => {
    const salesOrderId = prompt('请输入销售订单ID：');
    if (!salesOrderId) return;

    const quantity = prompt('请输入部分发货数量：');
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('发货数量必须大于0');
      return;
    }

    try {
      const res = await authFetch('/api/sales/delivery/partial', {
        method: 'POST',
        body: JSON.stringify({
          sales_order_id: parseInt(salesOrderId),
          quantity: parseFloat(quantity),
          remark: `部分发货申请`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('部分发货申请提交成功，等待审批');
        fetchData();
      } else {
        toast.error(result.message || '提交失败');
      }
    } catch {
      toast.error('提交部分发货申请失败');
    }
  };

  // 提交补发申请（符合设计文档 5.4 节）
  const submitReShip = async (parentShipmentId: number) => {
    const quantity = prompt('请输入补发数量：');
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('补发数量必须大于0');
      return;
    }

    const reason = prompt('请输入补发原因（可选）：') || '';

    try {
      const res = await authFetch('/api/sales/delivery/re-ship', {
        method: 'POST',
        body: JSON.stringify({
          parent_shipment_id: parentShipmentId,
          quantity: parseFloat(quantity),
          reason,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('补发申请提交成功，等待审批');
        fetchData();
      } else {
        toast.error(result.message || '提交失败');
      }
    } catch {
      toast.error('提交补发申请失败');
    }
  };

  const updateStatus = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/sales/delivery', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('状态更新成功');
        fetchData();
      } else {
        toast.error(result.message || '更新失败');
      }
    } catch {
      toast.error('更新状态失败');
    }
  };

  const deleteDelivery = async (id: number) => {
    if (!confirm('确定要删除该发货单吗？')) return;
    try {
      const res = await authFetch(`/api/sales/delivery?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success('删除成功');
        fetchData();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const viewDetail = async (shipment: Shipment) => {
    try {
      const res = await authFetch(`/api/sales/delivery?id=${shipment.id}`);
      const result = await res.json();
      if (result.success) {
        setDetailData(result.data);
        setDetailItems(result.data?.items || []);
        setDetailOpen(true);
      }
    } catch {
      toast.error('获取详情失败');
    }
  };

  const calcTotal = () => {
    return (form.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calcTotalQty = () => {
    return (form.items || []).reduce(
      (sum, item) => sum + (parseFloat(String(item.quantity)) || 0),
      0
    );
  };

  return (
    <MainLayout title={t('deliveryManagement')}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                {t('deliveryManagement')}
              </CardTitle>
              <CardDescription>{t('deliveryManagementDesc')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setForm({
                  items: [
                    {
                      material_id: 0,
                      material_name: '',
                      material_spec: '',
                      quantity: 0,
                      unit: '张',
                      unit_price: 0,
                      amount: 0,
                      batch_no: '',
                      shipped_quantity: 0,
                    },
                  ],
                  delivery_date: new Date().toISOString().split('T')[0],
                });
                setEditing(false);
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newDelivery')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('searchDeliveryPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('allStatus')}</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('totalDelivery')}</div>
                  <div className="text-2xl font-bold">{total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('pendingDelivery')}</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {list.filter((d) => d.status === 1).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('delivered')}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {list.filter((d) => d.status === 2).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('signed')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {list.filter((d) => d.status === 3).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('deliveryNo')}</TableHead>
                    <TableHead>{t('relatedOrder')}</TableHead>
                    <TableHead>{tc('customerName')}</TableHead>
                    <TableHead>{t('deliveryDate')}</TableHead>
                    <TableHead>{tc('totalQuantity')}</TableHead>
                    <TableHead>{tc('totalAmount')}</TableHead>
                    <TableHead>{tc('currency')}</TableHead>
                    <TableHead>{t('signStatus')}</TableHead>
                    <TableHead>{t('documentStatus')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.delivery_no}</TableCell>
                      <TableCell>{d.order_no || '-'}</TableCell>
                      <TableCell>{d.customer_name || '-'}</TableCell>
                      <TableCell>{d.delivery_date || '-'}</TableCell>
                      <TableCell>{parseFloat(String(d.total_qty || 0)).toLocaleString()}</TableCell>
                      <TableCell>
                        <MoneyDisplay
                          amount={parseFloat(String(d.total_amount || 0))}
                          currency={d.currency || 'CNY'}
                          baseAmount={d.base_total_amount}
                          baseCurrency={d.base_currency}
                        />
                      </TableCell>
                      <TableCell>
                        {d.currency || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={SIGN_STATUS_MAP[d.sign_status ?? 0]?.color || 'bg-gray-100'}
                        >
                          {SIGN_STATUS_MAP[d.sign_status ?? 0]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[d.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[d.status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDetail(d)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {d.status === 1 && d.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(d.id!, 2)}
                              title="确认发货"
                            >
                              <Truck className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          {d.status === 2 && d.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(d.id!, 3)}
                              title="确认签收"
                            >
                              <Printer className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => d.id && deleteDelivery(d.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{tc('text_gt2sbj')}</DialogTitle>
            <DialogDescription>{tc('text_5k6wux')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  客户
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(form.customer_id || '')}
                  onValueChange={(v) => {
                    const cust = customers.find((c: Loose) => c.id === parseInt(v));
                    setForm((prev) => ({
                      ...prev,
                      customer_id: parseInt(v),
                      customer_name: cust?.customer_name || '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择客户" />
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
              <div className="space-y-2">
                <Label>
                  关联销售订单
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(form.sales_order_id || '')}
                  onValueChange={(v) => {
                    const order = salesOrders.find((o) => o.id === parseInt(v));
                    setForm((prev) => ({
                      ...prev,
                      sales_order_id: parseInt(v),
                      order_no: order?.order_no || '',
                      customer_id: order?.customer_id || prev.customer_id,
                      customer_name: order?.customer_name || prev.customer_name,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择销售订单" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrders.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.order_no} - {o.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  仓库
                  <span className="text-red-500">*</span>
                </Label>
                <WarehouseSelect
                  value={form.warehouse_id || ''}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, warehouse_id: v ? parseInt(v) : 0 }))
                  }
                  placeholder="选择仓库"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>收货联系人</Label>
                <Input
                  value={form.contact_name || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="联系人"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')}</Label>
                <Input
                  value={form.contact_phone || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="电话"
                />
              </div>
              <div className="space-y-2">
                <Label>送货地址</Label>
                <Input
                  value={form.delivery_address || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, delivery_address: e.target.value }))
                  }
                  placeholder={tc('address')}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>物流公司</Label>
                <Input
                  value={form.logistics_company || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, logistics_company: e.target.value }))
                  }
                  placeholder="物流公司"
                />
              </div>
              <div className="space-y-2">
                <Label>物流单号</Label>
                <Input
                  value={form.tracking_no || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, tracking_no: e.target.value }))}
                  placeholder="物流单号"
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={tc('remark')}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">{tc('text_ir1jy6')}</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加物料
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格型号</TableHead>
                    <TableHead>{tc('quantity')}</TableHead>
                    <TableHead>{tc('unit')}</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>{tc('amount')}</TableHead>
                    <TableHead>{tc('batchNo')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(form.items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={item.material_name}
                          onChange={(e) => updateItem(idx, 'material_name', e.target.value)}
                          placeholder="物料名称"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material_spec}
                          onChange={(e) => updateItem(idx, 'material_spec', e.target.value)}
                          placeholder={tc('specification')}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <MoneyDisplay amount={item.amount || 0} currency="CNY" />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.batch_no}
                          onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                          placeholder={tc('batch')}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {(form.items || []).length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-6 mt-3 text-sm">
                <span>
                  总数量:
                  <strong>{calcTotalQty().toLocaleString()}</strong>
                </span>
                <span>
                  总金额:
                  <strong className="text-blue-600">
                    <MoneyDisplay amount={calcTotal()} currency="CNY" />
                  </strong>
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveDelivery} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>{tc('text_cyrs1a')}</DialogTitle>
            <DialogDescription>{detailData?.delivery_no}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{tc('text_fvh8n6')}</span>
                  {detailData.customer_name}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_d1c9ru')}</span>
                  {detailData.delivery_date}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_jx9hsq')}</span>
                  {detailData.order_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_za1nyu')}</span>
                  {detailData.logistics_company || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_zabqjk')}</span>
                  {detailData.tracking_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_gpem87')}</span>
                  {detailData.contact_name || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_ksxgln')}</span>
                  {detailData.contact_phone || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{tc('text_cz40sk')}</span>
                  {detailData.delivery_address || '-'}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-gray-500 text-sm">{tc('totalQuantity')}</div>
                    <div className="text-xl font-bold">
                      {parseFloat(String(detailData.total_qty || 0)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">{tc('totalAmount')}</div>
                    <div className="text-xl font-bold text-blue-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.total_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                        baseAmount={detailData.base_total_amount}
                        baseCurrency={detailData.base_currency}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">签收状态</div>
                    <Badge className={SIGN_STATUS_MAP[detailData.sign_status ?? 0]?.color}>
                      {SIGN_STATUS_MAP[detailData.sign_status ?? 0]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              {detailData.sign_person && (
                <div className="border-t pt-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">{tc('text_fzysd4')}</span>
                      {detailData.sign_person}
                    </div>
                    <div>
                      <span className="text-gray-500">{tc('text_15vxi4')}</span>
                      {detailData.sign_time}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
