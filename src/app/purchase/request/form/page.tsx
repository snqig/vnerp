'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Printer, Save, Plus, List, ChevronDown, Search, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCompanyName } from '@/hooks/useCompanyName';
import { MaterialPicker } from '@/components/ui/material-picker';

interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
}

interface Employee {
  id: number;
  employee_no: string;
  name: string;
  dept_id?: number;
  dept_name?: string;
  position?: string;
}

interface MaterialRef {
  material_id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  purchase_price: number;
}

interface PurchaseItem {
  id: number;
  material_id: number;
  material_code: string;
  productName: string;
  spec: string;
  unit: string;
  quantity: string;
  price: string;
  amount: string;
  remark: string;
}

interface PurchaseForm {
  department_id: number;
  department: string;
  applicant_id: number;
  applicant: string;
  reviewer_id: number;
  reviewer: string;
  approver_id: number;
  approver: string;
}

interface SavedRecord {
  id: number;
  request_no: string;
  request_date: string;
  request_dept: string;
  requester_name: string;
  status: number;
  total_amount: number;
  create_time: string;
  items: PurchaseItem[];
  form: PurchaseForm;
  remark: string;
  reviewer_name?: string;
  approver_name?: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '草稿', color: '#6b7280' },
  1: { label: '已提交', color: '#2563eb' },
  2: { label: '审校中', color: '#d97706' },
  3: { label: '审校通过', color: '#7c3aed' },
  4: { label: '已批准', color: '#059669' },
  5: { label: '已转采购', color: '#0891b2' },
  6: { label: '已驳回', color: '#dc2626' },
  9: { label: '已关闭', color: '#9ca3af' },
};

let nextItemId = 100;
const createEmptyItem = (): PurchaseItem => ({
  id: nextItemId++,
  material_id: 0,
  material_code: '',
  productName: '',
  spec: '',
  unit: '',
  quantity: '',
  price: '',
  amount: '',
  remark: '',
});

