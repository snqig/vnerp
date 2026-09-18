'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Search, Save, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRowSelection } from '@/lib/useRowSelection';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

interface ScoreRow {
  /** hr_performance.id，员工尚未打分时为 null */
  perfId: number | null;
  employeeId: number;
  employeeName: string;
  employeeNo: string;
  outputRate: number;
  qualityRate: number;
  equipmentRate: number;
  siteManagement: number;
  totalScore: number;
}

const calculateTotal = (row: {
  outputRate: number;
  qualityRate: number;
  equipmentRate: number;
  siteManagement: number;
}) => {
  return (
    Math.round(
      (row.outputRate * 0.4 +
        row.qualityRate * 0.3 +
        row.equipmentRate * 0.15 +
        row.siteManagement * 0.15) *
        100
    ) / 100
  );
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function PerformancePage() {
  const ts = useTranslations('Common');
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [_loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/performance');
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        setScores(
          (list as Record<string, unknown>[]).map((i) => {
            const row = {
              perfId: i.perf_id === null || i.perf_id === undefined ? null : Number(i.perf_id),
              employeeId: Number(i.employee_id),
              employeeName: String(i.employee_name ?? ''),
              employeeNo: String(i.employee_no ?? ''),
              outputRate: num(i.output_rate),
              qualityRate: num(i.quality_rate),
              equipmentRate: num(i.equipment_rate),
              siteManagement: num(i.site_management),
              totalScore: 0,
            };
            return { ...row, totalScore: calculateTotal(row) };
          })
        );
      } else {
        setScores([]);
      }
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
     
  }, []);

  const updateScore = (employeeId: number, field: keyof ScoreRow, value: number) => {
    setScores((prev) =>
      prev.map((r) => {
        if (r.employeeId !== employeeId) return r;
        const updated = { ...r, [field]: value };
        updated.totalScore = calculateTotal(updated);
        return updated;
      })
    );
  };

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/hr/performance', {
        method: 'POST',
        body: JSON.stringify({
          scores: scores.map((r) => ({
            employeeId: r.employeeId,
            outputRate: r.outputRate,
            qualityRate: r.qualityRate,
            equipmentRate: r.equipmentRate,
            siteManagement: r.siteManagement,
          })),
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('saveSuccess') || ts('k_16krn1'));
        fetchScores();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(t('saveFailed') || ts('k_1q9u8le'));
    }
  };

  const filtered = scores.filter(
    (r) => !search || r.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(filtered, (r) => String(r.employeeId));
  const [deleting, setDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0;
    let failMsg = '';
    for (const employeeId of ids) {
      const row = scores.find((r) => String(r.employeeId) === employeeId);
      if (!row?.perfId) continue; // 尚未打分，无记录可删
      try {
        const res = await authFetch(`/api/hr/performance?id=${row.perfId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) okCount++;
        else failMsg = data.message || failMsg;
      } catch {
        failMsg = tc('error');
      }
    }
    setDeleting(false);
    if (okCount > 0) toast.success(tc('batchDeleteSuccess', { count: okCount }));
    if (failMsg) toast.error(failMsg);
    clear();
    fetchScores();
  };

  return (
    <MainLayout title={t('performance') || ts('k_1g8d66q')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('performance') || ts('k_1g8d66q')}</h1>
          </div>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            {tc('save')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchEmployee') || ts('k_1stef0e')}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} loading={deleting} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input ref={selectAllRef} type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={allSelected} onChange={toggleAll} aria-label={tc('selectAll')} />
                  </TableHead>
                  <TableHead>{t('employeeName') || ts('k_10ld5dp')}</TableHead>
                  <TableHead className="text-right">
                    {t('outputRate40') || ts('k_sc91k0')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('qualityRate30') || ts('k_yspo8i')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('equipmentRate15') || ts('k_jacx39')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('siteManagement15') || ts('k_3f0n70')}
                  </TableHead>
                  <TableHead className="text-right text-blue-600 font-bold">
                    {t('totalScore') || ts('k_x4ssb8')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.employeeId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                        checked={isSelected(String(r.employeeId))}
                        onChange={() => toggle(String(r.employeeId))}
                        aria-label={t('performance') || ts('k_1g8d66q')}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{r.employeeName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.employeeNo}</span>
                      </div>
                    </TableCell>
                    {(
                      ['outputRate', 'qualityRate', 'equipmentRate', 'siteManagement'] as const
                    ).map((field) => (
                      <TableCell key={field} className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-24 text-right h-8 inline-block"
                          value={r[field]}
                          onChange={(e) =>
                            updateScore(r.employeeId, field, parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-blue-600">
                        {r.totalScore.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('noData') || ts('k_6tzr61')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
