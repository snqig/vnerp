'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (keyword: string) => void;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  placeholder = '搜索...',
  value: controlledValue,
  onChange,
  onSearch,
  debounceMs = 300,
  className = '',
  inputClassName = '',
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;
  const debouncedValue = useDebounce(currentValue, debounceMs);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevDebouncedRef = useRef(debouncedValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
  }, [isControlled, onChange]);

  const handleClear = useCallback(() => {
    if (!isControlled) {
      setInternalValue('');
    }
    onChange?.('');
    inputRef.current?.focus();
  }, [isControlled, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(currentValue);
    }
  }, [currentValue, onSearch]);

  useEffect(() => {
    if (prevDebouncedRef.current !== debouncedValue) {
      prevDebouncedRef.current = debouncedValue;
      onSearch?.(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`pl-10 pr-8 ${inputClassName}`}
        autoComplete="off"
      />
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
