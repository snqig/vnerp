'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import type { Employee } from '../../types';

// 批量打印卡片组件
function BatchPrintCard({ employee, index }: { employee: Employee; index: number }) {
  const tc = useTranslations('Common');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const generateQR = async () => {
      const queryUrl = `${window.location.origin}/hr/employee/query?id=${employee.id}`;
      const url = await QRCode.toDataURL(queryUrl, { width: 100, margin: 1 });
      setQrUrl(url);
    };
    generateQR();
  }, [employee.id]);

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start gap-4">
        <span className="text-sm text-muted-foreground">{tc("serialNo")} {index + 1}</span>
        <span className="font-medium">{employee.name}</span>
      </div>
      <div className="flex gap-4">
        <div className="w-20 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
          {employee.photo ? (
            <img
              src={employee.photo}
              alt={employee.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <UserCircle className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 text-sm space-y-1">
          <div>{tc("employeeNo")}: {employee.employee_no}</div>
          <div>{tc("department")}: {employee.dept_name}</div>
          <div>{tc("position")}: {employee.position || '-'}</div>
        </div>
        {qrUrl && (
          <div className="w-16 h-16">
            <img src={qrUrl} alt={tc("qrCode")} className="w-full h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

interface BatchPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selectedEmployees: number[];
  onPrintAll: () => void;
}

export function BatchPrintDialog({
  open,
  onOpenChange,
  employees,
  selectedEmployees,
  onPrintAll,
}: BatchPrintDialogProps) {
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto" resizable>
        <DialogHeader>
          <DialogTitle>{tc("batchPrintTitle")}</DialogTitle>
          <DialogDescription>{tc("batchPrintDesc", { count: selectedEmployees.length })}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            {employees
              .filter((emp) => selectedEmployees.includes(emp.id))
              .map((emp, index) => (
                <BatchPrintCard key={emp.id} employee={emp} index={index} />
              ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={onPrintAll} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            {tc("printAll")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
