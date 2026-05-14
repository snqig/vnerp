'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Printer, Plus, Edit, Trash2, Settings, CheckCircle2, Clock, XCircle } from 'lucide-react';

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'laser' | 'inkjet';
  model?: string;
  ip?: string;
  defaultPaperSize: string;
  isDefault: boolean;
  isActive: boolean;
}

export const DEFAULT_PRINTERS: PrinterConfig[] = [
  {
    id: 'printer-1',
    name: '热敏打印机-1号',
    type: 'thermal',
    model: 'Zebra ZD420',
    ip: '192.168.1.100',
    defaultPaperSize: '60x40',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'printer-2',
    name: '热敏打印机-2号',
    type: 'thermal',
    model: 'Zebra ZD420',
    ip: '192.168.1.101',
    defaultPaperSize: '80x50',
    isDefault: false,
    isActive: true,
  },
];

export interface PrintQueueItem {
  id: string;
  printerId: string;
  labelType: string;
  labelSpec: string;
  copies: number;
  status: 'pending' | 'printing' | 'success' | 'failed';
  createdAt: string;
  error?: string;
}

export const PrinterManagement: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterConfig[]>(DEFAULT_PRINTERS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [queue, setQueue] = useState<PrintQueueItem[]>([]);

  const togglePrinterActive = (id: string) => {
    setPrinters((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  const setDefaultPrinter = (id: string) => {
    setPrinters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isDefault: true } : { ...p, isDefault: false }))
    );
  };

  const statusIcon = (status: PrintQueueItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'printing':
        return (
          <div className="animate-pulse">
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
        );
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              打印机配置
            </CardTitle>
            <CardDescription>管理和配置打印设备</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                添加打印机
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加打印机</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>打印机名称</Label>
                  <Input placeholder="例如：车间1号打印机" />
                </div>
                <div className="space-y-2">
                  <Label>打印机类型</Label>
                  <Select defaultValue="thermal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">热敏打印机</SelectItem>
                      <SelectItem value="laser">激光打印机</SelectItem>
                      <SelectItem value="inkjet">喷墨打印机</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>型号（可选）</Label>
                  <Input placeholder="Zebra ZD420" />
                </div>
                <div className="space-y-2">
                  <Label>IP地址（可选）</Label>
                  <Input placeholder="192.168.1.100" />
                </div>
                <div className="space-y-2">
                  <Label>默认纸张尺寸</Label>
                  <Select defaultValue="60x40">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60x40">60mm x 40mm</SelectItem>
                      <SelectItem value="80x50">80mm x 50mm</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>设为默认打印机</Label>
                  <Switch />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg divide-y">
            {printers.map((printer) => (
              <div key={printer.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{printer.name}</span>
                      {printer.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          默认
                        </Badge>
                      )}
                      <Badge
                        variant={printer.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {printer.isActive ? '启用' : '禁用'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {printer.type === 'thermal'
                        ? '热敏'
                        : printer.type === 'laser'
                          ? '激光'
                          : '喷墨'}
                      打印机
                      {printer.model && ` · ${printer.model}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!printer.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultPrinter(printer.id)}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePrinterActive(printer.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            打印队列
          </CardTitle>
          <CardDescription>查看和管理打印任务</CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无打印任务</div>
          ) : (
            <div className="border rounded-lg divide-y">
              {queue.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(item.status)}
                    <div>
                      <div className="font-medium text-sm">{item.labelType}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.copies}份 · {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.status === 'success'
                          ? 'default'
                          : item.status === 'printing'
                            ? 'outline'
                            : item.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                      }
                    >
                      {item.status === 'pending'
                        ? '等待中'
                        : item.status === 'printing'
                          ? '打印中'
                          : item.status === 'success'
                            ? '成功'
                            : '失败'}
                    </Badge>
                    {(item.status === 'pending' || item.status === 'failed') && (
                      <Button variant="ghost" size="sm">
                        重试
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
