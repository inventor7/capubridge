import type { CDPClient } from "../client.js";

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

export interface GetDataParams {
  securityOrigin: string;
  databaseName: string;
  objectStoreName: string;
  indexName?: string;
  skipCount: number;
  pageSize: number;
  keyRange?: unknown;
}

export interface GetDataResult {
  records: IDBRecord[];
  hasMore: boolean;
}

export class IDBDomain {
  constructor(private client: CDPClient) {}

  enable(): Promise<unknown> {
    return this.client.send("IndexedDB.enable");
  }

  async discoverDatabases(): Promise<IDBDatabaseInfo[]> {
    const result = await this.client.send<{ result: { result: unknown } }>("Runtime.evaluate", {
      expression: `
          (async () => {
            try {
              const dbs = await indexedDB.databases();
              const details = await Promise.all(dbs.map(async (dbInfo) => {
                return new Promise((resolve, reject) => {
                  const req = indexedDB.open(dbInfo.name);
                  req.onsuccess = () => {
                    const db = req.result;
                    const info = {
                      name: db.name,
                      version: db.version,
                      origin: location.origin,
                      objectStoreNames: Array.from(db.objectStoreNames)
                    };
                    db.close();
                    resolve(info);
                  };
                  req.onerror = () => reject(req.error);
                });
              }));
              return JSON.stringify(details);
            } catch (e) {
              return JSON.stringify({ error: e.message });
            }
          })()
        `,
      awaitPromise: true,
      returnByValue: true,
    });

    const value = (result.result as Record<string, unknown>).value as string;

    const parsed = JSON.parse(value as string);
    if (parsed.error) {
      return [];
    }

    return parsed as IDBDatabaseInfo[];
  }

  async getDatabases(securityOrigin: string): Promise<IDBDatabaseInfo[]> {
    const { databaseNames } = await this.client.send<{ databaseNames: string[] }>(
      "IndexedDB.requestDatabaseNames",
      { securityOrigin },
    );
    return Promise.all(databaseNames.map((name: string) => this.getDatabase(securityOrigin, name)));
  }

  async getDatabase(securityOrigin: string, databaseName: string): Promise<IDBDatabaseInfo> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { databaseWithObjectStores } = await this.client.send<any>("IndexedDB.requestDatabase", {
      securityOrigin,
      databaseName,
    });
    return {
      name: databaseWithObjectStores.name as string,
      version: databaseWithObjectStores.version as number,
      origin: securityOrigin,
      objectStoreNames: (databaseWithObjectStores.objectStores as Array<{ name: string }>).map(
        (s) => s.name,
      ),
    };
  }

  async getData(params: GetDataParams): Promise<GetDataResult> {
    const isLocalForage = params.databaseName === "localforage";

    const expression = `
      (async () => {
        try {
          ${
            isLocalForage
              ? `
          // Special handling for localforage - use its API to get logical keys
          if (typeof localforage !== 'undefined') {
            const lfDriver = localforage.createInstance({
              name: '${params.databaseName}',
              storeName: '${params.objectStoreName}'
            });
            const keys = await lfDriver.keys();
            const allValues = await Promise.all(keys.map(k => lfDriver.getItem(k)));
            
            const skip = ${params.skipCount};
            const take = ${params.pageSize};
            const total = keys.length;
            const hasMore = skip + take < total;
            
            function safeSerialize(val) {
              if (val === undefined) return undefined;
              if (val === null) return null;
              if (val instanceof Date) return { __type: 'Date', value: val.toISOString() };
              if (val instanceof Blob) return { __type: 'Blob', size: val.size, type: val.type };
              if (typeof val === 'bigint') return { __type: 'BigInt', value: val.toString() };
              if (val instanceof ArrayBuffer) return { __type: 'ArrayBuffer', byteLength: val.byteLength };
              if (val instanceof Uint8Array) return { __type: 'Uint8Array', data: Array.from(val) };
              if (val instanceof Set) return { __type: 'Set', values: Array.from(val) };
              if (val instanceof Map) return { __type: 'Map', entries: Array.from(val.entries()) };
              return val;
            }
            
            const records = [];
            for (let i = skip; i < Math.min(skip + take, total); i++) {
              records.push({
                key: safeSerialize(keys[i]),
                value: safeSerialize(allValues[i])
              });
            }
            
            return JSON.stringify({ records, hasMore, total });
          }
          `
              : ""
          }
          
          // Fallback: raw IndexedDB access
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('${params.databaseName}');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          const tx = db.transaction('${params.objectStoreName}', 'readonly');
          const store = tx.objectStore('${params.objectStoreName}');
          const keyPath = store.keyPath;
          const autoIncrement = store.autoIncrement;

          const [allKeys, allValues] = await Promise.all([
            new Promise((resolve, reject) => {
              const req = store.getAllKeys();
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            }),
            new Promise((resolve, reject) => {
              const req = store.getAll();
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            })
          ]);

          db.close();

          const skip = ${params.skipCount};
          const take = ${params.pageSize};
          const total = allKeys.length;
          const hasMore = skip + take < total;

          function safeSerialize(val) {
            if (val === undefined) return undefined;
            if (val === null) return null;
            if (val instanceof Date) return { __type: 'Date', value: val.toISOString() };
            if (val instanceof Blob) return { __type: 'Blob', size: val.size, type: val.type };
            if (typeof val === 'bigint') return { __type: 'BigInt', value: val.toString() };
            if (val instanceof ArrayBuffer) return { __type: 'ArrayBuffer', byteLength: val.byteLength };
            if (val instanceof Uint8Array) return { __type: 'Uint8Array', data: Array.from(val) };
            if (val instanceof Set) return { __type: 'Set', values: Array.from(val) };
            if (val instanceof Map) return { __type: 'Map', entries: Array.from(val.entries()) };
            return val;
          }

          const records = [];
          for (let i = skip; i < Math.min(skip + take, total); i++) {
            let displayKey = allKeys[i];
            if (keyPath && typeof allValues[i] === 'object' && allValues[i] !== null) {
              if (typeof keyPath === 'string') {
                displayKey = allValues[i][keyPath];
              } else if (Array.isArray(keyPath)) {
                displayKey = keyPath.map(k => allValues[i][k]);
              }
            }
            records.push({
              key: safeSerialize(displayKey),
              value: safeSerialize(allValues[i])
            });
          }

          return JSON.stringify({ records, hasMore, total });
        } catch (e) {
          return JSON.stringify({ error: e.message });
        }
      })()
    `;

    const result = await this.client.send<{ result: { result: unknown } }>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    const value = (result.result as Record<string, unknown>).value as string;
    console.log("[IDB] getData result (first 500 chars):", value?.substring(0, 500));

    const parsed = JSON.parse(value as string);
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return {
      records: parsed.records as IDBRecord[],
      hasMore: parsed.hasMore as boolean,
    };
  }
}
