'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
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

interface Warehouse {
  id: number;
  warehouse_name: string;
  warehouse_code: string;
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
  // 翻译钩子
  const t = useTranslations('Production');
  const tc = useTranslations('Common');

  const priorityConfig: Record<string, { label: string; className: string }> = {
    urgent: {
      label: tc('critical'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    normal: {
      label: tc('normal'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    low: { label: tc('low'), className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  };

  const [activeTab, setActiveTab] = useState('mrp-run');

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<number[]>([]);
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
    } catch (e) {
      console.error('获取工单失败:', e);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await authFetch('/api/organization/warehouse-category');
      const data = await res.json();
      if (data.success || data.data) {
        const list = Array.isArray(data.data) ? data.data : [];
        setWarehouses(
          list.map((item: Record<string, unknown>) => ({
            id: item.id as number,
            warehouse_name: (item.warehouse_name || item.name || '') as string,
            warehouse_code: (item.warehouse_code || item.code || '') as string,
          }))
        );
      }
    } catch (e) {
      console.error('获取仓库失败:', e);
    }
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
    } catch (e) {
      console.error('获取物料失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
    fetchWarehouses();
    fetchMaterials();
  }, [fetchWorkOrders, fetchWarehouses, fetchMaterials]);

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
    } catch (e) {
      console.error('MRP运算失败:', e);
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
    } catch (e) {
      console.error('BOM展开失败:', e);
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
    } catch (e) {
      console.error('时间分桶计算失败:', e);
    } finally {
      setBucketLoading(false);
    }
  };

  const toggleWorkOrder = (id: number) => {
    setSelectedWorkOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <MainLayout title="MRP 物料需求计划">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="mrp-run">
              <Play className="h-4 w-4 mr-1" />
              MRP运算
            </TabsTrigger>
            <TabsTrigger value="bom-explode">
              <TreePine className="h-4 w-4 mr-1" />
              BOM展开
            </TabsTrigger>
            <TabsTrigger value="time-bucket">
              <BarChart3 className="h-4 w-4 mr-1" />
              时间分桶
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mrp-run">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5" />
                    MRP运算参数
                  </CardTitle>
                  <CardDescription>选择工单和仓库，运行MRP物料需求计划</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-1">
                      <Label>选择工单</Label>
                      <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 bg-muted/30">
                        {workOrders.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            暂无工单数据
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
                          已选择 {selectedWorkOrderIds.length} 个工单
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>仓库</Label>
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择仓库" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh.id} value={String(wh.id)}>
                                {wh.warehouse_name} ({wh.warehouse_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <Switch checked={autoGeneratePR} onCheckedChange={setAutoGeneratePR} />
                        <div>
                          <Label className="cursor-pointer">自动生成采购申请</Label>
                          <p className="text-xs text-muted-foreground">
                            MRP运算后自动创建采购申请单
                          </p>
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
                        运行MRP
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
                          <CardTitle className="text-sm font-medium">涉及物料</CardTitle>
                          <Layers className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {mrpResult.summary.total_materials}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">缺料项</CardTitle>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {mrpResult.summary.total_shortages}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">计划数量</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {mrpResult.summary.total_planned_qty.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">计划金额</CardTitle>
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ¥{mrpResult.summary.total_planned_amount.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {mrpResult.purchase_requests && mrpResult.purchase_requests.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            已生成采购申请
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4 flex-wrap">
                            {mrpResult.purchase_requests.map((pr, idx) => (
                              <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                                {pr.request_no} ({pr.item_count}项)
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>净需求明细</CardTitle>
                        <CardDescription>MRP运算后的物料净需求分析</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>物料编码</TableHead>
                                <TableHead>物料名称</TableHead>
                                <TableHead className="text-right">毛需求</TableHead>
                                <TableHead className="text-right">在库</TableHead>
                                <TableHead className="text-right">已分配</TableHead>
                                <TableHead className="text-right">在途</TableHead>
                                <TableHead className="text-right">安全库存</TableHead>
                                <TableHead className="text-right">净需求</TableHead>
                                <TableHead className="text-right">提前期(天)</TableHead>
                                <TableHead>建议下单日期</TableHead>
                                <TableHead>缺料预警</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mrpResult.net_requirements.map((req, idx) => (
                                <TableRow
                                  key={idx}
                                  className={
                                    req.shortage_warning ? 'bg-red-50 dark:bg-red-950/20' : ''
                                  }
                                >
                                  <TableCell className="font-medium">{req.material_code}</TableCell>
                                  <TableCell>{req.material_name}</TableCell>
                                  <TableCell className="text-right">
                                    {req.gross_requirement.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {req.on_hand_qty.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {req.allocated_qty.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {req.in_transit_qty.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {req.safety_stock.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {req.net_requirement > 0
                                      ? req.net_requirement.toLocaleString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">{req.lead_time_days}</TableCell>
                                  <TableCell>{req.suggested_order_date}</TableCell>
                                  <TableCell>
                                    {req.shortage_warning ? (
                                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        缺料
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      >
                                        充足
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {mrpResult.net_requirements.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={11}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    暂无净需求数据
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>计划订单</CardTitle>
                        <CardDescription>MRP建议的采购计划订单</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>物料编码</TableHead>
                                <TableHead>物料名称</TableHead>
                                <TableHead className="text-right">数量</TableHead>
                                <TableHead>需求日期</TableHead>
                                <TableHead>下单日期</TableHead>
                                <TableHead>优先级</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mrpResult.planned_orders.map((order, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {order.material_code}
                                  </TableCell>
                                  <TableCell>{order.material_name}</TableCell>
                                  <TableCell className="text-right">
                                    {order.quantity.toLocaleString()}
                                  </TableCell>
                                  <TableCell>{order.required_date}</TableCell>
                                  <TableCell>{order.order_date}</TableCell>
                                  <TableCell>
                                    <Badge className={priorityConfig[order.priority]?.className}>
                                      {priorityConfig[order.priority]?.label || order.priority}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {mrpResult.planned_orders.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    暂无计划订单
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
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
                    BOM展开
                  </CardTitle>
                  <CardDescription>选择产品并展开BOM物料清单</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>选择产品</Label>
                      <Select value={bomProductId} onValueChange={setBomProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品" />
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
                      <Label>数量</Label>
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
                        展开BOM
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
                        <CardTitle>BOM展开结果</CardTitle>
                        <CardDescription>
                          {bomTree.material_name} × {bomQuantity} {bomTree.unit}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">层级</TableHead>
                                <TableHead>物料编码</TableHead>
                                <TableHead>物料名称</TableHead>
                                <TableHead className="text-right">数量</TableHead>
                                <TableHead>单位</TableHead>
                                <TableHead className="text-right">损耗率</TableHead>
                                <TableHead className="text-right">提前期(天)</TableHead>
                                <TableHead>类型</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {flattenBOMTree(bomTree).map((node, idx) => (
                                <TableRow
                                  key={`${node.path}-${idx}`}
                                  className={
                                    node.level === 0
                                      ? 'bg-muted/50 font-semibold'
                                      : node.is_leaf
                                        ? ''
                                        : 'bg-blue-50/50 dark:bg-blue-950/20'
                                  }
                                >
                                  <TableCell>
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
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {node.material_code}
                                  </TableCell>
                                  <TableCell className={node.is_leaf ? '' : 'font-medium'}>
                                    {node.material_name}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {node.quantity.toLocaleString()}
                                  </TableCell>
                                  <TableCell>{node.unit}</TableCell>
                                  <TableCell className="text-right">
                                    {node.scrap_rate > 0
                                      ? `${(node.scrap_rate * 100).toFixed(1)}%`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {node.lead_time_days}
                                  </TableCell>
                                  <TableCell>
                                    {node.level === 0 ? (
                                      <Badge variant="outline">成品</Badge>
                                    ) : node.is_leaf ? (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        原材料
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        半成品
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
                    时间分桶分析
                  </CardTitle>
                  <CardDescription>按时间段分析物料的需求、库存和净需求</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>物料</Label>
                      <Select value={bucketMaterialId} onValueChange={setBucketMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择物料" />
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
                      <Label>仓库</Label>
                      <Select value={bucketWarehouseId} onValueChange={setBucketWarehouseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择仓库" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={String(wh.id)}>
                              {wh.warehouse_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>开始日期</Label>
                      <Input
                        type="date"
                        value={bucketStartDate}
                        onChange={(e) => setBucketStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>结束日期</Label>
                      <Input
                        type="date"
                        value={bucketEndDate}
                        onChange={(e) => setBucketEndDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>分桶粒度</Label>
                      <Select value={bucketSize} onValueChange={setBucketSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">按天</SelectItem>
                          <SelectItem value="week">按周</SelectItem>
                          <SelectItem value="month">按月</SelectItem>
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
                        计算
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
                        <CardTitle>时间分桶图表</CardTitle>
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
                                name="毛需求"
                                fill="hsl(220, 70%, 55%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar
                                yAxisId="left"
                                dataKey="scheduled_receipt"
                                name="计划接收"
                                fill="hsl(142, 70%, 45%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar
                                yAxisId="left"
                                dataKey="net_requirement"
                                name="净需求"
                                fill="hsl(0, 70%, 55%)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="on_hand"
                                name="库存量"
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
                        <CardTitle>时间分桶明细</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>日期</TableHead>
                                <TableHead className="text-right">毛需求</TableHead>
                                <TableHead className="text-right">计划接收</TableHead>
                                <TableHead className="text-right">库存量</TableHead>
                                <TableHead className="text-right">净需求</TableHead>
                                <TableHead className="text-right">计划下达</TableHead>
                                <TableHead className="text-right">计划接收(新)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {timeBuckets.map((bucket, idx) => (
                                <TableRow
                                  key={idx}
                                  className={
                                    bucket.net_requirement > 0 ? 'bg-red-50 dark:bg-red-950/20' : ''
                                  }
                                >
                                  <TableCell className="font-medium">{bucket.date}</TableCell>
                                  <TableCell className="text-right">
                                    {bucket.gross_requirement.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {bucket.scheduled_receipt.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {bucket.on_hand.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {bucket.net_requirement > 0
                                      ? bucket.net_requirement.toLocaleString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {bucket.planned_order_release > 0
                                      ? bucket.planned_order_release.toLocaleString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {bucket.planned_order_receipt > 0
                                      ? bucket.planned_order_receipt.toLocaleString()
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
