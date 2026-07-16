// src/components/ui/currency-select.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/auth-fetch';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

interface CurrencySelectProps {
  value: string;
  onChange: (value: string, currency?: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencySelect({ value, onChange, placeholder, disabled }: CurrencySelectProps) {
  const t = useTranslations('Common');
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadCurrencies = async () => {
      try {
        const response = await authFetch('/api/system/currency?active=true');
        const result = await response.json();
        if (mounted && result.success && Array.isArray(result.data)) {
          setCurrencies(result.data);
        }
      } catch {
        // 降级：使用默认币种列表
        if (mounted) {
          setCurrencies([
            { id: 1, code: 'CNY', name: 'CNY', symbol: '¥', decimal_places: 2 },
            { id: 2, code: 'USD', name: 'USD', symbol: '$', decimal_places: 2 },
            { id: 3, code: 'VND', name: 'VND', symbol: '₫', decimal_places: 0 },
          ]);
        }
      }
    };
    loadCurrencies();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const currency = currencies.find((c) => c.code === v);
        onChange(v, currency);
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t('selectCurrency') ?? '选择币种'} />
      </SelectTrigger>
      <SelectContent>
        {currencies.length === 0 ? (
          <SelectItem value="_empty" disabled>
            {t('noCurrency') || '暂无币种'}
          </SelectItem>
        ) : (
          currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code} {currency.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
