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
  Search,
  RefreshCw,
  FileText,
  Trash2,
  Scissors,
  Package,
  QrCode,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';

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

// 状态徽章
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: '正常', className: 'bg-green-100 text-green-700' },
    frozen: { label: '冻结', className: 'bg-orange-100 text-orange-700' },
    disabled: { label: '禁用', className: 'bg-gray-100 text-gray-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function CuttingRecordsPage() {
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
    { key: '记录号', header: '记录号' }, { key: '源标签号', header: '源标签号' },
    { key: '物料名称', header: '物料名称' }, { key: '物料编码', header: '物料编码' },
    { key: '规格', header: '规格' }, { key: '原宽幅', header: '原宽幅(mm)' },
    { key: '分切宽幅', header: '分切宽幅(mm)' }, { key: '分切总和', header: '分切总和(mm)' },
    { key: '剩余宽幅', header: '剩余宽幅(mm)' }, { key: '操作人', header: '操作人' },
    { key: '分切时间', header: '分切时间' }, { key: '状态', header: '状态' },
  ];
  const getExportData = () => records.map(r => ({
    记录号: r.recordNo, 源标签号: r.sourceLabelNo, 物料名称: r.materialName,
    物料编码: r.materialCode, 规格: r.specification, 原宽幅: r.originalWidth,
    分切宽幅: r.cutWidthStr, 分切总和: r.cutTotalWidth, 剩余宽幅: r.remainWidth,
    操作人: r.operatorName, 分切时间: new Date(r.cutTime).toLocaleString(),
    状态: r.status === 'active' ? '正常' : r.status === 'frozen' ? '冻结' : '禁用',
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

        const response = await fetch(`/api/warehouse/inbound/cutting?${params}`, {
          signal: controller.signal
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
          console.error('Failed to fetch cutting records:', error);
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
    <MainLayout title="分切记录管理">
      <div className="space-y-6">
        {/* 搜索栏 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              分切记录查询
            </CardTitle>
            <CardDescription>
              查询和管理物料分切记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">关键字</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="记录号/源标签号..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">源标签号</label>
                <Input
                  placeholder="输入源标签号"
                  value={sourceLabelNo}
                  onChange={(e) => setSourceLabelNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
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

        {/* 记录列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>分切记录列表</CardTitle>
                <CardDescription>
                  共 {total} 条记录
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={records.length}
                  onSelectAll={() => setSelectedIds(new Set(records.map(r => r.id)))}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={() => printTable(getExportData(), exportColumns, '分切记录')}
                  onExportPDF={() => exportTableToPDF(getExportData(), '分切记录', exportColumns, '分切记录')}
                  onExportXLS={() => exportTableToXLS(getExportData(), '分切记录', exportColumns)}
                  onExportWORD={() => exportTableToWORD(getExportData(), '分切记录', exportColumns, '分切记录')}
                />
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
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === records.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(new Set(records.map(r => r.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead>记录号</TableHead>
                    <TableHead>源标签号</TableHead>
                    <TableHead>物料信息</TableHead>
                    <TableHead>原宽幅</TableHead>
                    <TableHead>分切宽幅</TableHead>
                    <TableHead>分切总和</TableHead>
                    <TableHead>剩余宽幅</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>分切时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        暂无数据
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
                              if (checked) next.add(record.id); else next.delete(record.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.recordNo}
                        </TableCell>
                        <TableCell>{record.sourceLabelNo}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{record.materialName}</div>
                            <div className="text-sm text-muted-foreground">{record.materialCode}</div>
                            <div className="text-sm text-muted-foreground">{record.specification}</div>
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
    </MainLayout>
  );
}
