'use client';
import { useTranslations } from 'next-intl';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ScanLine, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeTypeLabels, QRCodeStatusLabels } from './qr-code-types';
import type { QRCodeRecord } from './qr-code-types';

interface QRCodeSearchProps {
  onSelect?: (qrCode: string, record: QRCodeRecord) => void;
  onTrace?: (qrCode: string) => void;
  showResult?: boolean;
  singleSelect?: boolean;
  className?: string;
}

export function QRCodeSearch({
  onSelect,
  onTrace,
  showResult = true,
  singleSelect = false,
  className = '',
}: QRCodeSearchProps) {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  const { toast } = useToast();
  const [searchType, setSearchType] = useState<'qr_code' | 'ref_no' | 'batch_no' | 'material'>(
    'qr_code'
  );
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<QRCodeRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({ title: ts('k_10n2r0s'), variant: 'destructive' });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSelectedQRCode(null);

    try {
      const params = new URLSearchParams();

      switch (searchType) {
        case 'qr_code':
          params.set('qr_code', keyword);
          break;
        case 'ref_no':
          params.set('ref_no', keyword);
          break;
        case 'batch_no':
          params.set('batch_no', keyword);
          break;
        case 'material':
          params.set('keyword', keyword);
          break;
      }

      const res = await fetch('/api/qrcode?' + params);
      const result = await res.json();

      if (result.success) {
        setResults(result.data?.list || []);
        if (result.data?.list?.length === 0) {
          toast({ title: ts('k_1rxn25') });
        }
      } else {
        toast({ title: ts('k_2be1oh'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_2be1oh'), variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (record: QRCodeRecord) => {
    if (singleSelect) {
      setSelectedQRCode(record.qr_code);
    }
    onSelect?.(record.qr_code, record);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-5 w-5" />
          {ts('k_1jcxd0j')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索区域 */}
        <div className="flex gap-2">
          <div className="flex gap-1">
            <Button
              variant={searchType === 'qr_code' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('qr_code')}
            >
              <ScanLine className="h-4 w-4 mr-1" />
              {ts('k_1srkox0')}</Button>
            <Button
              variant={searchType === 'ref_no' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('ref_no')}
            >
              {ts('k_iu45vp')}</Button>
            <Button
              variant={searchType === 'batch_no' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('batch_no')}
            >
              {tc('batch')}</Button>
            <Button
              variant={searchType === 'material' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('material')}
            >
              <List className="h-4 w-4 mr-1" />
              {ts('k_1h2cbqf')}</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchType === 'qr_code'
                ? ts('k_1gobg8n')
                : searchType === 'ref_no'
                  ? ts('k_3xywfb')
                  : searchType === 'batch_no'
                    ? ts('k_15n76ko')
                    : ts('k_127s9rb')
            }
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? ts('k_ram034') : ts('k_367f3v')}
          </Button>
        </div>

        {/* 搜索结果 */}
        {showResult && hasSearched && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{ts('k_qlswjb')}</TableHead>
                  <TableHead>{ts('k_7d0emt')}</TableHead>
                  <TableHead>{ts('k_anh4cj')}</TableHead>
                  <TableHead>{ts('k_15evjra')}</TableHead>
                  <TableHead>{ts('k_a60ciy')}</TableHead>
                  <TableHead>{ts('k_1i54xuo')}</TableHead>
                  <TableHead>{ts('k_1ccx4t4')}</TableHead>
                  <TableHead>{ts('k_501w24')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {ts('k_1rxn25')}</TableCell>
                  </TableRow>
                ) : (
                  results.map((record) => (
                    <TableRow
                      key={record.id}
                      className={selectedQRCode === record.qr_code ? 'bg-muted' : ''}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name="qrcode-select"
                          checked={selectedQRCode === record.qr_code}
                          onChange={() => handleSelect(record)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.qr_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {QRCodeTypeLabels[record.qr_type] || record.qr_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.ref_no || '-'}</TableCell>
                      <TableCell>{record.material_name || '-'}</TableCell>
                      <TableCell>
                        {record.quantity} {record.unit || ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={QRCodeStatusLabels[record.status]?.variant}>
                          {QRCodeStatusLabels[record.status]?.label || ts('k_1lpnuh4')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {onTrace && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onTrace(record.qr_code)}
                            >
                              {ts('k_bb05tx')}</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
