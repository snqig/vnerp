'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Upload, X, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Employee, Department, Role } from '../../types';

/* eslint-disable @next/next/no-img-element */

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: Partial<Employee>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Employee>>>;
  departments: Department[];
  roles: Role[];
  uploadingPhoto: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemovePhoto: () => void;
  onSave: () => Promise<void>;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  departments,
  roles,
  uploadingPhoto,
  fileInputRef,
  onPhotoUpload,
  onRemovePhoto,
  onSave,
}: EmployeeFormDialogProps) {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle>{editing ? t('editEmployee') : t('addEmployeeTitle')}</DialogTitle>
          <DialogDescription>
            {editing ? t('editEmployeeDesc') : t('addEmployeeDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {/* 照片上传区域 */}
          <div className="col-span-1 row-span-4">
            <Label className="mb-2 block">{tc('employeePhoto')}</Label>
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={onPhotoUpload}
                className="hidden"
              />
              {form.photo ? (
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                  <img
                    src={form.photo}
                    alt={tc('employeePhoto')}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={onRemovePhoto}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title={tc('deletePhoto')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full aspect-[3/4] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 dark:hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500">{tc('uploadPhoto')}</span>
                      <span className="text-xs text-gray-400">{tc('supportJpgPng')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tc('employeeNo')}</Label>
            <Input
              value={form.employee_no || ''}
              onChange={(e) => setForm({ ...form, employee_no: e.target.value })}
              placeholder={tc('autoGenerate')}
              readOnly={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {tc('name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={tc('enterName')}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {tc('gender')} <span className="text-gray-400 text-xs">{tc('idCardAuto')}</span>
            </Label>
            <Select
              value={form.gender?.toString() || '1'}
              onValueChange={(v) => setForm({ ...form, gender: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{tc('maleShort')}</SelectItem>
                <SelectItem value="2">{tc('femaleShort')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc('contact')}</Label>
            <Input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={tc('enterPhone')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('email')}</Label>
            <Input
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={tc('enterEmail')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('department')}</Label>
            <Select
              value={form.dept_id?.toString() || ''}
              onValueChange={(v) => setForm({ ...form, dept_id: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('selectDepartment')} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.dept_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc('position')}</Label>
            <Input
              value={form.position || ''}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder={tc('enterPosition')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('role')}</Label>
            <Select
              value={form.role_id?.toString() || ''}
              onValueChange={(v) => setForm({ ...form, role_id: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc('entryDate')}</Label>
            <Input
              type="date"
              value={form.entry_date || ''}
              onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('status')}</Label>
            <Select
              value={form.status?.toString() || '1'}
              onValueChange={(v) => setForm({ ...form, status: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{tc('statusActive')}</SelectItem>
                <SelectItem value="2">{tc('statusProbation')}</SelectItem>
                <SelectItem value="3">{tc('statusResigned')}</SelectItem>
                <SelectItem value="0">{tc('statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              {tc('age')} <span className="text-gray-400 text-xs">{tc('autoCalculate')}</span>
            </Label>
            <Input
              type="number"
              value={form.age || ''}
              readOnly
              className="bg-gray-50"
              placeholder={tc('autoCalculate')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('section')}</Label>
            <Input
              value={form.section || ''}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder={tc('enterSection')}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {tc('birthDate')} <span className="text-gray-400 text-xs">{tc('autoCalculate')}</span>
            </Label>
            <Input type="date" value={form.birth_date || ''} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>{tc('idCard')}</Label>
            <Input
              value={form.id_card || ''}
              onChange={(e) => {
                const idCard = e.target.value.replace(/[^0-9Xx]/g, '');
                let birthDate = '';
                let age = undefined;
                let gender = form.gender;
                if (idCard.length === 18) {
                  const year = idCard.substring(6, 10);
                  const month = idCard.substring(10, 12);
                  const day = idCard.substring(12, 14);
                  birthDate = `${year}-${month}-${day}`;
                  const birthYear = parseInt(year);
                  const currentYear = new Date().getFullYear();
                  age = currentYear - birthYear;
                  const genderDigit = parseInt(idCard.substring(16, 17));
                  gender = genderDigit % 2 === 1 ? 1 : 2;
                } else if (idCard.length === 15) {
                  const year = '19' + idCard.substring(6, 8);
                  const month = idCard.substring(8, 10);
                  const day = idCard.substring(10, 12);
                  birthDate = `${year}-${month}-${day}`;
                  const birthYear = parseInt(year);
                  const currentYear = new Date().getFullYear();
                  age = currentYear - birthYear;
                  const genderDigit = parseInt(idCard.substring(14, 15));
                  gender = genderDigit % 2 === 1 ? 1 : 2;
                }
                setForm({
                  ...form,
                  id_card: idCard,
                  birth_date: birthDate || form.birth_date,
                  age: age || form.age,
                  gender: gender,
                });
              }}
              placeholder={tc('enterIdCard')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('nativePlace')}</Label>
            <Input
              value={form.native_place || ''}
              onChange={(e) => setForm({ ...form, native_place: e.target.value })}
              placeholder={tc('enterNativePlace')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('education')}</Label>
            <Select
              value={form.education || ''}
              onValueChange={(v) => setForm({ ...form, education: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={tc('selectEducation')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="初中">{tc('juniorHigh')}</SelectItem>
                <SelectItem value="中专">{tc('technical')}</SelectItem>
                <SelectItem value="高中">{tc('highSchool')}</SelectItem>
                <SelectItem value="大专">{tc('associate')}</SelectItem>
                <SelectItem value="本科">{tc('bachelor')}</SelectItem>
                <SelectItem value="硕士">{tc('master')}</SelectItem>
                <SelectItem value="博士">{tc('doctor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc('homeAddress')}</Label>
            <Input
              value={form.home_address || ''}
              onChange={(e) => setForm({ ...form, home_address: e.target.value })}
              placeholder={tc('enterHomeAddress')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('currentAddress')}</Label>
            <Input
              value={form.current_address || ''}
              onChange={(e) => setForm({ ...form, current_address: e.target.value })}
              placeholder={tc('enterCurrentAddress')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700">
            {editing ? t('update') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
