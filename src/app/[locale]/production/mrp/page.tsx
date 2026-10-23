'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import {
  Play,
  PackageSearch,
  Clock,
  AlertTriangle,
  ShoppingCart,
  BarChart3,
  TreePine,
  Layers,
  Loader2,
  ChevronRight,
  FileSpreadsheet,
  Calculator,
  Shield,
} from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkOrder {
  id: number;
  work_order_no: string;
  material_name: string;
  plan_qty: number;
  plan_start_date: string;
  status: number;
}

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
}

interface NetRequirement {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  gross_requirement: number;
  on_hand_qty: number;
  allocated_qty: number;
  in_transit_qty: number;
  safety_stock: number;
  net_requirement: number;
  lead_time_days: number;
  suggested_order_date: string;
  suggested_delivery_date: string;
  suggested_order_qty: number;
  shortage_warning: boolean;
}

interface PlannedOrder {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  quantity: number;
  required_date: string;
  order_date: string;
  source_type: string;
  priority: 'urgent' | 'normal' | 'low';
}

interface BOMNode {
  material_id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  level: number;
  path: string;
  is_leaf: boolean;
  lead_time_days: number;
  scrap_rate: number;
  children?: BOMNode[];
}

interface TimeBucket {
  date: string;
  gross_requirement: number;
  scheduled_receipt: number;
  on_hand: number;
  net_requirement: number;
  planned_order_release: number;
  planned_order_receipt: number;
}

interface MRPSummary {
  total_materials: number;
  total_shortages: number;
  total_planned_qty: number;
  total_planned_amount: number;
}

interface MRPRunResult {
  net_requirements: NetRequirement[];
  planned_orders: PlannedOrder[];
  summary: MRPSummary;
  purchase_requests?: { request_no: string; item_count: number }[];
}

function flattenBOMTree(
  node: BOMNode,
  result: (BOMNode & { indent: number })[] = [],
  indent: number = 0
): (BOMNode & { indent: number })[] {
  result.push({ ...node, indent });
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      flattenBOMTree(child, result, indent + 1);
    }
  }
  return result;
}

