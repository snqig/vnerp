'use client';

import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Award, CheckCircle, XCircle, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { EmployeeOption } from '@/hooks/useEmployeeOptions';

export type QualityInspectionType = 'process' | 'final';

export interface QualityInspectItem {
  id: string;
  name: string;
  required?: boolean;
}

/**
 * 检验弹窗共用的表单状态形状。
 * - process 页使用 `defectType`
 * - final 页使用 `defectReason` + `packMethod`
 * 两者通过 `defectFieldName` 区分，组件只按统一字段读写。
 */
export interface QualityInspectForm {
  result: string;
  qualifiedQty: number;
  defectQty: number;
  inspector: string;
  remark: string;
  checkedItems: string[];
  defectType?: string;
  defectReason?: string;
  packMethod?: string;
}

export type QualityTFunction = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

/** 流程卡摘要信息（两页字段一致） */
export interface QualityInspectCard {
  card_no: string;
  product_name: string;
  customer_name?: string | null;
  finished_size?: string | null;
  tolerance?: string | null;
  plan_qty?: number | null;
}

interface QualityInspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: QualityInspectionType;
  title: string;
  description: string;
  /** 流程卡摘要信息（两页字段一致）；对话框关闭态可能为 null */
  card: QualityInspectCard | null;
  /** 检验项目清单 */
  items: QualityInspectItem[];
  /** 检验项目是否必填（渲染红色 *，final 页用） */
  itemsRequired?: boolean;
  /** 当前表单状态（持有在父页） */
  form: QualityInspectForm;
  /** 父页提供的 patch 更新器，组件只算差量回传 */
  onChange: (patch: Partial<QualityInspectForm>) => void;
  /** 不良原因字段名：process=defectType / final=defectReason */
  defectFieldName: 'defectType' | 'defectReason';
  /** 不良原因可选项 */
  defectOptions: { value: string; label: string }[];
  /** 库内真实人员 */
  employeeOptions: EmployeeOption[];
  employeeLabel: (emp: EmployeeOption) => string;
  /** final 页专有的额外字段（如包装方式），渲染在「不良原因」之后、「检验员」之前 */
  extraFields?: ReactNode;
  onSubmit: () => void;
  loading: boolean;
  /** next-intl 翻译函数（与父页同一实例，保证文案一致） */
  t: QualityTFunction;
  tc: QualityTFunction;
}

export function QualityInspectDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  card,
  items,
  itemsRequired,
  form,
  onChange,
  defectFieldName,
  defectOptions,
  employeeOptions,
  employeeLabel,
  extraFields,
  onSubmit,
  loading,
  t,
  tc,
}: QualityInspectDialogProps) {
  // 两页仅个别 label key 不同，按 type 分支取一致的翻译函数
  const itemsLabel = type === 'final' ? t('finalInspectionItems') : t('inspectionItems');
  const resultLabel = type === 'final' ? t('finalInspectionResult') : t('inspectionResult');
  const resultPlaceholder = type === 'final' ? t('selectFinalInspectionResult') : t('selectInspectionResult');
  const inspectorLabel = type === 'final' ? t('finalInspector') : t('inspector');
  const inspectorPlaceholder = type === 'final' ? t('enterFinalInspectorName') : t('enterInspectorName');
  const remarkPlaceholder = type === 'final' ? t('enterFinalInspectionRemark') : t('enterInspectionRemark');
  const submitLabel = type === 'final' ? t('submitFinalInspection') : t('submitInspection');
  const defectLabel = type === 'final' ? t('defectReason') : t('defectType');
  const defectPlaceholder = type === 'final' ? t('selectDefectReason') : t('selectDefectType');
  const passLabel = type === 'final' ? t('qualifiedInbound') : tc('qualified');
  const failLabel = type === 'final' ? t('unqualifiedRework') : tc('unqualified');

  const defectValue = (form[defectFieldName] ?? '') as string;

  const toggleItem = (id: string) => {
    const next = form.checkedItems.includes(id)
      ? form.checkedItems.filter((x) => x !== id)
      : [...form.checkedItems, id];
    onChange({ checkedItems: next });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
        {card && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* 流程卡信息 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{tc('product')}:</span>
                    <span className="ml-2 font-medium">{card.product_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('customer')}:</span>
                    <span className="ml-2">{card.customer_name ?? ''}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('specification')}:</span>
                    <span className="ml-2">
                      {card.finished_size} ({card.tolerance})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('planQty')}:</span>
                    <span className="ml-2">
                      {(card.plan_qty ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 检验项目 */}
              <div className="space-y-3">
                <Label>
                  {itemsLabel}
                  {itemsRequired && (
                    <span className="text-red-500 dark:text-red-400">*</span>
                  )}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.id}
                        checked={form.checkedItems.includes(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <label
                        htmlFor={item.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.name}
                        {item.required && (
                          <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 检验结果 */}
              <div className="space-y-3">
                <Label>{resultLabel}</Label>
                <Select
                  value={form.result}
                  onValueChange={(value) => onChange({ result: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={resultPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        {passLabel}
                      </div>
                    </SelectItem>
                    <SelectItem value="fail">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                        {failLabel}
                      </div>
                    </SelectItem>
                    <SelectItem value="concession">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                        {t('concessionAccept')}
                      </div>
                    </SelectItem>
                    <SelectItem value="rework">
                      <div className="flex items-center">
                        <RefreshCw className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                        {t('rework')}
                      </div>
                    </SelectItem>
                    <SelectItem value="scrap">
                      <div className="flex items-center">
                        <Trash2 className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                        {t('scrap')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 数量 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t('qualifiedQty')}</Label>
                  <Input
                    type="number"
                    value={form.qualifiedQty}
                    onChange={(e) =>
                      onChange({ qualifiedQty: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t('defectQty')}</Label>
                  <Input
                    type="number"
                    value={form.defectQty}
                    onChange={(e) =>
                      onChange({ defectQty: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* 不良原因 */}
              {form.defectQty > 0 && (
                <div className="space-y-3">
                  <Label>{defectLabel}</Label>
                  <Select
                    value={defectValue}
                    onValueChange={(value) =>
                      onChange({ [defectFieldName]: value } as Partial<QualityInspectForm>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={defectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {defectOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* final 页专有的额外字段（包装方式等） */}
              {extraFields}

              {/* 检验员 */}
              <div className="space-y-3">
                <Label>{inspectorLabel}</Label>
                {employeeOptions.length > 0 ? (
                  <Select
                    value={form.inspector}
                    onValueChange={(value) => onChange({ inspector: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={inspectorPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map((emp) => (
                        <SelectItem key={emp.employee_no} value={emp.name}>
                          {employeeLabel(emp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={inspectorPlaceholder}
                    value={form.inspector}
                    onChange={(e) => onChange({ inspector: e.target.value })}
                  />
                )}
              </div>

              {/* 备注 */}
              <div className="space-y-3">
                <Label>{tc('remark')}</Label>
                <Textarea
                  placeholder={remarkPlaceholder}
                  value={form.remark}
                  onChange={(e) => onChange({ remark: e.target.value })}
                  rows={3}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {tc('cancel')}
                </Button>
                <Button onClick={onSubmit} disabled={loading}>
                  {loading ? tc('submitting') : submitLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
