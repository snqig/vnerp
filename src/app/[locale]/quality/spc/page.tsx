'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Target,
  Shield,
  PieChart,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
}

interface SPCDataPoint {
  subgroup_id: number;
  timestamp: string;
  values: number[];
  x_bar: number;
  range: number;
}

interface ControlLimit {
  ucl: number;
  cl: number;
  lcl: number;
}

interface OutOfControlPoint {
  subgroup_id?: number;
  type?: 'x_bar' | 'range';
  value: number;
  limit: number;
}

interface XbarRChartResult {
  data_points: SPCDataPoint[];
  x_bar_limits: ControlLimit;
  r_limits: ControlLimit;
  out_of_control_points: OutOfControlPoint[];
  process_capability: {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
  };
}

interface ParetoItem {
  defect_type: string;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

interface PChartDataPoint {
  period: string;
  inspected: number;
  defective: number;
  defective_rate: number;
}

interface PChartResult {
  data_points: PChartDataPoint[];
  limits: ControlLimit;
  out_of_control_points: { period: string; rate: number; limit: number }[];
}

const capabilityColor = (value: number): string => {
  if (value >= 1.33) return 'text-green-600 dark:text-green-400';
  if (value >= 1.0) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const capabilityLabel = (value: number): string => {
  if (value >= 1.33) return '优秀';
  if (value >= 1.0) return '可接受';
  return '需改善';
};

export default function SPCPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const [activeTab, setActiveTab] = useState('xbar-r');
  const [materials, setMaterials] = useState<Material[]>([]);

  const [xbarMaterialId, setXbarMaterialId] = useState<string>('');
  const [inspectionType, setInspectionType] = useState<string>('process');
  const [xbarStartDate, setXbarStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [xbarEndDate, setXbarEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subgroupSize, setSubgroupSize] = useState<string>('5');
  const [xbarLoading, setXbarLoading] = useState(false);
  const [xbarResult, setXbarResult] = useState<XbarRChartResult | null>(null);

  const [paretoStartDate, setParetoStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [paretoEndDate, setParetoEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paretoMaterialId, setParetoMaterialId] = useState<string>('');
  const [paretoLoading, setParetoLoading] = useState(false);
  const [paretoResult, setParetoResult] = useState<ParetoItem[]>([]);

  const [pChartStartDate, setPChartStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [pChartEndDate, setPChartEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pChartMaterialId, setPChartMaterialId] = useState<string>('');
  const [pChartLoading, setPChartLoading] = useState(false);
  const [pChartResult, setPChartResult] = useState<PChartResult | null>(null);

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
    fetchMaterials();
  }, [fetchMaterials]);

  const handleGenerateXbarR = async () => {
    if (!xbarMaterialId) return;
    setXbarLoading(true);
    try {
      const res = await authFetch(
        `/api/quality/spc?action=xbar-r&materialId=${xbarMaterialId}&inspectionType=${inspectionType}&startDate=${xbarStartDate}&endDate=${xbarEndDate}&subgroupSize=${subgroupSize}`
      );
      const data = await res.json();
      if (data.success || data.data) {
        setXbarResult(data.data || data);
      }
    } catch (e) {
      console.error('生成Xbar-R图失败:', e);
    } finally {
      setXbarLoading(false);
    }
  };

  const handleAnalyzePareto = async () => {
    setParetoLoading(true);
    try {
      let url = `/api/quality/spc?action=pareto&startDate=${paretoStartDate}&endDate=${paretoEndDate}`;
      if (paretoMaterialId) url += `&materialId=${paretoMaterialId}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success || data.data) {
        setParetoResult(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.error('帕累托分析失败:', e);
    } finally {
      setParetoLoading(false);
    }
  };

  const handleGeneratePChart = async () => {
    setPChartLoading(true);
    try {
      let url = `/api/quality/spc?action=p-chart&startDate=${pChartStartDate}&endDate=${pChartEndDate}`;
      if (pChartMaterialId) url += `&materialId=${pChartMaterialId}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success || data.data) {
        setPChartResult(data.data || data);
      }
    } catch (e) {
      console.error('生成P控制图失败:', e);
    } finally {
      setPChartLoading(false);
    }
  };

  const buildXbarChartData = () => {
    if (!xbarResult) return [];
    const oocXbar = new Set(
      xbarResult.out_of_control_points
        .filter((p: OutOfControlPoint) => p.type === 'x_bar')
        .map((p: OutOfControlPoint) => p.subgroup_id)
    );
    return xbarResult.data_points.map((dp) => ({
      subgroup: `#${dp.subgroup_id}`,
      x_bar: Math.round(dp.x_bar * 10000) / 10000,
      is_ooc: oocXbar.has(dp.subgroup_id),
    }));
  };

  const buildRChartData = () => {
    if (!xbarResult) return [];
    const oocRange = new Set(
      xbarResult.out_of_control_points
        .filter((p: OutOfControlPoint) => p.type === 'range')
        .map((p: OutOfControlPoint) => p.subgroup_id)
    );
    return xbarResult.data_points.map((dp) => ({
      subgroup: `#${dp.subgroup_id}`,
      range: Math.round(dp.range * 10000) / 10000,
      is_ooc: oocRange.has(dp.subgroup_id),
    }));
  };

  return (
    <MainLayout title="SPC 统计过程控制">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="xbar-r">
              <Activity className="h-4 w-4 mr-1" />
              Xbar-R 控制图
            </TabsTrigger>
            <TabsTrigger value="pareto">
              <BarChart3 className="h-4 w-4 mr-1" />
              帕累托分析
            </TabsTrigger>
            <TabsTrigger value="p-chart">
              <PieChart className="h-4 w-4 mr-1" />
              P控制图
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xbar-r">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Xbar-R 控制图参数
                  </CardTitle>
                  <CardDescription>选择物料和检验参数，生成X均值-极差控制图</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc("material")}</Label>
                      <Select value={xbarMaterialId} onValueChange={setXbarMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择物料" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m: Material) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.material_code} - {m.material_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>检验类型</Label>
                      <Select value={inspectionType} onValueChange={setInspectionType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incoming">来料检验</SelectItem>
                          <SelectItem value="process">过程检验</SelectItem>
                          <SelectItem value="finished">成品检验</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{tc("startDate")}</Label>
                      <Input
                        type="date"
                        value={xbarStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setXbarStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc("endDate")}</Label>
                      <Input
                        type="date"
                        value={xbarEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setXbarEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>子组大小</Label>
                      <Select value={subgroupSize} onValueChange={setSubgroupSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleGenerateXbarR}
                        disabled={xbarLoading || !xbarMaterialId}
                        className="w-full"
                      >
                        {xbarLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        生成图表
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {xbarResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cp</CardTitle>
                          <Target className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${capabilityColor(xbarResult.process_capability.cp)}`}
                          >
                            {xbarResult.process_capability.cp.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {capabilityLabel(xbarResult.process_capability.cp)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cpk</CardTitle>
                          <Shield className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${capabilityColor(xbarResult.process_capability.cpk)}`}
                          >
                            {xbarResult.process_capability.cpk.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {capabilityLabel(xbarResult.process_capability.cpk)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Pp</CardTitle>
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${capabilityColor(xbarResult.process_capability.pp)}`}
                          >
                            {xbarResult.process_capability.pp.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {capabilityLabel(xbarResult.process_capability.pp)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Ppk</CardTitle>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${capabilityColor(xbarResult.process_capability.ppk)}`}
                          >
                            {xbarResult.process_capability.ppk.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {capabilityLabel(xbarResult.process_capability.ppk)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {xbarResult.out_of_control_points.length > 0 && (
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            异常点警告
                          </CardTitle>
                          <CardDescription>
                            检测到 {xbarResult.out_of_control_points.length} 个超出控制限的点
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {xbarResult.out_of_control_points.map(
                              (p: OutOfControlPoint, idx: number) => (
                                <Badge
                                  key={idx}
                                  className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                >
                                  子组#{p.subgroup_id} {p.type === 'x_bar' ? 'X均值' : '极差'}=
                                  {p.value.toFixed(4)}
                                </Badge>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>X-bar 均值控制图</CardTitle>
                        <CardDescription>
                          UCL={xbarResult.x_bar_limits.ucl.toFixed(4)} | CL=
                          {xbarResult.x_bar_limits.cl.toFixed(4)} | LCL=
                          {xbarResult.x_bar_limits.lcl.toFixed(4)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={buildXbarChartData()}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="subgroup" tick={{ fontSize: 11 }} />
                              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                              <ReferenceLine
                                y={xbarResult.x_bar_limits.ucl}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'UCL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={xbarResult.x_bar_limits.cl}
                                stroke="hsl(220, 70%, 50%)"
                                strokeDasharray="3 3"
                                label={{ value: 'CL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={xbarResult.x_bar_limits.lcl}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'LCL', position: 'right', fontSize: 11 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="x_bar"
                                name="X均值"
                                stroke="hsl(220, 70%, 50%)"
                                strokeWidth={2}
                                dot={(props: Record<string, unknown>) => {
                                  const cx = props.cx as number;
                                  const cy = props.cy as number;
                                  const payload = props.payload as {
                                    is_ooc: boolean;
                                    subgroup: string;
                                  };
                                  if (payload.is_ooc) {
                                    return (
                                      <circle
                                        key={`ooc-${payload.subgroup}`}
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill="hsl(0, 70%, 50%)"
                                        stroke="hsl(0, 70%, 50%)"
                                        strokeWidth={2}
                                      />
                                    );
                                  }
                                  return (
                                    <circle
                                      key={`normal-${payload.subgroup}`}
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill="hsl(220, 70%, 50%)"
                                      stroke="hsl(220, 70%, 50%)"
                                      strokeWidth={1}
                                    />
                                  );
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>R 极差控制图</CardTitle>
                        <CardDescription>
                          UCL={xbarResult.r_limits.ucl.toFixed(4)} | CL=
                          {xbarResult.r_limits.cl.toFixed(4)} | LCL=
                          {xbarResult.r_limits.lcl.toFixed(4)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={buildRChartData()}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="subgroup" tick={{ fontSize: 11 }} />
                              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                              <ReferenceLine
                                y={xbarResult.r_limits.ucl}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'UCL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={xbarResult.r_limits.cl}
                                stroke="hsl(142, 70%, 40%)"
                                strokeDasharray="3 3"
                                label={{ value: 'CL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={xbarResult.r_limits.lcl}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'LCL', position: 'right', fontSize: 11 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="range"
                                name="极差R"
                                stroke="hsl(142, 70%, 40%)"
                                strokeWidth={2}
                                dot={(props: Record<string, unknown>) => {
                                  const cx = props.cx as number;
                                  const cy = props.cy as number;
                                  const payload = props.payload as {
                                    is_ooc: boolean;
                                    subgroup: string;
                                  };
                                  if (payload.is_ooc) {
                                    return (
                                      <circle
                                        key={`ooc-r-${payload.subgroup}`}
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill="hsl(0, 70%, 50%)"
                                        stroke="hsl(0, 70%, 50%)"
                                        strokeWidth={2}
                                      />
                                    );
                                  }
                                  return (
                                    <circle
                                      key={`normal-r-${payload.subgroup}`}
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill="hsl(142, 70%, 40%)"
                                      stroke="hsl(142, 70%, 40%)"
                                      strokeWidth={1}
                                    />
                                  );
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>子组数据明细</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>子组</TableHead>
                                <TableHead>{tc("time")}</TableHead>
                                <TableHead>测量值</TableHead>
                                <TableHead className="text-right">X均值</TableHead>
                                <TableHead className="text-right">极差R</TableHead>
                                <TableHead>{tc("status")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {xbarResult.data_points.map((dp: SPCDataPoint, idx: number) => {
                                const isOocXbar = xbarResult.out_of_control_points.some(
                                  (p: OutOfControlPoint) =>
                                    p.subgroup_id === dp.subgroup_id && p.type === 'x_bar'
                                );
                                const isOocRange = xbarResult.out_of_control_points.some(
                                  (p: OutOfControlPoint) =>
                                    p.subgroup_id === dp.subgroup_id && p.type === 'range'
                                );
                                return (
                                  <TableRow
                                    key={idx}
                                    className={
                                      isOocXbar || isOocRange ? 'bg-red-50 dark:bg-red-950/20' : ''
                                    }
                                  >
                                    <TableCell className="font-medium">#{dp.subgroup_id}</TableCell>
                                    <TableCell className="text-sm">
                                      {dp.timestamp?.substring(0, 19) || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">
                                      [{dp.values.map((v: number) => v.toFixed(2)).join(', ')}]
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {dp.x_bar.toFixed(4)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {dp.range.toFixed(4)}
                                    </TableCell>
                                    <TableCell>
                                      {isOocXbar && (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mr-1">
                                          X异常
                                        </Badge>
                                      )}
                                      {isOocRange && (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          R异常
                                        </Badge>
                                      )}
                                      {!isOocXbar && !isOocRange && (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                          正常
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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

          <TabsContent value="pareto">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    帕累托分析参数
                  </CardTitle>
                  <CardDescription>分析不良类型的分布，识别主要质量问题</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc("startDate")}</Label>
                      <Input
                        type="date"
                        value={paretoStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setParetoStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc("endDate")}</Label>
                      <Input
                        type="date"
                        value={paretoEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setParetoEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>物料（可选）</Label>
                      <Select value={paretoMaterialId} onValueChange={setParetoMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder="全部物料" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部物料</SelectItem>
                          {materials.map((m: Material) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.material_code} - {m.material_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleAnalyzePareto}
                        disabled={paretoLoading}
                        className="w-full"
                      >
                        {paretoLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        分析
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {paretoResult.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>帕累托图</CardTitle>
                        <CardDescription>不良类型分布及累计百分比</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={paretoResult}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis
                                dataKey="defect_type"
                                tick={{ fontSize: 11 }}
                                angle={-30}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 11 }}
                                label={{
                                  value: tc('quantity'),
                                  angle: -90,
                                  position: 'insideLeft',
                                  fontSize: 12,
                                }}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                tick={{ fontSize: 11 }}
                                label={{
                                  value: '累计%',
                                  angle: 90,
                                  position: 'insideRight',
                                  fontSize: 12,
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                                formatter={(value: number, name: string) => {
                                  if (name === '累计百分比') return [`${value.toFixed(1)}%`, name];
                                  return [value, name];
                                }}
                              />
                              <Legend />
                              <ReferenceLine
                                yAxisId="right"
                                y={80}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="8 4"
                                label={{
                                  value: '80%',
                                  position: 'right',
                                  fontSize: 11,
                                  fill: 'hsl(0, 70%, 50%)',
                                }}
                              />
                              <Bar
                                yAxisId="left"
                                dataKey="count"
                                name="不良数量"
                                fill="hsl(220, 70%, 55%)"
                                radius={[4, 4, 0, 0]}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumulative_percentage"
                                name="累计百分比"
                                stroke="hsl(38, 90%, 50%)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'hsl(38, 90%, 50%)' }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>不良类型明细</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>不良类型</TableHead>
                                <TableHead className="text-right">{tc("quantity")}</TableHead>
                                <TableHead className="text-right">占比</TableHead>
                                <TableHead className="text-right">累计占比</TableHead>
                                <TableHead>分类</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paretoResult.map((item: ParetoItem, idx: number) => (
                                <TableRow
                                  key={idx}
                                  className={
                                    item.cumulative_percentage <= 80
                                      ? 'bg-red-50 dark:bg-red-950/20'
                                      : ''
                                  }
                                >
                                  <TableCell className="font-medium">{item.defect_type}</TableCell>
                                  <TableCell className="text-right">{item.count}</TableCell>
                                  <TableCell className="text-right">
                                    {item.percentage.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.cumulative_percentage.toFixed(1)}%
                                  </TableCell>
                                  <TableCell>
                                    {item.cumulative_percentage <= 80 ? (
                                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        A类(关键)
                                      </Badge>
                                    ) : item.cumulative_percentage <= 95 ? (
                                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        B类(重要)
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        C类(一般)
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

          <TabsContent value="p-chart">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    P控制图参数
                  </CardTitle>
                  <CardDescription>监控不合格品率的变化趋势</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc("startDate")}</Label>
                      <Input
                        type="date"
                        value={pChartStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPChartStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc("endDate")}</Label>
                      <Input
                        type="date"
                        value={pChartEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPChartEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>物料（可选）</Label>
                      <Select value={pChartMaterialId} onValueChange={setPChartMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder="全部物料" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部物料</SelectItem>
                          {materials.map((m: Material) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.material_code} - {m.material_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleGeneratePChart}
                        disabled={pChartLoading}
                        className="w-full"
                      >
                        {pChartLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <PieChart className="h-4 w-4 mr-2" />
                        )}
                        生成
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AnimatePresence>
                {pChartResult && pChartResult.data_points.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {pChartResult.out_of_control_points.length > 0 && (
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            异常点警告
                          </CardTitle>
                          <CardDescription>
                            检测到 {pChartResult.out_of_control_points.length} 个超出控制限的时段
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {pChartResult.out_of_control_points.map(
                              (p: { period: string; rate: number; limit: number }, idx: number) => (
                                <Badge
                                  key={idx}
                                  className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                >
                                  {p.period} 不良率={(p.rate * 100).toFixed(2)}%
                                </Badge>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>P 不合格品率控制图</CardTitle>
                        <CardDescription>
                          UCL={(pChartResult.limits.ucl * 100).toFixed(2)}% | CL=
                          {(pChartResult.limits.cl * 100).toFixed(2)}% | LCL=
                          {(pChartResult.limits.lcl * 100).toFixed(2)}%
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={pChartResult.data_points.map((dp: PChartDataPoint) => ({
                                period: dp.period,
                                defective_rate: Math.round(dp.defective_rate * 10000) / 100,
                                is_ooc: pChartResult.out_of_control_points.some(
                                  (ooc: { period: string; rate: number; limit: number }) =>
                                    ooc.period === dp.period
                                ),
                              }))}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                label={{
                                  value: '不良率(%)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  fontSize: 12,
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                                formatter={(value: number) => [`${value.toFixed(2)}%`, '不良率']}
                              />
                              <ReferenceLine
                                y={pChartResult.limits.ucl * 100}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'UCL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={pChartResult.limits.cl * 100}
                                stroke="hsl(220, 70%, 50%)"
                                strokeDasharray="3 3"
                                label={{ value: 'CL', position: 'right', fontSize: 11 }}
                              />
                              <ReferenceLine
                                y={pChartResult.limits.lcl * 100}
                                stroke="hsl(0, 70%, 50%)"
                                strokeDasharray="5 5"
                                label={{ value: 'LCL', position: 'right', fontSize: 11 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="defective_rate"
                                name="不良率(%)"
                                stroke="hsl(220, 70%, 50%)"
                                strokeWidth={2}
                                dot={(props: Record<string, unknown>) => {
                                  const cx = props.cx as number;
                                  const cy = props.cy as number;
                                  const payload = props.payload as {
                                    is_ooc: boolean;
                                    period: string;
                                  };
                                  if (payload.is_ooc) {
                                    return (
                                      <circle
                                        key={`ooc-p-${payload.period}`}
                                        cx={cx}
                                        cy={cy}
                                        r={6}
                                        fill="hsl(0, 70%, 50%)"
                                        stroke="hsl(0, 70%, 50%)"
                                        strokeWidth={2}
                                      />
                                    );
                                  }
                                  return (
                                    <circle
                                      key={`normal-p-${payload.period}`}
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill="hsl(220, 70%, 50%)"
                                      stroke="hsl(220, 70%, 50%)"
                                      strokeWidth={1}
                                    />
                                  );
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>P图数据明细</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>时段</TableHead>
                                <TableHead className="text-right">检验数</TableHead>
                                <TableHead className="text-right">不良数</TableHead>
                                <TableHead className="text-right">不良率</TableHead>
                                <TableHead>{tc("status")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pChartResult.data_points.map((dp: PChartDataPoint, idx: number) => {
                                const isOoc = pChartResult.out_of_control_points.some(
                                  (ooc: { period: string; rate: number; limit: number }) =>
                                    ooc.period === dp.period
                                );
                                return (
                                  <TableRow
                                    key={idx}
                                    className={isOoc ? 'bg-red-50 dark:bg-red-950/20' : ''}
                                  >
                                    <TableCell className="font-medium">{dp.period}</TableCell>
                                    <TableCell className="text-right">
                                      {(dp.inspected ?? 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {(dp.defective ?? 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {(dp.defective_rate * 100).toFixed(2)}%
                                    </TableCell>
                                    <TableCell>
                                      {isOoc ? (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          异常
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                          正常
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
