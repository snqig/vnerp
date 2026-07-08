'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import type { Supplier } from '../../types';

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelSupplier: string;
  setLabelSupplier: React.Dispatch<React.SetStateAction<string>>;
  suppliers: Supplier[];
}

export function GenerateDialog({
  open,
  onOpenChange,
  labelSupplier,
  setLabelSupplier,
  suppliers,
}: GenerateDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" resizable>
        <DialogHeader>
          <DialogTitle>{t('generateLabel')}</DialogTitle>
          <DialogDescription>{t('generateLabelDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="labelMaterialName">{tc('materialName')}</Label>
            <Input id="labelMaterialName" placeholder={t('enterMaterialName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labelSpecification">{tc('specification')}</Label>
            <Input id="labelSpecification" placeholder={t('specExample')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labelSupplier">{tc('supplier')}</Label>
            <Select value={labelSupplier} onValueChange={setLabelSupplier}>
              <SelectTrigger id="labelSupplier">
                <SelectValue placeholder={t('selectSupplier')} />
              </SelectTrigger>
              <SelectContent>
                {suppliers
                  .filter((s: any) => s.status !== 0 && s.status !== 'inactive')
                  .map((s: any) => (
                    <SelectItem key={s.id} value={s.name || s.supplier_name}>
                      {s.name || s.supplier_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t('generate')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
