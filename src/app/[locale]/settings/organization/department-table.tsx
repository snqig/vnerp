'use client';
import { useTranslations } from 'next-intl';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronRight, ChevronDown, Plus } from 'lucide-react';

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  parent_id: number;
  leader_name: string;
  sort_order: number;
  description: string;
  status: number;
  children?: Department[];
}

interface DepartmentTableProps {
  departments: Department[];
  onEdit: (dept: Department) => void;
  onDelete: (id: number) => void;
  onAdd: (parentId?: number) => void;
}

// 构建部门树形结构
function buildDepartmentTree(departments: Department[]): Department[] {
  const deptMap = new Map<number, Department>();
  const roots: Department[] = [];

  // 首先将所有部门放入map
  departments.forEach((dept) => {
    deptMap.set(dept.id, { ...dept, children: [] });
  });

  // 构建树形结构
  departments.forEach((dept) => {
    const node = deptMap.get(dept.id)!;
    if (dept.parent_id === 0) {
      roots.push(node);
    } else {
      const parent = deptMap.get(dept.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  // 按排序号排序
  const sortNodes = (nodes: Department[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(roots);

  return roots;
}

// 状态标签
function getStatusBadge(status: number) {
  const ts = useTranslations('Common');
  return status === 1 ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{ts('k_5pm2ma')}</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground hover:bg-muted">{ts('k_6q9o5l')}</Badge>
  );
}

// 渲染部门行
function DepartmentRow({
  dept,
  level,
  expandedRows,
  onToggleExpand,
  onEdit,
  onDelete,
  onAdd,
}: {
  dept: Department;
  level: number;
  expandedRows: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (dept: Department) => void;
  onDelete: (id: number) => void;
  onAdd: (parentId?: number) => void;
}) {
  const ts = useTranslations('Common');
  const hasChildren = dept.children && dept.children.length > 0;
  const isExpanded = expandedRows.has(dept.id);

  return (
    <>
      <TableRow className={level > 0 ? 'bg-gray-50/50' : ''}>
        <TableCell className="font-medium">
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-1"
                onClick={() => onToggleExpand(dept.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span className="w-7" />
            )}
            <span className={level === 0 ? 'font-semibold' : ''}>{dept.dept_code}</span>
          </div>
        </TableCell>
        <TableCell>
          <div style={{ paddingLeft: `${level * 24}px` }}>
            <span className={level === 0 ? 'font-semibold' : ''}>{dept.dept_name}</span>
            {level === 0 && <span className="ml-2 text-xs text-gray-400">{ts('k_dz0m8d')}</span>}
          </div>
        </TableCell>
        <TableCell>{dept.leader_name || '-'}</TableCell>
        <TableCell>{dept.sort_order}</TableCell>
        <TableCell>{getStatusBadge(dept.status)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => onAdd(dept.id)} title={ts('k_rvte1m')}>
              <Plus className="w-4 h-4 text-blue-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(dept)} title={ts('k_qreyeg')}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(dept.id)} title={ts('k_1t2vi4h')}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded &&
        dept.children?.map((child) => (
          <DepartmentRow
            key={child.id}
            dept={child}
            level={level + 1}
            expandedRows={expandedRows}
            onToggleExpand={onToggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        ))}
    </>
  );
}

export function DepartmentTable({ departments, onEdit, onDelete, onAdd }: DepartmentTableProps) {
  const ts = useTranslations('Common');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // 默认展开所有一级部门
  const treeData = buildDepartmentTree(departments);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // 展开全部
  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (nodes: Department[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(treeData);
    setExpandedRows(allIds);
  };

  // 收起全部
  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={expandAll}>
          {ts('k_uyffgg')}</Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          {ts('k_1n0p4e2')}</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[180px]">{ts('k_1flqf8g')}</TableHead>
              <TableHead>{ts('k_1dwuqb4')}</TableHead>
              <TableHead className="w-[120px]">{ts('k_17eokaf')}</TableHead>
              <TableHead className="w-[80px]">{ts('k_dqvmz2')}</TableHead>
              <TableHead className="w-[80px]">{ts('k_1ccx4t4')}</TableHead>
              <TableHead className="text-right w-[180px]">{ts('k_501w24')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treeData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {ts('k_9sue4h')}</TableCell>
              </TableRow>
            ) : (
              treeData.map((dept) => (
                <DepartmentRow
                  key={dept.id}
                  dept={dept}
                  level={0}
                  expandedRows={expandedRows}
                  onToggleExpand={toggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAdd={onAdd}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
