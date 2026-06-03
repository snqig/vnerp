'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, Plus, Search, ScanLine, FileCheck, RotateCcw } from 'lucide-react';

interface Requisition {
  id: number;
  requisition_no: string;
  work_order_no: string;
  type: string;
  status: number;
  total_quantity: number;
  applicant_name: string;
  approver_name: string;
  create_time: string;
  reason: string;
}

export default function MaterialRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchNo, setSearchNo] = useState('');

  // 弹窗状态
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showOverIssue, setShowOverIssue] = useState(false);
  const [showSupplementary, setShowSupplementary] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);

  // 表单数据
  const [workOrderId, setWorkOrderId] = useState('');
  const [overMaterialId, setOverMaterialId] = useState('');
  const [overQuantity, setOverQuantity] = useState('');
  const [overReason, setOverReason] = useState('');
  const [supReqId, setSupReqId] = useState('');
  const [supMaterialId, setSupMaterialId] = useState('');
  const [supQuantity, setSupQuantity] = useState('');
  const [supReason, setSupReason] = useState('');
  const [issueItems, setIssueItems] = useState('');

  const pageSize = 20;

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (activeTab !== 'all') params.type = activeTab;

      const result = await ApiClient.get('/api/material-requisitions', params);
      if (result.success) {
        setRequisitions(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      toast.error('加载领料单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [page, activeTab]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: any }> = {
      0: { label: '待审批', variant: 'secondary' },
      1: { label: '待出库', variant: 'warning' },
      2: { label: '已出库', variant: 'success' },
      3: { label: '已取消', variant: 'destructive' },
    };
    const s = map[status] || { label: '未知', variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      normal: '正常领料',
      over: '超领',
      supplementary: '补料',
    };
    return map[type] || type;
  };

  const handleAutoGenerate = async () => {
    if (!workOrderId) {
      toast.error('请输入工单ID');
      return;
    }
    try {
      const result = await ApiClient.post('/api/material-requisitions', {
        action: 'auto-generate',
        workOrderId: Number(workOrderId),
      });
      if (result.success) {
        toast.success(result.message);
        setShowAutoGen(false);
        setWorkOrderId('');
        loadRequisitions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('生成失败');
    }
  };

  const handleOverIssue = async () => {
    if (!workOrderId || !overMaterialId || !overQuantity || !overReason) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      const result = await ApiClient.post('/api/material-requisitions', {
        action: 'over-issue',
        workOrderId: Number(workOrderId),
        materialId: Number(overMaterialId),
        quantity: Number(overQuantity),
        reason: overReason,
      });
      if (result.success) {
        toast.success(result.message);
        setShowOverIssue(false);
        loadRequisitions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('提交失败');
    }
  };

  const handleSupplementary = async () => {
    if (!supReqId || !supMaterialId || !supQuantity || !supReason) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      const result = await ApiClient.post('/api/material-requisitions', {
        action: 'supplementary',
        originalRequisitionId: Number(supReqId),
        materialId: Number(supMaterialId),
        quantity: Number(supQuantity),
        reason: supReason,
      });
      if (result.success) {
        toast.success(result.message);
        setShowSupplementary(false);
        loadRequisitions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('提交失败');
    }
  };

  const handleIssue = async () => {
    if (!selectedReq || !issueItems) {
      toast.error('请填写出库信息');
      return;
    }
    try {
      const items = JSON.parse(issueItems);
      const result = await ApiClient.post(`/api/material-requisitions/${selectedReq.id}/issue`, {
        items,
      });
      if (result.success) {
        toast.success(result.message);
        setShowIssue(false);
        setSelectedReq(null);
        setIssueItems('');
        loadRequisitions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('出库失败，请检查JSON格式');
    }
  };

  const handleApprove = async (id: number, approved: boolean) => {
    try {
      const result = await ApiClient.put('/api/material-requisitions', {
        id,
        status: approved ? 1 : 3,
      });
      if (result.success) {
        toast.success(approved ? '审批通过' : '已驳回');
        loadRequisitions();
      }
    } catch (error) {
      toast.error('审批失败');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">物料领用管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoGen(true)}>
            <Plus className="w-4 h-4 mr-2" /> 自动生成
          </Button>
          <Button variant="outline" onClick={() => setShowOverIssue(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> 超领申请
          </Button>
          <Button variant="outline" onClick={() => setShowSupplementary(true)}>
            <FileCheck className="w-4 h-4 mr-2" /> 补料申请
          </Button>
          <Button onClick={loadRequisitions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="normal">正常领料</TabsTrigger>
          <TabsTrigger value="over">超领</TabsTrigger>
          <TabsTrigger value="supplementary">补料</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>领料单列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>领料单号</TableHead>
                <TableHead>工单号</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.requisition_no}</TableCell>
                  <TableCell>{req.work_order_no}</TableCell>
                  <TableCell>{getTypeLabel(req.type)}</TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell>{req.total_quantity}</TableCell>
                  <TableCell>{req.applicant_name}</TableCell>
                  <TableCell>{formatDate(req.create_time)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {req.status === 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(req.id, true)}
                          >
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApprove(req.id, false)}
                          >
                            驳回
                          </Button>
                        </>
                      )}
                      {req.status === 1 && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedReq(req);
                            setShowIssue(true);
                          }}
                        >
                          <ScanLine className="w-3 h-3 mr-1" /> 出库
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requisitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 自动生成弹窗 */}
      <Dialog open={showAutoGen} onOpenChange={setShowAutoGen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自动生成领料单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>工单ID</Label>
              <Input
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                placeholder="输入工单ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoGen(false)}>
              取消
            </Button>
            <Button onClick={handleAutoGenerate}>生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 超领弹窗 */}
      <Dialog open={showOverIssue} onOpenChange={setShowOverIssue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>超领申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>工单ID</Label>
              <Input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} />
            </div>
            <div>
              <Label>物料ID</Label>
              <Input value={overMaterialId} onChange={(e) => setOverMaterialId(e.target.value)} />
            </div>
            <div>
              <Label>超领数量</Label>
              <Input
                type="number"
                value={overQuantity}
                onChange={(e) => setOverQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>超领原因</Label>
              <Textarea value={overReason} onChange={(e) => setOverReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverIssue(false)}>
              取消
            </Button>
            <Button onClick={handleOverIssue}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 补料弹窗 */}
      <Dialog open={showSupplementary} onOpenChange={setShowSupplementary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>补料申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>原领料单ID</Label>
              <Input value={supReqId} onChange={(e) => setSupReqId(e.target.value)} />
            </div>
            <div>
              <Label>物料ID</Label>
              <Input value={supMaterialId} onChange={(e) => setSupMaterialId(e.target.value)} />
            </div>
            <div>
              <Label>补料数量</Label>
              <Input
                type="number"
                value={supQuantity}
                onChange={(e) => setSupQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>补料原因</Label>
              <Textarea value={supReason} onChange={(e) => setSupReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplementary(false)}>
              取消
            </Button>
            <Button onClick={handleSupplementary}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 出库弹窗 */}
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>扫码出库 - {selectedReq?.requisition_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>出库物料JSON</Label>
              <Textarea
                value={issueItems}
                onChange={(e) => setIssueItems(e.target.value)}
                placeholder='[{"materialId":1,"qrCode":"SM-xxx","quantity":10,"batchNo":"xxx"}]'
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssue(false)}>
              取消
            </Button>
            <Button onClick={handleIssue}>
              <ScanLine className="w-4 h-4 mr-2" /> 确认出库
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
