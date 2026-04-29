'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  QrCode,
  Scissors,
  Package,
  Printer,
  RefreshCw,
  Plus,
  FileText,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

// 状态徽章
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: '正常', className: 'bg-green-100 text-green-700' },
    frozen: { label: '冻结', className: 'bg-orange-100 text-orange-700' },
    cut: { label: '已分切', className: 'bg-blue-100 text-blue-700' },
    disabled: { label: '禁用', className: 'bg-gray-100 text-gray-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// 是否徽章
const getYesNoBadge = (value: number) => {
  return value === 1 ? (
    <Badge className="bg-green-100 text-green-700">是</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-700">否</Badge>
  );
};

export default function MaterialLabelsPage() {
  const { user } = useAuth();
  const [labels, setLabels] = useState<MaterialLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [isMainMaterial, setIsMainMaterial] = useState('all');
  const [isCut, setIsCut] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  
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
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (isMainMaterial && isMainMaterial !== 'all') params.append('isMainMaterial', isMainMaterial);
        if (isCut && isCut !== 'all') params.append('isCut', isCut);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await fetch(`/api/dcprint/labels?${params}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setLabels(result.data?.list || []);
          setTotal(result.data?.pagination?.total || 0);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch labels:', error);
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
    console.log('Opening cut dialog for label:', label);
    setSelectedLabel(label);
    setCutWidthStr('');
    setCutRemark('');
    setCuttingDialogOpen(true);
    console.log('Cutting dialog opened:', cuttingDialogOpen);
  };

  // 执行分切操作
  const handleCutting = async () => {
    if (!selectedLabel || !cutWidthStr || !user) {
      toast.error('请填写分切宽幅');
      return;
    }

    try {
      setCuttingLoading(true);
      
      const response = await fetch('/api/warehouse/inbound/cutting', {
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
        throw new Error(`分切操作失败: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('分切操作成功');
        setCuttingDialogOpen(false);
        // 触发数据刷新
        setPage(prevPage => prevPage);
      } else {
        toast.error(result.message || '分切操作失败');
      }
    } catch (error) {
      console.error('分切操作失败:', error);
      toast.error('分切操作失败，请重试');
    } finally {
      setCuttingLoading(false);
    }
  };

  return (
    <MainLayout title="物料标签管理">
      <div className="space-y-6">
        {/* 搜索栏 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              物料标签查询
            </CardTitle>
            <CardDescription>
              查询和管理物料标签，支持二维码追溯
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">关键字</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="标签号/物料代号/批号..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium mb-2 block">母材</label>
                <Select value={isMainMaterial} onValueChange={setIsMainMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1">是</SelectItem>
                    <SelectItem value="0">否</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <label className="text-sm font-medium mb-2 block">已分切</label>
                <Select value={isCut} onValueChange={setIsCut}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1">是</SelectItem>
                    <SelectItem value="0">否</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  查询
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
                <CardTitle>标签列表</CardTitle>
                <CardDescription>
                  共 {total} 条记录
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage(prevPage => prevPage)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签编号</TableHead>
                    <TableHead>物料信息</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>宽幅/米数</TableHead>
                    <TableHead>批号</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead>母材</TableHead>
                    <TableHead>已分切</TableHead>
                    <TableHead>已使用</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : labels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    labels.map((label) => (
                      <TableRow key={label.id}>
                        <TableCell className="font-medium">
                          {label.labelNo}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{label.materialName}</div>
                            <div className="text-sm text-muted-foreground">{label.materialCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{label.specification}</TableCell>
                        <TableCell>
                          {label.width && (
                            <div>{label.width}mm / {label.lengthPerRoll}m</div>
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
                                  <DialogTitle>二维码信息</DialogTitle>
                                  <DialogDescription>
                                    标签号: {label.labelNo}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center gap-4 py-4">
                                  <div className="p-4 bg-white border rounded-lg">
                                    {/* 这里可以显示实际的二维码图片 */}
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
                                console.log('Cut button clicked for label:', label);
                                handleOpenCutDialog(label);
                              }}
                              disabled={label.isCut === 1}
                              title={label.isCut === 1 ? '已分切' : '分切'}
                            >
                              <Scissors className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
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
                  第 {page} 页，共 {Math.ceil(total / pageSize)} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 分切对话框 */}
      <Dialog open={cuttingDialogOpen} onOpenChange={setCuttingDialogOpen}>
        <DialogContent className="sm:max-w-md" resizable>
          <DialogHeader>
            <DialogTitle>物料分切</DialogTitle>
            <DialogDescription>
              为标签 {selectedLabel?.labelNo} 执行分切操作
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">源标签信息</label>
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">标签号:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.labelNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">物料:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.materialName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">物料代号:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.materialCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">原宽幅:</span>
                    <span className="ml-2 font-medium">{selectedLabel?.width}mm</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">分切宽幅</label>
              <Input
                placeholder="如：10+20+30 (单位：mm)"
                value={cutWidthStr}
                onChange={(e) => setCutWidthStr(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                请输入分切后的宽幅，多个宽幅用"+"分隔
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                placeholder="分切备注"
                value={cutRemark}
                onChange={(e) => setCutRemark(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCuttingDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCutting}
              loading={cuttingLoading}
              disabled={!cutWidthStr}
            >
              执行分切
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
