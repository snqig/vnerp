const CACHE_NAME = 'dcprint-offline-scan-v1';
const SYNC_TAG = 'sync-scans';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(doSync());
  }
});

async function doSync() {
  const db = await openDB();
  const pending = await getAllPending(db);

  for (const item of pending) {
    try {
      const resp = await fetch('/api/trace/qr/scan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: [item] }),
      });

      if (resp.ok) {
        await markDone(db, item.id);
      } else {
        await markFailed(db, item.id, `HTTP ${resp.status}`);
      }
    } catch (err) {
      await markFailed(db, item.id, err instanceof Error ? err.message : String(err));
    }
  }
}

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('dcprint-offline-scan', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-scans')) {
        const store = db.createObjectStore('pending-scans', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db: IDBDatabase) {
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction('pending-scans', 'readonly');
    const store = tx.objectStore('pending-scans');
    const results: any[] = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (cursor.value.status === 'pending' || cursor.value.status === 'failed') {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

function markDone(db: IDBDatabase, id: number) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pending-scans', 'readwrite');
    const store = tx.objectStore('pending-scans');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.status = 'done';
        rec.updatedAt = Date.now();
        store.put(rec);
      }
      tx.oncomplete = () => resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function markFailed(db: IDBDatabase, id: number, error: string) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pending-scans', 'readwrite');
    const store = tx.objectStore('pending-scans');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) {
        rec.attempts += 1;
        rec.error = error;
        rec.updatedAt = Date.now();
        rec.status = rec.attempts >= (rec.maxAttempts ?? 3) ? 'failed' : 'pending';
        store.put(rec);
      }
      tx.oncomplete = () => resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
