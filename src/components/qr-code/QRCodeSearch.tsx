'use client';

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
import { QRCodeSVG } from 'qrcode.react';
import { Search, ScanLine, List, Filter, X } from 'lucide-react';
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
      toast({ title: '请输入搜索关键词', variant: 'destructive' });
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
          toast({ title: '未找到相关记录' });
        }
      } else {
        toast({ title: '搜索失败', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '搜索失败', variant: 'destructive' });
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
          二维码查询
        </CardTitle>
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
              二维码
            </Button>
            <Button
              variant={searchType === 'ref_no' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('ref_no')}
            >
              单号
            </Button>
            <Button
              variant={searchType === 'batch_no' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('batch_no')}
            >
              批次
            </Button>
            <Button
              variant={searchType === 'material' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('material')}
            >
              <List className="h-4 w-4 mr-1" />
              物料
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchType === 'qr_code'
                ? '输入二维码编码搜索...'
                : searchType === 'ref_no'
                  ? '输入单号搜索...'
                  : searchType === 'batch_no'
                    ? '输入批次号搜索...'
                    : '输入物料名称或编码搜索...'
            }
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {/* 搜索结果 */}
        {showResult && hasSearched && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">选择</TableHead>
                  <TableHead>二维码编码</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>关联单号</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      未找到相关记录
                    </TableCell>
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
                          {QRCodeStatusLabels[record.status]?.label || '未知'}
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
                              追溯
                            </Button>
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
