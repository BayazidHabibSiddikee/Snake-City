import type {
  CrashJournalSnapshot,
  PortalCollection,
  PortalRecord,
  PortalRecordType,
} from './RetentionPolicy';

const DB_NAME = 'SERPENT_PEAKS_PORTAL_MEMORY_DB';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_COLLECTIONS = 'collections';
const STORE_META = 'meta';
const CRASH_JOURNAL_LS_KEY = 'SERPENT_PEAKS_PORTAL_CRASH_JOURNAL_V1';

/**
 * Durable local repository for Portal Memory backed by IndexedDB, with a transparent
 * in-memory fallback (for headless tests or private windows) and synchronous localStorage
 * crash-journal mirroring so browser crashes can reliably restore lost sessions.
 */
export class MemoryRepository {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memRecords = new Map<string, PortalRecord>();
  private memCollections = new Map<string, PortalCollection>();
  private memCrashJournal: CrashJournalSnapshot | null = null;

  private openDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === 'undefined') {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_RECORDS)) {
            const store = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
            store.createIndex('by_type', 'type', { unique: false });
            store.createIndex('by_url', 'url', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
            db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async getAllRecords(): Promise<PortalRecord[]> {
    const db = await this.openDb();
    if (!db) {
      return Array.from(this.memRecords.values()).map((r) => ({ ...r, collectionIds: [...r.collectionIds] }));
    }
    return new Promise<PortalRecord[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_RECORDS, 'readonly');
        const req = tx.objectStore(STORE_RECORDS).getAll();
        req.onsuccess = () => {
          const rows = Array.isArray(req.result) ? (req.result as PortalRecord[]) : [];
          this.memRecords.clear();
          for (const row of rows) {
            this.memRecords.set(row.id, row);
          }
          resolve(rows);
        };
        req.onerror = () => resolve(Array.from(this.memRecords.values()));
      } catch {
        resolve(Array.from(this.memRecords.values()));
      }
    });
  }

  public async putRecord(record: PortalRecord): Promise<void> {
    const clone: PortalRecord = { ...record, collectionIds: [...record.collectionIds] };
    this.memRecords.set(clone.id, clone);
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_RECORDS, 'readwrite');
        tx.objectStore(STORE_RECORDS).put(clone);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async putRecordsBulk(records: readonly PortalRecord[]): Promise<void> {
    for (const r of records) {
      this.memRecords.set(r.id, { ...r, collectionIds: [...r.collectionIds] });
    }
    const db = await this.openDb();
    if (!db || records.length === 0) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_RECORDS, 'readwrite');
        const store = tx.objectStore(STORE_RECORDS);
        for (const r of records) {
          store.put({ ...r, collectionIds: [...r.collectionIds] });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async deleteRecord(id: string): Promise<boolean> {
    const existed = this.memRecords.delete(id);
    const db = await this.openDb();
    if (!db) return existed;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_RECORDS, 'readwrite');
        tx.objectStore(STORE_RECORDS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return true;
  }

  public async deleteRecordsByType(type: PortalRecordType): Promise<number> {
    const idsToDelete: string[] = [];
    this.memRecords.forEach((rec, id) => {
      if (rec.type === type) idsToDelete.push(id);
    });
    for (const id of idsToDelete) {
      this.memRecords.delete(id);
    }
    const db = await this.openDb();
    if (!db) return idsToDelete.length;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_RECORDS, 'readwrite');
        const store = tx.objectStore(STORE_RECORDS);
        for (const id of idsToDelete) {
          store.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return idsToDelete.length;
  }

  public async getAllCollections(): Promise<PortalCollection[]> {
    const db = await this.openDb();
    if (!db) {
      return Array.from(this.memCollections.values()).map((c) => ({ ...c, portalUrls: [...c.portalUrls] }));
    }
    return new Promise<PortalCollection[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
        const req = tx.objectStore(STORE_COLLECTIONS).getAll();
        req.onsuccess = () => {
          const rows = Array.isArray(req.result) ? (req.result as PortalCollection[]) : [];
          this.memCollections.clear();
          for (const row of rows) {
            this.memCollections.set(row.id, row);
          }
          resolve(rows);
        };
        req.onerror = () => resolve(Array.from(this.memCollections.values()));
      } catch {
        resolve(Array.from(this.memCollections.values()));
      }
    });
  }

  public async putCollection(collection: PortalCollection): Promise<void> {
    const clone: PortalCollection = { ...collection, portalUrls: [...collection.portalUrls] };
    this.memCollections.set(clone.id, clone);
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
        tx.objectStore(STORE_COLLECTIONS).put(clone);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async deleteCollection(id: string): Promise<boolean> {
    const existed = this.memCollections.delete(id);
    const db = await this.openDb();
    if (!db) return existed;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
        tx.objectStore(STORE_COLLECTIONS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return true;
  }

  public writeCrashJournalSync(snapshot: CrashJournalSnapshot): void {
    this.memCrashJournal = {
      ...snapshot,
      activeTabs: snapshot.activeTabs.map((t) => ({ ...t })),
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CRASH_JOURNAL_LS_KEY, JSON.stringify(this.memCrashJournal));
      }
    } catch {
      // ignore storage quota errors
    }
    void this.writeCrashJournalAsync(this.memCrashJournal);
  }

  private async writeCrashJournalAsync(snapshot: CrashJournalSnapshot): Promise<void> {
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).put({ key: 'crash_journal', value: snapshot });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async readCrashJournal(): Promise<CrashJournalSnapshot | null> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CRASH_JOURNAL_LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<CrashJournalSnapshot>;
          if (parsed && typeof parsed.sessionId === 'string' && Array.isArray(parsed.activeTabs)) {
            this.memCrashJournal = {
              sessionId: parsed.sessionId,
              updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
              cleanShutdown: Boolean(parsed.cleanShutdown),
              activeTabs: parsed.activeTabs,
            };
            return this.memCrashJournal;
          }
        }
      }
    } catch {
      // ignore parse errors
    }

    const db = await this.openDb();
    if (!db) return this.memCrashJournal;
    return new Promise<CrashJournalSnapshot | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get('crash_journal');
        req.onsuccess = () => {
          const entry = req.result as { key: string; value?: CrashJournalSnapshot } | undefined;
          resolve(entry?.value ?? this.memCrashJournal);
        };
        req.onerror = () => resolve(this.memCrashJournal);
      } catch {
        resolve(this.memCrashJournal);
      }
    });
  }
}
