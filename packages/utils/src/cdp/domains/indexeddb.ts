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

// CDP returns remote object representations — we flatten them to plain JS values
function deserializeRemoteObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  const o = obj as Record<string, unknown>;

  if (o.type === "undefined") return undefined;
  if (o.type === "number") return o.value;
  if (o.type === "string") return o.value;
  if (o.type === "boolean") return o.value;
  if (o.type === "bigint") return BigInt(o.value as string);
  if (o.type === "null") return null;

  if (o.type === "object" && o.subtype === "array") {
    const props = o.properties as Array<{ value: unknown }> | undefined;
    return props?.map((p) => deserializeRemoteObject(p.value)) ?? [];
  }

  if (o.type === "object" && o.value !== undefined) {
    // Structured value from CDP
    return o.value;
  }

  if (o.type === "object" && o.properties !== undefined) {
    const result: Record<string, unknown> = {};
    const props = o.properties as Array<{ name: string; value: unknown }>;
    for (const prop of props) {
      result[prop.name] = deserializeRemoteObject(prop.value);
    }
    return result;
  }

  return o.value ?? null;
}

export class IDBDomain {
  constructor(private client: CDPClient) {}

  enable(): Promise<unknown> {
    return this.client.send("IndexedDB.enable");
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.client.send<any>("IndexedDB.requestData", {
      securityOrigin: params.securityOrigin,
      databaseName: params.databaseName,
      objectStoreName: params.objectStoreName,
      indexName: params.indexName ?? "",
      skipCount: params.skipCount,
      pageSize: params.pageSize,
      keyRange: params.keyRange,
    });

    return {
      records: (
        result.objectStoreDataEntries as Array<{
          key: unknown;
          primaryKey: unknown;
          value: unknown;
        }>
      ).map((e) => ({
        key: e.primaryKey as IDBValidKey,
        value: deserializeRemoteObject(e.value),
      })),
      hasMore: result.hasMore as boolean,
    };
  }

  deleteRecord(
    securityOrigin: string,
    databaseName: string,
    objectStoreName: string,
    keyRange: unknown,
  ): Promise<unknown> {
    return this.client.send("IndexedDB.deleteObjectStoreEntries", {
      securityOrigin,
      databaseName,
      objectStoreName,
      keyRange,
    });
  }

  clearStore(
    securityOrigin: string,
    databaseName: string,
    objectStoreName: string,
  ): Promise<unknown> {
    return this.client.send("IndexedDB.clearObjectStore", {
      securityOrigin,
      databaseName,
      objectStoreName,
    });
  }
}
