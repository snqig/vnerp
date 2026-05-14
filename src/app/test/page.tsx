'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      toast.error('加载测试模块失败');
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
        toast.success(`测试完成：通过率 ${result.data.summary?.passRate || '0%'}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('测试执行失败');
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge variant="success">通过</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      case 'error':
        return <Badge variant="warning">错误</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">系统测试验证</h1>
        <Button onClick={loadModules} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> 刷新模块
        </Button>
      </div>

      {/* 测试控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle>测试控制</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">选择模块（留空执行全部）</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue placeholder="全部模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部模块</SelectItem>
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
              {running ? '执行中...' : '执行测试'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 测试结果摘要 */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>测试结果摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">总用例数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-muted-foreground">通过</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">失败</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.passRate}</div>
                <div className="text-sm text-muted-foreground">通过率</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细结果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>详细结果</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>用例名称</TableHead>
                  <TableHead>结果信息</TableHead>
                  <TableHead>耗时</TableHead>
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
