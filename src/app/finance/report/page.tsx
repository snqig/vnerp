'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Download, BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ReportItem {
  id: number; period: string; type: string; category: string;
  revenue: number; cost: number; profit: number; profit_rate: number;
}

export default function FinanceReportPage() {
  const [list, setList] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [periodType, setPeriodType] = useState('month');
  const [summary, setSummary] = useState({ total_revenue: 0, total_cost: 0, total_profit: 0, profit_rate: 0 });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', period_type: periodType });
      const res = await fetch('/api/finance/report?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data?.list || []); setTotal(result.data?.total || 0); }
    } catch (e) { console.error(e); }
  }, [page, periodType]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/stats');
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setSummary({
          total_revenue: d.total_revenue || 0, total_cost: d.total_cost || 0,
          total_profit: d.total_profit || 0, profit_rate: d.profit_rate || 0,
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); fetchSummary(); }, [fetchData, fetchSummary]);

  const formatAmount = (amount: number) => ((amount || 0) / 100).toFixed(2);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">财务报表</h2>
          <div className="flex items-center gap-2">
            <Select value={periodType} onValueChange={v => { setPeriodType(v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">按日</SelectItem>
                <SelectItem value="week">按周</SelectItem>
                <SelectItem value="month">按月</SelectItem>
                <SelectItem value="quarter">按季</SelectItem>
                <SelectItem value="year">按年</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /><span className="text-sm text-muted-foreground">总收入</span></div>
              <div className="text-2xl font-bold text-green-600">¥{formatAmount(summary.total_revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /><span className="text-sm text-muted-foreground">总成本</span></div>
              <div className="text-2xl font-bold text-red-600">¥{formatAmount(summary.total_cost)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-blue-500" /><span className="text-sm text-muted-foreground">总利润</span></div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.total_profit)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-500" /><span className="text-sm text-muted-foreground">利润率</span></div>
              <div className="text-2xl font-bold">{(summary.profit_rate || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>收支明细</CardTitle>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />导出</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead className="text-right">收入</TableHead>
                  <TableHead className="text-right">成本</TableHead>
                  <TableHead className="text-right">利润</TableHead>
                  <TableHead className="text-right">利润率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : list.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell className="text-right text-green-600">¥{formatAmount(r.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">¥{formatAmount(r.cost)}</TableCell>
                    <TableCell className={`text-right ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{formatAmount(r.profit)}</TableCell>
                    <TableCell className="text-right">{(r.profit_rate || 0).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {total} 条记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
