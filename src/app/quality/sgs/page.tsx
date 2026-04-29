'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, AlertTriangle, FileCheck, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CertItem {
  id?: number;
  test_item_name: string;
  test_standard: string;
  limit_value: string;
  test_value: string;
  unit: string;
  result: string;
}

interface Cert {
  id?: number;
  cert_no: string;
  material_id?: number;
  material_code: string;
  material_name: string;
  supplier_id?: number;
  supplier_name: string;
  cert_type: string;
  test_items?: string;
  test_result: string;
  test_report_no: string;
  test_org: string;
  issue_date: string;
  expire_date: string;
  status: number;
  file_url: string;
  remark: string;
  item_count?: number;
  days_remaining?: number;
  items?: CertItem[];
}

const certTypeMap: Record<string, string> = {
  'RoHS': 'RoHS', 'REACH': 'REACH', 'FDA': 'FDA',
  'EN71-3': 'EN71-3', '其他': '其他'
};
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  0: { label: '失效', variant: 'destructive' },
  1: { label: '有效', variant: 'default' },
  2: { label: '待检测', variant: 'outline' },
  3: { label: '已过期', variant: 'destructive' },
};
const testResultMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'PASS': { label: '合格', variant: 'default' },
  'FAIL': { label: '不合格', variant: 'destructive' },
  'PENDING': { label: '待检测', variant: 'outline' },
};

const rohsTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  { test_item_name: '铅(Pb)', test_standard: 'RoHS 2011/65/EU', limit_value: '1000', unit: 'mg/kg' },
  { test_item_name: '镉(Cd)', test_standard: 'RoHS 2011/65/EU', limit_value: '100', unit: 'mg/kg' },
  { test_item_name: '汞(Hg)', test_standard: 'RoHS 2011/65/EU', limit_value: '1000', unit: 'mg/kg' },
  { test_item_name: '六价铬(Cr6+)', test_standard: 'RoHS 2011/65/EU', limit_value: '1000', unit: 'mg/kg' },
  { test_item_name: '多溴联苯(PBB)', test_standard: 'RoHS 2011/65/EU', limit_value: '1000', unit: 'mg/kg' },
  { test_item_name: '多溴二苯醚(PBDE)', test_standard: 'RoHS 2011/65/EU', limit_value: '1000', unit: 'mg/kg' },
];

const reachTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  { test_item_name: 'SVHC物质', test_standard: 'REACH EC 1907/2006', limit_value: '1000', unit: 'mg/kg' },
  { test_item_name: '邻苯二甲酸酯', test_standard: 'REACH EC 1907/2006', limit_value: '1000', unit: 'mg/kg' },
];

const en71TestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  { test_item_name: '钡(Ba)', test_standard: 'EN71-3:2019', limit_value: '18750', unit: 'mg/kg' },
  { test_item_name: '镉(Cd)', test_standard: 'EN71-3:2019', limit_value: '17.9', unit: 'mg/kg' },
  { test_item_name: '铬(Cr)', test_standard: 'EN71-3:2019', limit_value: '460', unit: 'mg/kg' },
  { test_item_name: '铅(Pb)', test_standard: 'EN71-3:2019', limit_value: '2380', unit: 'mg/kg' },
  { test_item_name: '汞(Hg)', test_standard: 'EN71-3:2019', limit_value: '94', unit: 'mg/kg' },
  { test_item_name: '硒(Se)', test_standard: 'EN71-3:2019', limit_value: '460', unit: 'mg/kg' },
];

const fdaTestItems: Omit<CertItem, 'test_value' | 'result'>[] = [
  { test_item_name: '总迁移量', test_standard: 'FDA 21 CFR 175.105', limit_value: '60', unit: 'mg/dm²' },
  { test_item_name: '重金属(以Pb计)', test_standard: 'FDA 21 CFR 175.105', limit_value: '1', unit: 'mg/dm²' },
];

