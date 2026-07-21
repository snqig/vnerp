'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Save, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ScoreRow {
  id: number;
  employeeName: string;
  employeeNo: string;
  outputRate: number;
  qualityRate: number;
  equipmentRate: number;
  siteManagement: number;
  totalScore: number;
}

const calculateTotal = (row: { outputRate: number; qualityRate: number; equipmentRate: number; siteManagement: number }) => {
  return Math.round((row.outputRate * 0.4 + row.qualityRate * 0.3 + row.equipmentRate * 0.15 + row.siteManagement * 0.15) * 100) / 100;
};

export default function PerformancePage() {
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
        setScores(list.map((item: unknown) => ({
          id: item.id,
          employeeName: item.employeeName || item.employee_name,
          employeeNo: item.employeeNo || item.employee_no,
          outputRate: item.outputRate ?? item.output_rate ?? 0,
          qualityRate: item.qualityRate ?? item.quality_rate ?? 0,
          equipmentRate: item.equipmentRate ?? item.equipment_rate ?? 0,
          siteManagement: item.siteManagement ?? item.site_management ?? 0,
          totalScore: 0,
        })).map((r: ScoreRow) => ({ ...r, totalScore: calculateTotal(r) })));
      } else {
        setScores(mockData);
      }
    } catch {
      setScores(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScores(); }, []);

  const updateScore = (id: number, field: keyof ScoreRow, value: number) => {
    setScores((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
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
        body: JSON.stringify({ scores }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('saveSuccess') || '保存成功');
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(t('saveFailed') || '保存失败');
    }
  };

  const filtered = scores.filter((r) =>
    !search || r.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout title={t('performance') || '绩效评分'}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('performance') || '绩效评分'}</h1>
          </div>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />{tc('save')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchEmployee') || '搜索员工姓名...'}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('employeeName') || '姓名'}</TableHead>
                  <TableHead className="text-right">{t('outputRate40') || '产量达成率(40%)'}</TableHead>
                  <TableHead className="text-right">{t('qualityRate30') || '质量合格率(30%)'}</TableHead>
                  <TableHead className="text-right">{t('equipmentRate15') || '设备稼动率(15%)'}</TableHead>
                  <TableHead className="text-right">{t('siteManagement15') || '5S现场管理(15%)'}</TableHead>
                  <TableHead className="text-right text-blue-600 font-bold">{t('totalScore') || '总分'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{r.employeeName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.employeeNo}</span>
                      </div>
                    </TableCell>
                    {(['outputRate', 'qualityRate', 'equipmentRate', 'siteManagement'] as const).map((field) => (
                      <TableCell key={field} className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-24 text-right h-8 inline-block"
                          value={r[field]}
                          onChange={(e) => updateScore(r.id, field, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-blue-600">{r.totalScore.toFixed(2)}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('noData') || '暂无数据'}
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

const mockData: ScoreRow[] = [
  { id: 1, employeeName: '张三', employeeNo: 'EMP001', outputRate: 95, qualityRate: 98, equipmentRate: 88, siteManagement: 90, totalScore: 0 },
  { id: 2, employeeName: '李四', employeeNo: 'EMP002', outputRate: 88, qualityRate: 92, equipmentRate: 85, siteManagement: 82, totalScore: 0 },
  { id: 3, employeeName: '王五', employeeNo: 'EMP003', outputRate: 78, qualityRate: 85, equipmentRate: 80, siteManagement: 75, totalScore: 0 },
  { id: 4, employeeName: '赵六', employeeNo: 'EMP004', outputRate: 92, qualityRate: 90, equipmentRate: 95, siteManagement: 88, totalScore: 0 },
  { id: 5, employeeName: '孙七', employeeNo: 'EMP005', outputRate: 85, qualityRate: 88, equipmentRate: 82, siteManagement: 80, totalScore: 0 },
].map((r) => ({ ...r, totalScore: calculateTotal(r) }));
