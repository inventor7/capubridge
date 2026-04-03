export interface IDBDatabaseInfo {
  name: string;
  version: number;
  objectStoreNames: string[];
  origin: string;
}

export interface IDBObjectStoreInfo {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IDBIndexInfo[];
  recordCount?: number;
  estimatedSizeBytes?: number;
}

export interface IDBIndexInfo {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface IDBRecord {
  key: IDBValidKey;
  value: unknown;
}

export interface StorageSnapshot {
  id: string;
  label: string;
  createdAt: Date;
  targetOrigin: string;
  dbName: string;
  storeName: string;
  records: IDBRecord[];
}

export interface SeedProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  targetOrigin: string;
  stores: {
    dbName: string;
    storeName: string;
    records: IDBRecord[];
  }[];
}

export interface StorageQuota {
  usage: number;
  quota: number;
  usageDetails: {
    indexedDB?: number;
    caches?: number;
    fileSystem?: number;
  };
  persisted: boolean;
}
