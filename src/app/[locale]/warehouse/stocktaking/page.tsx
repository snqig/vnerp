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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  QrCode,
  ClipboardList,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';

interface InventoryCheck {
  id: number;
  check_no: string;
  type: number;
  warehouse_id: number;
  status: number;
  start_time: string | null;
  end_time: string | null;
  checker_id: number | null;
  approver_id: number | null;
  total_items: number;
  diff_items: number;
  diff_amount: number;
  remark: string | null;
  create_time: string;
  update_time: string;
  warehouse_name?: string;
  checker_name?: string;
  approver_name?: string;
  type_name?: string;
  status_name?: string;
}

interface InventoryCheckItem {
  id: number;
  check_id: number;
  material_id: number;
  qr_code: string | null;
  batch_no: string | null;
  warehouse_location: string | null;
  split_flag: number;
  parent_qr_code: string | null;
  book_quantity: number;
  actual_quantity: number;
  difference: number;
  difference_reason: string | null;
  status: number;
  material_name?: string;
  unit?: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  0: { label: '草稿', variant: 'outline' },
  1: { label: '进行中', variant: 'default' },
  2: { label: '待审批', variant: 'secondary' },
  3: { label: '已完成', variant: 'default' },
  4: { label: '已取消', variant: 'destructive' },
};

const TYPE_MAP: Record<number, string> = {
  1: '定期盘点',
  2: '不定期盘点',
  3: '循环盘点',
  4: '抽盘',
};

const SPLIT_FLAG_MAP: Record<number, string> = {
  0: '整料',
  1: '小料',
  2: '余料',
};

