'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { useToastContext } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Beaker,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

interface InkColor {
  id: number;
  color_code: string;
  color_name: string;
  color_series: string;
  base_ink_type: string;
  pantone_code: string;
  status: number;
  create_time: string;
}

interface FormulaVersion {
  id: number;
  color_id: number;
  version_no: string;
  version_name: string;
  status: number;
  total_weight: number;
  unit: string;
  theoretical_cost: number;
  cost_calc_status: number;
  activate_time: string;
  create_time: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '草稿', variant: 'secondary' },
  2: { label: '已生效', variant: 'default' },
  3: { label: '已作废', variant: 'destructive' },
};

export default function InkFormulaPage() {
  const ts = useTranslations('Dcprint');
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { addToast: toast } = useToastContext();

  const [colors, setColors] = useState<InkColor[]>([]);
  const [selectedColor, setSelectedColor] = useState<InkColor | null>(null);
  const [versions, setVersions] = useState<FormulaVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<InkColor | null>(null);
  const [colorForm, setColorForm] = useState({
    color_code: '',
    color_name: '',
    color_series: '',
    base_ink_type: '',
    pantone_code: '',
  });

  const fetchColors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (searchKeyword) params.append('keyword', searchKeyword);
      const res = await authFetch(`/api/dcprint/formula/color?${params}`);
      const data = await res.json();
      if (data.success) {
        setColors(data.data?.list || data.data || []);
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_1igc1i7'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchKeyword]);

  const fetchVersions = useCallback(async (colorId: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version?colorId=${colorId}`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.data?.list || data.data || []);
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_8le5m6'), variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);
  useEffect(() => {
    if (selectedColor) fetchVersions(selectedColor.id);
  }, [selectedColor, fetchVersions]);

  const handleSaveColor = async () => {
    if (!colorForm.color_code || !colorForm.color_name) {
      toast({ title: tc('warning'), description: ts('k_x3hboi'), variant: 'destructive' });
      return;
    }
    try {
      const url = editingColor
        ? `/api/dcprint/formula/color/${editingColor.id}`
        : '/api/dcprint/formula/color';
      const method = editingColor ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colorForm),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1rraohc'), description: editingColor ? ts('k_1795bzg') : ts('k_kiombh') });
        setIsColorDialogOpen(false);
        setEditingColor(null);
        setColorForm({
          color_code: '',
          color_name: '',
          color_series: '',
          base_ink_type: '',
          pantone_code: '',
        });
        fetchColors();
      } else {
        toast({ title: ts('k_v9pftt'), description: data.message || ts('k_ydow7a'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_ydow7a'), variant: 'destructive' });
    }
  };

  const handleActivateVersion = async (versionId: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/activate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1rraohc'), description: ts('k_1v6t9lk') });
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: ts('k_v9pftt'), description: data.message || ts('k_ydow7a'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_ydow7a'), variant: 'destructive' });
    }
  };

  const handleCancelVersion = async (versionId: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1rraohc'), description: ts('k_1jwfe6q') });
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: ts('k_v9pftt'), description: data.message || ts('k_ydow7a'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_ydow7a'), variant: 'destructive' });
    }
  };

  const handleDuplicateVersion = async (versionId: number) => {
    try {
      const res = await authFetch(`/api/dcprint/formula/version/${versionId}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1rraohc'), description: ts('k_11k3qq6') });
        if (selectedColor) fetchVersions(selectedColor.id);
      } else {
        toast({ title: ts('k_v9pftt'), description: data.message || ts('k_ydow7a'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_ydow7a'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout title={t('inkFormulaManagement')}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              {t('inkColorList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder={tc('search')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchColors()}
                />
              </div>
              <Button onClick={() => fetchColors()} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
              <Button
                onClick={() => {
                  setEditingColor(null);
                  setColorForm({
                    color_code: '',
                    color_name: '',
                    color_series: '',
                    base_ink_type: '',
                    pantone_code: '',
                  });
                  setIsColorDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {tc('add')}{ts('k_14gayme')}</Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
            ) : colors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Beaker className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{tc('noData')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_vjmear')}</TableHead>
                    <TableHead>{ts('k_1r6bl4j')}</TableHead>
                    <TableHead>{ts('k_17peoq2')}</TableHead>
                    <TableHead>{ts('k_qip0th')}</TableHead>
                    <TableHead>Pantone</TableHead>
                    <TableHead>{ts('k_1ccx4t4')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colors.map((color) => (
                    <TableRow
                      key={color.id}
                      className={selectedColor?.id === color.id ? 'bg-muted' : 'cursor-pointer'}
                      onClick={() => setSelectedColor(color)}
                    >
                      <TableCell className="font-mono">{color.color_code}</TableCell>
                      <TableCell>{color.color_name}</TableCell>
                      <TableCell>{color.color_series}</TableCell>
                      <TableCell>{color.base_ink_type}</TableCell>
                      <TableCell>{color.pantone_code}</TableCell>
                      <TableCell>
                        <Badge variant={color.status === 1 ? 'default' : 'secondary'}>
                          {color.status === 1 ? ts('k_tt5vxa') : ts('k_6q9o5l')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingColor(color);
                                setColorForm({
                                  color_code: color.color_code,
                                  color_name: color.color_name,
                                  color_series: color.color_series || '',
                                  base_ink_type: color.base_ink_type || '',
                                  pantone_code: color.pantone_code || '',
                                });
                                setIsColorDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {tc('edit')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedColor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedColor.color_name} {ts('k_1t2aw12')}</span>
                <Button
                  onClick={() =>
                    router.push(`/dcprint/ink-formula/new?colorId=${selectedColor.id}`)
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {ts('k_sgzqmj')}</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ts('k_qtzd7d')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ts('k_1ctz3eq')}</TableHead>
                      <TableHead>{ts('k_v6bi4')}</TableHead>
                      <TableHead>{ts('k_h0onm6')}</TableHead>
                      <TableHead>{ts('k_w8xmat')}</TableHead>
                      <TableHead>{ts('k_1ccx4t4')}</TableHead>
                      <TableHead>{ts('k_1xp7hag')}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((ver) => (
                      <TableRow key={ver.id}>
                        <TableCell className="font-mono">{ver.version_no}</TableCell>
                        <TableCell>{ver.version_name}</TableCell>
                        <TableCell>
                          {ver.total_weight} {ver.unit}
                        </TableCell>
                        <TableCell>¥{ver.theoretical_cost?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[ver.status]?.variant || 'secondary'}>
                            {STATUS_MAP[ver.status]?.label || ts('k_1lpnuh4')}
                          </Badge>
                        </TableCell>
                        <TableCell>{ver.activate_time || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dcprint/ink-formula/${ver.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {ver.status === 1 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivateVersion(ver.id)}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateVersion(ver.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {ver.status === 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelVersion(ver.id)}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColor ? ts('k_p2u7iz') : ts('k_yjhrdc')}</DialogTitle>
            <DialogDescription>{ts('k_6nrjp8')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                {ts('k_vjmear')}<span className="text-red-500">*</span>
              </Label>
              <Input
                value={colorForm.color_code}
                onChange={(e) => setColorForm({ ...colorForm, color_code: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {ts('k_1r6bl4j')}<span className="text-red-500">*</span>
              </Label>
              <Input
                value={colorForm.color_name}
                onChange={(e) => setColorForm({ ...colorForm, color_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{ts('k_17peoq2')}</Label>
              <Input
                value={colorForm.color_series}
                onChange={(e) => setColorForm({ ...colorForm, color_series: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{ts('k_qip0th')}</Label>
              <Input
                value={colorForm.base_ink_type}
                onChange={(e) => setColorForm({ ...colorForm, base_ink_type: e.target.value })}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{ts('k_8qbk1z')}</Label>
              <Input
                value={colorForm.pantone_code}
                onChange={(e) => setColorForm({ ...colorForm, pantone_code: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveColor}>{tc('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
