'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Phone,
  MapPin,
  User,
  RefreshCw,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { CustomerStatsCards } from './customer-stats-cards';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
  const ts = useTranslations('Orders');
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
  const [pageSize, setPageSize] = useState(20);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedRows, setSelectedRows] = useState<CustomerListItem[]>([]);

  // 从数据库加载客户数据
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchCustomers 依赖 searchTerm，搜索由下方防抖 effect 单独处理
  }, [currentPage, pageSize, statusFilter, customerTypeFilter, followUpStatusFilter]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchCustomers 依赖多个状态，此处仅响应 searchTerm 变化做防抖搜索
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
        const customerList = Array.isArray(result.data) ? result.data : result.data?.list || [];
        const formattedCustomers: CustomerListItem[] = customerList.map((item: Loose) => ({
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
      }
    } catch {
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
    } catch {
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
    } catch {
      alert(t('saveNetworkError'));
    }
  };

  const customerTypeColors: Record<number, string> = {
    1: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200',
    2: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200',
  };

  const followUpStatusColors: Record<number, string> = {
    1: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    2: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
    3: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    4: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  };

  const statusColors: Record<number, string> = {
    0: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200',
    1: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200',
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

  const renderSortTitle = (label: React.ReactNode, field: string) => (
    <span
      className="inline-flex items-center cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {label}
      {getSortIcon(field)}
    </span>
  );

  const filteredCustomers = useMemo(() => {
    if (!sortField || !sortOrder) return customers;
    return [...customers].sort((a, b) => {
      const aVal = (a as Record<string, Loose>)[sortField];
      const bVal = (b as Record<string, Loose>)[sortField];
      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, sortField, sortOrder]);

  const columns: StandardTableColumn<CustomerListItem>[] = [
    {
      key: 'customerCode',
      title: renderSortTitle(t('customerCode'), 'customerCode'),
      sortable: true,
      render: (c: CustomerListItem) => <span className="font-mono text-sm">{c.customerCode}</span>,
    },
    {
      key: 'customerName',
      title: renderSortTitle(t('customerName'), 'customerName'),
      sortable: true,
      render: (c: CustomerListItem) => (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[160px]" title={c.customerName}>
            {c.customerName}
          </span>
          {c.shortName && (
            <span className="text-xs text-muted-foreground">{c.shortName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'customerType',
      title: renderSortTitle(t('type'), 'customerType'),
      sortable: true,
      render: (c: CustomerListItem) => getCustomerTypeBadge(c.customerType),
    },
    {
      key: 'contactName',
      title: renderSortTitle(t('contactPerson'), 'contactName'),
      sortable: true,
      render: (c: CustomerListItem) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[100px]" title={c.contactName}>
            {c.contactName || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'contactPhone',
      title: renderSortTitle(t('contactPhone'), 'contactPhone'),
      sortable: true,
      render: (c: CustomerListItem) => (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{c.contactPhone || '-'}</span>
        </div>
      ),
    },
    {
      key: 'address',
      title: renderSortTitle(t('address'), 'address'),
      sortable: true,
      render: (c: CustomerListItem) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span
            className="truncate max-w-[180px]"
            title={`${c.province || ''}${c.city || ''}${c.district || ''}${c.address || ''}`}
          >
            {c.province || ''}
            {c.city || ''}
            {c.district || ''}
            {c.address || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'followUpStatus',
      title: renderSortTitle(t('followUpStatus'), 'followUpStatus'),
      sortable: true,
      render: (c: CustomerListItem) => getFollowUpStatusBadge(c.followUpStatus),
    },
    {
      key: 'status',
      title: renderSortTitle(tc('status'), 'status'),
      sortable: true,
      render: (c: CustomerListItem) => getStatusBadge(c.status),
    },
    {
      key: 'actions',
      title: tc('operation'),
      align: 'right',
      render: (c: CustomerListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(c)}>
              <Eye className="h-4 w-4 mr-2" />
              {tc('view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(c)}>
              <Edit className="h-4 w-4 mr-2" />
              {tc('edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(c)}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {tc('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <MainLayout title={t('customerArchive')}>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <CustomerStatsCards totalCount={totalCount} customers={customers} t={t} />

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
            <GlobalExportToolbar
              filename={ts('k_xszhep')}
              title={ts('k_xszhep')}
              columns={[
                { key: 'customerCode', label: t('customerCode'), width: 15 },
                { key: 'customerName', label: t('customerName'), width: 25 },
                {
                  key: 'customerType',
                  label: t('type'),
                  width: 10,
                  formatter: (v) => t(CUSTOMER_TYPE_LABEL_KEYS[v] || 'typeEnterprise'),
                },
                { key: 'contactName', label: t('contactPerson'), width: 12 },
                { key: 'contactPhone', label: t('contactPhone'), width: 15 },
                {
                  key: 'address',
                  label: t('address'),
                  width: 30,
                  formatter: (_v, row) =>
                    `${(row as Loose).province || ''}${(row as Loose).city || ''}${(row as Loose).district || ''}${(row as Loose).address || ''}`,
                },
                {
                  key: 'followUpStatus',
                  label: t('followUpStatus'),
                  width: 12,
                  formatter: (v) => t(FOLLOW_UP_STATUS_LABEL_KEYS[v] || 'statusPotential'),
                },
                {
                  key: 'status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => tc(STATUS_LABEL_KEYS[v] || 'enabled'),
                },
              ]}
              data={
                selectedRows.length > 0
                  ? filteredCustomers.filter((c) => selectedRows.some((r) => r.id === c.id))
                  : filteredCustomers
              }
            />
          </CardHeader>
          <CardContent>
            <StandardTable<CustomerListItem>
              columns={columns}
              dataSource={filteredCustomers}
              total={totalCount}
              page={currentPage}
              pageSize={pageSize}
              showPagination={totalCount > 0}
              pageSizeOptions={[20, 50, 100]}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              rowKey="id"
              loading={loading && customers.length === 0}
              emptyText={customers.length === 0 ? tc('noData') : tc('noData')}
            />
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