export default function StocktakingPage() {
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

  const { toast } = useToast();
  const [list, setList] = useState<InventoryCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InventoryCheck>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showScanDialog, setShowScanDialog] = useState(false);
  const [currentCheckId, setCurrentCheckId] = useState<number | null>(null);
  const [scanQrCode, setScanQrCode] = useState('');
  const [scanQuantity, setScanQuantity] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItems, setDetailItems] = useState<InventoryCheckItem[]>([]);

  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const exportColumns = [
    { key: 'check_no', header: '盘点单号' },
    { key: 'warehouse_name', header: '仓库' },
    { key: 'type_name', header: '盘点类型' },
    { key: 'total_items', header: '盘点项数' },
    { key: 'diff_items', header: '差异项数' },
    { key: 'diff_amount', header: '差异金额' },
    { key: 'status_name', header: '状态' },
  ];

  const getExportData = () =>
    list.map((item) => ({
      check_no: item.check_no,
      warehouse_name: item.warehouse_name || '-',
      type_name: TYPE_MAP[item.type] || '-',
      total_items: item.total_items,
      diff_items: item.diff_items,
      diff_amount: item.diff_amount,
      status_name: STATUS_MAP[item.status]?.label || '-',
    }));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', checkNo: searchNo });
      const res = await authFetch('/api/warehouse/stocktaking?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=active&all=true');
      const result = await res.json();
      if (result.success) {
        setWarehouses(result.data?.map((w: any) => ({ id: w.id, name: w.name })) || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/warehouse/stocktaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editItem.type || 1,
          warehouse_id: editItem.warehouse_id,
          checker_id: editItem.checker_id,
          remark: editItem.remark,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: '盘点单生成成功',
          description: `已锁定库存，共 ${result.data.item_count} 项待盘点`,
        });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '操作失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string, extraData?: any) => {
    try {
      const body: any = { id, action };
      if (extraData) Object.assign(body, extraData);

      const res = await authFetch('/api/warehouse/stocktaking', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: '操作成功' });
        fetchData();
        setShowApproveDialog(false);
      } else {
        toast({ title: '操作失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch(`/api/warehouse/stocktaking?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const openScanDialog = (check: InventoryCheck) => {
    setCurrentCheckId(check.id);
    setScanQrCode('');
    setScanQuantity('');
    setScanResult(null);
    setShowScanDialog(true);
  };

  const executeScan = async () => {
    if (!currentCheckId || !scanQrCode || !scanQuantity) {
      toast({ title: '请填写完整的扫码信息', variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${currentCheckId}/scan`, {
        method: 'POST',
        body: JSON.stringify({
          qr_code: scanQrCode,
          actual_quantity: Number(scanQuantity),
        }),
      });
      const result = await res.json();

      if (result.success) {
        setScanResult(result.data);
        toast({ title: '扫码盘点成功' });
        setScanQrCode('');
        setScanQuantity('');
      } else {
        toast({ title: '扫码失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '扫码失败', variant: 'destructive' });
    }
  };

  const openDetailDialog = async (check: InventoryCheck) => {
    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${check.id}/items`);
      const result = await res.json();
      if (result.success) {
        const detailitemsList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setDetailItems(detailitemsList);
        setShowDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">库存盘点</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="搜索单号"
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={list.length}
              onSelectAll={() => setSelectedIds(new Set(list.map((i) => i.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={() => printTable(getExportData(), exportColumns, '库存盘点')}
              onExportPDF={() =>
                exportTableToPDF(getExportData(), '库存盘点', exportColumns, '库存盘点')
              }
              onExportXLS={() => exportTableToXLS(getExportData(), '库存盘点', exportColumns)}
              onExportWORD={() =>
                exportTableToWORD(getExportData(), '库存盘点', exportColumns, '库存盘点')
              }
            />
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              新增盘点
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === list.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(list.map((i) => i.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-xs">盘点单号</TableHead>
                  <TableHead className="text-xs">仓库</TableHead>
                  <TableHead className="text-xs">类型</TableHead>
                  <TableHead className="text-xs">盘点项数</TableHead>
                  <TableHead className="text-xs">差异项数</TableHead>
                  <TableHead className="text-xs">差异金额</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = STATUS_MAP[item.status] || STATUS_MAP[0];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds);
                            if (checked) next.add(item.id);
                            else next.delete(item.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.check_no}</TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{TYPE_MAP[item.type] || '-'}</TableCell>
                      <TableCell className="text-xs text-center">{item.total_items}</TableCell>
                      <TableCell className="text-xs text-center">{item.diff_items}</TableCell>
                      <TableCell className="text-xs text-center font-mono">
                        ¥{item.diff_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openScanDialog(item)}
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              扫码
                            </Button>
                          )}
                          {(item.status === 0 || item.status === 1) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAction(item.id, 'cancel')}
                            >
                              取消
                            </Button>
                          )}
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAction(item.id, 'submit')}
                            >
                              提交
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => setShowApproveDialog(true)}
                            >
                              审批
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => openDetailDialog(item)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditItem(item);
                              setShowDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {[0, 4].includes(item.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      暂无盘点记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>新增盘点单</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  仓库 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(editItem.warehouse_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, warehouse_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>盘点类型</Label>
                <Select
                  value={String(editItem.type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">定期盘点</SelectItem>
                    <SelectItem value="2">不定期盘点</SelectItem>
                    <SelectItem value="3">循环盘点</SelectItem>
                    <SelectItem value="4">抽盘</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>盘点人</Label>
                <UserSelect
                  value={editItem.checker_id ? String(editItem.checker_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, checker_id: Number(v) })}
                />
              </div>
              <div className="col-span-2">
                <Label>备注</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>生成盘点单</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>扫码盘点</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>
                  二维码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={scanQrCode}
                  onChange={(e) => setScanQrCode(e.target.value)}
                  placeholder="扫描或输入二维码"
                  className="font-mono"
                />
              </div>
              <div>
                <Label>
                  实际数量 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={scanQuantity}
                  onChange={(e) => setScanQuantity(e.target.value)}
                  placeholder="输入实际盘点数量"
                />
              </div>
              {scanResult && (
                <div className="border rounded p-3 bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">物料名称：</span>
                      {scanResult.material_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">批次号：</span>
                      {scanResult.batch_no || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">类型：</span>
                      {SPLIT_FLAG_MAP[scanResult.split_flag] || '整料'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">库位：</span>
                      {scanResult.warehouse_location || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">账面数量：</span>
                      {scanResult.book_quantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">实际数量：</span>
                      {scanResult.actual_quantity}
                    </div>
                    <div
                      className={`col-span-2 font-bold ${scanResult.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      差异：{scanResult.difference > 0 ? '+' : ''}
                      {scanResult.difference}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScanDialog(false)}>
                关闭
              </Button>
              <Button onClick={executeScan}>
                <QrCode className="h-4 w-4 mr-1" />
                确认盘点
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader>
              <DialogTitle>盘点明细</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>二维码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>账面数量</TableHead>
                  <TableHead>实际数量</TableHead>
                  <TableHead>差异数量</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.qr_code || '-'}</TableCell>
                    <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {SPLIT_FLAG_MAP[item.split_flag] || '整料'}
                    </TableCell>
                    <TableCell className="text-xs text-center">{item.book_quantity}</TableCell>
                    <TableCell className="text-xs text-center">
                      {item.actual_quantity || '-'}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-center font-bold ${item.difference !== 0 ? 'text-red-600' : ''}`}
                    >
                      {item.difference > 0 ? '+' : ''}
                      {item.difference}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {item.status === 0 ? '未盘点' : item.status === 1 ? '已盘点' : '已调整'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>审批盘点结果</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>审批人</Label>
                <UserSelect value="" onChange={(v) => {}} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleAction(list.find((i) => i.status === 2)?.id || 0, 'approve', {
                      approver_id: 1,
                    })
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  通过
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction(list.find((i) => i.status === 2)?.id || 0, 'reject')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  驳回
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
