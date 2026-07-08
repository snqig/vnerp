'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, FileText, Trash2, Scissors, Package, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

// 分切记录类型
interface CuttingRecord {
  id: number;
  recordNo: string;
  sourceLabelId: number;
  sourceLabelNo: string;
  cutWidthStr: string;
  originalWidth: number;
  cutTotalWidth: number;
  remainWidth: number;
  operatorId: number;
  operatorName: string;
  cutTime: string;
  remark: string;
  status: string;
  createTime: string;
  materialCode: string;
  materialName: string;
  specification: string;
}

export default function CuttingRecordsPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 状态徽章
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: {
        label: tc('normal'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      frozen: {
        label: tc('frozen'),
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      },
      disabled: {
        label: tc('disabled'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      },
    };
    const config = statusMap[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const { user } = useAuth();
  const [records, setRecords] = useState<CuttingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sourceLabelNo, setSourceLabelNo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const exportColumns = [
    { key: 'recordNo', header: t('recordNoCol') },
    { key: 'sourceLabelNo', header: t('sourceLabelNoCol') },
    { key: 'materialName', header: t('materialName') },
    { key: 'materialCode', header: t('materialCode') },
    { key: 'specification', header: t('specification') },
    { key: 'originalWidth', header: t('originalWidthMM') },
    { key: 'cutWidth', header: t('cutWidthMM') },
    { key: 'cutTotal', header: t('cutTotalMM') },
    { key: 'remainWidth', header: t('remainWidthMM') },
    { key: 'operator', header: t('operator') },
    { key: 'cutTime', header: t('cutTime') },
    { key: tc('status'), header: tc('status') },
  ];
  const getExportData = () =>
    records.map((r) => ({
      recordNo: r.recordNo,
      sourceLabelNo: r.sourceLabelNo,
      materialName: r.materialName,
      materialCode: r.materialCode,
      specification: r.specification,
      originalWidth: r.originalWidth,
      cutWidth: r.cutWidthStr,
      cutTotal: r.cutTotalWidth,
      remainWidth: r.remainWidth,
      operator: r.operatorName,
      cutTime: new Date(r.cutTime).toLocaleString(),
      status: r.status === 'active' ? tc('normal') : r.status === 'frozen' ? tc('frozen') : tc('disabled'),
    }));

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (sourceLabelNo) params.append('sourceLabelNo', sourceLabelNo);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await authFetch(`/api/warehouse/inbound/cutting?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setRecords(result.data?.list || []);
          setTotal(result.data?.pagination?.total || 0);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [page, keyword, sourceLabelNo]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setSourceLabelNo('');
    setPage(1);
  };

  return (
    <MainLayout title={t('cuttingRecordManagement')}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              {t('cuttingRecordQuery')}
            </CardTitle>
            <CardDescription>{t('cuttingRecordQueryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t('keyword')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('keywordPlaceholder')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t('sourceLabelNo')}</label>
                <Input
                  placeholder={t('inputSourceLabelNo')}
                  value={sourceLabelNo}
                  onChange={(e) => setSourceLabelNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('reset')}
                </Button>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  {t('query')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('cuttingRecords')}</CardTitle>
                <CardDescription>{t('recordCount', { count: total })}</CardDescription>
              </div>
              <div className="flex gap-2">
                <GlobalExportToolbar
                  filename="分切记录"
                  title="分切记录"
                  landscape
                  columns={[
                    { key: 'recordNo', label: t('recordNoCol'), width: 15 },
                    { key: 'sourceLabelNo', label: t('sourceLabelNoCol'), width: 15 },
                    { key: 'materialName', label: t('materialName'), width: 18 },
                    { key: 'materialCode', label: t('materialCode'), width: 15 },
                    { key: 'specification', label: t('specification'), width: 12 },
                    { key: 'originalWidth', label: t('originalWidthMM'), width: 12 },
                    { key: 'cutWidthStr', label: t('cutWidthMM'), width: 12 },
                    { key: 'cutTotalWidth', label: t('cutTotalMM'), width: 12 },
                    { key: 'remainWidth', label: t('remainWidthMM'), width: 12 },
                    { key: 'operatorName', label: t('operator'), width: 10 },
                    { key: 'cutTime', label: t('cutTime'), width: 18, formatter: (v) => new Date(v).toLocaleString() },
                    { key: 'status', label: tc('status'), width: 10, formatter: (v) => v === 'active' ? tc('normal') : v === 'frozen' ? tc('frozen') : tc('disabled') },
                  ]}
                  data={selectedIds.size > 0 ? records.filter((r) => selectedIds.has(r.id)) : records}
                />
                <Button variant="outline" onClick={() => setPage((prevPage) => prevPage)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('refresh')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === records.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(new Set(records.map((r) => r.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead>{t('recordNoCol')}</TableHead>
                    <TableHead>{t('sourceLabelNoCol')}</TableHead>
                    <TableHead>{t('materialInfo')}</TableHead>
                    <TableHead>{t('originalWidthMM')}</TableHead>
                    <TableHead>{t('cutWidthMM')}</TableHead>
                    <TableHead>{t('cutTotalMM')}</TableHead>
                    <TableHead>{t('remainWidthMM')}</TableHead>
                    <TableHead>{t('operator')}</TableHead>
                    <TableHead>{t('cutTime')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        {t('loading')}
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(record.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedIds);
                              if (checked) next.add(record.id);
                              else next.delete(record.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{record.recordNo}</TableCell>
                        <TableCell>{record.sourceLabelNo}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{record.materialName}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.materialCode}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.specification}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.originalWidth}mm</TableCell>
                        <TableCell>{record.cutWidthStr}mm</TableCell>
                        <TableCell>{record.cutTotalWidth}mm</TableCell>
                        <TableCell>{record.remainWidth}mm</TableCell>
                        <TableCell>{record.operatorName}</TableCell>
                        <TableCell>{new Date(record.cutTime).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {t('pageOf', { page, pages: Math.ceil(total / pageSize) })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {tc('prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * pageSize >= total}
                  >
                    {tc('nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
