'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
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
  remark: string;
  create_time: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  0: { label: '草稿', variant: 'secondary' },
  1: { label: '待审批', variant: 'outline' },
  2: { label: '已批准', variant: 'default' },
  3: { label: '已拒绝', variant: 'destructive' },
  4: { label: '已转采购', variant: 'default' },
  5: { label: '已完成', variant: 'default' },
};

const priorityMap: Record<number, { label: string; color: string }> = {
  0: { label: '低', color: 'bg-gray-100 text-gray-700' },
  1: { label: '中', color: 'bg-blue-100 text-blue-700' },
  2: { label: '高', color: 'bg-orange-100 text-orange-700' },
  3: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

export default function PurchaseRequestPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchRequests();
  }, [page, status]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status !== 'all') params.append('status', status);
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/purchase/request?${params}`);
      const result = await response.json();

      if (result.success) {
        setRequests(result.data);
        setTotal(result.pagination.total);
      } else {
        toast.error(result.message || '获取采购申请列表失败');
      }
    } catch (error) {
      toast.error('获取采购申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个采购申请吗？')) return;

    try {
      const response = await fetch(`/api/purchase/request?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('删除成功');
        fetchRequests();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchRequests();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              采购申请
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理采购申请单，跟踪审批进度
            </p>
          </div>
          <Button onClick={() => router.push('/purchase/request/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新增申请
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索申请单号、申请人、部门..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="0">草稿</option>
            <option value="1">待审批</option>
            <option value="2">已批准</option>
            <option value="3">已拒绝</option>
            <option value="4">已转采购</option>
            <option value="5">已完成</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>

        {/* 申请列表 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请单号</TableHead>
                <TableHead>申请日期</TableHead>
                <TableHead>申请部门</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无采购申请数据
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.request_no}
                    </TableCell>
                    <TableCell>{request.request_date}</TableCell>
                    <TableCell>{request.request_dept || '-'}</TableCell>
                    <TableCell>{request.requester_name || '-'}</TableCell>
                    <TableCell>{request.request_type || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${priorityMap[request.priority]?.color || ''}`}>
                        {priorityMap[request.priority]?.label || '中'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(request.total_amount, request.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[request.status]?.variant || 'default'}>
                        {statusMap[request.status]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/purchase/request/${request.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看
                          </DropdownMenuItem>
                          {request.status <= 1 && (
                            <DropdownMenuItem onClick={() => router.push(`/purchase/request/${request.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                          )}
                          {request.status === 1 && (
                            <>
                              <DropdownMenuItem onClick={() => toast.info('审批功能开发中')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                批准
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('审批功能开发中')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                拒绝
                              </DropdownMenuItem>
                            </>
                          )}
                          {request.status <= 1 && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(request.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
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
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
