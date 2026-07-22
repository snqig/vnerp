'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AnimatedTabs } from '@/components/ui/animated-tabs';
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  Edit,
  Trash2,
  Wrench,
  Activity,
  WrenchIcon,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { useTranslations } from 'next-intl';
import type { DieApiResponse, DashboardStatsResponse } from '@/domain/prepress';

type DieTemplate = DieApiResponse & Record<string, any>;
type DashboardStats = DashboardStatsResponse & Record<string, any>;
type MaintenanceRecord = Record<string, any>;
type UsageLog = Record<string, any>;

export default function DieTemplatePage() {
  const t = useTranslations('Common');
  const tc = useTranslations('Common');
  const td = useTranslations('DieTemplate');

  const TYPE_MAP: Record<number, { label: string; color: string }> = {
    1: { label: t('dieMold'), color: 'bg-blue-100 text-blue-800' },
    2: { label: t('screenPlate'), color: 'bg-purple-100 text-purple-800' },
  };

  const ASSET_TYPE_MAP: Record<string, { label: string; color: string }> = {
    die: { label: t('dieMold'), color: 'bg-blue-100 text-blue-800' },
    flexo_plate: { label: t('flexoPlate'), color: 'bg-cyan-100 text-cyan-800' },
    screen_mesh: { label: t('screenPlate'), color: 'bg-purple-100 text-purple-800' },
  };

  const DIE_STATUS_MAP: Record<string, { label: string; color: string }> = {
    available: { label: t('available'), color: 'bg-green-100 text-green-800' },
    in_use: { label: t('inUse'), color: 'bg-blue-100 text-blue-800' },
    maintenance_needed: { label: t('maintenanceNeeded'), color: 'bg-yellow-100 text-yellow-800' },
    re_rule_needed: { label: t('reRuleNeeded'), color: 'bg-orange-100 text-orange-800' },
    scrap: { label: t('scrapped'), color: 'bg-secondary text-secondary-foreground' },
  };

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: { label: t('normal'), color: 'bg-green-100 text-green-800' },
    2: { label: t('warning'), color: 'bg-yellow-100 text-yellow-800' },
    3: { label: t('locked'), color: 'bg-red-100 text-red-800' },
    4: { label: t('scrap'), color: 'bg-secondary text-secondary-foreground' },
  };

  const MAINTENANCE_TYPE_MAP: Record<string, { label: string; color: string }> = {
    routine: { label: t('routineMaintenance'), color: 'bg-green-100 text-green-800' },
    grinding: { label: t('grinding'), color: 'bg-blue-100 text-blue-800' },
    re_rule: { label: t('reRule'), color: 'bg-orange-100 text-orange-800' },
    replace: { label: t('replace'), color: 'bg-red-100 text-red-800' },
  };

  const MAINTENANCE_STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: { label: t('pendingMaintenance'), color: 'bg-yellow-100 text-yellow-800' },
    2: { label: t('maintaining'), color: 'bg-blue-100 text-blue-800' },
    3: { label: t('completed'), color: 'bg-green-100 text-green-800' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<DieTemplate[]>([]);
  const [warningList, setWarningList] = useState<DieTemplate[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({} as DashboardStats);
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceRecord[]>([]);
  const [usageLogList, setUsageLogList] = useState<UsageLog[]>([]);
  const [keyword, setKeyword] = useState('');
  const [_loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, _setStatusFilter] = useState('all');
  const [dieStatusFilter, setDieStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailData, setDetailData] = useState<DieTemplate | null>(null);
  const [selectedItem, setSelectedItem] = useState<DieTemplate | null>(null);
  const [usageAmount, setUsageAmount] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: 'routine',
    cost: '',
    technician_name: '',
    remark: '',
    complete_immediately: true,
  });

  const [statusCardDialogOpen, setStatusCardDialogOpen] = useState(false);
  const [statusCardType, setStatusCardType] = useState<string>('');
  const [statusCardList, setStatusCardList] = useState<DieTemplate[]>([]);

  const [form, setForm] = useState({
    template_code: '',
    template_name: '',
    template_type: '1',
    asset_type: 'die',
    layout_type: 'single_row',
    pieces_per_impression: '1',
    specification: '',
    material: '',
    max_usage: '',
    current_usage: '0',
    warning_usage: '',
    max_impressions: '',
    cumulative_impressions: '0',
    warning_threshold: '80',
    maintenance_interval: '8000',
    unit_price: '',
    storage_location: '',
    purchase_date: '',
    remark: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (typeFilter !== 'all') params.set('template_type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dieStatusFilter !== 'all') params.set('die_status', dieStatusFilter);
      params.set('pageSize', '50');
      const res = await authFetch(`/api/prepress/die-template?${params}`);
      const data = await res.json();
      if (data.success) {
        setList(data.data?.list || []);
        setWarningList(data.data?.warningList || []);
        setDashboardStats(data.data?.dashboardStats || {});
      }
    } catch {
      toast({ title: 'td("fetchListFailed")', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [keyword, typeFilter, statusFilter, dieStatusFilter]);

  const fetchMaintenanceList = useCallback(async () => {
    try {
      const res = await authFetch('/api/prepress/die-maintenance?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setMaintenanceList(data.data?.list || []);
      }
    } catch {
      toast({ title: 'td("fetchMaintenanceFailed")', variant: 'destructive' });
    }
  }, []);

  const fetchUsageLogs = useCallback(async () => {
    try {
      const res = await authFetch('/api/prepress/die-usage?pageSize=50');
      const data = await res.json();
      if (data.success) {
        setUsageLogList(data.data?.list || []);
      }
    } catch {
      toast({ title: 'td("fetchUsageFailed")', variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (activeTab === 'maintenance') fetchMaintenanceList();
    if (activeTab === 'usage') fetchUsageLogs();
  }, [activeTab, fetchMaintenanceList, fetchUsageLogs]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const sortedList = [...list].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a as Record<string, Loose>)[sortField];
    const bVal = (b as Record<string, Loose>)[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal, 'zh-CN');
    } else {
      cmp = (aVal as number) - (bVal as number);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedList.map((s) => s.id)));
  };

  const handleCreate = async () => {
    if (!form.template_code || !form.template_name) {
      toast({ title: 'td("fillCodeAndName")', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/prepress/die-template', {
        method: 'POST',
        body: JSON.stringify({
          template_code: form.template_code,
          template_name: form.template_name,
          template_type: parseInt(form.template_type),
          asset_type: form.asset_type,
          layout_type: form.layout_type,
          pieces_per_impression: parseInt(form.pieces_per_impression) || 1,
          specification: form.specification || null,
          material: form.material || null,
          max_usage: parseInt(form.max_usage) || 0,
          current_usage: parseInt(form.current_usage) || 0,
          warning_usage: form.warning_usage ? parseInt(form.warning_usage) : undefined,
          max_impressions: parseInt(form.max_impressions) || parseInt(form.max_usage) || 0,
          cumulative_impressions: parseInt(form.cumulative_impressions) || 0,
          warning_threshold: parseFloat(form.warning_threshold) || 80,
          maintenance_interval: parseInt(form.maintenance_interval) || 8000,
          unit_price: parseFloat(form.unit_price) || 0,
          storage_location: form.storage_location || null,
          purchase_date: form.purchase_date || null,
          remark: form.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'td("createSuccess")' });
        setDialogOpen(false);
        resetForm();
        fetchList();
      } else {
        toast({ title: data.message || td('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: td('createFailed'), variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      const res = await authFetch('/api/prepress/die-template', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedItem.id,
          template_name: form.template_name,
          template_type: parseInt(form.template_type),
          asset_type: form.asset_type,
          layout_type: form.layout_type,
          pieces_per_impression: parseInt(form.pieces_per_impression) || 1,
          specification: form.specification || null,
          material: form.material || null,
          max_usage: parseInt(form.max_usage) || 0,
          current_usage: parseInt(form.current_usage) || 0,
          warning_usage: form.warning_usage ? parseInt(form.warning_usage) : undefined,
          max_impressions: parseInt(form.max_impressions) || parseInt(form.max_usage) || 0,
          cumulative_impressions: parseInt(form.cumulative_impressions) || 0,
          warning_threshold: parseFloat(form.warning_threshold) || 80,
          maintenance_interval: parseInt(form.maintenance_interval) || 8000,
          unit_price: parseFloat(form.unit_price) || 0,
          storage_location: form.storage_location || null,
          remark: form.remark || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'td("updateSuccess")' });
        setDialogOpen(false);
        setEditing(false);
        resetForm();
        fetchList();
      } else {
        toast({ title: data.message || td('updateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: td('updateFailed'), variant: 'destructive' });
    }
  };

  const handleDeductUsage = async () => {
    if (!selectedItem || !usageAmount) {
      toast({ title: 'td("inputUsageCount")', variant: 'destructive' });
      return;
    }
    const deductCount = parseInt(usageAmount);
    if (deductCount <= 0) {
      toast({ title: 'td("usageCountMustGreaterThan0")', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/prepress/die-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          die_id: selectedItem.id,
          impressions: deductCount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: td('recordSuccess', {
            count: deductCount,
            cumulative: data.data?.cumulative_after || 0,
          }),
        });
        setUsageDialogOpen(false);
        setUsageAmount('');
        fetchList();
      } else {
        toast({ title: data.message || td('recordFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: td('recordFailed'), variant: 'destructive' });
    }
  };

  const handleMaintenance = async () => {
    if (!selectedItem) return;
    try {
      const res = await authFetch('/api/prepress/die-maintenance', {
        method: 'POST',
        body: JSON.stringify({
          die_id: selectedItem.id,
          maintenance_type: maintenanceForm.maintenance_type,
          cost: parseFloat(maintenanceForm.cost) || 0,
          technician_name: maintenanceForm.technician_name || null,
          remark: maintenanceForm.remark || null,
          complete_immediately: maintenanceForm.complete_immediately,
          status: maintenanceForm.complete_immediately ? 3 : 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: td('maintenanceRecordCreated') });
        setMaintenanceDialogOpen(false);
        resetMaintenanceForm();
        fetchList();
        if (activeTab === 'maintenance') fetchMaintenanceList();
      } else {
        toast({ title: data.message || td('maintenanceCreateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: td('maintenanceCreateFailed'), variant: 'destructive' });
    }
  };

  const handleCompleteMaintenance = async (record: MaintenanceRecord) => {
    if (!confirm(td('confirmCompleteMaintenance'))) return;
    try {
      const res = await authFetch('/api/prepress/die-maintenance', {
        method: 'PUT',
        body: JSON.stringify({
          id: record.id,
          status: 3,
          cost: record.cost,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'td("maintenanceCompleted")' });
        fetchMaintenanceList();
        fetchList();
      } else {
        toast({ title: data.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleLock = async (item: DieTemplate) => {
    const action = item.status === 3 ? td('unlock') : td('lock');
    if (!confirm(`${action}${td('this')}${TYPE_MAP[item.template_type]?.label || td('template')}`))
      return;
    try {
      const newStatus = item.status === 3 ? (item.current_usage >= item.warning_usage ? 2 : 1) : 3;
      const res = await authFetch('/api/prepress/die-template', {
        method: 'PUT',
        body: JSON.stringify({
          id: item.id,
          template_name: item.template_name,
          template_type: item.template_type,
          specification: item.specification,
          material: item.material,
          max_usage: item.max_usage,
          current_usage: item.current_usage,
          warning_usage: item.warning_usage,
          storage_location: item.storage_location,
          remark: item.remark,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: td(item.status === 3 ? 'unlockSuccess' : 'lockSuccess') });
        fetchList();
      } else {
        toast({
          title: data.message || td(item.status === 3 ? 'unlockFailed' : 'lockFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: td(item.status === 3 ? 'unlockFailed' : 'lockFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleScrap = async (item: DieTemplate) => {
    if (!confirm(td('confirmScrap'))) return;
    try {
      const res = await authFetch('/api/prepress/die-template', {
        method: 'PUT',
        body: JSON.stringify({
          id: item.id,
          template_name: item.template_name,
          template_type: item.template_type,
          specification: item.specification,
          material: item.material,
          max_usage: item.max_usage,
          current_usage: item.current_usage,
          warning_usage: item.warning_usage,
          storage_location: item.storage_location,
          remark: item.remark,
          status: 4,
          force_die_status: 'scrap',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'td("scrapSuccess")' });
        fetchList();
      } else {
        toast({ title: data.message || td('scrapFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: td('scrapFailed'), variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setForm({
      template_code: '',
      template_name: '',
      template_type: '1',
      asset_type: 'die',
      layout_type: 'single_row',
      pieces_per_impression: '1',
      specification: '',
      material: '',
      max_usage: '',
      current_usage: '0',
      warning_usage: '',
      max_impressions: '',
      cumulative_impressions: '0',
      warning_threshold: '80',
      maintenance_interval: '8000',
      unit_price: '',
      storage_location: '',
      purchase_date: '',
      remark: '',
    });
    setSelectedItem(null);
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      maintenance_type: 'routine',
      cost: '',
      technician_name: '',
      remark: '',
      complete_immediately: true,
    });
    setSelectedItem(null);
  };

  const handleStatusCardClick = (type: string) => {
    let filtered: DieTemplate[] = [];
    switch (type) {
      case 'available':
        filtered = list.filter(
          (i) => i.die_status === 'available' || (!i.die_status && i.status === 1)
        );
        break;
      case 'maintenance_needed':
        filtered = list.filter((i) => i.die_status === 'maintenance_needed');
        break;
      case 're_rule_needed':
        filtered = list.filter((i) => i.die_status === 're_rule_needed');
        break;
      case 'scrap':
        filtered = list.filter((i) => i.die_status === 'scrap' || i.status === 4);
        break;
      case 'maintenance_due':
        filtered = list.filter((i) => {
          const pct = getMaintenanceProgress(i);
          return pct >= 80;
        });
        break;
      default:
        filtered = list;
    }
    setStatusCardType(type);
    setStatusCardList(filtered);
    setStatusCardDialogOpen(true);
  };

  const getStatusCardTitle = () => {
    switch (statusCardType) {
      case 'available':
        return td('availableDieTemplates');
      case 'maintenance_needed':
        return td('maintenanceNeededDieTemplates');
      case 're_rule_needed':
        return td('reRuleNeededDieTemplates');
      case 'scrap':
        return td('scrapDieTemplates');
      case 'maintenance_due':
        return td('maintenanceDueDieTemplates');
      default:
        return td('allDieTemplates');
    }
  };

  const handleCardMaintenance = async (item: DieTemplate) => {
    setSelectedItem(item);
    setMaintenanceForm({
      maintenance_type: item.die_status === 're_rule_needed' ? 're_rule' : 'routine',
      cost: '',
      technician_name: '',
      remark: '',
      complete_immediately: true,
    });
    setMaintenanceDialogOpen(true);
  };

  const handleCardReRule = async (item: DieTemplate) => {
    setSelectedItem(item);
    setMaintenanceForm({
      maintenance_type: 're_rule',
      cost: '',
      technician_name: '',
      remark: '',
      complete_immediately: false,
    });
    setMaintenanceDialogOpen(true);
  };

  const openEditDialog = (item: DieTemplate) => {
    setSelectedItem(item);
    setEditing(true);
    setForm({
      template_code: item.template_code,
      template_name: item.template_name,
      template_type: String(item.template_type),
      asset_type: item.asset_type || (item.template_type === 2 ? 'screen_mesh' : 'die'),
      layout_type: item.layout_type || 'single_row',
      pieces_per_impression: String(item.pieces_per_impression || 1),
      specification: item.specification || '',
      material: item.material || '',
      max_usage: String(item.max_usage),
      current_usage: String(item.current_usage),
      warning_usage: String(item.warning_usage),
      max_impressions: String(item.max_impressions || item.max_usage),
      cumulative_impressions: String(item.cumulative_impressions || item.current_usage),
      warning_threshold: String(item.warning_threshold || 80),
      maintenance_interval: String(item.maintenance_interval || 8000),
      unit_price: String(item.unit_price || 0),
      storage_location: item.storage_location || '',
      purchase_date: item.purchase_date || '',
      remark: item.remark || '',
    });
    setDialogOpen(true);
  };

  const getUsagePercent = (item: DieTemplate) => {
    const max = item.max_impressions || item.max_usage;
    const current = item.cumulative_impressions || item.current_usage;
    if (!max) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const getUsageBarColor = (item: DieTemplate) => {
    const pct = getUsagePercent(item);
    if (pct >= 95) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMaintenanceProgress = (item: DieTemplate) => {
    if (!item.maintenance_interval || item.maintenance_interval <= 0) return 0;
    const sinceLast = (item.cumulative_impressions || 0) - (item.last_maintenance_impressions || 0);
    return Math.min(100, Math.round((sinceLast / item.maintenance_interval) * 100));
  };

  const getMaintenanceBarColor = (item: DieTemplate) => {
    const pct = getMaintenanceProgress(item);
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <MainLayout title={td('title')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-6">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('all')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{td('totalCount')}</div>
              <div className="text-2xl font-bold">{dashboardStats.total_count || 0}</div>
            </CardContent>
          </Card>
          <Card
            className="border-green-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('available')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-green-600">{td('available')}</div>
              <div className="text-2xl font-bold text-green-600">
                {dashboardStats.available_count || 0}
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-yellow-500/30 dark:border-yellow-400/30 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('maintenance_needed')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-yellow-600">{td('maintenanceNeeded')}</div>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardStats.warning_count || 0}
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('re_rule_needed')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-orange-600">{td('reRuleNeeded')}</div>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardStats.locked_count || 0}
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('scrap')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{td('scrap')}</div>
              <div className="text-2xl font-bold text-muted-foreground">
                {dashboardStats.scrap_count || 0}
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusCardClick('maintenance_due')}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-blue-600">{td('maintenanceDue')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardStats.maintenance_due_count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {warningList.length > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/10 dark:border-yellow-400/30 dark:bg-yellow-900/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                {td('lifeWarning')} ({warningList.length})
              </CardTitle>
              <CardDescription className="text-yellow-600 dark:text-yellow-300">
                {td('warningDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{td('codeRequired')}</TableHead>
                    <TableHead>{td('name')}</TableHead>
                    <TableHead>{td('type')}</TableHead>
                    <TableHead>{td('cumulativeMax')}</TableHead>
                    <TableHead>{td('usageRate')}</TableHead>
                    <TableHead>{td('lifeCycle')}</TableHead>
                    <TableHead>{td('sinceLastMaintenance')}</TableHead>
                    <TableHead>{td('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warningList.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.template_code}</TableCell>
                      <TableCell>{item.template_name}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                              ?.color || 'bg-secondary'
                          }
                        >
                          {(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                            ?.label || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.cumulative_impressions || item.current_usage} /{' '}
                        {item.max_impressions || item.max_usage}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getUsageBarColor(item)}`}
                              style={{ width: `${getUsagePercent(item)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{getUsagePercent(item)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.color ||
                            'bg-secondary'
                          }
                        >
                          {(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.label ||
                            '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getMaintenanceBarColor(item)}`}
                              style={{ width: `${getMaintenanceProgress(item)}%` }}
                            />
                          </div>
                          <span className="text-xs">{getMaintenanceProgress(item)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setMaintenanceDialogOpen(true);
                            }}
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            {td('maintenance')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setUsageDialogOpen(true);
                            }}
                          >
                            <Activity className="h-3 w-3 mr-1" />
                            {td('recordUsage')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 shrink-0">
                <CardTitle>{td('dieTemplateManage')}</CardTitle>
                <CardDescription className="mt-1">{td('manageDesc')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={td('searchPlaceholder')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder={tc('type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{td('allTypes')}</SelectItem>
                    <SelectItem value="1">{td('dieMold')}</SelectItem>
                    <SelectItem value="2">{td('screenPlate')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dieStatusFilter} onValueChange={setDieStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={td('lifeCycle')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{td('allStatus')}</SelectItem>
                    <SelectItem value="available">{td('available')}</SelectItem>
                    <SelectItem value="in_use">{td('inUse')}</SelectItem>
                    <SelectItem value="maintenance_needed">{td('maintenanceNeeded')}</SelectItem>
                    <SelectItem value="re_rule_needed">{td('reRuleNeeded')}</SelectItem>
                    <SelectItem value="scrap">{td('scrap')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchList}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {td('refresh')}
                </Button>
                <GlobalExportToolbar
                  filename="刀模模板列表"
                  title="刀模模板列表"
                  columns={[
                    { key: 'template_code', label: td('code'), width: 15 },
                    { key: 'template_name', label: tc('name'), width: 20 },
                    {
                      key: 'asset_type',
                      label: td('assetType'),
                      width: 12,
                      formatter: (_v, row) =>
                        (ASSET_TYPE_MAP[row.asset_type] || TYPE_MAP[row.template_type])?.label ||
                        '-',
                    },
                    {
                      key: 'specification',
                      label: td('specification'),
                      width: 15,
                      formatter: (v) => v || '-',
                    },
                    {
                      key: 'cumulative_impressions',
                      label: td('cumulativeMax'),
                      width: 15,
                      formatter: (_v, row) =>
                        `${row.cumulative_impressions || row.current_usage} / ${row.max_impressions || row.max_usage}`,
                    },
                    {
                      key: 'current_usage',
                      label: td('usageRate'),
                      width: 10,
                      formatter: (_v, row) => `${getUsagePercent(row)}%`,
                    },
                    {
                      key: 'die_status',
                      label: td('lifeCycle'),
                      width: 12,
                      formatter: (_v, row) =>
                        (DIE_STATUS_MAP[row.die_status] || STATUS_MAP[row.status])?.label || '-',
                    },
                    {
                      key: 'storage_location',
                      label: td('storageLocation'),
                      width: 15,
                      formatter: (v) => v || '-',
                    },
                  ]}
                  data={
                    selectedIds.size > 0
                      ? sortedList.filter((i) => selectedIds.has(i.id))
                      : sortedList
                  }
                />
                <Button
                  onClick={() => {
                    resetForm();
                    setEditing(false);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {td('add')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <AnimatedTabs
                tabs={[
                  { label: td('assetList') },
                  { label: td('maintenanceRecord') },
                  { label: td('usageRecord') },
                ]}
                activeTab={
                  activeTab === 'list'
                    ? td('assetList')
                    : activeTab === 'maintenance'
                      ? td('maintenanceRecord')
                      : td('usageRecord')
                }
                onTabChange={(label) => {
                  if (label === td('assetList')) setActiveTab('list');
                  else if (label === td('maintenanceRecord')) setActiveTab('maintenance');
                  else if (label === td('usageRecord')) setActiveTab('usage');
                }}
              />
            </div>

            {activeTab === 'list' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === sortedList.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">{td('serialNo')}</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('template_code')}
                    >
                      <span className="inline-flex items-center">
                        {td('code')}
                        {getSortIcon('template_code')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('template_name')}
                    >
                      <span className="inline-flex items-center">
                        {td('name')}
                        {getSortIcon('template_name')}
                      </span>
                    </TableHead>
                    <TableHead>{td('assetType')}</TableHead>
                    <TableHead>{td('specification')}</TableHead>
                    <TableHead>{td('cumulativeMax')}</TableHead>
                    <TableHead>{td('usageRate')}</TableHead>
                    <TableHead>{td('lifeCycle')}</TableHead>
                    <TableHead>{td('maintenanceProgress')}</TableHead>
                    <TableHead>{td('storageLocation')}</TableHead>
                    <TableHead>{td('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        {td('noDieTemplateRecords')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedList.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.die_status === 'scrap'
                            ? 'bg-gray-50 dark:bg-gray-900'
                            : item.die_status === 're_rule_needed'
                              ? 'bg-orange-50 dark:bg-orange-950'
                              : item.die_status === 'maintenance_needed'
                                ? 'bg-yellow-50 dark:bg-yellow-950'
                                : item.status === 3
                                  ? 'bg-red-50 dark:bg-red-950'
                                  : item.status === 2
                                    ? 'bg-yellow-50 dark:bg-yellow-950'
                                    : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono">{item.template_code}</TableCell>
                        <TableCell className="font-medium">{item.template_name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                                ?.color || 'bg-secondary'
                            }
                          >
                            {(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                              ?.label || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.specification || '-'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">
                              {item.cumulative_impressions || item.current_usage}
                            </span>
                            <span className="text-gray-400">
                              {' '}
                              / {item.max_impressions || item.max_usage}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getUsageBarColor(item)}`}
                                style={{ width: `${getUsagePercent(item)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{getUsagePercent(item)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.color ||
                              'bg-secondary'
                            }
                          >
                            {(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.label ||
                              '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getMaintenanceBarColor(item)}`}
                                style={{ width: `${getMaintenanceProgress(item)}%` }}
                              />
                            </div>
                            <span className="text-xs">
                              {item.maintenance_count || 0}
                              {td('times')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.storage_location || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetailData(item);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setUsageDialogOpen(true);
                              }}
                              title={td('recordUsage')}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setMaintenanceDialogOpen(true);
                              }}
                              title={td('maintenance')}
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLock(item)}
                              title={item.status === 3 ? td('unlock') : td('lock')}
                            >
                              {item.status === 3 ? (
                                <Unlock className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleScrap(item)}
                              title={td('scrapAction')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === 'maintenance' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{td('maintenanceRecords')}</h3>
                  <Button variant="outline" onClick={fetchMaintenanceList}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {td('refresh')}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{td('maintenanceNo')}</TableHead>
                      <TableHead>{td('dieCode')}</TableHead>
                      <TableHead>{td('name')}</TableHead>
                      <TableHead>{td('maintenanceType')}</TableHead>
                      <TableHead>{td('beforeMaintenance')}</TableHead>
                      <TableHead>{td('afterMaintenance')}</TableHead>
                      <TableHead>{td('cost')}</TableHead>
                      <TableHead>{td('maintenancePerson')}</TableHead>
                      <TableHead>{td('status')}</TableHead>
                      <TableHead>{td('operation')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          {td('noMaintenanceRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenanceList.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.maintenance_no}</TableCell>
                          <TableCell className="font-mono">{record.die_code}</TableCell>
                          <TableCell>{record.template_name}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                MAINTENANCE_TYPE_MAP[record.maintenance_type]?.color ||
                                'bg-secondary'
                              }
                            >
                              {MAINTENANCE_TYPE_MAP[record.maintenance_type]?.label ||
                                record.maintenance_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.impressions_before}</TableCell>
                          <TableCell>{record.impressions_after}</TableCell>
                          <TableCell>{record.cost ? `¥${record.cost}` : '-'}</TableCell>
                          <TableCell>{record.technician_name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                MAINTENANCE_STATUS_MAP[record.status]?.color || 'bg-secondary'
                              }
                            >
                              {MAINTENANCE_STATUS_MAP[record.status]?.label || record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.status !== 3 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteMaintenance(record)}
                              >
                                {td('completeMaintenance')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}

            {activeTab === 'usage' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{td('usageRecords')}</h3>
                  <Button variant="outline" onClick={fetchUsageLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {td('refresh')}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{td('dieCode')}</TableHead>
                      <TableHead>{td('name')}</TableHead>
                      <TableHead>{td('workOrderNo')}</TableHead>
                      <TableHead>{td('process')}</TableHead>
                      <TableHead>{td('thisTime')}</TableHead>
                      <TableHead>{td('cumulativeCount')}</TableHead>
                      <TableHead>{td('operator')}</TableHead>
                      <TableHead>{td('usageDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {td('noUsageRecords')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      usageLogList.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono">{log.die_code}</TableCell>
                          <TableCell>{log.template_name}</TableCell>
                          <TableCell className="font-mono">{log.work_order_no || '-'}</TableCell>
                          <TableCell>{log.process_name || '-'}</TableCell>
                          <TableCell className="font-medium">{log.impressions}</TableCell>
                          <TableCell>{log.cumulative_after}</TableCell>
                          <TableCell>{log.operator_name || '-'}</TableCell>
                          <TableCell>{log.usage_date || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editing ? td('editDieTemplate') : td('addDieTemplate')}</DialogTitle>
              <DialogDescription>{editing ? td('editDesc') : td('createDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {td('codeRequired')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.template_code}
                    onChange={(e) => setForm({ ...form, template_code: e.target.value })}
                    disabled={editing}
                    placeholder={td('codePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {td('nameRequired')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.template_name}
                    onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                    placeholder={td('namePlaceholder')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{td('traditionalType')}</Label>
                  <Select
                    value={form.template_type}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        template_type: v,
                        asset_type: v === '2' ? 'screen_mesh' : 'die',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{td('dieMold')}</SelectItem>
                      <SelectItem value="2">{td('screenPlate')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{td('assetTypeLabel')}</Label>
                  <Select
                    value={form.asset_type}
                    onValueChange={(v) => setForm({ ...form, asset_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="die">{td('dieMold')}</SelectItem>
                      <SelectItem value="flexo_plate">{td('flexoPlate')}</SelectItem>
                      <SelectItem value="screen_mesh">{td('screenPlate')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{td('layoutType')}</Label>
                  <Select
                    value={form.layout_type}
                    onValueChange={(v) => setForm({ ...form, layout_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_row">{td('singleRow')}</SelectItem>
                      <SelectItem value="multi_row">{td('multiRow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{td('piecesPerImpression')}</Label>
                  <Input
                    type="number"
                    value={form.pieces_per_impression}
                    onChange={(e) => setForm({ ...form, pieces_per_impression: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{td('specification')}</Label>
                  <Input
                    value={form.specification}
                    onChange={(e) => setForm({ ...form, specification: e.target.value })}
                    placeholder={td('specPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{td('material')}</Label>
                  <Input
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    placeholder={td('materialPlaceholder')}
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {td('lifeParams')}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{td('maxUsage')}</Label>
                    <Input
                      type="number"
                      value={form.max_impressions || form.max_usage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          max_impressions: e.target.value,
                          max_usage: e.target.value,
                        })
                      }
                      placeholder={td('maxUsagePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{td('usedCount')}</Label>
                    <Input
                      type="number"
                      value={form.cumulative_impressions || form.current_usage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cumulative_impressions: e.target.value,
                          current_usage: e.target.value,
                        })
                      }
                      placeholder={td('usedCountPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{td('warningThreshold')}</Label>
                    <Input
                      type="number"
                      value={form.warning_threshold}
                      onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
                      placeholder={td('warningThresholdPlaceholder')}
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <WrenchIcon className="h-4 w-4" />
                  {td('maintenanceParams')}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{td('maintenanceInterval')}</Label>
                    <Input
                      type="number"
                      value={form.maintenance_interval}
                      onChange={(e) => setForm({ ...form, maintenance_interval: e.target.value })}
                      placeholder={td('maintenanceIntervalPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{td('unitPrice')}</Label>
                    <Input
                      type="number"
                      value={form.unit_price}
                      onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                      placeholder={td('usedCountPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{td('storageLocationLabel')}</Label>
                    <Input
                      value={form.storage_location}
                      onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                      placeholder={td('storagePlaceholder')}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{td('remark')}</Label>
                <Textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder={td('remarkPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={editing ? handleUpdate : handleCreate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editing ? tc('save') : td('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{td('recordUsageTitle')}</DialogTitle>
              <DialogDescription>
                {selectedItem &&
                  `${td('for')} ${selectedItem.template_name} (${selectedItem.template_code}) ${td('recordUsageTitle')}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('currentCumulative')}</span>
                    <span className="font-medium">
                      {selectedItem.cumulative_impressions || selectedItem.current_usage} /{' '}
                      {selectedItem.max_impressions || selectedItem.max_usage}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('usageRateLabel')}</span>
                    <span className="font-medium">{getUsagePercent(selectedItem)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('lifeCycleLabel')}</span>
                    <Badge
                      className={
                        (DIE_STATUS_MAP[selectedItem.die_status] || STATUS_MAP[selectedItem.status])
                          ?.color || 'bg-secondary'
                      }
                    >
                      {(DIE_STATUS_MAP[selectedItem.die_status] || STATUS_MAP[selectedItem.status])
                        ?.label || '-'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  {td('thisUsageCount')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={usageAmount}
                  onChange={(e) => setUsageAmount(e.target.value)}
                  placeholder={td('thisUsageCountPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleDeductUsage} className="bg-blue-600 hover:bg-blue-700">
                {td('confirmRecord')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{td('createMaintenanceRecord')}</DialogTitle>
              <DialogDescription>
                {selectedItem &&
                  `${td('for')} ${selectedItem.template_name} (${selectedItem.template_code}) ${td('createMaintenanceRecord')}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('cumulativeUsage')}</span>
                    <span className="font-medium">
                      {selectedItem.cumulative_impressions || selectedItem.current_usage} /{' '}
                      {selectedItem.max_impressions || selectedItem.max_usage}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('maintenanceCount')}</span>
                    <span className="font-medium">
                      {selectedItem.maintenance_count || 0}
                      {td('times')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{td('sinceLastMaintenance')}</span>
                    <span className="font-medium">
                      {(selectedItem.cumulative_impressions || 0) -
                        (selectedItem.last_maintenance_impressions || 0)}
                      {td('times')}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  {td('maintenanceType')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={maintenanceForm.maintenance_type}
                  onValueChange={(v) =>
                    setMaintenanceForm({ ...maintenanceForm, maintenance_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">{td('routineMaintenance')}</SelectItem>
                    <SelectItem value="grinding">{td('grinding')}</SelectItem>
                    <SelectItem value="re_rule">{td('reRule')}</SelectItem>
                    <SelectItem value="replace">{td('replace')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{td('maintenanceCost')}</Label>
                  <Input
                    type="number"
                    value={maintenanceForm.cost}
                    onChange={(e) =>
                      setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })
                    }
                    placeholder={td('usedCountPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{td('maintenancePerson')}</Label>
                  <Input
                    value={maintenanceForm.technician_name}
                    onChange={(e) =>
                      setMaintenanceForm({ ...maintenanceForm, technician_name: e.target.value })
                    }
                    placeholder={td('maintenancePersonName')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{td('remark')}</Label>
                <Textarea
                  value={maintenanceForm.remark}
                  onChange={(e) =>
                    setMaintenanceForm({ ...maintenanceForm, remark: e.target.value })
                  }
                  placeholder={td('maintenanceRemark')}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="complete_immediately"
                  checked={maintenanceForm.complete_immediately}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      complete_immediately: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <Label htmlFor="complete_immediately" className="text-sm">
                  {td('completeImmediately')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleMaintenance} className="bg-blue-600 hover:bg-blue-700">
                {td('createMaintenance')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{td('dieTemplateDetail')}</DialogTitle>
            </DialogHeader>
            {detailData && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{td('codeRequired')}：</span>
                    {detailData.template_code}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('nameRequired')}：</span>
                    {detailData.template_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('assetType')}：</span>
                    <Badge
                      className={
                        (
                          ASSET_TYPE_MAP[detailData.asset_type] ||
                          TYPE_MAP[detailData.template_type]
                        )?.color || 'bg-secondary'
                      }
                    >
                      {(ASSET_TYPE_MAP[detailData.asset_type] || TYPE_MAP[detailData.template_type])
                        ?.label || '-'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('lifeCycle')}：</span>
                    <Badge
                      className={
                        (DIE_STATUS_MAP[detailData.die_status] || STATUS_MAP[detailData.status])
                          ?.color || 'bg-secondary'
                      }
                    >
                      {(DIE_STATUS_MAP[detailData.die_status] || STATUS_MAP[detailData.status])
                        ?.label || '-'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('specification')}：</span>
                    {detailData.specification || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('material')}：</span>
                    {detailData.material || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('layoutType')}：</span>
                    {detailData.layout_type === 'multi_row'
                      ? td('layoutMulti')
                      : td('layoutSingle')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('piecesPerImpression')}：</span>
                    {detailData.pieces_per_impression || 1}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">{td('lifeInfo')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{td('usageRateLabel')}</span>
                      <span className="text-sm font-medium">{getUsagePercent(detailData)}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getUsageBarColor(detailData)}`}
                        style={{ width: `${getUsagePercent(detailData)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400">
                      {detailData.cumulative_impressions || detailData.current_usage} /{' '}
                      {detailData.max_impressions || detailData.max_usage} {td('times')}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">{td('maintenanceInfo')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{td('maintenanceCount')}：</span>
                      {detailData.maintenance_count || 0}
                      {td('times')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {td('maintenanceIntervalLabel')}：
                      </span>
                      {detailData.maintenance_interval || '-'}
                      {td('times')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{td('lastMaintenance')}：</span>
                      {detailData.last_maintenance_date || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{td('lastUsed')}：</span>
                      {detailData.last_used_date || '-'}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {td('maintenanceProgressLabel')}
                      </span>
                      <span className="text-sm">{getMaintenanceProgress(detailData)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${getMaintenanceBarColor(detailData)}`}
                        style={{ width: `${getMaintenanceProgress(detailData)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{td('unitPriceLabel')}：</span>¥
                    {detailData.unit_price || 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('storageLocation')}：</span>
                    {detailData.storage_location || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('purchaseDate')}：</span>
                    {detailData.purchase_date || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{td('qrCode')}：</span>
                    {detailData.qr_code || '-'}
                  </div>
                </div>
                {detailData.remark && (
                  <div className="border-t pt-3 text-sm">
                    <span className="text-muted-foreground">{td('detailRemark')}：</span>
                    {detailData.remark}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={statusCardDialogOpen} onOpenChange={setStatusCardDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{getStatusCardTitle()}</DialogTitle>
              <DialogDescription>
                {td('totalRecords', { count: statusCardList.length })}
              </DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{td('codeRequired')}</TableHead>
                  <TableHead>{td('name')}</TableHead>
                  <TableHead>{td('assetType')}</TableHead>
                  <TableHead>
                    {td('cumulativeMax')}
                    {td('usageRate')}
                  </TableHead>
                  <TableHead>{td('lifeCycle')}</TableHead>
                  <TableHead>{td('maintenanceProgress')}</TableHead>
                  <TableHead>{td('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusCardList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {td('noRecords')}
                    </TableCell>
                  </TableRow>
                ) : (
                  statusCardList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.template_code}</TableCell>
                      <TableCell>{item.template_name}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                              ?.color || 'bg-secondary'
                          }
                        >
                          {(ASSET_TYPE_MAP[item.asset_type] || TYPE_MAP[item.template_type])
                            ?.label || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getUsageBarColor(item)}`}
                              style={{ width: `${getUsagePercent(item)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{getUsagePercent(item)}%</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.cumulative_impressions || item.current_usage} /{' '}
                          {item.max_impressions || item.max_usage}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.color ||
                            'bg-secondary'
                          }
                        >
                          {(DIE_STATUS_MAP[item.die_status] || STATUS_MAP[item.status])?.label ||
                            '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getMaintenanceBarColor(item)}`}
                              style={{ width: `${getMaintenanceProgress(item)}%` }}
                            />
                          </div>
                          <span className="text-xs">{getMaintenanceProgress(item)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(statusCardType === 'maintenance_needed' ||
                            statusCardType === 'maintenance_due') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                              onClick={() => handleCardMaintenance(item)}
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              {td('maintenance')}
                            </Button>
                          )}
                          {(statusCardType === 're_rule_needed' ||
                            statusCardType === 'maintenance_needed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-700 border-orange-300 hover:bg-orange-50"
                              onClick={() => handleCardReRule(item)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {td('redo')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDetailData(item);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {td('detail')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusCardDialogOpen(false)}>
                {td('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
