// src/components/ui/money-display.tsx
'use client';

import { formatMoney, formatAmount } from '@/lib/money-format';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  baseAmount?: number;
  baseCurrency?: string;
  showSymbol?: boolean;
  className?: string;
}

export function MoneyDisplay({
  amount,
  currency = 'CNY',
  baseAmount,
  baseCurrency,
  showSymbol = true,
  className,
}: MoneyDisplayProps) {
  const original = showSymbol ? formatMoney(amount, currency) : formatAmount(amount, currency);

  // 同币种或无本位币金额时，单行显示
  if (baseAmount === undefined || currency === baseCurrency) {
    return <span className={className}>{original}</span>;
  }

  // 双行显示：原币 + 本位币
  const base = showSymbol
    ? formatMoney(baseAmount, baseCurrency)
    : formatAmount(baseAmount, baseCurrency);

  return (
    <span className={className}>
      <span className="font-medium">{original}</span>
      <span className="text-xs text-muted-foreground ml-1">(≈{base})</span>
    </span>
  );
}
