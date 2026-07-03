'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';

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

const CUSTOMER_TYPE_LABEL_KEYS: Record<number, string> = {
  1: 'typeEnterprise',
  2: 'typeIndividual',
};

const FOLLOW_UP_STATUS_LABEL_KEYS: Record<number, string> = {
  1: 'statusPotential',
  2: 'statusIntention',
  3: 'statusCompleted',
  4: 'statusLost',
};

const STATUS_LABEL_KEYS: Record<number, string> = {
  0: 'disabled',
  1: 'enabled',
};

export default function CustomersPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');
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

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 从数据库加载客户数据
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, statusFilter, customerTypeFilter, followUpStatusFilter]);

  // 防抖搜索：搜索词变化时自动触发搜索
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

      const response = await authFetch(`/api/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // 转换数据库字段为前端格式
        const customerList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        const formattedCustomers: CustomerListItem[] = customerList.map((item: any) => ({
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
        setTotalCount(result.pagination?.total || result.data?.total || 0);
      } else {
        console.error(t('loadDataFailed'), result.message);
      }
    } catch (error) {
      console.error(t('loadDataFailed'), error);
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
    setSelectedCustomer(customer);
    setEditForm({
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      shortName: customer.shortName || '',
      customerType: String(customer.customerType),
      industry: customer.industry || '',
      scale: customer.scale || '',
      creditLevel: customer.creditLevel || '',
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      address: customer.address || '',
      contactName: customer.contactName || '',
      contactPhone: customer.contactPhone || '',
      contactEmail: customer.contactEmail || '',
      fax: customer.fax || '',
      website: customer.website || '',
      taxNumber: customer.taxNumber || '',
      bankName: customer.bankName || '',
      bankAccount: customer.bankAccount || '',
      followUpStatus: String(customer.followUpStatus),
      status: String(customer.status),
      remark: customer.remark || '',
    });
    setIsEditOpen(true);
  };

  // 处理查看客户详情
  const handleView = (customer: CustomerListItem) => {
    setSelectedCustomer(customer);
    setIsViewOpen(true);
  };

  // 处理删除客户
  const handleDelete = async (customer: CustomerListItem) => {
    if (!confirm(t('confirmDeleteCustomer', { name: customer.customerName }))) {
      return;
    }

    try {
      const response = await authFetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        fetchCustomers();
      } else {
        alert(tc('deleteFailed') + ': ' + result.message);
      }
    } catch (error) {
      console.error(tc('deleteFailed'), error);
      alert(t('deleteNetworkError'));
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    try {
      const body = {
        customer_code: editForm.customerCode,
        customer_name: editForm.customerName,
        short_name: editForm.shortName,
        customer_type: parseInt(editForm.customerType) || 1,
        industry: editForm.industry,
        scale: editForm.scale,
        credit_level: editForm.creditLevel,
        province: editForm.province,
        city: editForm.city,
        district: editForm.district,
        address: editForm.address,
        contact_name: editForm.contactName,
        contact_phone: editForm.contactPhone,
        contact_email: editForm.contactEmail,
        fax: editForm.fax,
        website: editForm.website,
        tax_number: editForm.taxNumber,
        bank_name: editForm.bankName,
        bank_account: editForm.bankAccount,
        follow_up_status: parseInt(editForm.followUpStatus) || 1,
        status: parseInt(editForm.status) ?? 1,
        remark: editForm.remark,
      };
      const response = await authFetch(`/api/customers?id=${selectedCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setIsEditOpen(false);
        fetchCustomers();
      } else {
        alert(t('saveFailed') + ': ' + result.message);
      }
    } catch (error) {
      console.error(t('saveFailed'), error);
      alert(t('saveNetworkError'));
    }
  };

  const customerTypeColors: Record<number, string> = {
    1: 'bg-blue-100 text-blue-800 border-blue-200',
    2: 'bg-green-100 text-green-800 border-green-200',
  };

  const followUpStatusColors: Record<number, string> = {
    1: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    2: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
    3: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    4: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  };

  const statusColors: Record<number, string> = {
    0: 'bg-red-100 text-red-800 border-red-200',
    1: 'bg-green-100 text-green-800 border-green-200',
  };

  // 获取客户类型标签
  const getCustomerTypeBadge = (type: number) => {
    const key = CUSTOMER_TYPE_LABEL_KEYS[type] || 'typeEnterprise';
    const color = customerTypeColors[type] || customerTypeColors[1];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}
      >
        {t(key)}
      </span>
    );
  };

  const getFollowUpStatusBadge = (status: number) => {
    const key = FOLLOW_UP_STATUS_LABEL_KEYS[status] || 'statusPotential';
    const color = followUpStatusColors[status] || followUpStatusColors[1];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}
      >
        {t(key)}
      </span>
    );
  };

  // 获取状态标签
  const getStatusBadge = (status: number) => {
    const key = STATUS_LABEL_KEYS[status] || 'enabled';
    const color = statusColors[status] || statusColors[1];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}
      >
        {tc(key)}
      </span>
    );
  };

  // 分页计算
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const filteredCustomers = useMemo(() => {
    if (!sortField || !sortOrder) return customers;
    return [...customers].sort((a, b) => {
      const aVal = (a as Record<string, any>)[sortField];
      const bVal = (b as Record<string, any>)[sortField];
      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, sortField, sortOrder]);

  return (
    <MainLayout title={t('customerArchive')}>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('totalCustomers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('completedCustomers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customers.filter((c) => c.followUpStatus === 3).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('intentionCustomers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {customers.filter((c) => c.followUpStatus === 2).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('enterpriseCustomers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customers.filter((c) => c.customerType === 1).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{tc('search')}</label>
                <SearchInput
                  placeholder={t('searchCustomerPlaceholder')}
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onSearch={() => {
                    setCurrentPage(1);
                    fetchCustomers();
                  }}
                />
              </div>
              <div className="w-[140px]">
                <label className="text-sm font-medium mb-2 block">{t('customerType')}</label>
                <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTypes')}</SelectItem>
                    <SelectItem value="1">{t('typeEnterprise')}</SelectItem>
                    <SelectItem value="2">{t('typeIndividual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <label className="text-sm font-medium mb-2 block">{t('followUpStatus')}</label>
                <Select value={followUpStatusFilter} onValueChange={setFollowUpStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="1">{t('statusPotential')}</SelectItem>
                    <SelectItem value="2">{t('statusIntention')}</SelectItem>
                    <SelectItem value="3">{t('statusCompleted')}</SelectItem>
                    <SelectItem value="4">{t('statusLost')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <label className="text-sm font-medium mb-2 block">{tc('status')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc('all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                    <SelectItem value="1">{tc('enabled')}</SelectItem>
                    <SelectItem value="0">{tc('disabled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
              <Button variant="outline" onClick={fetchCustomers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc('refresh')}
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('newCustomer')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 客户列表 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('customerList')}</CardTitle>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={filteredCustomers.length}
              onSelectAll={() => setSelectedIds(new Set(filteredCustomers.map((c) => c.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={() =>
                printTable(
                  filteredCustomers.map((c) => ({
                    [t('customerCode')]: c.customerCode,
                    [t('customerName')]: c.customerName,
                    [t('type')]: t(CUSTOMER_TYPE_LABEL_KEYS[c.customerType] || 'typeEnterprise'),
                    [t('contactPerson')]: c.contactName,
                    [t('contactPhone')]: c.contactPhone,
                    [t('address')]: `${c.province || ''}${c.city || ''}${c.district || ''}${c.address || ''}`,
                    [t('followUpStatus')]: t(FOLLOW_UP_STATUS_LABEL_KEYS[c.followUpStatus] || 'statusPotential'),
                    [tc('status')]: tc(STATUS_LABEL_KEYS[c.status] || 'enabled'),
                  })),
                  [
                    { key: t('customerCode'), header: t('customerCode') },
                    { key: t('customerName'), header: t('customerName') },
                    { key: t('type'), header: t('type') },
                    { key: t('contactPerson'), header: t('contactPerson') },
                    { key: t('contactPhone'), header: t('contactPhone') },
                    { key: t('address'), header: t('address') },
                    { key: t('followUpStatus'), header: t('followUpStatus') },
                    { key: tc('status'), header: tc('status') },
                  ],
                  t('customerList')
                )
              }
              onExportPDF={() =>
                exportTableToPDF(
                  filteredCustomers.map((c) => ({
                    [t('customerCode')]: c.customerCode,
                    [t('customerName')]: c.customerName,
                    [t('type')]: t(CUSTOMER_TYPE_LABEL_KEYS[c.customerType] || 'typeEnterprise'),
                    [t('contactPerson')]: c.contactName,
                    [t('contactPhone')]: c.contactPhone,
                    [t('address')]: `${c.province || ''}${c.city || ''}${c.district || ''}${c.address || ''}`,
                    [t('followUpStatus')]: t(FOLLOW_UP_STATUS_LABEL_KEYS[c.followUpStatus] || 'statusPotential'),
                    [tc('status')]: tc(STATUS_LABEL_KEYS[c.status] || 'enabled'),
                  })),
                  t('customerList'),
                  [
                    { key: t('customerCode'), header: t('customerCode') },
                    { key: t('customerName'), header: t('customerName') },
                    { key: t('type'), header: t('type') },
                    { key: t('contactPerson'), header: t('contactPerson') },
                    { key: t('contactPhone'), header: t('contactPhone') },
                    { key: t('address'), header: t('address') },
                    { key: t('followUpStatus'), header: t('followUpStatus') },
                    { key: tc('status'), header: tc('status') },
                  ],
                  t('customerList')
                )
              }
              onExportXLS={() =>
                exportTableToXLS(
                  filteredCustomers.map((c) => ({
                    [t('customerCode')]: c.customerCode,
                    [t('customerName')]: c.customerName,
                    [t('type')]: t(CUSTOMER_TYPE_LABEL_KEYS[c.customerType] || 'typeEnterprise'),
                    [t('contactPerson')]: c.contactName,
                    [t('contactPhone')]: c.contactPhone,
                    [t('address')]: `${c.province || ''}${c.city || ''}${c.district || ''}${c.address || ''}`,
                    [t('followUpStatus')]: t(FOLLOW_UP_STATUS_LABEL_KEYS[c.followUpStatus] || 'statusPotential'),
                    [tc('status')]: tc(STATUS_LABEL_KEYS[c.status] || 'enabled'),
                  })),
                  t('customerList'),
                  [
                    { key: t('customerCode'), header: t('customerCode') },
                    { key: t('customerName'), header: t('customerName') },
                    { key: t('type'), header: t('type') },
                    { key: t('contactPerson'), header: t('contactPerson') },
                    { key: t('contactPhone'), header: t('contactPhone') },
                    { key: t('address'), header: t('address') },
                    { key: t('followUpStatus'), header: t('followUpStatus') },
                    { key: tc('status'), header: tc('status') },
                  ]
                )
              }
              onExportWORD={() =>
                exportTableToWORD(
                  filteredCustomers.map((c) => ({
                    [t('customerCode')]: c.customerCode,
                    [t('customerName')]: c.customerName,
                    [t('type')]: t(CUSTOMER_TYPE_LABEL_KEYS[c.customerType] || 'typeEnterprise'),
                    [t('contactPerson')]: c.contactName,
                    [t('contactPhone')]: c.contactPhone,
                    [t('address')]: `${c.province || ''}${c.city || ''}${c.district || ''}${c.address || ''}`,
                    [t('followUpStatus')]: t(FOLLOW_UP_STATUS_LABEL_KEYS[c.followUpStatus] || 'statusPotential'),
                    [tc('status')]: tc(STATUS_LABEL_KEYS[c.status] || 'enabled'),
                  })),
                  t('customerList'),
                  [
                    { key: t('customerCode'), header: t('customerCode') },
                    { key: t('customerName'), header: t('customerName') },
                    { key: t('type'), header: t('type') },
                    { key: t('contactPerson'), header: t('contactPerson') },
                    { key: t('contactPhone'), header: t('contactPhone') },
                    { key: t('address'), header: t('address') },
                    { key: t('followUpStatus'), header: t('followUpStatus') },
                    { key: tc('status'), header: tc('status') },
                  ],
                  t('customerList')
                )
              }
            />
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          selectedIds.size > 0 && selectedIds.size === filteredCustomers.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('customerCode')}
                    >
                      <span className="inline-flex items-center">
                        {t('customerCode')}{getSortIcon('customerCode')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[180px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('customerName')}
                    >
                      <span className="inline-flex items-center">
                        {t('customerName')}{getSortIcon('customerName')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('customerType')}
                    >
                      <span className="inline-flex items-center">
                        {t('type')}{getSortIcon('customerType')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('contactName')}
                    >
                      <span className="inline-flex items-center">
                        {t('contactPerson')}{getSortIcon('contactName')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[130px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('contactPhone')}
                    >
                      <span className="inline-flex items-center">
                        {t('contactPhone')}{getSortIcon('contactPhone')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[200px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('address')}
                    >
                      <span className="inline-flex items-center">{t('address')}{getSortIcon('address')}</span>
                    </TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('followUpStatus')}
                    >
                      <span className="inline-flex items-center">
                        {t('followUpStatus')}{getSortIcon('followUpStatus')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[70px] cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">{tc('status')}{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="w-[80px] text-center">{tc('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          {tc('loading')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="group hover:bg-muted/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(customer.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedIds);
                              if (checked) next.add(customer.id);
                              else next.delete(customer.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{customer.customerCode}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className="font-medium truncate max-w-[160px]"
                              title={customer.customerName}
                            >
                              {customer.customerName}
                            </span>
                            {customer.shortName && (
                              <span className="text-xs text-muted-foreground">
                                {customer.shortName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getCustomerTypeBadge(customer.customerType)}</TableCell>
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
                            <span
                              className="truncate max-w-[180px]"
                              title={`${customer.province || ''}${customer.city || ''}${customer.district || ''}${customer.address || ''}`}
                            >
                              {customer.province || ''}
                              {customer.city || ''}
                              {customer.district || ''}
                              {customer.address || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getFollowUpStatusBadge(customer.followUpStatus)}</TableCell>
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(customer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {tc('view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(customer)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tc('delete')}
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
                  {t('paginationInfo', { total: totalCount, current: currentPage, pages: totalPages })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 查看客户详情对话框 */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('customerDetail')}</DialogTitle>
              <DialogDescription>{t('viewCustomerInfo')}</DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('customerCode')}</span>
                    <p className="font-medium">{selectedCustomer.customerCode}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('customerName')}</span>
                    <p className="font-medium">{selectedCustomer.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('shortName')}</span>
                    <p className="font-medium">{selectedCustomer.shortName || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('customerType')}</span>
                    <p>{getCustomerTypeBadge(selectedCustomer.customerType)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('industry')}</span>
                    <p className="font-medium">{selectedCustomer.industry || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('scale')}</span>
                    <p className="font-medium">{selectedCustomer.scale || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('creditLevel')}</span>
                    <p className="font-medium">{selectedCustomer.creditLevel || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('followUpStatus')}</span>
                    <p>{getFollowUpStatusBadge(selectedCustomer.followUpStatus)}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t('contactInfo')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('contactPerson')}</span>
                      <p className="font-medium">{selectedCustomer.contactName || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('contactPhone')}</span>
                      <p className="font-medium">{selectedCustomer.contactPhone || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('email')}</span>
                      <p className="font-medium">{selectedCustomer.contactEmail || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('fax')}</span>
                      <p className="font-medium">{selectedCustomer.fax || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('website')}</span>
                      <p className="font-medium">{selectedCustomer.website || '-'}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-sm text-muted-foreground">{t('address')}</span>
                      <p className="font-medium">
                        {[
                          selectedCustomer.province,
                          selectedCustomer.city,
                          selectedCustomer.district,
                          selectedCustomer.address,
                        ]
                          .filter(Boolean)
                          .join('') || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t('financeInfo')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('taxNumber')}</span>
                      <p className="font-medium">{selectedCustomer.taxNumber || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('bankName')}</span>
                      <p className="font-medium">{selectedCustomer.bankName || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{t('bankAccount')}</span>
                      <p className="font-medium">{selectedCustomer.bankAccount || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">{tc('status')}</span>
                      <p>{getStatusBadge(selectedCustomer.status)}</p>
                    </div>
                  </div>
                </div>
                  <div className="border-t pt-4">
                    <span className="text-sm text-muted-foreground">{tc('remark')}</span>
                    <p className="font-medium mt-1">{selectedCustomer.remark}</p>
                  </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑客户对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('editCustomer')}</DialogTitle>
              <DialogDescription>{t('modifyCustomerInfo')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('customerCode')} *</Label>
                  <Input
                    value={editForm.customerCode || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerCode: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('customerName')} *</Label>
                  <Input
                    value={editForm.customerName || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('shortName')}</Label>
                  <Input
                    value={editForm.shortName || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, shortName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('customerType')}</Label>
                  <Select
                    value={editForm.customerType || '1'}
                    onValueChange={(v) => setEditForm((prev) => ({ ...prev, customerType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('typeEnterprise')}</SelectItem>
                      <SelectItem value="2">{t('typeIndividual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('industry')}</Label>
                  <Input
                    value={editForm.industry || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, industry: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('scale')}</Label>
                  <Input
                    value={editForm.scale || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, scale: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('creditLevel')}</Label>
                  <Input
                    value={editForm.creditLevel || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, creditLevel: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('followUpStatus')}</Label>
                  <Select
                    value={editForm.followUpStatus || '1'}
                    onValueChange={(v) => setEditForm((prev) => ({ ...prev, followUpStatus: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('statusPotential')}</SelectItem>
                      <SelectItem value="2">{t('statusIntention')}</SelectItem>
                      <SelectItem value="3">{t('statusCompleted')}</SelectItem>
                      <SelectItem value="4">{t('statusLost')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">{t('contactInfo')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('contactPerson')}</Label>
                    <Input
                      value={editForm.contactName || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, contactName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('contactPhone')}</Label>
                    <Input
                      value={editForm.contactPhone || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input
                      value={editForm.contactEmail || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fax')}</Label>
                    <Input
                      value={editForm.fax || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fax: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('website')}</Label>
                    <Input
                      value={editForm.website || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, website: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('province')}</Label>
                    <Input
                      value={editForm.province || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, province: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('city')}</Label>
                    <Input
                      value={editForm.city || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('district')}</Label>
                    <Input
                      value={editForm.district || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, district: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>{t('detailAddress')}</Label>
                    <Input
                      value={editForm.address || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">{t('financeInfo')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('taxNumber')}</Label>
                    <Input
                      value={editForm.taxNumber || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, taxNumber: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('bankName')}</Label>
                    <Input
                      value={editForm.bankName || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('bankAccount')}</Label>
                    <Input
                      value={editForm.bankAccount || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, bankAccount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tc('status')}</Label>
                    <Select
                      value={editForm.status || '1'}
                      onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{tc('enabled')}</SelectItem>
                        <SelectItem value="0">{tc('disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={editForm.remark || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, remark: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSaveEdit}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
