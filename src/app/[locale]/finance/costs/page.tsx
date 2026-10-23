'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClient } from '@/lib/api-client';
import { formatDate, formatAmount } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, Calculator, DollarSign, Box, Users, MoreHorizontal } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface CostRecord {
  id: number;
  work_order_id: number;
  work_order_no: string;
  plan_qty: number;
  completed_qty: number;
  material_cost: number;
  labor_cost: number;
  manufacturing_cost: number;
  total_cost: number;
  unit_cost: number;
  calculate_time: string;
  status: number;
}

export default function CostsPage() {
  // 翻译钩子
  const tc = useTranslations('Common');

  const [costs, setCosts] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [showCalc, setShowCalc] = useState(false);
  const [calcWorkOrderId, setCalcWorkOrderId] = useState('');

  const loadCosts = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/costs', { page, pageSize });
      if (result.success) {
        setCosts(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('loadCostFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCosts();
  }, [page, pageSize]);

  const columns: StandardTableColumn<CostRecord>[] = [
    {
      key: 'work_order_no',
      title: tc('workOrderNo'),
      render: (c) => <span className="font-medium">{c.work_order_no}</span>,
    },
    { key: 'plan_qty', title: tc('planQty'), align: 'right' },
    { key: 'completed_qty', title: tc('completedQty'), align: 'right' },
    {
      key: 'material_cost',
      title: tc('materialCost'),
      align: 'right',
      render: (c) => formatAmount(c.material_cost),
    },
    {
      key: 'labor_cost',
      title: tc('laborCost'),
      align: 'right',
      render: (c) => formatAmount(c.labor_cost),
    },
    {
      key: 'manufacturing_cost',
      title: tc('manufacturingCost'),
      align: 'right',
      render: (c) => formatAmount(c.manufacturing_cost),
    },
    {
      key: 'total_cost',
      title: tc('totalCost'),
      align: 'right',
      render: (c) => <span className="font-bold">{formatAmount(c.total_cost)}</span>,
    },
    {
      key: 'unit_cost',
      title: tc('unitCost'),
      align: 'right',
      render: (c) => (
        <span className="text-blue-600 dark:text-blue-400 font-medium">
          {formatAmount(c.unit_cost)}
        </span>
      ),
    },
    {
      key: 'calculate_time',
      title: tc('calculateTime'),
      render: (c) => formatDate(c.calculate_time),
    },
  ];

  const handleCalculate = async () => {
    if (!calcWorkOrderId) {
      toast.error(tc('enterWorkOrderId'));
      return;
    }
    try {
      const result = await ApiClient.post('/api/finance/costs', {
        workOrderId: Number(calcWorkOrderId),
      });
      if (result.success) {
        toast.success(result.message);
        setShowCalc(false);
        setCalcWorkOrderId('');
        loadCosts();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(tc('calcFailed'));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalCost'), icon: DollarSign, ...StatsTheme.blue },
            { key: 'material', label: tc('materialCost'), icon: Box, ...StatsTheme.green },
            { key: 'labor', label: tc('laborCost'), icon: Users, ...StatsTheme.orange },
            { key: 'other', label: tc('otherCost'), icon: MoreHorizontal, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: costs.reduce((sum, c) => sum + (c.total_cost || 0), 0) },
            { key: 'material', count: costs.reduce((sum, c) => sum + (c.material_cost || 0), 0) },
            { key: 'labor', count: costs.reduce((sum, c) => sum + (c.labor_cost || 0), 0) },
            { key: 'other', count: costs.reduce((sum, c) => sum + (c.manufacturing_cost || 0), 0) },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{tc('costAccountingTitle')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalc(true)}>
            <Calculator className="w-4 h-4 mr-2" />
            {tc('calcCostButton')}
          </Button>
          <Button onClick={loadCosts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tc('costListTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StandardTable<CostRecord>
            columns={columns}
            dataSource={costs}
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[20, 25, 30]}
            rowKey="id"
            rowSelectable={false}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            loading={loading}
            onRetry={loadCosts}
            emptyText={tc('noData')}
          />
        </CardContent>
      </Card>

      {/* 计算成本弹窗 */}
      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('calcCostTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{tc('workOrderId')}</Label>
              <Input
                value={calcWorkOrderId}
                onChange={(e) => setCalcWorkOrderId(e.target.value)}
                placeholder={tc('enterWorkOrderId')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalc(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCalculate}>
              <Calculator className="w-4 h-4 mr-2" />
              {tc('calculate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
