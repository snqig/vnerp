'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Play,
  RotateCcw,
  Clock,
  XCircle,
  Loader2,
  ChevronRight,
  Database,
  GitBranch,
  Users,
  DollarSign,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SagaStep {
  name: string;
  status: 'pending' | 'success' | 'failed' | 'compensating' | 'compensated';
  errorMessage?: string;
  completedAt?: string;
}

interface SagaLog {
  id: number;
  sagaId: string;
  sagaType: string;
  status: 'pending' | 'executing' | 'success' | 'compensating' | 'compensated' | 'failed';
  payload: Record<string, unknown>;
  steps: SagaStep[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface SagaStats {
  total: number;
  pending: number;
  executing: number;
  success: number;
  failed: number;
  compensated: number;
}

const PAGE_SIZE = 10;

function getStatusColor(status: SagaLog['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'executing':
      return 'bg-blue-100 text-blue-800';
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'compensating':
      return 'bg-orange-100 text-orange-800';
    case 'compensated':
      return 'bg-purple-100 text-purple-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: SagaLog['status']) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'executing':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'success':
      return <CheckCircle className="w-4 h-4" />;
    case 'compensating':
      return <RotateCcw className="w-4 h-4 animate-spin" />;
    case 'compensated':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'workorder_completion':
      return <GitBranch className="w-4 h-4" />;
    case 'material_issue':
      return <Database className="w-4 h-4" />;
    case 'work_report':
      return <Users className="w-4 h-4" />;
    case 'hr_payroll_calculation':
      return <DollarSign className="w-4 h-4" />;
    default:
      return <GitBranch className="w-4 h-4" />;
  }
}

export default function ConsistencyMonitorPage() {
  const t = useTranslations('Monitoring');
  const tc = useTranslations('Common');

  const [allSagas, setAllSagas] = useState<SagaLog[]>([]);
  const [stats, setStats] = useState<SagaStats>({
    total: 0,
    pending: 0,
    executing: 0,
    success: 0,
    failed: 0,
    compensated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSaga, setSelectedSaga] = useState<SagaLog | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchIdRef = useRef(0);

  const fetchData = async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const response = await authFetch('/api/saga?pageSize=9999');
      if (fetchId !== fetchIdRef.current) return;

      const data = await response.json();
      if (fetchId !== fetchIdRef.current) return;

      if (data.success && data.data) {
        const list = (data.data.list || data.data) as SagaLog[];
        const allList = Array.isArray(list) ? list : [];

        setAllSagas(allList);
        setStats({
          total: allList.length,
          pending: allList.filter((s) => s.status === 'pending').length,
          executing: allList.filter((s) => s.status === 'executing').length,
          success: allList.filter((s) => s.status === 'success').length,
          failed: allList.filter((s) => s.status === 'failed').length,
          compensated: allList.filter((s) => s.status === 'compensated').length,
        });
      }
    } catch {
      // 静默处理，避免控制台噪音
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 筛选后的数据
  const filteredSagas = statusFilter === 'all'
    ? allSagas
    : allSagas.filter((s) => s.status === statusFilter);

  // 分页后的数据
  const totalPages = Math.ceil(filteredSagas.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSagas = filteredSagas.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleRetry = async (sagaId: string) => {
    try {
      await authFetch('/api/saga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', sagaId }),
      });
      fetchData();
    } catch {
      // 静默处理
    }
  };

  const handleCompensate = async (sagaId: string) => {
    try {
      await authFetch('/api/saga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compensate', sagaId }),
      });
      fetchData();
    } catch {
      // 静默处理
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      workorder_completion: t('consistency.typeLabels.workorder_completion'),
      material_issue: t('consistency.typeLabels.material_issue'),
      work_report: t('consistency.typeLabels.work_report'),
      hr_payroll_calculation: t('consistency.typeLabels.hr_payroll_calculation'),
    };
    return labels[type] || type;
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              {t('consistency.title')}
            </CardTitle>
            <CardDescription>
              {t('consistency.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-500">{t('consistency.total')}</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-600">{t('consistency.pending')}</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.executing}</div>
                <div className="text-sm text-blue-600">{t('consistency.executing')}</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-sm text-green-600">{t('consistency.success')}</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-red-600">{t('consistency.failed')}</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.compensated}</div>
                <div className="text-sm text-purple-600">{t('consistency.compensated')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('consistency.sagaList')}</CardTitle>
              <CardDescription>{t('consistency.sagaListDesc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm"
              >
                <option value="all">{tc('all')}</option>
                <option value="pending">{t('consistency.pending')}</option>
                <option value="executing">{t('consistency.executing')}</option>
                <option value="success">{tc('success')}</option>
                <option value="failed">{tc('failed')}</option>
                <option value="compensated">{t('consistency.compensated')}</option>
              </select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {tc('refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : paginatedSagas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('consistency.noData')}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('consistency.type')}</TableHead>
                      <TableHead>{t('consistency.sagaId')}</TableHead>
                      <TableHead>{t('consistency.businessId')}</TableHead>
                      <TableHead>{t('consistency.status')}</TableHead>
                      <TableHead>{t('consistency.steps')}</TableHead>
                      <TableHead>{t('consistency.createdAt')}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSagas.map((saga) => (
                      <TableRow
                        key={saga.sagaId}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedSaga(saga)}
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          {getTypeIcon(saga.sagaType)}
                          {getTypeLabel(saga.sagaType)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {saga.sagaId}
                        </TableCell>
                        <TableCell>
                          {String(saga.payload.workOrderId || saga.payload.pickOrderId || saga.payload.reportId || '-')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(saga.status)}>
                            {getStatusIcon(saga.status)}
                            <span className="ml-1">{t(`consistency.statusLabels.${saga.status}`)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {saga.steps.map((step, idx) => (
                              <span
                                key={idx}
                                className={`w-2 h-2 rounded-full ${
                                  step.status === 'success' ? 'bg-green-500' :
                                  step.status === 'failed' ? 'bg-red-500' :
                                  step.status === 'compensated' ? 'bg-purple-500' :
                                  step.status === 'compensating' ? 'bg-orange-500 animate-pulse' :
                                  'bg-gray-300'
                                }`}
                                title={step.name}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">
                              {saga.steps.filter(s => s.status === 'success').length}/{saga.steps.length}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(saga.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {saga.status === 'failed' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleRetry(saga.sagaId); }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  {tc('retry')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleCompensate(saga.sagaId); }}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  {t('consistency.compensate')}
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setSelectedSaga(saga); }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-500">
                      {t('consistency.page')} {safePage} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        {t('consistency.prevPage')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        {t('consistency.nextPage')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {selectedSaga && (
          <Card className="fixed inset-4 md:inset-auto md:w-[600px] md:right-4 md:top-4 bg-white z-50 max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getTypeIcon(selectedSaga.sagaType)}
                {t('consistency.sagaDetail')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSaga(null)}
              >
                {tc('close')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('consistency.sagaId')}</label>
                    <div className="text-sm font-mono">{selectedSaga.sagaId}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('consistency.type')}</label>
                    <div className="text-sm">{getTypeLabel(selectedSaga.sagaType)}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">{t('consistency.status')}</label>
                  <Badge className={`mt-1 ${getStatusColor(selectedSaga.status)}`}>
                    {getStatusIcon(selectedSaga.status)}
                    <span className="ml-1">{t(`consistency.statusLabels.${selectedSaga.status}`)}</span>
                  </Badge>
                </div>

                {selectedSaga.errorMessage && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <label className="text-sm font-medium text-red-600">{tc('error')}</label>
                    <p className="text-sm text-red-600 mt-1">{selectedSaga.errorMessage}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">{t('consistency.businessData')}</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-auto">
                    {JSON.stringify(selectedSaga.payload, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">{t('consistency.steps')}</label>
                  <div className="mt-2 space-y-2">
                    {selectedSaga.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded-lg bg-gray-50"
                      >
                        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${
                          step.status === 'success' ? 'bg-green-500' :
                          step.status === 'failed' ? 'bg-red-500' :
                          step.status === 'compensated' ? 'bg-purple-500' :
                          step.status === 'compensating' ? 'bg-orange-500 animate-pulse' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{step.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              step.status === 'success' ? 'bg-green-100 text-green-700' :
                              step.status === 'failed' ? 'bg-red-100 text-red-700' :
                              step.status === 'compensated' ? 'bg-purple-100 text-purple-700' :
                              step.status === 'compensating' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {t(`consistency.stepStatus.${step.status}`)}
                            </span>
                          </div>
                          {step.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">{step.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedSaga.status === 'failed' && (
                    <>
                      <Button
                        className="flex-1"
                        onClick={() => { handleRetry(selectedSaga.sagaId); setSelectedSaga(null); }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {tc('retry')}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { handleCompensate(selectedSaga.sagaId); setSelectedSaga(null); }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {t('consistency.compensate')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
