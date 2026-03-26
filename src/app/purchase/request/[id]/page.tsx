'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Edit, Printer, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseRequest {
  id: number;
  request_no: string;
  request_date: string;
  request_type: string;
  request_dept: string;
  requester_name: string;
  total_amount: number;
  currency: string;
  status: number;
  priority: number;
  expected_date: string;
  supplier_name: string;
  remark: string;
  approver_name: string;
  approve_date: string;
  approve_remark: string;
  create_time: string;
  items: RequestItem[];
}

interface RequestItem {
  id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  remark: string;
}

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  1: { label: '待审批', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: '已批准', color: 'bg-green-100 text-green-700' },
  3: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
  4: { label: '已转采购', color: 'bg-blue-100 text-blue-700' },
  5: { label: '已完成', color: 'bg-purple-100 text-purple-700' },
};

const priorityMap: Record<number, { label: string; color: string }> = {
  0: { label: '低', color: 'bg-gray-100 text-gray-700' },
  1: { label: '中', color: 'bg-blue-100 text-blue-700' },
  2: { label: '高', color: 'bg-orange-100 text-orange-700' },
  3: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

export default function PurchaseRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase/request?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setRequest(result.data);
      } else {
        toast.error(result.message || '获取采购申请失败');
      }
    } catch (error) {
      toast.error('获取采购申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    toast.info('审批功能开发中');
  };

  const handleReject = async () => {
    toast.info('审批功能开发中');
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
    }).format(amount);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-20">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-20 text-muted-foreground">
            采购申请不存在或已被删除
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                采购申请详情
              </h1>
              <p className="text-sm text-muted-foreground">
                单号：{request.request_no}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              打印
            </Button>
            {request.status <= 1 && (
              <Button onClick={() => router.push(`/purchase/request/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
            )}
            {request.status === 1 && (
              <>
                <Button variant="outline" className="text-green-600" onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  批准
                </Button>
                <Button variant="outline" className="text-red-600" onClick={handleReject}>
                  <XCircle className="h-4 w-4 mr-2" />
                  拒绝
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 状态栏 */}
        <div className="flex items-center gap-4 mb-6">
          <span className={`px-3 py-1 rounded text-sm font-medium ${statusMap[request.status]?.color}`}>
            {statusMap[request.status]?.label || '未知'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${priorityMap[request.priority]?.color}`}>
            优先级：{priorityMap[request.priority]?.label || '中'}
          </span>
        </div>

        {/* 基本信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">申请日期</div>
                <div className="font-medium">{request.request_date}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">申请类型</div>
                <div className="font-medium">{request.request_type || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">申请部门</div>
                <div className="font-medium">{request.request_dept || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">申请人</div>
                <div className="font-medium">{request.requester_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">期望到货日期</div>
                <div className="font-medium">{request.expected_date || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">建议供应商</div>
                <div className="font-medium">{request.supplier_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">创建时间</div>
                <div className="font-medium">{new Date(request.create_time).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">合计金额</div>
                <div className="font-medium text-blue-600">
                  {formatAmount(request.total_amount, request.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 物料明细 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>采购物料明细</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>行号</TableHead>
                  <TableHead>物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>规格型号</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.line_no}</TableCell>
                    <TableCell>{item.material_code || '-'}</TableCell>
                    <TableCell className="font-medium">{item.material_name}</TableCell>
                    <TableCell>{item.material_spec || '-'}</TableCell>
                    <TableCell>{item.material_unit || '-'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{Number(item.price || 0).toFixed(4)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(Number(item.amount || 0), request.currency)}
                    </TableCell>
                    <TableCell>{item.remark || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 合计 */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-lg font-bold">
                合计金额：<span className="text-blue-600">{formatAmount(request.total_amount, request.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 审批信息 */}
        {(request.approver_name || request.approve_remark) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>审批信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">审批人</div>
                  <div className="font-medium">{request.approver_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">审批日期</div>
                  <div className="font-medium">{request.approve_date || '-'}</div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-sm text-muted-foreground">审批意见</div>
                  <div className="font-medium">{request.approve_remark || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 备注 */}
        {request.remark && (
          <Card>
            <CardHeader>
              <CardTitle>备注</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{request.remark}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
