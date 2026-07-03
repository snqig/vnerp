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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, QrCode, Scissors, Printer, RefreshCw, Trash2, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LabelPrintTrigger, LabelData } from '@/components/printing/LabelPrintPreview';
import { PrinterManagement } from '@/components/printing/PrinterManagement';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { mockLabels, USE_MOCK } from '@/lib/mock-data';

// 物料标签类型
interface MaterialLabel {
  id: number;
  labelNo: string;
  qrCode?: string;
  purchaseOrderNo?: string;
  supplierName?: string;
  receiveDate?: string;
  materialCode: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  batchNo?: string;
  quantity: number;
  width?: number;
  lengthPerRoll?: number;
  warehouseName?: string;
  locationName?: string;
  isMainMaterial: number;
  isUsed: number;
  isCut: number;
  status: string;
  createTime?: string;
}

// 是否徽章 - 需要在组件内部使用翻译
export default function MaterialLabelsPage() {

  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');
  const { user } = useAuth();

  // 是否徽章
  const getYesNoBadge = (value: number) => {
    return value === 1 ? (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        {tc('yes')}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{tc('no')}</Badge>
    );
  };

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
      cut: {
        label: t('cut'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
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

  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<MaterialLabel[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isMainMaterial, setIsMainMaterial] = useState('all');
  const [isCut, setIsCut] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedLabels, setSelectedLabels] = useState<Set<number>>(new Set());
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

  // 分切相关状态
  const [cuttingDialogOpen, setCuttingDialogOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<MaterialLabel | null>(null);
  const [cutWidthStr, setCutWidthStr] = useState('');
  const [cuttingLoading, setCuttingLoading] = useState(false);
  const [cutRemark, setCutRemark] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);

        if (USE_MOCK) {
          logger.info({ module: 'Dcprint', action: 'fetchLabels' }, '使用 mock 标签数据');
          setLabels(mockLabels);
          setTotal(mockLabels.length);
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (isMainMaterial && isMainMaterial !== 'all')
          params.append('isMainMaterial', isMainMaterial);
        if (isCut && isCut !== 'all') params.append('isCut', isCut);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await authFetch(`/api/dcprint/labels?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setLabels(result.data?.list || []);
          setTotal(result.data?.pagination?.total || 0);
          logger.info({ module: 'Dcprint', action: 'fetchLabels' }, '标签数据获取成功', { count: (result.data?.list || []).length });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          logger.error({ module: 'Dcprint', action: 'fetchLabels' }, '获取标签数据失败', { error: (error as Error).message });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [page, isMainMaterial, isCut, keyword]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setIsMainMaterial('all');
    setIsCut('all');
    setPage(1);
  };

  // 打开分切对话框
  const handleOpenCutDialog = (label: MaterialLabel) => {
    setSelectedLabel(label);
    setCutWidthStr('');
    setCutRemark('');
    setCuttingDialogOpen(true);
  };

  // 执行分切操作
  const handleCutting = async () => {
    if (!selectedLabel || !cutWidthStr || !user) {
      toast.error(t('pleaseFillCutWidth'));
      return;
    }

    try {
      setCuttingLoading(true);

      const response = await authFetch('/api/warehouse/inbound/cutting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceLabelId: selectedLabel.id,
          cutWidthStr,
          operatorId: user.id,
          operatorName: user.realName || user.username,
          remark: cutRemark,
        }),
      });

      if (!response.ok) {
        throw new Error(`${t('cuttingFailed')}: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(t('cuttingSuccess'));
        setCuttingDialogOpen(false);
        setPage((prevPage) => prevPage);
      } else {
        toast.error(result.message || t('cuttingFailed'));
      }
    } catch (error) {
      console.error(t('cuttingFailed'), error);
      toast.error(t('cuttingFailedRetry'));
    } finally {
      setCuttingLoading(false);
    }
  };

  // 转换为打印数据格式
  const toPrintData = (label: MaterialLabel): LabelData => ({
    id: String(label.id),
    labelNo: label.labelNo,
    qrCode: label.qrCode,
    materialCode: label.materialCode,
    materialName: label.materialName,
    specification: label.specification,
    batchNo: label.batchNo,
    quantity: label.quantity,
    unit: label.unit,
    warehouseName: label.warehouseName,
  });

  // 获取选中的打印标签
  const selectedPrintLabels = labels.filter((l) => selectedLabels.has(l.id)).map(toPrintData);

  return (
    <MainLayout title={t('labelManagement')}>
      <div className="space-y-6">
        {/* 搜索栏 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('labelQuery')}
            </CardTitle>
            <CardDescription>{t('labelQueryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{tc('keyword')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('labelNoMaterialCodeBatchNo')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium mb-2 block">{t('mainMaterial')}</label>
                <Select value={isMainMaterial} onValueChange={setIsMainMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc("all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc("all")}</SelectItem>
                    <SelectItem value="1">{tc("yes")}</SelectItem>
                    <SelectItem value="0">{tc("no")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium mb-2 block">{t('isCut')}</label>
                <Select value={isCut} onValueChange={setIsCut}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc("all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc("all")}</SelectItem>
                    <SelectItem value="1">{tc("yes")}</SelectItem>
                    <SelectItem value="0">{tc("no")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {tc('reset')}
                </Button>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  {tc('search')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('labelList')}</CardTitle>
                <CardDescription>{tc('totalRecords', { count: total })}</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedPrintLabels.length > 0 && (
                  <LabelPrintTrigger labels={selectedPrintLabels}>
                    <Button>
                      <Printer className="h-4 w-4 mr-2" />
                      {t('printSelected')} ({selectedPrintLabels.length})
                    </Button>
                  </LabelPrintTrigger>
                )}
                <Button variant="outline" onClick={() => setShowPrinterSettings(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('printerSettings')}
                </Button>
                <Button variant="outline" onClick={() => setPage((prevPage) => prevPage)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tc('refresh')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={labels.length > 0 && selectedLabels.size === labels.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLabels(new Set(labels.map((l) => l.id)));
                          } else {
                            setSelectedLabels(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>{t('labelNo')}</TableHead>
                    <TableHead>{t('materialInfo')}</TableHead>
                    <TableHead>{tc("specification")}</TableHead>
                    <TableHead>{t('widthLength')}</TableHead>
                    <TableHead>{tc('batchNo')}</TableHead>
                    <TableHead>{tc("warehouse")}</TableHead>
                    <TableHead>{t('mainMaterial')}</TableHead>
                    <TableHead>{t('isCut')}</TableHead>
                    <TableHead>{t('isUsed')}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        {tc('loading')}
                      </TableCell>
                    </TableRow>
                  ) : labels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        {tc('noRecords')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    labels.map((label) => (
                      <TableRow key={label.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLabels.has(label.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedLabels);
                              if (checked) {
                                newSelected.add(label.id);
                              } else {
                                newSelected.delete(label.id);
                              }
                              setSelectedLabels(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{label.labelNo}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{label.materialName}</div>
                            <div className="text-sm text-muted-foreground">
                              {label.materialCode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{label.specification}</TableCell>
                        <TableCell>
                          {label.width && (
                            <div>
                              {label.width}mm / {label.lengthPerRoll}m
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{label.batchNo}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{label.warehouseName}</div>
                            <div className="text-muted-foreground">{label.locationName}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getYesNoBadge(label.isMainMaterial)}</TableCell>
                        <TableCell>{getYesNoBadge(label.isCut)}</TableCell>
                        <TableCell>{getYesNoBadge(label.isUsed)}</TableCell>
                        <TableCell>{getStatusBadge(label.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('qrCodeInfo')}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col items-center gap-4 py-4">
                                  <div className="p-4 bg-white border rounded-lg">
                                    <QrCode className="h-32 w-32" />
                                  </div>
                                  <code className="text-xs bg-muted p-2 rounded">
                                    {label.qrCode}
                                  </code>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCutDialog(label);
                              }}
                              disabled={label.isCut === 1}
                              title={label.isCut === 1 ? t('cut') : t('cutting')}
                            >
                              <Scissors className="h-4 w-4" />
                            </Button>
                            <LabelPrintTrigger labels={[toPrintData(label)]}>
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </LabelPrintTrigger>
                          </div>
                        </TableCell>
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
                  {t('pageInfo', { page, total: Math.ceil(total / pageSize) })}
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

      {/* 分切对话框 */}
      <Dialog open={cuttingDialogOpen} onOpenChange={setCuttingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('materialCutting')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('labelNo')}:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.labelNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('material')}:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.materialName}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('cutWidth')}</label>
              <Input
                placeholder={t('cutWidthPlaceholder')}
                value={cutWidthStr}
                onChange={(e) => setCutWidthStr(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{tc("remark")}</label>
              <Input
                placeholder={t('cuttingRemark')}
                value={cutRemark}
                onChange={(e) => setCutRemark(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCuttingDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCutting} loading={cuttingLoading} disabled={!cutWidthStr}>
              {t('executeCutting')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打印机设置对话框 */}
      <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('printerManagement')}</DialogTitle>
          </DialogHeader>
          <PrinterManagement />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
