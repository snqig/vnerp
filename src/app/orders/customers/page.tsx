'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Phone,
  MapPin,
  Mail,
  User,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// 客户列表项接口（基于 crm_customer 表）
interface CustomerListItem {
  id: number;
  customerCode: string;
  customerName: string;
  shortName: string;
  customerType: number;
  industry: string;
  scale: string;
  creditLevel: string;
  province: string;
  city: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  fax: string;
  website: string;
  businessLicense: string;
  taxNumber: string;
  bankName: string;
  bankAccount: string;
  salesmanId: number;
  followUpStatus: number;
  status: number;
  remark: string;
  createTime: string;
  updateTime: string;
}

// 客户类型映射
const customerTypeMap: Record<number, { label: string; color: string }> = {
  1: { label: '企业', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  2: { label: '个人', color: 'bg-green-100 text-green-800 border-green-200' },
};

// 跟进状态映射
const followUpStatusMap: Record<number, { label: string; color: string }> = {
  1: { label: '潜在客户', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  2: { label: '意向客户', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  3: { label: '成交客户', color: 'bg-green-100 text-green-800 border-green-200' },
  4: { label: '流失客户', color: 'bg-red-100 text-red-800 border-red-200' },
};

// 状态映射
const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '禁用', color: 'bg-red-100 text-red-800 border-red-200' },
  1: { label: '启用', color: 'bg-green-100 text-green-800 border-green-200' },
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // 从数据库加载客户数据
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, statusFilter, customerTypeFilter, followUpStatusFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (customerTypeFilter !== 'all') {
        params.append('customerType', customerTypeFilter);
      }
      if (followUpStatusFilter !== 'all') {
        params.append('followUpStatus', followUpStatusFilter);
      }
      if (searchTerm) {
        params.append('keyword', searchTerm);
      }

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // 转换数据库字段为前端格式
        const formattedCustomers: CustomerListItem[] = result.data.map((item: any) => ({
          id: item.id,
          customerCode: item.customer_code,
          customerName: item.customer_name,
          shortName: item.short_name,
          customerType: item.customer_type,
          industry: item.industry,
          scale: item.scale,
          creditLevel: item.credit_level,
          province: item.province,
          city: item.city,
          district: item.district,
          address: item.address,
          contactName: item.contact_name,
          contactPhone: item.contact_phone,
          contactEmail: item.contact_email,
          fax: item.fax,
          website: item.website,
          businessLicense: item.business_license,
          taxNumber: item.tax_number,
          bankName: item.bank_name,
          bankAccount: item.bank_account,
          salesmanId: item.salesman_id,
          followUpStatus: item.follow_up_status,
          status: item.status,
          remark: item.remark,
          createTime: item.create_time,
          updateTime: item.update_time,
        }));
        setCustomers(formattedCustomers);
        setTotalCount(result.pagination?.total || 0);
      } else {
        console.error('加载数据失败:', result.message);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchCustomers();
  };

  // 处理新建客户
  const handleCreate = () => {
    router.push('/orders/customers/new');
  };

  // 处理编辑客户
  const handleEdit = (customer: CustomerListItem) => {
    router.push(`/orders/customers/${customer.id}/edit`);
  };

  // 处理查看客户详情
  const handleView = (customer: CustomerListItem) => {
    router.push(`/orders/customers/${customer.id}`);
  };

  // 处理删除客户
  const handleDelete = async (customer: CustomerListItem) => {
    if (!confirm(`确定要删除客户 "${customer.customerName}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        fetchCustomers();
      } else {
        alert('删除失败: ' + result.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查网络连接');
    }
  };

  // 获取客户类型标签
  const getCustomerTypeBadge = (type: number) => {
    const { label, color } = customerTypeMap[type] || customerTypeMap[1];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  // 获取跟进状态标签
  const getFollowUpStatusBadge = (status: number) => {
    const { label, color } = followUpStatusMap[status] || followUpStatusMap[1];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  // 获取状态标签
  const getStatusBadge = (status: number) => {
    const { label, color } = statusMap[status] || statusMap[1];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  // 分页计算
  const totalPages = Math.ceil(totalCount / pageSize);
  const filteredCustomers = customers;

  return (
    <MainLayout title="客户档案">
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                客户总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                成交客户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customers.filter(c => c.followUpStatus === 3).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                意向客户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {customers.filter(c => c.followUpStatus === 2).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                企业客户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customers.filter(c => c.customerType === 1).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="客户编码/名称/联系人/电话"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[140px]">
                <label className="text-sm font-medium mb-2 block">客户类型</label>
                <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="1">企业</SelectItem>
                    <SelectItem value="2">个人</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <label className="text-sm font-medium mb-2 block">跟进状态</label>
                <Select value={followUpStatusFilter} onValueChange={setFollowUpStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">潜在客户</SelectItem>
                    <SelectItem value="2">意向客户</SelectItem>
                    <SelectItem value="3">成交客户</SelectItem>
                    <SelectItem value="4">流失客户</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <label className="text-sm font-medium mb-2 block">状态</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                搜索
              </Button>
              <Button variant="outline" onClick={fetchCustomers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                新建客户
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 客户列表 */}
        <Card>
          <CardHeader>
            <CardTitle>客户列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[100px]">客户编码</TableHead>
                    <TableHead className="w-[180px]">客户名称</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[120px]">联系人</TableHead>
                    <TableHead className="w-[130px]">联系电话</TableHead>
                    <TableHead className="w-[200px]">地址</TableHead>
                    <TableHead className="w-[100px]">跟进状态</TableHead>
                    <TableHead className="w-[70px]">状态</TableHead>
                    <TableHead className="w-[80px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          加载中...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="group hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">
                          {customer.customerCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[160px]" title={customer.customerName}>
                              {customer.customerName}
                            </span>
                            {customer.shortName && (
                              <span className="text-xs text-muted-foreground">{customer.shortName}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getCustomerTypeBadge(customer.customerType)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[100px]" title={customer.contactName}>
                              {customer.contactName || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{customer.contactPhone || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[180px]" title={`${customer.province || ''}${customer.city || ''}${customer.district || ''}${customer.address || ''}`}>
                              {customer.province || ''}{customer.city || ''}{customer.district || ''}{customer.address || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getFollowUpStatusBadge(customer.followUpStatus)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(customer.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(customer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(customer)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  共 {totalCount} 条记录，第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