const generateOrderNo = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${yyyy}${mm}${dd}-${random}`;
};

const formatDateCN = (date: Date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const commonUnits = ['个', '件', '箱', '卷', '米', '千克', '公斤', '吨', '张', '套', '批', '桶', '瓶', '包', '条', '块', '片', '支', '根', '台', '把', '双', '对', '只', '令', '令/张'];

export default function PurchaseRequestFormPage() {
  const router = useRouter();
  const { companyName } = useCompanyName();
  const printRef = useRef<HTMLDivElement>(null);

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(() => {
    const items = [];
    for (let i = 0; i < 10; i++) items.push(createEmptyItem());
    return items;
  });
  const [form, setForm] = useState<PurchaseForm>({
    department_id: 0,
    department: '',
    applicant_id: 0,
    applicant: '',
    reviewer_id: 0,
    reviewer: '',
    approver_id: 0,
    approver: '',
  });
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [showListDialog, setShowListDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<number>(0);
  const [unitPickerIdx, setUnitPickerIdx] = useState<number | null>(null);
  const [requestDate, setRequestDate] = useState('');
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materialPickerTargetIdx, setMaterialPickerTargetIdx] = useState<number>(-1);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    setPurchaseOrderNo(generateOrderNo());
    setRequestDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetch('/api/organization/department')
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          setDepartments(result.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/organization/employee?pageSize=200')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const list = Array.isArray(result.data) ? result.data : (result.data.data || []);
          setEmployees(list);
        }
      })
      .catch(() => {});
  }, []);

  const loadSavedRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch('/api/purchase/request?pageSize=50');
      const result = await res.json();
      if (result.success) {
        const records = result.data?.data || result.data || [];
        setSavedRecords(Array.isArray(records) ? records : []);
      }
    } catch {
      setSavedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleOpenList = () => {
    loadSavedRecords();
    setShowListDialog(true);
  };

  const handleEditRecord = (record: SavedRecord) => {
    setEditingId(record.id);
    setEditingStatus(record.status);
    setPurchaseOrderNo(record.request_no);
    setRequestDate(record.request_date);

    const dept = departments.find(d => d.dept_name === record.request_dept);
    const applicant = employees.find(e => e.name === record.requester_name);

    setForm({
      department_id: dept?.id || 0,
      department: record.request_dept || '',
      applicant_id: applicant?.id || 0,
      applicant: record.requester_name || '',
      reviewer_id: 0,
      reviewer: record.reviewer_name || '',
      approver_id: 0,
      approver: record.approver_name || '',
    });

    if (record.items && record.items.length > 0) {
      const items = record.items.map((item: any) => ({
        id: nextItemId++,
        material_id: item.material_id || 0,
        material_code: item.material_code || '',
        productName: item.material_name || '',
        spec: item.material_spec || '',
        unit: item.material_unit || '',
        quantity: String(item.quantity || ''),
        price: String(item.price || ''),
        amount: String(item.amount || ''),
        remark: item.remark || '',
      }));
      setPurchaseItems(items);
    } else {
      const items = [];
      for (let i = 0; i < 10; i++) items.push(createEmptyItem());
      setPurchaseItems(items);
    }

    setShowListDialog(false);
  };

  const handleMaterialSelect = (idx: number) => {
    setMaterialPickerTargetIdx(idx);
    setMaterialPickerOpen(true);
  };

  const onMaterialPicked = (mat: any) => {
    if (materialPickerTargetIdx < 0) return;
    setPurchaseItems(prev => {
      const next = [...prev];
      const qty = next[materialPickerTargetIdx].quantity || '1';
      const price = String(mat.purchase_price || '');
      const amount = price && qty ? String((parseFloat(price) * parseFloat(qty)).toFixed(2)) : '';
      next[materialPickerTargetIdx] = {
        ...next[materialPickerTargetIdx],
        material_id: mat.id,
        material_code: mat.material_code,
        productName: mat.material_name,
        spec: mat.specification || '',
        unit: mat.unit || '',
        price,
        amount,
      };
      return next;
    });
  };

  const addNewRow = () => {
    setPurchaseItems(prev => [...prev, createEmptyItem()]);
  };

  const removeRow = (index: number) => {
    if (purchaseItems.length === 1) {
      toast.error('至少保留一行物料明细');
      return;
    }
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string) => {
    setPurchaseItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? value : next[index].quantity;
        const price = field === 'price' ? value : next[index].price;
        if (qty && price && !isNaN(parseFloat(qty)) && !isNaN(parseFloat(price))) {
          next[index].amount = (parseFloat(qty) * parseFloat(price)).toFixed(2);
        }
      }

      return next;
    });
  };

  const handleSave = async (submitStatus: number = 0) => {
    const filledItems = purchaseItems.filter(item => item.productName || item.spec || item.quantity);
    if (filledItems.length === 0) {
      toast.error('请至少填写一行物料明细');
      return;
    }
    if (!form.applicant) {
      toast.error('请选择申请人');
      return;
    }
    if (!form.department) {
      toast.error('请选择部门');
      return;
    }

    const itemsWithoutMaterialId = filledItems.filter(item => !item.material_id);
    if (itemsWithoutMaterialId.length > 0 && submitStatus >= 1) {
      toast.error(`有 ${itemsWithoutMaterialId.length} 行物料未从主档选择，提交前请补全`);
      return;
    }

    try {
      const body = {
        request_date: requestDate,
        request_type: '请购单',
        request_dept_id: form.department_id,
        request_dept: form.department,
        requester_id: form.applicant_id,
        requester_name: form.applicant,
        reviewer_id: form.reviewer_id,
        reviewer_name: form.reviewer,
        approver_id: form.approver_id,
        approver_name: form.approver,
        priority: 1,
        expected_date: new Date().toISOString().split('T')[0],
        remark: '',
        status: submitStatus,
        items: filledItems.map((item, idx) => ({
          line_no: idx + 1,
          material_id: item.material_id || null,
          material_code: item.material_code || '',
          material_name: item.productName,
          material_spec: item.spec,
          material_unit: item.unit,
          quantity: parseFloat(item.quantity) || 0,
          price: parseFloat(item.price) || 0,
          amount: parseFloat(item.amount) || 0,
          remark: item.remark,
        })),
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/purchase/request?id=${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/purchase/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const result = await res.json();
      if (result.success) {
        const statusLabel = STATUS_MAP[submitStatus]?.label || '保存';
        toast.success(`${statusLabel}成功`);
        setEditingStatus(submitStatus);
        if (!editingId && result.data?.id) {
          setEditingId(result.data.id);
        }
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (e) {
      toast.error('保存失败');
    }
  };

  const handlePrint = () => {
    const filledItems = purchaseItems.filter(item => item.productName || item.spec || item.quantity);
    const itemRows = filledItems.length > 0
      ? filledItems.map((item, idx) => `
        <tr>
          <td class="serial">${idx + 1}</td>
          <td>${item.productName || ''}</td>
          <td>${item.spec || ''}</td>
          <td>${item.unit || ''}</td>
          <td class="num">${item.quantity || ''}</td>
          <td>${item.remark || ''}</td>
        </tr>`).join('')
      : Array.from({ length: 10 }, (_, idx) => `
        <tr>
          <td class="serial">${idx + 1}</td>
          <td></td><td></td><td></td><td></td><td></td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>请购单</title>
      <style>
        @page { size: A5 landscape; margin: 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; padding: 10px; color: #333; font-size: 11px; }
        .title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .company-title { font-size: 18px; font-weight: 800; color: #0b3b5f; letter-spacing: 1px; border-bottom: 2px solid #d32f2f; display: inline-block; padding-bottom: 4px; }
        .order-no { font-size: 13px; font-weight: 600; color: #e11d1d; background: #fff5f5; padding: 2px 10px; white-space: nowrap; }
        .sub-title { font-size: 15px; font-weight: 700; color: #1e466e; background: #f0f6ff; display: inline-block; padding: 3px 20px; border-radius: 20px; margin: 6px 0 10px; }
        .text-center { text-align: center; }
        .info-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f8fafc; padding: 6px 14px; border: 1px solid #e2edf2; margin-bottom: 0; }
        .dept-area { font-weight: 500; font-size: 12px; }
        .dept-area span { font-weight: 700; color: #0f3b5c; }
        .date { font-size: 12px; color: #2c6e9e; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: center; vertical-align: middle; }
        th { background-color: #eef3fc; font-weight: 700; color: #1a4b74; font-size: 12px; }
        .serial { font-weight: 600; background: #f9fbfd; color: #1f5e8e; }
        .num { text-align: center; }
        .sign-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #cde1ec; }
        .doc-code { font-family: monospace; font-size: 10px; background: #f1f5f9; padding: 3px 10px; border-radius: 16px; color: #2c5282; font-weight: 600; }
        .sign-group { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
        .sign-item { font-size: 12px; }
        .sign-item span { font-weight: 700; color: #b43b0b; }
        .sign-item .sign-line { display: inline-block; width: 80px; border-bottom: 1px solid #999; margin-left: 4px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <div class="title-row">
          <div style="flex:1"></div>
          <div style="text-align:center;flex:2"><span class="company-title">${companyName}</span></div>
          <div style="flex:1;text-align:right"><span class="order-no">${purchaseOrderNo}</span></div>
        </div>
        <div class="text-center"><span class="sub-title">请购单</span></div>
        <div class="info-bar">
          <div class="dept-area"><span>部门：</span>${form.department || '__________'}</div>
          <div class="date">${formatDateCN(new Date(requestDate))}</div>
        </div>
        <table>
          <thead><tr><th style="width:40px">序号</th><th>品名</th><th>规格</th><th style="width:60px">单位</th><th style="width:70px">数量</th><th>备注</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="sign-bar">
          <div class="doc-code">表单编号：DC-A-03A</div>
          <div class="sign-group">
            <div class="sign-item"><span>申请人：</span><span class="sign-line">${form.applicant || ''}</span></div>
            <div class="sign-item"><span>审校：</span><span class="sign-line">${form.reviewer || ''}</span></div>
            <div class="sign-item"><span>批准：</span><span class="sign-line">${form.approver || ''}</span></div>
          </div>
        </div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const resetForm = () => {
    const items = [];
    for (let i = 0; i < 10; i++) items.push(createEmptyItem());
    setPurchaseItems(items);
    setForm({
      department_id: 0, department: '',
      applicant_id: 0, applicant: '',
      reviewer_id: 0, reviewer: '',
      approver_id: 0, approver: '',
    });
    setEditingId(null);
    setEditingStatus(0);
    setPurchaseOrderNo(generateOrderNo());
    setRequestDate(new Date().toISOString().split('T')[0]);
  };

  const canEdit = editingStatus === 0 || editingStatus === 6;
  const canSubmit = editingStatus === 0 || editingStatus === 6;

  return (
    <MainLayout>
      <MaterialPicker
        open={materialPickerOpen}
        onClose={() => setMaterialPickerOpen(false)}
        onSelect={onMaterialPicked}
      />

      <div className="p-6" onClick={() => setUnitPickerIdx(null)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">请购单录入</h1>
            {editingId && (
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: STATUS_MAP[editingStatus]?.color || '#6b7280',
                background: `${STATUS_MAP[editingStatus]?.color}15`,
                padding: '2px 12px', borderRadius: '12px'
              }}>
                {STATUS_MAP[editingStatus]?.label || '未知'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenList}>
              <List className="h-4 w-4 mr-1" />历史记录
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              新建
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />打印(A5横向)
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => handleSave(0)}>
                <Save className="h-4 w-4 mr-1" />保存草稿
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" onClick={() => handleSave(1)}>
                <Send className="h-4 w-4 mr-1" />提交审校
              </Button>
            )}
          </div>
        </div>

        <div ref={printRef} className="bg-white rounded-2xl shadow-lg p-6 max-w-[1400px] mx-auto" style={{ background: '#ffffff', borderRadius: '28px', boxShadow: '0 25px 45px -12px rgba(0,0,0,0.15)', padding: '28px 32px 42px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}></div>
            <div style={{ textAlign: 'center', flex: 2 }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#0b3b5f', letterSpacing: '1px', display: 'inline-block', paddingBottom: '8px' }}>
                {companyName}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#e11d1d', padding: '4px 14px', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                {purchaseOrderNo}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1e466e', display: 'inline-block', padding: '6px 28px' }}>
              请购单
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px', padding: '14px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontWeight: 500 }}>
              <label style={{ fontWeight: 700, color: '#0f3b5c' }}>部门：</label>
              <Select
                value={form.department_id ? String(form.department_id) : ''}
                onValueChange={v => {
                  const dept = departments.find(d => d.id === Number(v));
                  setForm(prev => ({
                    ...prev,
                    department_id: Number(v),
                    department: dept?.dept_name || '',
                  }));
                }}
                disabled={!canEdit}
              >
                <SelectTrigger style={{ border: '1px solid #cbdde6', borderRadius: '0', padding: '8px 16px', fontSize: '14px', width: '200px' }}>
                  <SelectValue placeholder="选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={String(dept.id)}>{dept.dept_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#2c6e9e', fontWeight: 600 }}>
              <input
                type="date"
                value={requestDate}
                onChange={e => setRequestDate(e.target.value)}
                disabled={!canEdit}
                style={{ border: '1px solid #cbdde6', borderRadius: '0', padding: '4px 12px', fontSize: '14px', color: '#2c6e9e', background: 'white', cursor: 'pointer', fontWeight: 600 }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e0edf3' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
              <thead>
                <tr>
                  {['序号', '物料编码', '品名', '规格', '单位', '数量', '单价', '金额', '备注', '操作'].map((h, i) => (
                    <th key={h} style={{ border: '1px solid #d4e2ec', padding: '12px 10px', background: '#eef3fc', fontWeight: 800, color: '#1a4b74', fontSize: '15px', width: i === 0 ? '50px' : i === 1 ? '110px' : i === 4 ? '80px' : i === 5 ? '90px' : i === 6 ? '90px' : i === 7 ? '100px' : i === 9 ? '70px' : undefined }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #d4e2ec', padding: 0, textAlign: 'center', fontWeight: 600, background: '#f9fbfd', color: '#1f5e8e' }}>
                      {idx + 1}
                    </td>
                    <td style={{ border: '1px solid #d4e2ec', padding: 0, textAlign: 'center' }}>
                      {item.material_code ? (
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600, padding: '0 8px' }}>
                          {item.material_code}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMaterialSelect(idx)}
                          disabled={!canEdit}
                          style={{
                            width: '100%', border: 'none', background: '#f0f6ff',
                            padding: '10px', cursor: canEdit ? 'pointer' : 'default',
                            color: '#2563eb', fontSize: '12px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}
                        >
                          <Search style={{ width: '14px', height: '14px' }} />
                          选择物料
                        </button>
                      )}
                      {item.material_code && canEdit && (
                        <button
                          onClick={() => handleMaterialSelect(idx)}
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: '#2563eb', fontSize: '11px', padding: '2px 4px'
                          }}
                        >
                          更换
                        </button>
                      )}
                    </td>
                    {(['productName', 'spec', 'unit', 'quantity', 'price', 'amount', 'remark'] as const).map(field => {
                      if (field === 'unit') {
                        return (
                          <td key={field} style={{ border: '1px solid #d4e2ec', padding: 0, position: 'relative' }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => updateItem(idx, 'unit', e.target.value)}
                                onFocus={() => setUnitPickerIdx(idx)}
                                disabled={!canEdit}
                                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '12px 10px', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'center', cursor: 'text', paddingRight: '20px' }}
                              />
                              <ChevronDown style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#999', pointerEvents: 'none' }} />
                              {unitPickerIdx === idx && canEdit && (
                                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: '0', zIndex: 50, background: 'white', border: '1px solid #d4e2ec', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '200px' }}>
                                  {commonUnits.map(u => (
                                    <button
                                      key={u}
                                      onClick={() => { updateItem(idx, 'unit', u); setUnitPickerIdx(null); }}
                                      style={{ border: '1px solid #e2edf2', background: item.unit === u ? '#eef3fc' : '#f8fafc', padding: '3px 10px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer', color: '#1a4b74', fontWeight: item.unit === u ? 700 : 400 }}
                                    >
                                      {u}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (field === 'amount') {
                        return (
                          <td key={field} style={{ border: '1px solid #d4e2ec', padding: 0, textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: '13px' }}>
                            {item.amount || ''}
                          </td>
                        );
                      }

                      return (
                        <td key={field} style={{ border: '1px solid #d4e2ec', padding: 0 }}>
                          <input
                            type={field === 'quantity' || field === 'price' ? 'number' : 'text'}
                            value={item[field]}
                            onChange={e => updateItem(idx, field, e.target.value)}
                            disabled={!canEdit || (field === 'productName' && item.material_id > 0) || (field === 'spec' && item.material_id > 0)}
                            style={{
                              width: '100%', height: '100%', border: 'none', background: 'transparent',
                              outline: 'none', padding: '12px 10px', fontFamily: 'inherit',
                              fontSize: 'inherit', textAlign: 'center', cursor: 'text',
                              color: item.material_id > 0 && (field === 'productName' || field === 'spec') ? '#6b7280' : 'inherit'
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ border: '1px solid #d4e2ec', padding: 0, textAlign: 'center' }}>
                      <button
                        onClick={() => removeRow(idx)}
                        disabled={!canEdit}
                        style={{
                          background: 'none', border: 'none', fontSize: '16px', cursor: canEdit ? 'pointer' : 'not-allowed',
                          color: '#a0342e', padding: '4px 8px', borderRadius: '30px',
                          opacity: canEdit ? 1 : 0.4
                        }}
                        title="删除此行"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', margin: '12px 0 10px' }}>
            <button
              onClick={addNewRow}
              disabled={!canEdit}
              style={{
                background: canEdit ? '#1e6f3f' : '#9ca3af', color: 'white', border: 'none',
                padding: '10px 24px', borderRadius: '40px', fontWeight: 600, fontSize: '14px',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              + 添加物料行
            </button>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              合计金额：<span style={{ color: '#059669', fontWeight: 700, fontSize: '16px' }}>
                ¥{purchaseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginTop: '30px', paddingTop: '18px', borderTop: '1px solid #cde1ec' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', background: '#f1f5f9', padding: '6px 18px', borderRadius: '32px', color: '#2c5282', fontWeight: 600 }}>
              表单编号：DC-A-03A
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', alignItems: 'center' }}>
              {[
                { label: '申请人', key: 'applicant' as const, idKey: 'applicant_id' as const },
                { label: '审校', key: 'reviewer' as const, idKey: 'reviewer_id' as const },
                { label: '批准', key: 'approver' as const, idKey: 'approver_id' as const },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700, color: '#b43b0b' }}>{item.label}：</span>
                  <Select
                    value={form[item.idKey] ? String(form[item.idKey]) : ''}
                    onValueChange={v => {
                      const emp = employees.find(e => e.id === Number(v));
                      setForm(prev => ({
                        ...prev,
                        [item.idKey]: Number(v),
                        [item.key]: emp?.name || '',
                      }));
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger style={{ border: '1px solid #cbdde6', borderRadius: '0', padding: '4px 12px', fontSize: '13px', width: '120px' }}>
                      <SelectValue placeholder={`选择${item.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.name}{emp.dept_name ? ` (${emp.dept_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
          <DialogContent style={{ maxWidth: '900px', maxHeight: '80vh' }}>
            <DialogHeader>
              <DialogTitle>历史请购单记录</DialogTitle>
            </DialogHeader>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingRecords ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>加载中...</div>
              ) : savedRecords.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>暂无记录</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['单号', '部门', '申请人', '日期', '状态', '金额', '操作'].map(h => (
                        <th key={h} style={{ border: '1px solid #e5e7eb', padding: '8px 12px', background: '#f9fafb', fontWeight: 700, color: '#374151', textAlign: 'left' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {savedRecords.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                          {record.request_no}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{record.request_dept}</td>
                        <td style={{ padding: '8px 12px' }}>{record.requester_name}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{record.request_date}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 600,
                            color: STATUS_MAP[record.status]?.color || '#6b7280',
                            background: `${STATUS_MAP[record.status]?.color}15`,
                            padding: '2px 8px', borderRadius: '10px'
                          }}>
                            {STATUS_MAP[record.status]?.label || '未知'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 600 }}>
                          ¥{(record.total_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => handleEditRecord(record)}
                            style={{
                              background: '#2563eb', color: 'white', border: 'none',
                              padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
                              cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
