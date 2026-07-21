'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SyncRecord {
  id: number;
  syncType: string;
  status: 'synced' | 'pending' | 'failed';
  syncTime: string;
  recordCount: number;
  errorMessage?: string;
}

const mockSyncHistory: SyncRecord[] = [
  { id: 1, syncType: 'pieceWork', status: 'synced', syncTime: '2024-03-15 10:30:00', recordCount: 156 },
  { id: 2, syncType: 'pieceWork', status: 'synced', syncTime: '2024-03-15 09:00:00', recordCount: 142 },
  { id: 3, syncType: 'quality', status: 'synced', syncTime: '2024-03-15 08:30:00', recordCount: 89 },
  { id: 4, syncType: 'pieceWork', status: 'failed', syncTime: '2024-03-14 17:00:00', recordCount: 0, errorMessage: '连接超时' },
  { id: 5, syncType: 'quality', status: 'pending', syncTime: '2024-03-14 16:00:00', recordCount: 0 },
];

const syncTypeLabels: Record<string, string> = {
  pieceWork: 'syncTypePieceWork',
  quality: 'syncTypeQuality',
};

const typeIcons: Record<string, React.ComponentType<any>> = {
  pieceWork: Database,
  quality: CheckCircle2,
};

const statusConfig: Record<string, { label: string; className: string }> = {
  synced: { label: 'syncStatusSynced', className: 'bg-green-100 text-green-700' },
  pending: { label: 'syncStatusPending', className: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'syncStatusFailed', className: 'bg-red-100 text-red-700' },
};

export default function MesSyncPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('-');
  const [pieceWorkCount, setPieceWorkCount] = useState(0);
  const [qualityCount, setQualityCount] = useState(0);

  const fetchSyncData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/mes-sync/piece-work');
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        setRecords(list);
        const synced = list.filter((r: SyncRecord) => r.status === 'synced');
        if (synced.length > 0) {
          setLastSyncTime(synced[0].syncTime);
        }
        setPieceWorkCount(list.filter((r: SyncRecord) => r.syncType === 'pieceWork').length);
        setQualityCount(list.filter((r: SyncRecord) => r.syncType === 'quality').length);
      } else {
        setRecords(mockSyncHistory);
      }
    } catch {
      setRecords(mockSyncHistory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSyncData(); }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await authFetch('/api/hr/mes-sync/sync', { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('syncSuccess') || '同步成功');
        fetchSyncData();
      } else {
        toast.error(json.message || t('syncFailed') || '同步失败');
      }
    } catch {
      toast.error(t('syncFailed') || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const recentRecords = records.slice(0, 50);

  return (
    <MainLayout title={t('mesSync')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('mesSync')}</h1>
          </div>
          <Button onClick={handleManualSync} disabled={syncing} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('syncing') : t('manualSync')}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('pieceWorkSync')}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{pieceWorkCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('syncRecords')}</p>
                </div>
                <Database className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('qualitySync')}</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{qualityCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('syncRecords')}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('lastSyncTime')}</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">{lastSyncTime}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('lastSyncDesc')}</p>
                </div>
                <Clock className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('syncHistory')}
              <Badge variant="secondary" className="ml-2">{t('latest50')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('syncType')}</TableHead>
                  <TableHead>{t('syncTime')}</TableHead>
                  <TableHead className="text-right">{t('recordCount')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('errorMessage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRecords.map((r) => {
                  const TypeIcon = typeIcons[r.syncType] || Database;
                  const statusConf = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{t(syncTypeLabels[r.syncType] || r.syncType)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.syncTime}</TableCell>
                      <TableCell className="text-right">{r.recordCount}</TableCell>
                      <TableCell>
                        <Badge className={statusConf.className}>{t(statusConf.label)}</Badge>
                      </TableCell>
                      <TableCell className="text-red-500 text-sm">{r.errorMessage || '-'}</TableCell>
                    </TableRow>
                  );
                })}
                {recentRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {loading ? tc('loading') : t('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