function getDefaultItems(certType: string): CertItem[] {
  let templates: Omit<CertItem, 'test_value' | 'result'>[] = [];
  switch (certType) {
    case 'RoHS': templates = rohsTestItems; break;
    case 'REACH': templates = reachTestItems; break;
    case 'EN71-3': templates = en71TestItems; break;
    case 'FDA': templates = fdaTestItems; break;
    default: templates = []; break;
  }
  return templates.map(t => ({ ...t, test_value: '', result: 'N/A' }));
}

export default function SGSManagementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Cert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCertNo, setSearchCertNo] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchCertType, setSearchCertType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Cert>>({});
  const [detailItem, setDetailItem] = useState<Cert | null>(null);
  const [warningData, setWarningData] = useState<{ expired: Cert[]; expiring: Cert[]; total: number }>({ expired: [], expiring: [], total: 0 });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '20',
        certNo: searchCertNo, materialName: searchMaterial,
        certType: searchCertType, status: searchStatus
      });
      const res = await fetch('/api/quality/sgs?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) { console.error(e); }
  };

  const fetchWarning = async () => {
    try {
      const res = await fetch('/api/quality/sgs/expiry-warning?days=90');
      const result = await res.json();
      if (result.success) {
        setWarningData(result.data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchWarning(); }, []);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/quality/sgs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
        fetchWarning();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此SGS认证记录？')) return;
    try {
      const res = await fetch('/api/quality/sgs?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
        fetchWarning();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await fetch('/api/quality/sgs/' + id);
      const result = await res.json();
      if (result.success) {
        setDetailItem(result.data);
        setShowDetailDialog(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleCertTypeChange = (certType: string) => {
    const newItems = getDefaultItems(certType);
    setEditItem({ ...editItem, cert_type: certType, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof CertItem, value: string) => {
    if (!editItem.items) return;
    const newItems = [...editItem.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItem({ ...editItem, items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [...(editItem.items || []), { test_item_name: '', test_standard: '', limit_value: '', test_value: '', unit: '', result: 'N/A' }];
    setEditItem({ ...editItem, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!editItem.items) return;
    const newItems = editItem.items.filter((_, i) => i !== index);
    setEditItem({ ...editItem, items: newItems });
  };

  const isExpiring = (expireDate: string) => {
    if (!expireDate) return false;
    const diff = (new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  };

  const isExpired = (expireDate: string) => {
    if (!expireDate) return false;
    return new Date(expireDate).getTime() < Date.now();
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">SGS认证管理</h1>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="证书编号" value={searchCertNo} onChange={e => setSearchCertNo(e.target.value)} className="w-28 h-8 text-sm" />
              <Input placeholder="物料名称" value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} className="w-28 h-8 text-sm" />
              <Select value={searchCertType} onValueChange={v => setSearchCertType(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-24 h-8 text-sm"><SelectValue placeholder="认证类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="RoHS">RoHS</SelectItem>
                  <SelectItem value="REACH">REACH</SelectItem>
                  <SelectItem value="FDA">FDA</SelectItem>
                  <SelectItem value="EN71-3">EN71-3</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
              <Select value={searchStatus} onValueChange={v => setSearchStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-24 h-8 text-sm"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="1">有效</SelectItem>
                  <SelectItem value="2">待检测</SelectItem>
                  <SelectItem value="3">已过期</SelectItem>
                  <SelectItem value="0">失效</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => {
              setEditItem({ cert_type: 'RoHS', test_result: 'PENDING', test_org: 'SGS', status: 2, items: getDefaultItems('RoHS') });
              setShowDialog(true);
            }}><Plus className="h-3 w-3 mr-1" />新增认证</Button>
          </div>
        </div>

        {warningData.total > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  SGS认证预警：{warningData.expired.length} 个已过期，{warningData.expiring.length} 个即将过期（90天内）
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">证书编号</TableHead>
                <TableHead className="text-xs">物料名称</TableHead>
                <TableHead className="text-xs">供应商</TableHead>
                <TableHead className="text-xs">认证类型</TableHead>
                <TableHead className="text-xs">检测结果</TableHead>
                <TableHead className="text-xs">检测机构</TableHead>
                <TableHead className="text-xs">发证日期</TableHead>
                <TableHead className="text-xs">有效期至</TableHead>
                <TableHead className="text-xs">状态</TableHead>
                <TableHead className="text-xs">检测项</TableHead>
                <TableHead className="text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs font-mono">{item.cert_no}</TableCell>
                  <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                  <TableCell className="text-xs">{item.supplier_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.cert_type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={testResultMap[item.test_result]?.variant || 'outline'} className="text-xs">
                      {testResultMap[item.test_result]?.label || item.test_result}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.test_org || '-'}</TableCell>
                  <TableCell className="text-xs">{item.issue_date || '-'}</TableCell>
                  <TableCell className="text-xs">
                    <span className={isExpired(item.expire_date) ? 'text-red-600 font-medium' : isExpiring(item.expire_date) ? 'text-amber-600' : ''}>
                      {item.expire_date || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusMap[item.status]?.variant || 'outline'} className="text-xs">
                      {statusMap[item.status]?.label || '未知'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.item_count ?? 0}项</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleViewDetail(item.id!)}><FileCheck className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id!)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-gray-400 py-8">暂无SGS认证记录</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader><DialogTitle>{editItem.id ? '编辑SGS认证' : '新增SGS认证'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>证书编号</Label><Input value={editItem.cert_no || ''} onChange={e => setEditItem({ ...editItem, cert_no: e.target.value })} /></div>
              <div><Label>物料编码</Label><Input value={editItem.material_code || ''} onChange={e => setEditItem({ ...editItem, material_code: e.target.value })} /></div>
              <div><Label>物料名称</Label><Input value={editItem.material_name || ''} onChange={e => setEditItem({ ...editItem, material_name: e.target.value })} /></div>
              <div><Label>供应商名称</Label><Input value={editItem.supplier_name || ''} onChange={e => setEditItem({ ...editItem, supplier_name: e.target.value })} /></div>
              <div>
                <Label>认证类型</Label>
                <Select value={editItem.cert_type || 'RoHS'} onValueChange={handleCertTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RoHS">RoHS</SelectItem>
                    <SelectItem value="REACH">REACH</SelectItem>
                    <SelectItem value="FDA">FDA</SelectItem>
                    <SelectItem value="EN71-3">EN71-3</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>检测结果</Label>
                <Select value={editItem.test_result || 'PENDING'} onValueChange={v => setEditItem({ ...editItem, test_result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">合格</SelectItem>
                    <SelectItem value="FAIL">不合格</SelectItem>
                    <SelectItem value="PENDING">待检测</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>测试报告编号</Label><Input value={editItem.test_report_no || ''} onChange={e => setEditItem({ ...editItem, test_report_no: e.target.value })} /></div>
              <div><Label>检测机构</Label><Input value={editItem.test_org || ''} onChange={e => setEditItem({ ...editItem, test_org: e.target.value })} /></div>
              <div>
                <Label>状态</Label>
                <Select value={String(editItem.status ?? 2)} onValueChange={v => setEditItem({ ...editItem, status: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">有效</SelectItem>
                    <SelectItem value="2">待检测</SelectItem>
                    <SelectItem value="0">失效</SelectItem>
                    <SelectItem value="3">已过期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>发证日期</Label><Input type="date" value={editItem.issue_date || ''} onChange={e => setEditItem({ ...editItem, issue_date: e.target.value })} /></div>
              <div><Label>有效期至</Label><Input type="date" value={editItem.expire_date || ''} onChange={e => setEditItem({ ...editItem, expire_date: e.target.value })} /></div>
              <div><Label>证书文件</Label><Input value={editItem.file_url || ''} onChange={e => setEditItem({ ...editItem, file_url: e.target.value })} placeholder="文件路径或URL" /></div>
              <div className="col-span-3"><Label>备注</Label><Textarea value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} rows={2} /></div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">检测项目明细</Label>
                <Button size="sm" variant="outline" onClick={handleAddItem}><Plus className="h-3 w-3 mr-1" />添加项目</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-36">检测项目</TableHead>
                    <TableHead className="text-xs w-36">检测标准</TableHead>
                    <TableHead className="text-xs w-20">限值</TableHead>
                    <TableHead className="text-xs w-20">检测值</TableHead>
                    <TableHead className="text-xs w-16">单位</TableHead>
                    <TableHead className="text-xs w-20">结果</TableHead>
                    <TableHead className="text-xs w-12">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editItem.items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Input className="h-7 text-xs" value={item.test_item_name} onChange={e => handleItemChange(idx, 'test_item_name', e.target.value)} /></TableCell>
                      <TableCell><Input className="h-7 text-xs" value={item.test_standard} onChange={e => handleItemChange(idx, 'test_standard', e.target.value)} /></TableCell>
                      <TableCell><Input className="h-7 text-xs" value={item.limit_value} onChange={e => handleItemChange(idx, 'limit_value', e.target.value)} /></TableCell>
                      <TableCell><Input className="h-7 text-xs" value={item.test_value} onChange={e => handleItemChange(idx, 'test_value', e.target.value)} /></TableCell>
                      <TableCell><Input className="h-7 text-xs" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></TableCell>
                      <TableCell>
                        <Select value={item.result} onValueChange={v => handleItemChange(idx, 'result', v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PASS">PASS</SelectItem>
                            <SelectItem value="FAIL">FAIL</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleRemoveItem(idx)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {(!editItem.items || editItem.items.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-4 text-xs">暂无检测项目，请点击"添加项目"或选择认证类型自动填充</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader><DialogTitle>SGS认证详情 - {detailItem?.cert_no}</DialogTitle></DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-500">物料名称：</span>{detailItem.material_name || '-'}</div>
                  <div><span className="text-gray-500">物料编码：</span>{detailItem.material_code || '-'}</div>
                  <div><span className="text-gray-500">供应商：</span>{detailItem.supplier_name || '-'}</div>
                  <div><span className="text-gray-500">认证类型：</span>{detailItem.cert_type}</div>
                  <div><span className="text-gray-500">检测结果：</span>
                    <Badge variant={testResultMap[detailItem.test_result]?.variant || 'outline'} className="text-xs">
                      {testResultMap[detailItem.test_result]?.label || detailItem.test_result}
                    </Badge>
                  </div>
                  <div><span className="text-gray-500">检测机构：</span>{detailItem.test_org || '-'}</div>
                  <div><span className="text-gray-500">报告编号：</span>{detailItem.test_report_no || '-'}</div>
                  <div><span className="text-gray-500">发证日期：</span>{detailItem.issue_date || '-'}</div>
                  <div><span className="text-gray-500">有效期至：</span>
                    <span className={isExpired(detailItem.expire_date) ? 'text-red-600 font-medium' : isExpiring(detailItem.expire_date) ? 'text-amber-600' : ''}>
                      {detailItem.expire_date || '-'}
                    </span>
                  </div>
                  <div><span className="text-gray-500">状态：</span>
                    <Badge variant={statusMap[detailItem.status]?.variant || 'outline'} className="text-xs">
                      {statusMap[detailItem.status]?.label || '未知'}
                    </Badge>
                  </div>
                </div>
                {detailItem.remark && <div className="text-sm"><span className="text-gray-500">备注：</span>{detailItem.remark}</div>}

                {detailItem.items && detailItem.items.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">检测项目明细</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">检测项目</TableHead>
                          <TableHead className="text-xs">检测标准</TableHead>
                          <TableHead className="text-xs">限值</TableHead>
                          <TableHead className="text-xs">检测值</TableHead>
                          <TableHead className="text-xs">单位</TableHead>
                          <TableHead className="text-xs">结果</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItem.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{item.test_item_name}</TableCell>
                            <TableCell className="text-xs">{item.test_standard}</TableCell>
                            <TableCell className="text-xs font-mono">{item.limit_value}</TableCell>
                            <TableCell className="text-xs font-mono">{item.test_value || '-'}</TableCell>
                            <TableCell className="text-xs">{item.unit}</TableCell>
                            <TableCell>
                              <Badge variant={item.result === 'PASS' ? 'default' : item.result === 'FAIL' ? 'destructive' : 'outline'} className="text-xs">
                                {item.result}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
