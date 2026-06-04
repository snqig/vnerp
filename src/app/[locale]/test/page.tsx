'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  module: string;
  status: 'passed' | 'failed' | 'error';
  message: string;
  data?: any;
  duration: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: string;
}

export default function TestPage() {
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [running, setRunning] = useState(false);

  const loadModules = async () => {
    try {
      const result = await ApiClient.get('/api/test');
      if (result.success) {
        setModules(result.data.modules || []);
      }
    } catch (error) {
      toast.error(t('loadTestModulesFail'));
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const result = await ApiClient.post('/api/test', {
        module: selectedModule || undefined,
      });

      if (result.success) {
        setResults(result.data.results || []);
        setSummary(result.data.summary || null);
        toast.success(t('testComplete') + ` ${result.data.summary?.passRate || '0%'}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t('testFail'));
    } finally {
      setRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge variant="success">{t('passed')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('failed')}</Badge>;
      case 'error':
        return <Badge variant="warning">{t('error')}</Badge>;
      default:
        return <Badge>{t('unknown')}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('systemTest')}</h1>
        <Button onClick={loadModules} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> {t('refreshModules')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('testControl')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">{t('selectModule')}</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allModules')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('allModules')}</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runTests} disabled={running}>
              <Play className={`w-4 h-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
              {running ? t('running') : t('runTests')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>{t('testSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">{t('totalCases')}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-muted-foreground">{t('passed')}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">{t('failed')}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.passRate}</div>
                <div className="text-sm text-muted-foreground">{t('passRate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detailResults')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('module')}</TableHead>
                  <TableHead>{t('testCaseName')}</TableHead>
                  <TableHead>{t('resultInfo')}</TableHead>
                  <TableHead>{t('duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow
                    key={index}
                    className={result.status !== 'passed' ? 'bg-red-50/50' : ''}
                  >
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell>{result.module}</TableCell>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell className="max-w-md truncate" title={result.message}>
                      {result.message}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{result.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
