// src/components/ui/currency-select.tsx
'use client';

import { useEffect, useState } from 'react';
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

export function CurrencySelect({
  value,
  onChange,
  placeholder = '选择币种',
  disabled,
}: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await authFetch('/api/system/currency?active=true');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setCurrencies(result.data);
        }
      } catch {
        // 降级：使用默认币种列表
        setCurrencies([
          { id: 1, code: 'CNY', name: '人民币', symbol: '¥', decimal_places: 2 },
          { id: 2, code: 'USD', name: '美元', symbol: '$', decimal_places: 2 },
          { id: 3, code: 'VND', name: '越南盾', symbol: '₫', decimal_places: 0 },
        ]);
      }
    };
    loadCurrencies();
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
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} {currency.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
