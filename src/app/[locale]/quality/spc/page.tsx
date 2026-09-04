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
import { useTranslations, useLocale } from 'next-intl';

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
  const tc = useTranslations('Common');
  const ts = useTranslations('Quality');
  if (value >= 1.33) return tc('excellent');
  if (value >= 1.0) return ts('k_1whyb9e');
  return ts('k_tecew2');
};

export default function SPCPage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const tc = useTranslations('Common');
  const locale = useLocale();

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
    } catch {}
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
    } catch {
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
    } catch {
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
    } catch {
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
    <MainLayout title={ts('k_evgxn6')}>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="xbar-r">
              <Activity className="h-4 w-4 mr-1" />
              {ts('k_13r6uqy')}</TabsTrigger>
            <TabsTrigger value="pareto">
              <BarChart3 className="h-4 w-4 mr-1" />
              {ts('k_14damjl')}</TabsTrigger>
            <TabsTrigger value="p-chart">
              <PieChart className="h-4 w-4 mr-1" />
              {tc('pChartTitle')}</TabsTrigger>
          </TabsList>

          <TabsContent value="xbar-r">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {ts('k_wgsa54')}</CardTitle>
                  <CardDescription>{tc('spcXbarRDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc('material')}</Label>
                      <Select value={xbarMaterialId} onValueChange={setXbarMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder={ts('k_1s1m8ux')} />
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
                      <Label>{tc('inspectionTypeLabel')}</Label>
                      <Select value={inspectionType} onValueChange={setInspectionType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incoming">{ts('k_109mrrr')}</SelectItem>
                          <SelectItem value="process">{ts('k_1q7pfzv')}</SelectItem>
                          <SelectItem value="finished">{ts('k_nwgik6')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('startDate')}</Label>
                      <Input
                        type="date"
                        value={xbarStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setXbarStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('endDate')}</Label>
                      <Input
                        type="date"
                        value={xbarEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setXbarEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('subgroupSizeLabel')}</Label>
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
                        {ts('k_o3qij0')}</Button>
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
                            {ts('k_1nfdpy2')}</CardTitle>
                          <CardDescription>
                            {tc('oocWarningPrefix')}
                            {xbarResult.out_of_control_points.length}
                            {tc('oocPointsSuffix')}
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
                                  {tc('subgroupLabel')}
                                  {p.subgroup_id} {p.type === 'x_bar' ? ts('k_ndjg9g') : ts('k_1a3sds6')}=
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
                        <CardTitle>{tc('xBarChartTitle')}</CardTitle>
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
                                name={ts('k_ndjg9g')}
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
                        <CardTitle>{tc('rChartTitle')}</CardTitle>
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
                                name={ts('k_bdjdvg')}
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
                        <CardTitle>{tc('dataTableTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{tc('subgroupCol')}</TableHead>
                                <TableHead>{tc('time')}</TableHead>
                                <TableHead>{tc('valuesCol')}</TableHead>
                                <TableHead className="text-right">{ts('k_ndjg9g')}</TableHead>
                                <TableHead className="text-right">{ts('k_bdjdvg')}</TableHead>
                                <TableHead>{tc('status')}</TableHead>
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
                                          {ts('k_kh2dxh')}</Badge>
                                      )}
                                      {isOocRange && (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          {ts('k_1swqj87')}</Badge>
                                      )}
                                      {!isOocXbar && !isOocRange && (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                          {ts('k_tt5vxa')}</Badge>
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
                    {ts('k_q7wmq3')}</CardTitle>
                  <CardDescription>{tc('paretoDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc('startDate')}</Label>
                      <Input
                        type="date"
                        value={paretoStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setParetoStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('endDate')}</Label>
                      <Input
                        type="date"
                        value={paretoEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setParetoEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('materialFilterLabel')}</Label>
                      <Select value={paretoMaterialId} onValueChange={setParetoMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder={ts('k_1rbspan')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ts('k_1rbspan')}</SelectItem>
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
                        {ts('k_1dcyb7v')}</Button>
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
                        <CardTitle>{tc('paretoChartTitle')}</CardTitle>
                        <CardDescription>{tc('paretoChartDesc')}</CardDescription>
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
                                  value: ts('k_1plb87s'),
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
                                  if (name === ts('k_1a0kfrf')) return [`${value.toFixed(1)}%`, name];
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
                                name={ts('k_1kd1xu8')}
                                fill="hsl(220, 70%, 55%)"
                                radius={[4, 4, 0, 0]}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumulative_percentage"
                                name={ts('k_1a0kfrf')}
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
                        <CardTitle>{tc('paretoTableTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{ts('k_o5rqlv')}</TableHead>
                                <TableHead className="text-right">{tc('quantity')}</TableHead>
                                <TableHead className="text-right">{tc('percentageCol')}</TableHead>
                                <TableHead className="text-right">{tc('cumulativeCol')}</TableHead>
                                <TableHead>{ts('k_1kbcp7q')}</TableHead>
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
                                        {ts('k_1dpavgt')}</Badge>
                                    ) : item.cumulative_percentage <= 95 ? (
                                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        {ts('k_j0vjmz')}</Badge>
                                    ) : (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        {ts('k_1lr5nkk')}</Badge>
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
                    {ts('k_xgepku')}</CardTitle>
                  <CardDescription>{tc('pChartDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{tc('startDate')}</Label>
                      <Input
                        type="date"
                        value={pChartStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPChartStartDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('endDate')}</Label>
                      <Input
                        type="date"
                        value={pChartEndDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPChartEndDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tc('materialFilterLabel')}</Label>
                      <Select value={pChartMaterialId} onValueChange={setPChartMaterialId}>
                        <SelectTrigger>
                          <SelectValue placeholder={ts('k_1rbspan')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ts('k_1rbspan')}</SelectItem>
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
                        {ts('k_1xe92u2')}</Button>
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
                            {ts('k_1nfdpy2')}</CardTitle>
                          <CardDescription>
                            {tc('oocWarningPrefix')}
                            {pChartResult.out_of_control_points.length}
                            {tc('oocPeriodsSuffix')}
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
                                  {p.period}
                                  {tc('defectiveRateLabel')}
                                  {(p.rate * 100).toFixed(2)}%
                                </Badge>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>{tc('pChartTitle')}</CardTitle>
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
                                  value: ts('k_lwxo24'),
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
                                formatter={(value: number) => [`${value.toFixed(2)}%`, ts('k_zgw0d2')]}
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
                                name={ts('k_lwxo24')}
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
                        <CardTitle>{tc('pChartTableTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{ts('k_1x0iz04')}</TableHead>
                                <TableHead className="text-right">{tc('inspectedCol')}</TableHead>
                                <TableHead className="text-right">{tc('defectiveCol')}</TableHead>
                                <TableHead className="text-right">{ts('k_zgw0d2')}</TableHead>
                                <TableHead>{tc('status')}</TableHead>
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
                                      {(dp.inspected ?? 0).toLocaleString(locale)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {(dp.defective ?? 0).toLocaleString(locale)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {(dp.defective_rate * 100).toFixed(2)}%
                                    </TableCell>
                                    <TableCell>
                                      {isOoc ? (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          {ts('k_1uz4mvb')}</Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                          {ts('k_tt5vxa')}</Badge>
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
