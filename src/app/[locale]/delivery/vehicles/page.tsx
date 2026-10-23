'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Car, Wrench, FileText, Truck, CheckCircle, Circle } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Vehicle {
  id: number;
  vehicle_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  mileage: number;
  fuel_type: string;
  capacity: number;
  status: number;
  driver_name: string;
  driver_phone: string;
  insurance_expire: string;
  annual_inspect_expire: string;
  create_time: string;
}

export default function VehiclesPage() {
  const t = useTranslations('Delivery');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    0: { label: tc('disabled'), variant: 'secondary' },
    1: { label: tc('enabled'), variant: 'default' },
    2: { label: t('underRepair'), variant: 'outline' },
    3: { label: t('scrapped'), variant: 'destructive' },
  };

  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const doJump = () => {
    const n = Number(jumpValue);
    if (!jumpValue || isNaN(n) || n < 1 || n > totalPages) {
      setJumpError(tStd('invalidPage', { max: totalPages }));
      return;
    }
    setJumpError(null);
    setPage(n);
  };

  useEffect(() => {
    fetchVehicles();
  }, [page, pageSize, status, keyword]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status !== 'all') params.append('status', status);
      if (keyword) params.append('keyword', keyword);

      const response = await authFetch(`/api/delivery/vehicles?${params}`);
      const result = await response.json();

      if (result.success) {
        setVehicles(result.data);
        setTotal(result.pagination.total);
        setTotalPages(Math.ceil((result.pagination.total || 0) / pageSize));
      } else {
        toast.error(result.message || t('fetchFailed'));
      }
    } catch {
      toast.error(t('fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteVehicle'))) return;

    try {
      const response = await authFetch(`/api/delivery/vehicles?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success(tc('deleteSuccess'));
        fetchVehicles();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchVehicles();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalVehicles'), icon: Truck, ...StatsTheme.blue },
            { key: 'active', label: tc('inUse'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'maintenance', label: tc('underMaintenance'), icon: Wrench, ...StatsTheme.orange },
            { key: 'idle', label: tc('idleCount'), icon: Circle, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: vehicles.length },
            { key: 'active', count: vehicles.filter((v) => v.status === 1).length },
            { key: 'maintenance', count: vehicles.filter((v) => v.status === 2).length },
            { key: 'idle', count: vehicles.filter((v) => v.status === 0).length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Car className="h-6 w-6" />
              {t('vehicleManagement')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('vehicleManagementDesc')}</p>
          </div>
          <Button onClick={() => router.push('/delivery/vehicles/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addVehicle')}
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchVehiclePlaceholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">{tc('all')}</option>
            <option value="1">{tc('enabled')}</option>
            <option value="2">{t('underRepair')}</option>
            <option value="0">{tc('disabled')}</option>
            <option value="3">{t('scrapped')}</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            {tc('search')}
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('plateNo')}</TableHead>
                <TableHead>{t('vehicleInfo')}</TableHead>
                <TableHead>{t('driver')}</TableHead>
                <TableHead>{t('mileage')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{t('insuranceExpire')}</TableHead>
                <TableHead>{t('annualInspectExpire')}</TableHead>
                <TableHead className="w-[100px]">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {tc('loading')}
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.vehicle_no}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {vehicle.brand} {vehicle.model}
                        </div>
                        <div className="text-muted-foreground">
                          {vehicle.vehicle_type} · {vehicle.color} · {vehicle.fuel_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vehicle.driver_name || '-'}</div>
                        {vehicle.driver_phone && (
                          <div className="text-muted-foreground text-xs">
                            {vehicle.driver_phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.mileage?.toLocaleString()} km</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[vehicle.status]?.variant || 'default'}>
                        {statusMap[vehicle.status]?.label || tc('unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>{vehicle.insurance_expire || '-'}</TableCell>
                    <TableCell>{vehicle.annual_inspect_expire || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/delivery/vehicles/${vehicle.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {tc('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/delivery/vehicles/${vehicle.id}/repair`)}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            {t('repairRecords')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/delivery/vehicles/${vehicle.id}/cost`)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('costRecords')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-red-600 dark:text-red-400"
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

        {total > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {tStd('paginationSummary', { total, pages: totalPages })}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{tStd('prevPage')}</Button>
              <span className="text-sm">{tStd('pageNumber', { page, pages: totalPages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>{tStd('nextPage')}</Button>
              <div className="flex items-center gap-1">
                <Input className="w-[70px]" value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page, pages: totalPages })} onKeyDown={(e) => { if (e.key === 'Enter') doJump(); }} />
                <Button variant="outline" size="sm" onClick={doJump}>{tStd('jump')}</Button>
              </div>
            </div>
          </div>
        )}
        {jumpError && <p className="text-destructive text-sm mt-2">{jumpError}</p>}
      </div>
    </MainLayout>
  );
}
