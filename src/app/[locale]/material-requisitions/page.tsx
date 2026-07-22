'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, Plus, ScanLine, FileCheck, RotateCcw } from 'lucide-react';

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
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [page, _setPage] = useState(1);
  const [_total, setTotal] = useState(0);
  const [_searchNo, _setSearchNo] = useState('');

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
      const params: Loose = { page, pageSize };
      if (activeTab !== 'all') params.type = activeTab;

      const result = await ApiClient.get('/api/material-requisitions', params);
      if (result.success) {
        setRequisitions(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(t('loadFail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [page, activeTab]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: Loose }> = {
      0: { label: tc('pending'), variant: 'secondary' },
      1: { label: t('pendingIssue'), variant: 'warning' },
      2: { label: t('issued'), variant: 'success' },
      3: { label: t('cancelled'), variant: 'destructive' },
    };
    const s = map[status] || { label: tc('unknown'), variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      normal: t('normalIssue'),
      over: t('overIssue'),
      supplementary: t('supplementary'),
    };
    return map[type] || type;
  };

  const handleAutoGenerate = async () => {
    if (!workOrderId) {
      toast.error(t('enterWorkOrderId'));
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
    } catch {
      toast.error(t('generateFail'));
    }
  };

  const handleOverIssue = async () => {
    if (!workOrderId || !overMaterialId || !overQuantity || !overReason) {
      toast.error(t('fillAllInfo'));
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
    } catch {
      toast.error(t('submitFail'));
    }
  };

  const handleSupplementary = async () => {
    if (!supReqId || !supMaterialId || !supQuantity || !supReason) {
      toast.error(t('fillAllInfo'));
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
    } catch {
      toast.error(t('submitFail'));
    }
  };

  const handleIssue = async () => {
    if (!selectedReq || !issueItems) {
      toast.error(t('fillIssueInfo'));
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
    } catch {
      toast.error(t('issueFail'));
    }
  };

  const handleApprove = async (id: number, approved: boolean) => {
    try {
      const result = await ApiClient.put('/api/material-requisitions', {
        id,
        status: approved ? 1 : 3,
      });
      if (result.success) {
        toast.success(approved ? t('approveSuccess') : t('rejectSuccess'));
        loadRequisitions();
      }
    } catch {
      toast.error(t('approveFail'));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('materialRequisitionManagement')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoGen(true)}>
            <Plus className="w-4 h-4 mr-2" /> {t('autoGenerate')}
          </Button>
          <Button variant="outline" onClick={() => setShowOverIssue(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> {t('overIssueRequest')}
          </Button>
          <Button variant="outline" onClick={() => setShowSupplementary(true)}>
            <FileCheck className="w-4 h-4 mr-2" /> {t('supplementaryRequest')}
          </Button>
          <Button onClick={loadRequisitions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('refresh')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="normal">{t('normalIssue')}</TabsTrigger>
          <TabsTrigger value="over">{t('overIssue')}</TabsTrigger>
          <TabsTrigger value="supplementary">{t('supplementary')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{t('requisitionList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('requisitionNo')}</TableHead>
                <TableHead>{t('workOrderNo')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead>{t('applicant')}</TableHead>
                <TableHead>{t('applyTime')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
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
                            {t('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApprove(req.id, false)}
                          >
                            {t('reject')}
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
                          <ScanLine className="w-3 h-3 mr-1" /> {t('issue')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requisitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAutoGen} onOpenChange={setShowAutoGen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('autoGenerateRequisition')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('workOrderId')}</Label>
              <Input
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                placeholder={t('enterWorkOrderId')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoGen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAutoGenerate}>{t('generate')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOverIssue} onOpenChange={setShowOverIssue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('overIssueRequest')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('workOrderId')}</Label>
              <Input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} />
            </div>
            <div>
              <Label>{t('materialId')}</Label>
              <Input value={overMaterialId} onChange={(e) => setOverMaterialId(e.target.value)} />
            </div>
            <div>
              <Label>{t('overIssueQty')}</Label>
              <Input
                type="number"
                value={overQuantity}
                onChange={(e) => setOverQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('overIssueReason')}</Label>
              <Textarea value={overReason} onChange={(e) => setOverReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverIssue(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleOverIssue}>{t('submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupplementary} onOpenChange={setShowSupplementary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('supplementaryRequest')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('originalRequisitionId')}</Label>
              <Input value={supReqId} onChange={(e) => setSupReqId(e.target.value)} />
            </div>
            <div>
              <Label>{t('materialId')}</Label>
              <Input value={supMaterialId} onChange={(e) => setSupMaterialId(e.target.value)} />
            </div>
            <div>
              <Label>{t('supplementaryQty')}</Label>
              <Input
                type="number"
                value={supQuantity}
                onChange={(e) => setSupQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('supplementaryReason')}</Label>
              <Textarea value={supReason} onChange={(e) => setSupReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplementary(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSupplementary}>{t('submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('scanIssue')} - {selectedReq?.requisition_no}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('issueItemsJson')}</Label>
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
              {t('cancel')}
            </Button>
            <Button onClick={handleIssue}>
              <ScanLine className="w-4 h-4 mr-2" /> {t('confirmIssue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
