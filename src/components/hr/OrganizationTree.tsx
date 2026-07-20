'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, Building2, Landmark, Factory, Wrench, Users, Briefcase,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';

interface OrgNode {
  id: number;
  code: string;
  name: string;
  type: 'group' | 'legal_entity' | 'factory' | 'workshop' | 'team' | 'position';
  skillLevel?: number;
  children?: OrgNode[];
}

interface EditForm {
  id?: number;
  type: string;
  parentId?: number;
  code: string;
  name: string;
  sortOrder: number;
  remark: string;
  skillLevel?: number;
  managerName?: string;
  teamLeader?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  taxId?: string;
  legalPerson?: string;
  baseSalaryRange?: string;
}

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  group: { icon: Building2, label: 'orgGroup', color: 'text-blue-600' },
  legal_entity: { icon: Landmark, label: 'orgLegalEntity', color: 'text-purple-600' },
  factory: { icon: Factory, label: 'orgFactory', color: 'text-green-600' },
  workshop: { icon: Wrench, label: 'orgWorkshop', color: 'text-orange-600' },
  team: { icon: Users, label: 'orgTeam', color: 'text-teal-600' },
  position: { icon: Briefcase, label: 'orgPosition', color: 'text-gray-600' },
};

const childTypeMap: Record<string, string> = {
  group: 'legal_entity',
  legal_entity: 'factory',
  factory: 'workshop',
  workshop: 'team',
  team: 'position',
};

const typeNames: Record<string, string> = {
  group: '集团',
  legal_entity: '法人实体',
  factory: '工厂',
  workshop: '车间',
  team: '班组',
  position: '岗位',
};

function TreeNode({
  node, depth, t, onEdit, onDelete, onAddChild,
}: {
  node: OrgNode; depth: number; t: ReturnType<typeof useTranslations>;
  onEdit: (n: OrgNode) => void;
  onDelete: (n: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const config = typeConfig[node.type];
  const Icon = config.icon;
  const canAddChild = !!childTypeMap[node.type];

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent group transition-colors',
          depth > 0 && 'ml-6',
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => hasChildren && setExpanded(!expanded)}>
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <span className="w-4" />
          )}
          <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
          <span className="text-sm font-medium truncate">{node.name}</span>
          {node.code && <span className="text-xs text-muted-foreground shrink-0">({node.code})</span>}
          <Badge variant="outline" className="text-xs shrink-0">{t(config.label)}</Badge>
          {node.skillLevel && <span className="text-xs text-muted-foreground shrink-0">Lv.{node.skillLevel}</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canAddChild && (
            <Button variant="ghost" size="icon" className="h-6 w-6" title={`新增${typeNames[childTypeMap[node.type]]}`}
              onClick={(e) => { e.stopPropagation(); onAddChild(node); }}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" title="编辑"
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" title="删除"
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-border ml-4">
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} t={t}
              onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationTree() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EditForm>({ type: 'group', code: '', name: '', sortOrder: 0, remark: '' });
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = useTranslations('Hr');

  const fetchTree = async () => {
    try {
      const r = await fetch('/api/organization/tree');
      const d = await r.json();
      setTree(d.data || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchTree(); }, []);

  const openCreate = (parent?: OrgNode) => {
    const childType = parent ? childTypeMap[parent.type] : 'group';
    setIsEdit(false);
    setForm({
      type: childType, parentId: parent?.id, code: '', name: '',
      sortOrder: 0, remark: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (node: OrgNode) => {
    setIsEdit(true);
    setForm({ id: node.id, type: node.type, code: node.code, name: node.name, sortOrder: 0, remark: '' });
    setDialogOpen(true);
  };

  const handleDelete = async (node: OrgNode) => {
    if (!confirm(`确认删除 ${typeNames[node.type]}「${node.name}」？`)) return;
    try {
      const res = await authFetch(`/api/organization/crud?id=${node.id}&type=${node.type}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('删除成功');
        fetchTree();
      } else {
        toast.error(json.message || '删除失败');
      }
    } catch {
      toast.error('删除请求失败');
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast.error('编码和名称为必填'); return; }
    setSaving(true);
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { id: form.id, type: form.type, code: form.code, name: form.name, sortOrder: form.sortOrder, remark: form.remark }
        : form;
      const res = await authFetch('/api/organization/crud', {
        method, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(isEdit ? '更新成功' : '创建成功');
        setDialogOpen(false);
        fetchTree();
      } else {
        toast.error(json.message || '保存失败');
      }
    } catch {
      toast.error('保存请求失败');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">{t('loadingOrg')}</div>;

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-muted-foreground">{t('orgTree')}</span>
        <Button size="sm" variant="outline" onClick={() => openCreate()}>
          <Plus className="h-3 w-3 mr-1" />新增{t('orgGroup')}
        </Button>
      </div>

      {tree.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('noOrgData')}</div>
      ) : (
        tree.map(node => (
          <TreeNode key={node.id} node={node} depth={0} t={t}
            onEdit={openEdit} onDelete={handleDelete} onAddChild={openCreate} />
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? '编辑' : '新增'}{typeNames[form.type] || form.type}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>编码 <span className="text-red-500">*</span></Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="如 HQ" />
            </div>
            <div className="space-y-1.5">
              <Label>名称 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如 总部" />
            </div>
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            {(form.type === 'workshop') && (
              <div className="space-y-1.5">
                <Label>负责人</Label>
                <Input value={form.managerName || ''} onChange={e => setForm({ ...form, managerName: e.target.value })} />
              </div>
            )}
            {(form.type === 'team') && (
              <div className="space-y-1.5">
                <Label>班组长</Label>
                <Input value={form.teamLeader || ''} onChange={e => setForm({ ...form, teamLeader: e.target.value })} />
              </div>
            )}
            {(form.type === 'position') && (
              <>
                <div className="space-y-1.5">
                  <Label>技能等级</Label>
                  <Input type="number" value={form.skillLevel || 1} onChange={e => setForm({ ...form, skillLevel: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>薪资范围</Label>
                  <Input value={form.baseSalaryRange || ''} onChange={e => setForm({ ...form, baseSalaryRange: e.target.value })} placeholder="如 5000-8000" />
                </div>
              </>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>备注</Label>
              <Input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
