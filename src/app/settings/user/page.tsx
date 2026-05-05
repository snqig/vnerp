'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Role { id: number; role_name: string; role_code: string; }
interface Dept { id: number; dept_name: string; }
interface Employee { id: number; name: string; employee_no: string; }
interface UserItem { id: number; username: string; real_name: string; email: string; phone: string; department_id: number; dept_name: string; status: number; first_login: number; roles: Role[]; }

export default function UserManagementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<UserItem> & { password?: string; role_ids?: number[]; department_id?: number }>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nameWarning, setNameWarning] = useState('');

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', username: searchUser }); const res = await fetch('/api/system/user?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };

  const fetchRoles = async () => { try { const res = await fetch('/api/system/roles'); const result = await res.json(); if (result.success) setRoles(result.data || []); } catch (e) { console.error(e); } };

  const fetchDepartments = async () => { try { const res = await fetch('/api/organization/department'); const result = await res.json(); if (result.success) setDepartments(result.data || []); } catch (e) { console.error(e); } };

  const fetchEmployees = async () => { try { const res = await fetch('/api/organization/employee?pageSize=9999'); const result = await res.json(); if (result.success) setEmployees(result.data?.list || result.data || []); } catch (e) { console.error(e); } };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchRoles(); fetchDepartments(); fetchEmployees(); }, []);

  const checkEmployeeName = (name: string) => {
    if (!name || !name.trim()) { setNameWarning(''); return true; }
    const found = employees.some(e => e.name === name.trim());
    if (!found) {
      setNameWarning('该姓名在员工档案中不存在，请确认');
      return false;
    }
    setNameWarning('');
    return true;
  };

  const handleSave = async () => {
    if (!editItem.username) { toast({ title: '用户名不能为空', variant: 'destructive' }); return; }
    if (!editItem.id && !editItem.password) { toast({ title: '密码不能为空', variant: 'destructive' }); return; }
    if (!editItem.real_name) { toast({ title: '姓名不能为空', variant: 'destructive' }); return; }

    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const body: any = {
        id: editItem.id,
        username: editItem.username,
        real_name: editItem.real_name,
        email: editItem.email || '',
        phone: editItem.phone || '',
        department_id: editItem.department_id || null,
        role_ids: editItem.role_ids || [],
        status: editItem.status ?? 1,
      };
      if (!editItem.id) body.password = editItem.password;

      const res = await fetch('/api/system/user', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
        try { await fetch('/api/auth/cache/clear', { method: 'POST' }); } catch (e) {}
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/system/user?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

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
          <h1 className="text-2xl font-bold">用户管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索用户名" value={searchUser} onChange={e => setSearchUser(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={openAddDialog}><Plus className="h-3 w-3 mr-1" />新增用户</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">用户名</TableHead>
                <TableHead className="text-xs">姓名</TableHead>
                <TableHead className="text-xs">邮箱</TableHead>
                <TableHead className="text-xs">手机</TableHead>
                <TableHead className="text-xs">部门</TableHead>
                <TableHead className="text-xs">角色</TableHead>
                <TableHead className="text-xs">状态</TableHead>
                <TableHead className="text-xs">首次登录</TableHead>
                <TableHead className="text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.username}</TableCell>
                  <TableCell className="text-xs">{item.real_name || '-'}</TableCell>
                  <TableCell className="text-xs">{item.email || '-'}</TableCell>
                  <TableCell className="text-xs">{item.phone || '-'}</TableCell>
                  <TableCell className="text-xs">{item.dept_name || '-'}</TableCell>
                  <TableCell className="text-xs">{(item.roles || []).map(r => r.role_name).join(', ') || '-'}</TableCell>
                  <TableCell><Badge variant={item.status === 1 ? 'default' : 'destructive'} className="text-xs">{item.status === 1 ? '启用' : '禁用'}</Badge></TableCell>
                  <TableCell><Badge variant={item.first_login === 1 ? 'outline' : 'secondary'} className="text-xs">{item.first_login === 1 ? '是' : '否'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditDialog(item)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setNameWarning(''); }}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>{editItem.id ? '编辑用户' : '新增用户'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>用户名 <span className="text-red-500">*</span></Label>
                <Input value={editItem.username || ''} onChange={e => setEditItem({ ...editItem, username: e.target.value })} disabled={!!editItem.id} placeholder="请输入用户名" />
              </div>
              <div>
                <Label>密码 {!editItem.id && <span className="text-red-500">*</span>}</Label>
                <Input type="password" value={editItem.password || ''} onChange={e => setEditItem({ ...editItem, password: e.target.value })} placeholder={editItem.id ? '留空不修改' : '请输入密码'} />
              </div>
              <div>
                <Label>姓名 <span className="text-red-500">*</span></Label>
                <Input
                  value={editItem.real_name || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditItem({ ...editItem, real_name: val });
                    checkEmployeeName(val);
                  }}
                  onBlur={() => { if (editItem.real_name) checkEmployeeName(editItem.real_name); }}
                  placeholder="请输入姓名"
                />
                {nameWarning && <p className="text-xs text-amber-600 mt-1">{nameWarning}</p>}
              </div>
              <div>
                <Label>邮箱</Label>
                <Input value={editItem.email || ''} onChange={e => setEditItem({ ...editItem, email: e.target.value })} placeholder="请输入邮箱" />
              </div>
              <div>
                <Label>手机</Label>
                <Input value={editItem.phone || ''} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} placeholder="请输入手机号" />
              </div>
              <div>
                <Label>部门</Label>
                <Select value={editItem.department_id ? String(editItem.department_id) : ''} onValueChange={(v) => setEditItem({ ...editItem, department_id: v ? Number(v) : undefined })}>
                  <SelectTrigger><SelectValue placeholder="选择部门" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.dept_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>状态</Label>
                <Select value={String(editItem.status ?? 1)} onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label className="mb-2 block">角色分配</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                {roles.length === 0 && <p className="text-sm text-gray-400">暂无角色</p>}
                {roles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(editItem.role_ids || []).includes(role.id)}
                      onCheckedChange={(checked) => {
                        const current = editItem.role_ids || [];
                        setEditItem({
                          ...editItem,
                          role_ids: checked
                            ? [...current, role.id]
                            : current.filter(id => id !== role.id)
                        });
                      }}
                    />
                    <span className="text-sm">{role.role_name}</span>
                    <span className="text-xs text-gray-400">({role.role_code})</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDialog(false); setNameWarning(''); }}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
