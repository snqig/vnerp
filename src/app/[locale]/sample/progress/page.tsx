'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ClipboardList, Clock, CheckCircle, AlertTriangle, ChevronRight, FileText, Wrench, CheckCheck, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';

interface SampleProgress {
  id: number;
  sample_no: string;
  customer_name: string;
  product_name: string;
  design_confirm: number;
  process_card: number;
  sampling: number;
  quality_inspection: number;
  delivery: number;
  status: string;
  responsible_person: string;
  require_date: string;
  actual_date: string | null;
  progress_percent: number;
}

const STAGES = [
  { key: 'design_confirm', label: '设计确认', icon: FileText, color: 'bg-blue-500' },
  { key: 'process_card', label: '工艺卡', icon: ClipboardList, color: 'bg-indigo-500' },
  { key: 'sampling', label: '打样中', icon: Wrench, color: 'bg-yellow-500' },
  { key: 'quality_inspection', label: '质检', icon: CheckCheck, color: 'bg-purple-500' },
  { key: 'delivery', label: '交付', icon: Package, color: 'bg-green-500' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待执行', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' },
  in_progress: { label: '进行中', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  completed: { label: '已完成', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  at_risk: { label: '延期风险', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

export default function SampleProgressPage() {
  const ts = useTranslations('Sample');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<SampleProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    inProgress: 0,
    dueToday: 0,
    dueThisWeek: 0,
    atRisk: 0,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (keyword) params.append('keyword', keyword);
      const res = await authFetch(`/api/sample/progress?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setStats(result.data?.stats || { inProgress: 0, dueToday: 0, dueThisWeek: 0, atRisk: 0 });
      }
    } catch {
      toast({ title: ts('k_fetchFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, keyword, ts, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStageStatus = (stage: number) => {
    if (stage === 1) return 'completed';
    if (stage === 2) return 'in_progress';
    return 'pending';
  };

  const getStageClassName = (stage: number) => {
    if (stage === 1) return 'bg-green-500 text-white';
    if (stage === 2) return 'bg-yellow-500 text-white animate-pulse';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  };

  const filteredList = list.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (keyword && !item.sample_no.includes(keyword) && !item.product_name.includes(keyword) && !item.customer_name.includes(keyword)) return false;
    return true;
  });

  return (
    <MainLayout title={ts('k_sampleProgress')}>
      <div className="space-y-6">
        <StatsCards
          configs={[
            { key: 'inProgress', label: ts('k_inProgress'), icon: ClipboardList, ...StatsTheme.blue },
            { key: 'dueToday', label: ts('k_dueToday'), icon: Clock, ...StatsTheme.orange },
            { key: 'dueThisWeek', label: ts('k_dueThisWeek'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'atRisk', label: ts('k_atRisk'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'inProgress', count: stats.inProgress },
            { key: 'dueToday', count: stats.dueToday },
            { key: 'dueThisWeek', count: stats.dueThisWeek },
            { key: 'atRisk', count: stats.atRisk },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
          showTrend={false}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{ts('k_sampleList')}</CardTitle>
              <CardDescription>{ts('k_sampleProgressDesc')}</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={ts('k_searchPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={ts('k_statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('all')}</SelectItem>
                  <SelectItem value="pending">{STATUS_MAP.pending.label}</SelectItem>
                  <SelectItem value="in_progress">{STATUS_MAP.in_progress.label}</SelectItem>
                  <SelectItem value="completed">{STATUS_MAP.completed.label}</SelectItem>
                  <SelectItem value="at_risk">{STATUS_MAP.at_risk.label}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {ts('k_noData')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_sampleNo')}</TableHead>
                    <TableHead>{ts('k_productName')}</TableHead>
                    <TableHead>{tc('customer')}</TableHead>
                    <TableHead>{ts('k_progress')}</TableHead>
                    <TableHead>{ts('k_responsiblePerson')}</TableHead>
                    <TableHead>{ts('k_requireDate')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sample_no}</TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {STAGES.map((stage, idx) => (
                            <div key={stage.key} className="flex items-center">
                              <Badge
                                className={`px-2 py-0.5 text-xs ${getStageClassName(item[stage.key as keyof SampleProgress] as number)}`}
                              >
                                {idx + 1}
                              </Badge>
                              {idx < STAGES.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-gray-300 mx-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${item.progress_percent}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>{item.responsible_person || '-'}</TableCell>
                      <TableCell>{formatDate(item.require_date)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[item.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[item.status]?.label || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          {ts('k_viewDetail')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
