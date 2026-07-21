'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClient } from '@/lib/api-client';
import { formatDate, formatAmount } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, Calculator } from 'lucide-react';

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
  const [_page, _setPage] = useState(1);
  const [_total, setTotal] = useState(0);

  const [showCalc, setShowCalc] = useState(false);
  const [calcWorkOrderId, setCalcWorkOrderId] = useState('');

  const pageSize = 20;

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
  }, [page]);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('workOrderNo')}</TableHead>
                <TableHead>{tc('planQty')}</TableHead>
                <TableHead>{tc('completedQty')}</TableHead>
                <TableHead>{tc('materialCost')}</TableHead>
                <TableHead>{tc('laborCost')}</TableHead>
                <TableHead>{tc('manufacturingCost')}</TableHead>
                <TableHead>{tc('totalCost')}</TableHead>
                <TableHead>{tc('unitCost')}</TableHead>
                <TableHead>{tc('calculateTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">{cost.work_order_no}</TableCell>
                  <TableCell>{cost.plan_qty}</TableCell>
                  <TableCell>{cost.completed_qty}</TableCell>
                  <TableCell>{formatAmount(cost.material_cost)}</TableCell>
                  <TableCell>{formatAmount(cost.labor_cost)}</TableCell>
                  <TableCell>{formatAmount(cost.manufacturing_cost)}</TableCell>
                  <TableCell className="font-bold">{formatAmount(cost.total_cost)}</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {formatAmount(cost.unit_cost)}
                  </TableCell>
                  <TableCell>{formatDate(cost.calculate_time)}</TableCell>
                </TableRow>
              ))}
              {costs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
