'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  exportTableToXLS,
  exportTableToPDF,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { useTranslations } from 'next-intl';

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

interface LabTestRecord {
  id?: number;
  test_no: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  batch_no: string;
  test_type: string;
  test_items: string;
  test_standard: string;
  test_equipment: string;
  tester: string;
  test_date: string;
  result_summary: string;
  detail_data: string;
  conclusion: string;
  status: number;
  remark: string;
  create_time: string;
}

const testTypeMap: Record<string, string> = {
  color: '色差测试',
  adhesion: '附着力测试',
  wear: '耐磨测试',
  tensile: '拉伸测试',
  thickness: '厚度测试',
  other: '其他测试',
};
const conclusionMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pass: { label: '合格', variant: 'default' },
  fail: { label: '不合格', variant: 'destructive' },
  conditional: { label: '有条件合格', variant: 'secondary' },
  pending: { label: '待判定', variant: 'outline' },
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '待测试', variant: 'outline' },
  2: { label: '测试中', variant: 'secondary' },
  3: { label: '已完成', variant: 'default' },
};

export default function LabTestPage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<LabTestRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchType, setSearchType] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<LabTestRecord>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(list, 'test_no');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        productName: searchProduct,
        testType: searchType,
      });
      const res = await authFetch('/api/quality/lab-test?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/quality/lab-test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此测试记录？')) return;
    try {
      const res = await fetch('/api/quality/lab-test?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout title="实验室测试管理">
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索产品名称"
                    className="pl-8 w-60"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="测试类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {Object.entries(testTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  查询
                </Button>
              </div>
              <Button
                onClick={() => {
                  setEditItem({ test_type: 'color', conclusion: 'pending' });
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                新建测试
              </Button>
              <TableExportToolbar
                selectedCount={selectedIds.length}
                totalCount={sortedData.length}
                onSelectAll={() => setSelectedIds(sortedData.filter((i) => i.id).map((i) => i.id!))}
                onDeselectAll={() => setSelectedIds([])}
                onPrint={() => {}}
                onExportPDF={() =>
                  exportTableToPDF(
                    sortedData,
                    '实验室测试报告',
                    [
                      { key: 'test_no', header: '测试编号' },
                      { key: 'product_name', header: '产品名称' },
                      { key: 'batch_no', header: '批次号' },
                      { key: 'test_type', header: '测试类型' },
                      { key: 'conclusion', header: '结论' },
                      { key: 'status', header: tc('status') },
                    ],
                    '实验室测试报告'
                  )
                }
                onExportXLS={() =>
                  exportTableToXLS(sortedData, '实验室测试报告', [
                    { key: 'test_no', header: '测试编号' },
                    { key: 'product_name', header: '产品名称' },
                    { key: 'batch_no', header: '批次号' },
                    { key: 'test_type', header: '测试类型' },
                    { key: 'conclusion', header: '结论' },
                    { key: 'status', header: tc('status') },
                  ])
                }
                onExportWORD={() =>
                  exportTableToWORD(
                    sortedData,
                    '实验室测试报告',
                    [
                      { key: 'test_no', header: '测试编号' },
                      { key: 'product_name', header: '产品名称' },
                      { key: 'batch_no', header: '批次号' },
                      { key: 'test_type', header: '测试类型' },
                      { key: 'conclusion', header: '结论' },
                      { key: 'status', header: tc('status') },
                    ],
                    '实验室测试报告'
                  )
                }
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                      onCheckedChange={() =>
                        setSelectedIds(
                          selectedIds.length === sortedData.length
                            ? []
                            : sortedData.filter((i) => i.id).map((i) => i.id!)
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center">序号</TableHead>
                  <SortableTableHeader
                    field="test_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    测试编号
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="product_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    产品名称
                  </SortableTableHeader>
                  <TableHead>批次号</TableHead>
                  <TableHead>测试类型</TableHead>
                  <TableHead>测试项目</TableHead>
                  <TableHead>测试人</TableHead>
                  <TableHead>测试日期</TableHead>
                  <SortableTableHeader
                    field="conclusion"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    结论
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    状态
                  </SortableTableHeader>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.id ? selectedIds.includes(item.id) : false}
                        onCheckedChange={() => {
                          if (item.id)
                            setSelectedIds((prev) =>
                              prev.includes(item.id!)
                                ? prev.filter((i) => i !== item.id!)
                                : [...prev, item.id!]
                            );
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {(page - 1) * 20 + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.test_no}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.batch_no || '-'}</TableCell>
                    <TableCell>{testTypeMap[item.test_type] || item.test_type}</TableCell>
                    <TableCell className="max-w-32 truncate">{item.test_items || '-'}</TableCell>
                    <TableCell>{item.tester || '-'}</TableCell>
                    <TableCell>{item.test_date?.substring(0, 10) || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={conclusionMap[item.conclusion]?.variant || 'outline'}>
                        {conclusionMap[item.conclusion]?.label || '待判定'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {statusMap[item.status]?.label || tc('unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (item.id) handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">共 {total} 条</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑测试记录' : '新建测试记录'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>产品编码</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>产品名称 *</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>批次号</Label>
                <Input
                  value={editItem.batch_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, batch_no: e.target.value })}
                />
              </div>
              <div>
                <Label>测试类型</Label>
                <Select
                  value={editItem.test_type || 'color'}
                  onValueChange={(v) => setEditItem({ ...editItem, test_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(testTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>测试项目</Label>
                <Input
                  value={editItem.test_items || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_items: e.target.value })}
                />
              </div>
              <div>
                <Label>测试标准</Label>
                <Input
                  value={editItem.test_standard || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_standard: e.target.value })}
                />
              </div>
              <div>
                <Label>测试设备</Label>
                <Input
                  value={editItem.test_equipment || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_equipment: e.target.value })}
                />
              </div>
              <div>
                <Label>测试人</Label>
                <Input
                  value={editItem.tester || ''}
                  onChange={(e) => setEditItem({ ...editItem, tester: e.target.value })}
                />
              </div>
              <div>
                <Label>测试日期</Label>
                <Input
                  type="date"
                  value={editItem.test_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, test_date: e.target.value })}
                />
              </div>
              <div>
                <Label>结论</Label>
                <Select
                  value={editItem.conclusion || 'pending'}
                  onValueChange={(v) => setEditItem({ ...editItem, conclusion: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conclusionMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>结果摘要</Label>
                <Textarea
                  rows={3}
                  value={editItem.result_summary || ''}
                  onChange={(e) => setEditItem({ ...editItem, result_summary: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>详细数据(JSON)</Label>
                <Textarea
                  rows={3}
                  value={editItem.detail_data || ''}
                  onChange={(e) => setEditItem({ ...editItem, detail_data: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>备注</Label>
                <Textarea
                  rows={2}
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