export default function MRPPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const priorityConfig: Record<string, { label: string; className: string }> = {
    urgent: {
      label: tc('critical'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    normal: {
      label: tc('normal'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    low: {
      label: tc('low'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  const [activeTab, setActiveTab] = useState('mrp-run');

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<number[]>([]);
  const [selectedReqRows, setSelectedReqRows] = useState<NetRequirement[]>([]);
  const [selectedOrderRows, setSelectedOrderRows] = useState<PlannedOrder[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [autoGeneratePR, setAutoGeneratePR] = useState(false);
  const [mrpLoading, setMrpLoading] = useState(false);
  const [mrpResult, setMrpResult] = useState<MRPRunResult | null>(null);

  const [bomProductId, setBomProductId] = useState<string>('');
  const [bomQuantity, setBomQuantity] = useState<number>(1);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomTree, setBomTree] = useState<BOMNode | null>(null);

  const [bucketMaterialId, setBucketMaterialId] = useState<string>('');
  const [bucketWarehouseId, setBucketWarehouseId] = useState<string>('');
  const [bucketStartDate, setBucketStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [bucketEndDate, setBucketEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });
  const [bucketSize, setBucketSize] = useState<string>('week');
  const [bucketLoading, setBucketLoading] = useState(false);
  const [timeBuckets, setTimeBuckets] = useState<TimeBucket[]>([]);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/production/orders');
      const data = await res.json();
      if (data.success || data.data) {
        const list = Array.isArray(data.data) ? data.data : [];
        setWorkOrders(
          list.map((item: Record<string, unknown>) => ({
            id: item.id as number,
            work_order_no: (item.work_order_no || item.workOrderNo || '') as string,
            material_name: (item.material_name || item.productName || '') as string,
            plan_qty: Number(item.plan_qty || item.planQty || 0),
            plan_start_date: (item.plan_start_date || item.planStartDate || '') as string,
            status: (item.status ?? 0) as number,
          }))
        );
      }
    } catch {}
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (data.success || data.data) {
        const list = Array.isArray(data.data) ? data.data : [];
        setMaterials(
          list.map((item: Record<string, unknown>) => ({
            id: item.id as number,
            material_code: (item.material_code || '') as string,
            material_name: (item.material_name || '') as string,
            unit: (item.unit || '') as string,
          }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWorkOrders();
    fetchMaterials();
  }, [fetchWorkOrders, fetchMaterials]);

  const handleRunMRP = async () => {
    if (selectedWorkOrderIds.length === 0 || !selectedWarehouseId) return;
    setMrpLoading(true);
    try {
      const res = await authFetch('/api/production/mrp', {
        method: 'POST',
        body: JSON.stringify({
          workOrderIds: selectedWorkOrderIds,
          warehouseId: Number(selectedWarehouseId),
          autoGeneratePR,
        }),
      });
      const data = await res.json();
      if (data.success || data.data) {
        setMrpResult(data.data || data);
      }
    } catch {
    } finally {
      setMrpLoading(false);
    }
  };

  const handleExplodeBOM = async () => {
    if (!bomProductId) return;
    setBomLoading(true);
    try {
      const res = await authFetch(
        `/api/production/mrp?action=bom-explode&productId=${bomProductId}&quantity=${bomQuantity}`
      );
      const data = await res.json();
      if (data.success || data.data) {
        setBomTree(data.data || data);
      }
    } catch {
    } finally {
      setBomLoading(false);
    }
  };

  const handleCalculateBuckets = async () => {
    if (!bucketMaterialId || !bucketWarehouseId) return;
    setBucketLoading(true);
    try {
      const res = await fetch(
        `/api/production/mrp?action=time-buckets&materialId=${bucketMaterialId}&warehouseId=${bucketWarehouseId}&startDate=${bucketStartDate}&endDate=${bucketEndDate}&bucketSize=${bucketSize}`
      );
      const data = await res.json();
      if (data.success || data.data) {
        setTimeBuckets(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
    } finally {
      setBucketLoading(false);
    }
  };

  const handleBatchDeleteReq = async () => {
    if (selectedReqRows.length === 0) return;
    try {
      await authFetch('/api/production/mrp/batch-delete-reqs', {
        method: 'POST',
        body: JSON.stringify({ materialIds: selectedReqRows.map((r) => r.material_id) }),
      });
      setSelectedReqRows([]);
    } catch {}
  };

  const handleBatchDeleteOrders = async () => {
    if (selectedOrderRows.length === 0) return;
    try {
      await authFetch('/api/production/mrp/batch-delete-orders', {
        method: 'POST',
        body: JSON.stringify({ materialIds: selectedOrderRows.map((r) => r.material_id) }),
      });
      setSelectedOrderRows([]);
    } catch {}
  };

  const toggleWorkOrder = (id: number) => {
    setSelectedWorkOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const netReqColumns: StandardTableColumn<NetRequirement>[] = [
    { key: 'material_code', title: t('materialCode'), align: 'left' },
    { key: 'material_name', title: t('materialName') },
    { key: 'gross_requirement', title: t('grossRequirement'), align: 'right', render: (row) => row.gross_requirement.toLocaleString(locale) },
    { key: 'on_hand_qty', title: t('onHand'), align: 'right', render: (row) => row.on_hand_qty.toLocaleString(locale) },
    { key: 'allocated_qty', title: t('allocated'), align: 'right', render: (row) => row.allocated_qty.toLocaleString(locale) },
    { key: 'in_transit_qty', title: t('inTransit'), align: 'right', render: (row) => row.in_transit_qty.toLocaleString(locale) },
    { key: 'safety_stock', title: t('safetyStock'), align: 'right', render: (row) => row.safety_stock.toLocaleString(locale) },
    { key: 'net_requirement', title: t('netRequirement'), align: 'right', render: (row) => row.net_requirement > 0 ? row.net_requirement.toLocaleString(locale) : '-' },
    { key: 'lead_time_days', title: t('leadTimeDays'), align: 'right', dataIndex: 'lead_time_days' },
    { key: 'suggested_order_date', title: t('suggestedOrderDate'), dataIndex: 'suggested_order_date' },
    {
      key: 'shortage_warning',
      title: t('shortageWarning'),
      render: (row) =>
        row.shortage_warning ? (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t('shortage')}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t('sufficient')}
          </Badge>
        ),
    },
  ];

  const plannedOrderColumns: StandardTableColumn<PlannedOrder>[] = [
    { key: 'material_code', title: t('materialCode'), align: 'left' },
    { key: 'material_name', title: t('materialName') },
    { key: 'quantity', title: tc('quantity'), align: 'right', render: (row) => row.quantity.toLocaleString(locale) },
    { key: 'required_date', title: t('requiredDate'), dataIndex: 'required_date' },
    { key: 'order_date', title: t('orderDate'), dataIndex: 'order_date' },
    {
      key: 'priority',
      title: t('priorityLabel'),
      render: (row) => (
        <Badge className={priorityConfig[row.priority]?.className}>
          {priorityConfig[row.priority]?.label || row.priority}
        </Badge>
      ),
    },
  ];

  const bomNodeColumns: StandardTableColumn<BOMNode & { indent: number }>[] = [
    {
      key: 'level',
      title: t('level'),
      width: 64,
      render: (row) => (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${row.indent * 20}px` }}>
          {row.level > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          <span className="text-xs text-muted-foreground">L{row.level}</span>
        </div>
      ),
    },
    { key: 'material_code', title: t('materialCode'), render: (row) => <span className="font-mono text-sm">{row.material_code}</span> },
    { key: 'material_name', title: t('materialName'), render: (row) => <span className={row.is_leaf ? '' : 'font-medium'}>{row.material_name}</span> },
    { key: 'quantity', title: tc('quantity'), align: 'right', render: (row) => row.quantity.toLocaleString(locale) },
    { key: 'unit', title: t('unit'), dataIndex: 'unit' },
    { key: 'scrap_rate', title: t('scrapRate'), align: 'right', render: (row) => row.scrap_rate > 0 ? `${(row.scrap_rate * 100).toFixed(1)}%` : '-' },
    { key: 'lead_time_days', title: t('leadTimeDays'), align: 'right', dataIndex: 'lead_time_days' },
    {
      key: 'type',
      title: t('type'),
      render: (row) =>
        row.level === 0 ? (
          <Badge variant="outline">{t('finishedProduct')}</Badge>
        ) : row.is_leaf ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('rawMaterial')}</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('semiFinished')}</Badge>
        ),
    },
  ];

  const timeBucketColumns: StandardTableColumn<TimeBucket>[] = [
    { key: 'date', title: t('date'), dataIndex: 'date', headerClassName: 'font-medium' },
    { key: 'gross_requirement', title: t('grossRequirement'), align: 'right', render: (row) => row.gross_requirement.toLocaleString(locale) },
    { key: 'scheduled_receipt', title: t('scheduledReceipt'), align: 'right', render: (row) => row.scheduled_receipt.toLocaleString(locale) },
    { key: 'on_hand', title: t('onHand'), align: 'right', render: (row) => row.on_hand.toLocaleString(locale) },
    { key: 'net_requirement', title: t('netRequirement'), align: 'right', render: (row) => row.net_requirement > 0 ? row.net_requirement.toLocaleString(locale) : '-' },
    { key: 'planned_order_release', title: t('plannedOrderRelease'), align: 'right', render: (row) => row.planned_order_release > 0 ? row.planned_order_release.toLocaleString(locale) : '-' },
    { key: 'planned_order_receipt', title: t('plannedOrderReceipt'), align: 'right', render: (row) => row.planned_order_receipt > 0 ? row.planned_order_receipt.toLocaleString(locale) : '-' },
  ];

  return (
    <MainLayout title={t('mrpTitle')}>
      <div className="space-y-6">
        <StatsCards
          configs={[
            { key: 'pending', label: tc('pendingCalc'), icon: Calculator, ...StatsTheme.blue },
            { key: 'expiring', label: tc('expiringSoon'), icon: Clock, ...StatsTheme.orange },
            { key: 'shortage', label: tc('shortageItems'), icon: AlertTriangle, ...StatsTheme.red },
            { key: 'safety', label: tc('safetyStock'), icon: Shield, ...StatsTheme.green },
          ]}
          stats={[
            { key: 'pending', count: workOrders.length },
            { key: 'expiring', count: mrpResult ? mrpResult.net_requirements.filter((r) => { const d = new Date(r.suggested_delivery_date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && r.shortage_warning; }).length : 0 },
            { key: 'shortage', count: mrpResult ? mrpResult.summary.total_shortages : 0 },
            { key: 'safety', count: mrpResult ? mrpResult.net_requirements.filter((r) => r.safety_stock > 0).length : 0 },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="mrp-run">
              <Play className="h-4 w-4 mr-1" />
              {t('mrpRun')}
            </TabsTrigger>
            <TabsTrigger value="bom-explode">
              <TreePine className="h-4 w-4 mr-1" />
              {t('bomExplode')}
            </TabsTrigger>
            <TabsTrigger value="time-bucket">
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('timeBucket')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mrp-run">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5" />
                    {t('mrpParams')}
                  </CardTitle>
                  <CardDescription>{t('mrpParamsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-1">
                      <Label>{t('selectWorkOrder')}</Label>
                      <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 bg-muted/30">
                        {workOrders.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            {t('noWorkOrderData')}
                          </div>
                        ) : (
                          workOrders.map((wo) => (
                            <label
                              key={wo.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedWorkOrderIds.includes(wo.id)}
                                onChange={() => toggleWorkOrder(wo.id)}
                                className="rounded border-border"
                              />
                              <span className="font-medium">{wo.work_order_no}</span>
                              <span className="text-muted-foreground truncate">
                                {wo.material_name}
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {wo.plan_qty}
                              </Badge>
                            </label>
                          ))
                        )}
                      </div>
                      {selectedWorkOrderIds.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {t('selectedWorkOrdersCount', { count: selectedWorkOrderIds.length })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('warehouse')}</Label>
                        <WarehouseSelect
                          value={selectedWarehouseId}
                          onChange={setSelectedWarehouseId}
                          placeholder={t('selectWarehouse')}
                        />
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <Switch checked={autoGeneratePR} onCheckedChange={setAutoGeneratePR} />
                        <div>
                          <Label className="cursor-pointer">{t('autoGeneratePR')}</Label>
                          <p className="text-xs text-muted-foreground">{t('autoGeneratePRDesc')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-end gap-2">
                      <Button
                        onClick={handleRunMRP}
                        disabled={
                          mrpLoading || selectedWorkOrderIds.length === 0 || !selectedWarehouseId
                        }
                        className="w-full md:w-auto"
                        size="lg"
                      >
                        {mrpLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {t('runMRP')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {mrpResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {t('involvedMaterials')}
                          </CardTitle>
                          <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {mrpResult.summary.total_materials}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {t('shortageItems')}
                          </CardTitle>
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {mrpResult.summary.total_shortages}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{t('plannedQty')}</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {mrpResult.summary.total_planned_qty.toLocaleString(locale)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {t('plannedAmount')}
                          </CardTitle>
                          <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ¥{mrpResult.summary.total_planned_amount.toLocaleString(locale)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {mrpResult.purchase_requests && mrpResult.purchase_requests.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            {t('generatedPR')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4 flex-wrap">
                            {mrpResult.purchase_requests.map((pr, idx) => (
                              <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                                {pr.request_no} ({pr.item_count}
                                {tc('itemsUnit')}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('netRequirementDetail')}</CardTitle>
                        <CardDescription>{t('netRequirementDesc')}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3">{t('materialCode')}</th>
                                <th className="text-left py-2 px-3">{t('materialName')}</th>
                                <th className="text-right py-2 px-3">
                                  {t('grossRequirement')}
                                </th>
                                <th className="text-right py-2 px-3">{t('onHand')}</th>
                                <th className="text-right py-2 px-3">{t('allocated')}</th>
                                <th className="text-right py-2 px-3">{t('inTransit')}</th>
                                <th className="text-right py-2 px-3">{t('safetyStock')}</th>
                                <th className="text-right py-2 px-3">{t('netRequirement')}</th>
                                <th className="text-right py-2 px-3">{t('leadTimeDays')}</th>
                                <th className="text-left py-2 px-3">{t('suggestedOrderDate')}</th>
                                <th className="text-left py-2 px-3">{t('shortageWarning')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mrpResult.net_requirements.map((req, idx) => (
                                <tr
                                  key={idx}
                                  className={
                                    req.shortage_warning ? 'bg-red-50 dark:bg-red-950/20' : ''
                                  }
                                >
                                  <td className="py-2 px-3 font-medium">{req.material_code}</td>
                                  <td className="py-2 px-3">{req.material_name}</td>
                                  <td className="py-2 px-3 text-right">
                                    {req.gross_requirement.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {req.on_hand_qty.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {req.allocated_qty.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {req.in_transit_qty.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {req.safety_stock.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold">
                                    {req.net_requirement > 0
                                      ? req.net_requirement.toLocaleString(locale)
                                      : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">{req.lead_time_days}</td>
                                  <td className="py-2 px-3">{req.suggested_order_date}</td>
                                  <td className="py-2 px-3">
                                    {req.shortage_warning ? (
                                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {t('shortage')}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      >
                                        {t('sufficient')}
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {mrpResult.net_requirements.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={11}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    {t('noNetRequirementData')}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('plannedOrders')}</CardTitle>
                        <CardDescription>{t('plannedOrdersDesc')}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3">{t('materialCode')}</th>
                                <th className="text-left py-2 px-3">{t('materialName')}</th>
                                <th className="text-right py-2 px-3">{tc('quantity')}</th>
                                <th className="text-left py-2 px-3">{t('requiredDate')}</th>
                                <th className="text-left py-2 px-3">{t('orderDate')}</th>
                                <th className="text-left py-2 px-3">{t('priorityLabel')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mrpResult.planned_orders.map((order, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-medium">
                                    {order.material_code}
                                  </td>
                                  <td className="py-2 px-3">{order.material_name}</td>
                                  <td className="py-2 px-3 text-right">
                                    {order.quantity.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3">{order.required_date}</td>
                                  <td className="py-2 px-3">{order.order_date}</td>
                                  <td className="py-2 px-3">
                                    <Badge className={priorityConfig[order.priority]?.className}>
                                      {priorityConfig[order.priority]?.label || order.priority}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                              {mrpResult.planned_orders.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    {t('noPlannedOrders')}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="bom-explode">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5" />
                    {t('bomExplode')}
                  </CardTitle>
                  <CardDescription>{t('bomExplodeDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{t('selectProduct')}</Label>
                      <Select value={bomProductId} onValueChange={setBomProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.material_code} - {m.material_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('quantity')}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={bomQuantity}
                        onChange={(e) => setBomQuantity(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleExplodeBOM}
                        disabled={bomLoading || !bomProductId}
                        className="w-full"
                      >
                        {bomLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TreePine className="h-4 w-4 mr-2" />
                        )}
                        {t('explodeBOM')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {bomTree && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('bomExplodeResult')}</CardTitle>
                        <CardDescription>
                          {bomTree.material_name} × {bomQuantity} {bomTree.unit}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 w-16">{t('level')}</th>
                                <th className="text-left py-2 px-3">{t('materialCode')}</th>
                                <th className="text-left py-2 px-3">{t('materialName')}</th>
                                <th className="text-right py-2 px-3">{tc('quantity')}</th>
                                <th className="text-left py-2 px-3">{t('unit')}</th>
                                <th className="text-right py-2 px-3">{t('scrapRate')}</th>
                                <th className="text-right py-2 px-3">{t('leadTimeDays')}</th>
                                <th className="text-left py-2 px-3">{t('type')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {flattenBOMTree(bomTree).map((node, idx) => (
                                <tr
                                  key={`${node.path}-${idx}`}
                                  className={
                                    node.level === 0
                                      ? 'bg-muted/50 font-semibold'
                                      : node.is_leaf
                                        ? ''
                                        : 'bg-blue-50/50 dark:bg-blue-950/20'
                                  }
                                >
                                  <td className="py-2 px-3">
                                    <div
                                      className="flex items-center gap-1"
                                      style={{ paddingLeft: `${node.indent * 20}px` }}
                                    >
                                      {node.level > 0 && (
                                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        L{node.level}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-sm">
                                    {node.material_code}
                                  </td>
                                  <td className={`py-2 px-3 ${node.is_leaf ? '' : 'font-medium'}`}>
                                    {node.material_name}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {node.quantity.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3">{node.unit}</td>
                                  <td className="py-2 px-3 text-right">
                                    {node.scrap_rate > 0
                                      ? `${(node.scrap_rate * 100).toFixed(1)}%`
                                      : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {node.lead_time_days}
                                  </td>
                                  <td className="py-2 px-3">
                                    {node.level === 0 ? (
                                      <Badge variant="outline">{t('finishedProduct')}</Badge>
                                    ) : node.is_leaf ? (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        {t('rawMaterial')}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        {t('semiFinished')}
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="time-bucket">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('timeBucketAnalysis')}
                  </CardTitle>
                  <CardDescription>{t('timeBucketDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{t('material')}</Label>
                      <Select value={bucketMaterialId} onValueChange={setBucketMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectMaterial')} />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.material_code} - {m.material_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('warehouse')}</Label>
                      <WarehouseSelect
                        value={bucketWarehouseId}
                        onChange={setBucketWarehouseId}
                        placeholder={t('selectWarehouse')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('startDate')}</Label>
                      <Input
                        type="date"
                        value={bucketStartDate}
                        onChange={(e) => setBucketStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('endDate')}</Label>
                      <Input
                        type="date"
                        value={bucketEndDate}
                        onChange={(e) => setBucketEndDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('bucketSize')}</Label>
                      <Select value={bucketSize} onValueChange={setBucketSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">{t('byDay')}</SelectItem>
                          <SelectItem value="week">{t('byWeek')}</SelectItem>
                          <SelectItem value="month">{t('byMonth')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleCalculateBuckets}
                        disabled={bucketLoading || !bucketMaterialId || !bucketWarehouseId}
                        className="w-full"
                      >
                        {bucketLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        {t('calculate')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {timeBuckets.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('timeBucketChart')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={timeBuckets}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 12 }}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 12 }}
                                className="text-muted-foreground"
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                              <Legend />
                              <Bar
                                yAxisId="left"
                                dataKey="gross_requirement"
                                name={t('grossRequirement')}
                                fill="hsl(220, 70%, 55%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar
                                yAxisId="left"
                                dataKey="scheduled_receipt"
                                name={t('scheduledReceipt')}
                                fill="hsl(142, 70%, 45%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar
                                yAxisId="left"
                                dataKey="net_requirement"
                                name={t('netRequirement')}
                                fill="hsl(0, 70%, 55%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="on_hand"
                                name={t('onHand')}
                                stroke="hsl(38, 90%, 50%)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('timeBucketDetail')}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3">{t('date')}</th>
                                <th className="text-right py-2 px-3">
                                  {t('grossRequirement')}
                                </th>
                                <th className="text-right py-2 px-3">
                                  {t('scheduledReceipt')}
                                </th>
                                <th className="text-right py-2 px-3">{t('onHand')}</th>
                                <th className="text-right py-2 px-3">{t('netRequirement')}</th>
                                <th className="text-right py-2 px-3">
                                  {t('plannedOrderRelease')}
                                </th>
                                <th className="text-right py-2 px-3">
                                  {t('plannedOrderReceipt')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeBuckets.map((bucket, idx) => (
                                <tr
                                  key={idx}
                                  className={
                                    bucket.net_requirement > 0 ? 'bg-red-50 dark:bg-red-950/20' : ''
                                  }
                                >
                                  <td className="py-2 px-3 font-medium">{bucket.date}</td>
                                  <td className="py-2 px-3 text-right">
                                    {bucket.gross_requirement.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {bucket.scheduled_receipt.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {bucket.on_hand.toLocaleString(locale)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold">
                                    {bucket.net_requirement > 0
                                      ? bucket.net_requirement.toLocaleString(locale)
                                      : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {bucket.planned_order_release > 0
                                      ? bucket.planned_order_release.toLocaleString(locale)
                                      : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {bucket.planned_order_receipt > 0
                                      ? bucket.planned_order_receipt.toLocaleString(locale)
                                      : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
