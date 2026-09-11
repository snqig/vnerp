'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Role {
  id: number;
  role_name: string;
  role_code: string;
}
interface Dept {
  id: number;
  dept_name: string;
}
interface Employee {
  id: number;
  name: string;
  employee_no: string;
}
interface UserItem {
  id: number;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  department_id: number;
  dept_name: string;
  status: number;
  first_login: number;
  roles: Role[];
}

interface UserFormData {
  id?: number;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  department_id: number | null;
  role_ids: number[];
  status: number;
  password?: string;
}

export default function UserManagementPage() {
  const ts = useTranslations('Common');
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<
    Partial<UserItem> & { password?: string; role_ids?: number[]; department_id?: number }
  >({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nameWarning, setNameWarning] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        username: searchUser,
      });
      const res = await authFetch('/api/system/user?' + params);
      if (!res.ok) {
        setList([]);
        setTotal(0);
        return;
      }
      const result = await res.json();

      // 支持多种数据响应格式
      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: Loose[] = [];
        let totalCount = 0;

        if (Array.isArray(rawData)) {
          rawList = rawData;
          totalCount = rawData.length;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
          totalCount =
            rawData.total || rawData.totalCount || rawData.totalRecords || rawList.length;
        }

        setList(rawList);
        setTotal(totalCount);
      } else {
        setList([]);
        setTotal(0);
      }
    } catch {
      setList([]);
      setTotal(0);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await authFetch('/api/system/roles');
      if (!res.ok) {
        setRoles([]);
        return;
      }
      const result = await res.json();

      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: Loose[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        setRoles(rawList);
      } else {
        setRoles([]);
      }
    } catch {
      setRoles([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await authFetch('/api/organization/department');
      if (!res.ok) {
        setDepartments([]);
        return;
      }
      const result = await res.json();

      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: Loose[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        setDepartments(rawList);
      } else {
        setDepartments([]);
      }
    } catch {
      setDepartments([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await authFetch('/api/organization/employee?pageSize=9999');
      if (!res.ok) {
        setEmployees([]);
        return;
      }
      const result = await res.json();

      if (result.success || result.code === 200 || result.code === 0) {
        const rawData = result.data || result;
        let rawList: Loose[] = [];
        if (Array.isArray(rawData)) {
          rawList = rawData;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || rawData.data || [];
          if (!Array.isArray(rawList)) {
            rawList = [];
          }
        }
        setEmployees(rawList);
      } else {
        setEmployees([]);
      }
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchRoles();
    fetchDepartments();
    fetchEmployees();
  }, []);

  const checkEmployeeName = (name: string) => {
    if (!name || !name.trim()) {
      setNameWarning('');
      return true;
    }
    const found = employees.some((e) => e.name === name.trim());
    if (!found) {
      setNameWarning(ts('k_v6y3qx'));
      return false;
    }
    setNameWarning('');
    return true;
  };

  const handleSave = async () => {
    if (!editItem.username) {
      toast({ title: tc('usernameRequired'), variant: 'destructive' });
      return;
    }
    if (!editItem.id && !editItem.password) {
      toast({ title: tc('passwordRequired'), variant: 'destructive' });
      return;
    }
    if (!editItem.real_name) {
      toast({ title: tc('nameRequired'), variant: 'destructive' });
      return;
    }

    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const body: UserFormData = {
        id: editItem.id,
        username: editItem.username,
        real_name: editItem.real_name || '',
        email: editItem.email || '',
        phone: editItem.phone || '',
        department_id: editItem.department_id || null,
        role_ids: editItem.role_ids || [],
        status: editItem.status ?? 1,
      };
      if (!editItem.id) body.password = editItem.password;

      const res = await authFetch('/api/system/user', {
        method,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
        try {
          await authFetch('/api/auth/cache/clear', { method: 'POST' });
        } catch {}
      } else {
        toast({
          title: tc('operationFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('saveFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/system/user?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const openAddDialog = () => {
    setEditItem({ role_ids: [], status: 1 });
    setNameWarning('');
    setShowDialog(true);
  };

  const openEditDialog = (item: UserItem) => {
    setEditItem({
      ...item,
      role_ids: (item.roles || []).map((r: Role) => r.id),
      department_id: item.department_id,
    });
    setNameWarning('');
    setShowDialog(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('userManagement')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchUsername')}
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t('addUser')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('username')}</TableHead>
                  <TableHead className="text-xs">{tc('name')}</TableHead>
                  <TableHead className="text-xs">{tc('email')}</TableHead>
                  <TableHead className="text-xs">{tc('phone')}</TableHead>
                  <TableHead className="text-xs">{tc('department')}</TableHead>
                  <TableHead className="text-xs">{tc('role')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('firstLogin')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.username}</TableCell>
                    <TableCell className="text-xs">{item.real_name || '-'}</TableCell>
                    <TableCell className="text-xs">{item.email || '-'}</TableCell>
                    <TableCell className="text-xs">{item.phone || '-'}</TableCell>
                    <TableCell className="text-xs">{item.dept_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {(item.roles || []).map((r) => r.role_name).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status === 1 ? tc('enabled') : tc('disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.first_login === 1 ? 'outline' : 'secondary'}
                        className="text-xs"
                      >
                        {item.first_login === 1 ? tc('yes') : tc('no')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                      {t('noRecords')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{ts('k_1vsm2qk')}{total}{ts('k_1rfm5gs')}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('prevPage')}</Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('nextPage')}</Button>
          </div>
        </div>

        <Dialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) setNameWarning('');
          }}
        >
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? ts('k_cbf2mt') : ts('k_183giky')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  {ts('k_u9jq8n')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={editItem.username || ''}
                  onChange={(e) => setEditItem({ ...editItem, username: e.target.value })}
                  disabled={!!editItem.id}
                  placeholder={tc('enterUsername')}
                />
              </div>
              <div>
                <Label>
                  {ts('k_1aph6eg')}{!editItem.id && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type="password"
                  value={editItem.password || ''}
                  onChange={(e) => setEditItem({ ...editItem, password: e.target.value })}
                  placeholder={editItem.id ? ts('k_129o8fs') : tc('passwordRequired')}
                />
              </div>
              <div>
                <Label>
                  {ts('k_10ld5dp')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={editItem.real_name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditItem({ ...editItem, real_name: val });
                    checkEmployeeName(val);
                  }}
                  onBlur={() => {
                    if (editItem.real_name) checkEmployeeName(editItem.real_name);
                  }}
                  placeholder={ts('k_p7rfum')}
                />
                {nameWarning && <p className="text-xs text-amber-600 mt-1">{nameWarning}</p>}
              </div>
              <div>
                <Label>{tc('email')}</Label>
                <Input
                  value={editItem.email || ''}
                  onChange={(e) => setEditItem({ ...editItem, email: e.target.value })}
                  placeholder={tc('enterEmail')}
                />
              </div>
              <div>
                <Label>{ts('k_1yx08wg')}</Label>
                <Input
                  value={editItem.phone || ''}
                  onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })}
                  placeholder={tc('enterPhone')}
                />
              </div>
              <div>
                <Label>{tc('department')}</Label>
                <Select
                  value={editItem.department_id ? String(editItem.department_id) : ''}
                  onValueChange={(v) =>
                    setEditItem({ ...editItem, department_id: v ? Number(v) : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_18m3h1b')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <Select
                  value={String(editItem.status ?? 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('enable')}</SelectItem>
                    <SelectItem value="0">{tc('disable')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>{tc('assignRoleLabel')}</Label>
                {roles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const allSelected = roles.length === (editItem.role_ids || []).length;
                      setEditItem({
                        ...editItem,
                        role_ids: allSelected ? [] : roles.map((r) => r.id),
                      });
                    }}
                  >
                    {roles.length === (editItem.role_ids || []).length ? ts('k_1yw46hk') : ts('k_1yb2sje')}
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                {roles.length === 0 && (
                  <p className="text-sm text-gray-400">{tc('noRolesAvailable')}</p>
                )}
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={(editItem.role_ids || []).includes(role.id)}
                      onCheckedChange={(checked) => {
                        const current = editItem.role_ids || [];
                        setEditItem({
                          ...editItem,
                          role_ids: checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        });
                      }}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{role.role_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({role.role_code})</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {ts('k_cgrzph')}</p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setNameWarning('');
                }}
              >
                {t('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
