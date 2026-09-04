'use client';
import { useTranslations } from 'next-intl';
export default function T() {
  const tc = useTranslations('Common');
  return (
    <Select value="原材料">原材料</Select>
  );
}
