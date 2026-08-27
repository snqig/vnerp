'use client';

import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

export function useOfflineScanSync(
  onSync?: (
    items: Array<{ qrCode: string; scanType: string; payload: Record<string, unknown> }>
  ) => Promise<void>
) {
  const { isOnline } = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const { getAllPendingScans } = await import('@/lib/offline-scan-queue');
      const items = await getAllPendingScans();
      setPendingCount(items.filter((i) => i.status === 'pending' || i.status === 'failed').length);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const syncPending = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const { getAllPendingScans, markScanDone, markScanFailed, removeScan } =
        await import('@/lib/offline-scan-queue');
      const pending = await getAllPendingScans();
      const items = pending.filter((i) => i.status === 'pending' || i.status === 'failed');

      for (const item of items) {
        try {
          if (onSync) {
            await onSync([{ qrCode: item.qrCode, scanType: item.scanType, payload: item.payload }]);
          }
          if (item.id !== undefined) {
            await markScanDone(item.id);
          }
        } catch (err) {
          if (item.id !== undefined) {
            await markScanFailed(item.id, (err as Error).message);
          }
        }
      }
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, onSync, refreshCount]);

  return { isOnline, syncing, pendingCount, syncPending, refreshCount };
}
