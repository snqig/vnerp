'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, X, Search } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

interface AdvancedSearchProps {
  fields: FilterField[];
  onSearch: (filters: Record<string, string>) => void;
  onReset: () => void;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  className?: string;
}

export function AdvancedSearch({
  fields,
  onSearch,
  onReset,
  activeFilters = [],
  onRemoveFilter,
  className = '',
}: AdvancedSearchProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(filters);
    setOpen(false);
  }, [filters, onSearch]);

  const handleReset = useCallback(() => {
    setFilters({});
    onReset();
  }, [onReset]);

  const activeCount = activeFilters.length;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {tc('text_k24nth')}
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{tc('text_g5ph6r')}</h4>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleReset}>
                {tc('text_phz5')}
              </Button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  {field.type === 'text' && (
                    <Input
                      placeholder={field.placeholder || `输入${field.label}`}
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  )}
                  {field.type === 'select' && field.options && (
                    <Select
                      value={filters[field.key] || ''}
                      onValueChange={(v) => handleFieldChange(field.key, v === '__all__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={field.placeholder || `选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">{tc('text_en40')}</SelectItem>
                        {field.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === 'date' && (
                    <Input
                      type="date"
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                {tc('text_ev02')}
              </Button>
              <Button size="sm" onClick={handleSearch}>
                <Search className="h-3 w-3 mr-1" />
                {tc('text_hpqe')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 活跃筛选标签 */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 text-xs pr-1">
              {filter.label}: {filter.displayValue}
              <button
                onClick={() => onRemoveFilter?.(filter.key)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={handleReset}
          >
            {tc('text_ehzovz')}
          </Button>
        </div>
      )}
    </div>
  );
}
