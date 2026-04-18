# Capubridge Comprehensive Roadmap

**Date**: 2026-04-12
**Status**: Draft
**Author**: AI-assisted research

---

## Executive Summary

Capubridge is a Tauri 2 desktop developer tool for hybrid mobile app developers (Capacitor/Ionic/React Native). It combines ADB device management, deep browser storage inspection, remote Chrome DevTools Protocol (CDP) connection, screen mirroring, and framework-specific DevTools into a single unified interface.

This document outlines a **4-phase roadmap** covering:

1. Finishing incomplete features (Tier 1)
2. Building unique differentiators (Tier 2)
3. Expanding to new markets (Tier 3)
4. Adding power user features (Tier 4)

---

## Current State Assessment

### Codebase Statistics

- **99 module files** across 9 feature modules
- **54 Rust backend commands** across 9 command modules
- **235 UI component files** (shadcn-vue + reka-ui)
- **7 Pinia stores**, **9 composables**
- **Active development** on `ayoub/inspect-devtools` branch

### Complete Features

- SQLite DB browser (pull, query, paginate, WAL support, batch scanning)
- IndexedDB browser (full CRUD, server-side pagination, advanced filters)
- LocalStorage / Cache API / OPFS explorers
- DOM Elements inspector via CDP
- Vue DevTools integration (official DevTools patched to work over CDP)
- Screen mirroring (scrcpy H.264 via WebCodecs + Chrome screencast)
- Touch/keyboard injection on mirror
- Device management (list, select, overview, connection types)
- App management (list, inspect, launch, stop, clear, uninstall)
- File browser (lazy tree, search, pull, delete, preview, keyboard nav)
- Performance metrics collection (CPU, RAM, JS heap, DOM nodes)
- WebView target discovery (ADB + Chrome)
- Plugin system for framework detection (extensible `InspectPlugin` interface)

### Incomplete / Stub Features

| Feature            | Status                  | Gap                                     |
| ------------------ | ----------------------- | --------------------------------------- |
| Network Requests   | Mock data only          | No live CDP Network domain capture      |
| Console REPL       | Input shell             | No CDP Runtime.evaluate wiring          |
| Capacitor Module   | 100% mock data          | No real plugin discovery or log capture |
| React DevTools     | Detection + placeholder | No bridge implementation                |
| Network WebSocket  | "Coming soon" stub      | No CDP Network event capture            |
| Network Throttle   | "Coming soon" stub      | No CDP network emulation                |
| Network Mock       | "Coming soon" stub      | No request interception                 |
| Console Exceptions | "Coming soon" stub      | No exception aggregation                |
| Hybrid Module      | 100% mock data          | No real functionality                   |

### Unused Dependencies

- `@unovis/vue` + `@unovis/ts` — Data visualization library, **zero imports**
- `@devicefarmer/adbkit` — JS ADB client, superseded by Rust `adb_client`
- `@vueuse/core` — Installed but partially used

### Commented-Out IPC Contracts (Planned)

- `adb_force_stop`, `adb_clear_data`, `adb_uninstall`
- `adb_push_file`
- `start_logcat` / `stop_logcat`
- `save_export` / `read_import`

---

## Tier 1: Finish What's Started

**Goal**: Make Capubridge production-ready by completing stub/incomplete features.
**Impact**: Critical — without these, the tool feels unfinished.
**Effort**: Low-Medium (mostly wiring existing infrastructure)

### 1.1 Live Network Capture

**Current State**: `NetworkRequests.vue` uses mock data from `@/data/mock-data`.

**What's Needed**:

- Connect to CDP `Network` domain events:
  - `Network.requestWillBeSent` — capture request start
  - `Network.responseReceived` — capture response headers, status, timing
  - `Network.loadingFinished` — capture response body size
  - `Network.loadingFailed` — capture error details
- Request body capture: `Network.getResponseBody`
- Response body capture: same method
- Populate `NetworkRequests.vue` table with live data
- Wire existing filter logic (URL, method, status, type)
- Implement detail panel tabs: Headers, Payload, Response, Timing

**Architecture**:

```
CDP Network Domain → Event Handler → Request Registry → TanStack Table
```

**Key Types** (from `ipc.types.ts` — already defined, uncomment/extend):

```typescript
interface NetworkRequest {
  requestId: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  statusText: string;
  type: string; // "fetch", "xhr", "document", "image", etc.
  size: number;
  time: number; // duration in ms
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timing?: ResourceTiming;
}
```

**Effort**: Medium (150-250 lines of event wiring + UI binding)

---

### 1.2 Console REPL

**Current State**: `ConsoleRepl.vue` has input UI but no evaluation logic.

**What's Needed**:

- Connect input to CDP `Runtime.evaluate` with `awaitPromise: true`
- Display output in a scrollable console area
- Handle different result types: primitive, object, error, undefined
- Implement console history (up/down arrow navigation)
- Support multi-line input (Shift+Enter)
- Color-code output types (strings green, numbers blue, errors red, objects expandable)
- Capture `Runtime.consoleAPICalled` events for live console output

**Architecture**:

```
User Input → Runtime.evaluate → RemoteObject → Display
                ↓
        Console API Events → Live Output
```

**Effort**: Low-Medium (100-200 lines)

---

### 1.3 Capacitor Live Data

**Current State**: All 6 Capacitor components import from `@/data/mock-data`.

**What's Needed**:

#### Plugin Discovery

```typescript
// Runtime.evaluate to get installed plugins
const pluginsExpression = `
  (function() {
    const plugins = window.Capacitor?.Plugins || {};
    return Object.keys(plugins).map(name => ({
      name,
      version: plugins[name]?.version ?? 'unknown'
    }));
  })()
`;
```

#### Config Discovery

```typescript
// Fetch capacitor.config.json from WebView
const configExpression = `
  fetch('/capacitor.config.json')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
`;
```

#### Package Cross-Reference

```rust
// Already exists: adb_list_packages
// Filter for @capacitor/* and @ionic/* packages
// Cross-reference with JS runtime plugins
```

#### Plugin Version Checks

```typescript
// Check npm registry for latest versions
const checkUpdates = async (plugins: string[]) => {
  const responses = await Promise.all(
    plugins.map((name) => fetch(`https://registry.npmjs.org/${name}/latest`)),
  );
  return responses.map((r) => r.json());
};
```

#### Console Log Capture Per Plugin

```typescript
// Intercept console.log, tag by plugin (parse call stack)
const interceptExpression = `
  (function() {
    const originalLog = console.log;
    console.log = function(...args) {
      const stack = new Error().stack || '';
      const pluginMatch = stack.match(/@capacitor\\/([^\\/]+)/);
      const plugin = pluginMatch ? pluginMatch[1] : 'app';
      window.postMessage({
        type: 'capacitor-console',
        level: 'log',
        message: args.join(' '),
        plugin,
        timestamp: Date.now()
      }, '*');
      originalLog.apply(console, args);
    };
  })()
`;
```

**Effort**: Medium (300-500 lines across 6 components)

---

### 1.4 React DevTools Bridge

**Current State**: Detection exists (`__REACT_DEVTOOLS_GLOBAL_HOOK__`), `ReactDevtoolsPlaceholder.vue` is a stub.

**What's Needed** (mirror Vue DevTools pattern):

1. Inject `react-devtools-inline` bundle via CDP `Runtime.evaluate`
2. Create RPC transport over CDP (same pattern as `useVueDevtoolsBridge.ts`)
3. Build `ReactDevtoolsPanel.vue` component tree
4. Component tree display
5. Props/state inspection
6. Hook value display

**Architecture** (same as Vue):

```
Detection → Injection → RPC Bridge → Panel UI
```

**Key Files to Create**:

- `modules/inspect/plugins/react-devtools.ts` — Update detection, add injection logic
- `modules/inspect/react-devtools/useReactDevtoolsBridge.ts` — RPC transport
- `modules/inspect/react-devtools/ReactDevtoolsPanel.vue` — Panel UI
- `modules/inspect/react-devtools/ComponentTree.vue` — Tree display
- `modules/inspect/react-devtools/ComponentDetail.vue` — Props/state/hooks

**Effort**: High (800-1200 lines, but pattern exists from Vue)

---

### 1.5 Network WebSocket Inspector

**Current State**: `NetworkWebSocket.vue` — "Coming soon" stub.

**What's Needed**:

- Capture `Network.webSocketCreated` and `Network.webSocketClosed` events
- Capture `Network.webSocketFrameSent` and `Network.webSocketFrameReceived`
- Display as timeline with frame content
- Filter by URL, direction (sent/received), opcode (text/binary/ping/pong/close)

**Effort**: Low-Medium (150-250 lines)

---

## Tier 2: High-Value Differentiators

**Goal**: Build features no competing tool offers.
**Impact**: Critical — these are Capubridge's unique selling points.
**Effort**: Medium-High

### 2.1 AI Assistant for Database Queries

**Vision**: Natural language interface for querying IndexedDB and SQLite, with automatic relationship discovery, cross-store joins, and anomaly explanation.

#### Use Cases

| Use Case                  | Example Query                                   | AI Action                                                                  |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Foreign Key Emulation** | "Show me all orders with user email"            | Query `orders` store, extract `user_id`, query `users` store, join results |
| **Complex Filtering**     | "Find users created last week with >5 orders"   | Generate IDB cursor logic with date + count filters                        |
| **Anomaly Detection**     | "Why is this table 2GB?"                        | Analyze record distribution, find blob-heavy rows, explain                 |
| **Schema Discovery**      | "What stores reference user_id?"                | Scan all stores for `user_id` field, report relationships                  |
| **Data Analysis**         | "Show me daily order counts for the last month" | Group by date, aggregate, display as table/chart                           |

#### Architecture

```
┌─────────────────────────────────────────────────┐
│              AI Assistant Layer                  │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐     │
│  │ Schema Context │    │ Query Planner    │     │
│  │ Builder        │───→│ (LLM-powered)    │     │
│  └────────────────┘    └────────┬─────────┘     │
│                                 │               │
│  ┌────────────────┐    ┌────────▼─────────┐     │
│  │ Explanation    │◄───│ Result Executor  │     │
│  │ Generator      │    │ (CDP commands)   │     │
│  └────────────────┘    └──────────────────┘     │
└─────────────────────────────────────────────────┘
         ↑                          ↓
┌─────────────────┐    ┌──────────────────────┐
│ User Input      │    │ Query Results        │
│ (natural lang)  │    │ (table + explanation)│
└─────────────────┘    └──────────────────────┘
```

#### Components

**`useAIAssistant.ts`** — Core composable:

```typescript
interface AIQueryResult {
  explanation: string; // "I queried X, joined with Y..."
  data: any[]; // Query results
  queriesExecuted: {
    // Transparency
    store: string;
    query: string;
    recordsScanned: number;
    recordsReturned: number;
  }[];
  relationships: {
    // Discovered relationships
    fromStore: string;
    toStore: string;
    foreignKey: string;
    confidence: number; // 0-1 based on data analysis
  }[];
}

export function useAIAssistant(targetId: Ref<string>) {
  async function executeNaturalLanguage(
    query: string,
    context: { stores: StoreInfo[]; samples: Record<string, any[]> },
  ): Promise<AIQueryResult>;

  async function discoverRelationships(
    stores: StoreInfo[],
    samples: Record<string, any[]>,
  ): Promise<Relationship[]>;

  async function explainAnomaly(
    stats: StorageStats,
    samples: Record<string, any[]>,
  ): Promise<string>;

  return { executeNaturalLanguage, discoverRelationships, explainAnomaly };
}
```

**`AIQueryPanel.vue`** — UI component:

- Natural language input
- Query execution indicator
- Results table (reuses existing table components)
- Explanation text
- Discovered relationships display
- Query history

#### LLM Integration Options

| Option                   | Pros                                        | Cons                             |
| ------------------------ | ------------------------------------------- | -------------------------------- |
| **OpenAI API**           | Best quality, easy integration              | Requires API key, cost per query |
| **Anthropic Claude**     | Good reasoning, large context               | Requires API key, cost           |
| **Local model (Ollama)** | Free, offline, private                      | Lower quality, needs local setup |
| **Hybrid**               | Local for simple queries, cloud for complex | Most complex implementation      |

**Recommended**: Hybrid approach. Use a local model (llama3.1:8b via Ollama) for simple queries (filtering, basic joins), fall back to OpenAI for complex analysis (anomaly detection, schema discovery).

#### Prompt Design

```
You are a database query assistant for a mobile debugging tool.
The user wants to query their app's storage.

SCHEMA:
{stores: [...]}  // Store/table names and sample fields

SAMPLE DATA:
{storeName: [...]}  // First 10 records from each store

USER QUERY: "{natural language query}"

TASK:
1. Identify which stores/tables are needed
2. Determine any cross-store relationships
3. Generate a query plan with specific CDP commands
4. Explain what you'll do in plain language

RESPONSE FORMAT (JSON):
{
  "explanation": "Plain language explanation",
  "plan": [
    {"store": "orders", "operation": "scan", "filter": {...}},
    {"store": "users", "operation": "lookup", "keys": [...]}
  ],
  "joins": [{"from": "orders.user_id", "to": "users.id"}]
}
```

**Effort**: High (500-800 lines + LLM integration)

---

### 2.2 DB Change Tracking / Delta Diff

**Vision**: Capture database state snapshots, compare them over time, visualize changes with field-level diffs, and use AI to explain what happened.

#### Workflow

```
1. User clicks "Capture Snapshot"
   ↓
2. Pull all stores/tables to local JSON cache
   ↓ (time passes, user interacts with app)
3. User clicks "Capture Again"
   ↓
4. Pull fresh state
   ↓
5. Diff engine compares snapshots
   ↓
6. Display:
   - Added records (green highlight)
   - Modified records (yellow, field-level diff)
   - Deleted records (red strikethrough)
   - Summary stats ("+847 orders, -150 sessions, 23 users modified")
   - AI explanation ("The checkout flow created 847 new orders")
```

#### Components

**`useSnapshotManager.ts`** — Snapshot management:

```typescript
interface Snapshot {
  id: string;
  timestamp: number;
  targetId: string;
  stores: {
    name: string;
    recordCount: number;
    estimatedSize: number;
    records: Record<string, any>[]; // Or keys + fetch-on-demand for large sets
  }[];
}

interface SnapshotDiff {
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  summary: {
    added: number;
    modified: number;
    deleted: number;
  };
  byStore: {
    storeName: string;
    added: Record<string, any>[];
    modified: { key: string; before: Record<string, any>; after: Record<string, any> }[];
    deleted: Record<string, any>[];
  }[];
}

export function useSnapshotManager(targetId: Ref<string>) {
  async function captureSnapshot(label?: string): Promise<Snapshot>;
  async function loadSnapshots(): Promise<Snapshot[]>;
  async function diffSnapshots(idA: string, idB: string): Promise<SnapshotDiff>;
  async function deleteSnapshot(id: string): Promise<void>;

  return { captureSnapshot, loadSnapshots, diffSnapshots, deleteSnapshot };
}
```

**`SnapshotPanel.vue`** — UI:

- List of captured snapshots with timestamps and labels
- "Capture Now" button
- Diff selector (pick 2 snapshots to compare)
- Diff results:
  - Summary bar (+847, ~23, -150)
  - Per-store breakdown
  - Record-level diff with field highlighting
  - AI explanation panel

**Storage**: Local JSON files in Tauri app data directory:

```
%APPDATA%/capubridge/snapshots/
  ├── {targetId}_{timestamp}_orders.json
  ├── {targetId}_{timestamp}_users.json
  └── ...
```

**Diff Algorithm**:

```typescript
function diffRecords(
  before: Record<string, any>[],
  after: Record<string, any>[],
  keyField: string = "id",
): { added: any[]; modified: Diff[]; deleted: any[] } {
  const beforeMap = new Map(before.map((r) => [r[keyField], r]));
  const afterMap = new Map(after.map((r) => [r[keyField], r]));

  const added = after.filter((r) => !beforeMap.has(r[keyField]));
  const deleted = before.filter((r) => !afterMap.has(r[keyField]));
  const modified = after
    .filter((r) => beforeMap.has(r[keyField]))
    .map((r) => ({
      key: r[keyField],
      before: beforeMap.get(r[keyField]),
      after: r,
      changedFields: Object.keys(r).filter(
        (k) => JSON.stringify(r[k]) !== JSON.stringify(beforeMap.get(r[keyField])[k]),
      ),
    }))
    .filter((d) => d.changedFields.length > 0);

  return { added, modified, deleted };
}
```

**Effort**: Medium (400-600 lines)

---

### 2.3 Capacitor Plugin Console Log Aggregation

**Vision**: Unified timeline of JS console + native logcat logs, correlated by plugin and timestamp.

#### Architecture

```
┌──────────────────────────────────────────────────┐
│           Plugin Log Timeline                     │
│                                                   │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │ JS Console      │   │ Native Logcat        │  │
│  │ (CDP Events)    │   │ (ADB Stream)         │  │
│  │                 │   │                      │  │
│  │ console.log     │   │ logcat -s            │  │
│  │ console.warn    │   │   "Capacitor:*"      │  │
│  │ console.error   │   │                      │  │
│  └────────┬────────┘   └──────────┬───────────┘  │
│           │                       │              │
│           └───────────┬───────────┘              │
│                       ↓                          │
│           ┌─────────────────────┐               │
│           │ Timeline Merger     │               │
│           │ (sort by timestamp, │               │
│           │  deduplicate)       │               │
│           └──────────┬──────────┘               │
│                      ↓                          │
│           ┌─────────────────────┐               │
│           │ Unified Timeline UI │               │
│           │                     │               │
│           │ [Camera] JS: ...    │               │
│           │ [Camera] Native: .. │               │
│           │ [FileSystem] JS: .. │               │
│           └─────────────────────┘               │
└──────────────────────────────────────────────────┘
```

#### Implementation

**JS Console Interception**:

```typescript
// Via CDP Runtime domain
cdpClient.on("Runtime.consoleAPICalled", (params) => {
  const stackTrace = params.stackTrace;
  const pluginName = extractPluginFromStackTrace(stackTrace);

  logEntry = {
    type: "js-console",
    level: params.type, // log, warn, error, info
    message: params.args.map((a) => a.value).join(" "),
    plugin: pluginName,
    timestamp: Date.now(),
    source: "js",
  };

  timelineStore.addEntry(logEntry);
});
```

**Native Logcat Streaming**:

```rust
// Already exists: logcat streaming via Tauri events
// Enhancement: filter by Capacitor plugin tags
#[tauri::command]
pub async fn start_capacitor_logcat(
    app: tauri::AppHandle,
    serial: String,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    // Filter for Capacitor logs: "Capacitor", "CAP", plugin-specific tags
    let logcat_cmd = format!(
        "logcat -v time Capacitor:* CAP:* {}:*",
        "Capacitor/Camera" // Could be parameterized per plugin
    );

    // Stream via existing shell plugin or ADB server
    // ...
}
```

**Plugin Detection from Stack Trace**:

```typescript
function extractPluginFromStackTrace(stackTrace?: any): string {
  if (!stackTrace?.callFrames) return "app";

  for (const frame of stackTrace.callFrames) {
    // Match @capacitor/* package imports
    const match = frame.url?.match(/@capacitor\/([^\\/]+)/);
    if (match) return match[1];

    // Match Capacitor.Plugins.* calls
    const pluginMatch = frame.functionName?.match(/Capacitor\.Plugins\['([^']+)'\]/);
    if (pluginMatch) return pluginMatch[1];
  }

  return "app";
}
```

**UI Components**:

- Timeline view with color-coded entries (JS=blue, Native=green)
- Plugin filter dropdown
- Level filter (V/D/I/W/E)
- Text search
- Auto-scroll toggle
- Export to file

**Effort**: Medium (300-500 lines)

---

### 2.4 Performance Charts (Using @unovis/vue)

**Current State**: `@unovis/vue` and `@unovis/ts` are installed but completely unused. `usePerfMetrics.ts` collects real-time metrics. Chart components are scaffolded but unused.

**What's Needed**: Wire existing metrics to chart visualizations.

#### Charts to Build

| Chart                      | Data Source                            | Type        | Value              |
| -------------------------- | -------------------------------------- | ----------- | ------------------ |
| **CPU Timeline**           | Tauri `perf:metrics` events            | Line chart  | Find CPU spikes    |
| **Memory Timeline**        | CDP `Performance.getMetrics` (JS heap) | Area chart  | Find memory leaks  |
| **DOM Node Count**         | CDP `Memory.getDOMCounters`            | Line chart  | Find DOM bloat     |
| **Network Waterfall**      | CDP `Network` domain events            | Gantt chart | Find slow requests |
| **Frame Rate**             | scrcpy stream timing                   | Bar chart   | Find jank          |
| **Storage Growth**         | IDB/SQLite size over time              | Stacked bar | Find storage leaks |
| **Per-Store Distribution** | IDB overview data                      | Pie chart   | Visual breakdown   |

**Effort**: Medium (400-600 lines, but library is already installed)

---

## Tier 3: Ecosystem Expanders

**Goal**: Open Capubridge to new user bases (React Native developers).
**Impact**: High — 2M+ potential new users.
**Effort**: High

### 3.1 React Native Support

#### React DevTools Bridge (See Tier 1.4)

The detection already exists. The Vue DevTools pattern is complete. This is pure implementation work.

#### Metro Bundler Integration

**What is Metro**: React Native's JavaScript bundler and development server. Runs on `localhost:8081` by default.

**What Metro Exposes**:

- Console logs (WebSocket connection to `/debugger-ui`)
- Network requests (via `__REACT_DEVTOOLS__` or custom integration)
- Hot reload events
- Bundle build status
- Error overlays

**Architecture**:

```
┌─────────────────────────────────────┐
│       Metro Integration             │
│                                     │
│  WebSocket: ws://localhost:8081    │
│  /debugger-ui?device=...           │
│                                     │
│  Events:                           │
│  - log (console output)            │
│  - error (red screen errors)       │
│  - reload (HMR events)             │
│  - bundle (build status)           │
└─────────────────────────────────────┘
```

**Implementation**:

```typescript
// Connect to Metro WebSocket
const metroWs = new WebSocket("ws://localhost:8081/debugger-ui");

metroWs.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.method) {
    case "log":
      consoleStore.addEntry({
        type: "metro-console",
        level: message.level,
        message: message.args.join(" "),
        timestamp: Date.now(),
      });
      break;
    case "error":
      consoleStore.addEntry({
        type: "metro-error",
        message: message.error.message,
        stack: message.error.stack,
        timestamp: Date.now(),
      });
      break;
  }
};
```

#### AsyncStorage / MMKV Browser

**Approach**: Same as SQLite browser — pull DB files from device via ADB.

- **AsyncStorage**: Stored as SQLite in `/data/data/<package>/databases/RKStorage`
- **MMKV**: Stored as XML files in `/data/data/<package>/files/mmkv/`
- Both can be pulled and parsed with existing Rust infrastructure

#### Hermes Debugger (Future)

**What is Hermes**: React Native's JavaScript engine (replacing JSC). Exposes a debugging protocol.

**Feasibility**: Metro's debugger endpoint has a CDP-compatible interface. Port forwarding + CDP client could work.

**Effort**: High — requires understanding Hermes debugger protocol

#### Native UI Inspector (Future)

**Limitation**: CDP only works on WebViews. React Native's native views (not WebViews) cannot be inspected via CDP.

**Alternative**: Use React Native's Inspector API (`react-devtools-core/backend`) — similar to how Flipper does it.

**Effort**: High — different protocol, separate from CDP

---

### 3.2 RN-Specific Features

| Feature                            | Description                                                      | Effort |
| ---------------------------------- | ---------------------------------------------------------------- | ------ |
| **React Native Package Detection** | Auto-detect RN apps by checking for `com.facebook.react` package | Low    |
| **Hermes Bytecode Inspection**     | View `.hbc` bundle info                                          | Medium |
| **Native Module Browser**          | List native modules registered in RN bridge                      | Medium |
| **Bridge Message Inspector**       | Monitor JS ↔ Native bridge traffic                               | High   |

---

## Tier 4: Power User Features

**Goal**: Features that lock users in through unique capabilities.
**Impact**: Medium-High — power users will evangelize the tool.
**Effort**: Medium

### 4.1 Multi-Device Comparison View

**Vision**: Side-by-side view of 2-3 devices showing storage, performance, or logs simultaneously.

#### Use Cases

- "Why is this bug only on Samsung?" — compare storage, logs, performance
- QA regression: "Did this change affect all devices or just one?"
- Performance comparison: "Which device is slowest?"

#### UI Design

```
┌─────────────┬─────────────┬─────────────┐
│  Device 1   │  Device 2   │  Device 3   │
│  Pixel 7    │  Galaxy S23 │  OnePlus 11 │
├─────────────┼─────────────┼─────────────┤
│  [Content synced by tab selection]      │
│                                         │
│  Same tab on all devices:               │
│  - Storage overview                     │
│  - Network requests                     │
│  - Console logs                         │
│  - Performance metrics                  │
└─────────────┴─────────────┴─────────────┘
```

#### Implementation

- New route: `/compare`
- Device selector (pick 2-3 devices)
- Sync tab state across devices (same route params)
- Layout: CSS grid with equal columns
- Each column renders the same component with different `targetId`

**Effort**: Medium (200-300 lines)

---

### 4.2 Session Recording & Playback

**Vision**: Record a debugging session and replay it later for documentation, QA, or onboarding.

#### What Gets Recorded

- All CDP events (console, network, storage mutations)
- Mirror frames (or screenshots at 1fps for size)
- User actions (tab navigation, queries executed, filters applied)
- Device state at start (installed packages, storage sizes)

#### Recording Format

```json
{
  "version": 1,
  "metadata": {
    "timestamp": "2026-04-12T10:30:00Z",
    "device": "Pixel 7",
    "package": "com.example.app",
    "duration": 300,
    "events": 1247
  },
  "events": [
    {
      "timestamp": 0,
      "type": "console",
      "level": "log",
      "message": "App initialized"
    },
    {
      "timestamp": 1.2,
      "type": "network",
      "method": "GET",
      "url": "/api/users",
      "status": 200
    },
    {
      "timestamp": 3.5,
      "type": "storage-mutation",
      "store": "orders",
      "operation": "put",
      "key": "ord_123"
    },
    {
      "timestamp": 5.0,
      "type": "user-action",
      "action": "navigate",
      "tab": "storage/indexeddb"
    }
  ],
  "screenshots": [
    { "timestamp": 0, "data": "base64..." },
    { "timestamp": 1, "data": "base64..." }
  ]
}
```

#### Playback UI

- Timeline scrubber
- Speed controls (0.25x, 0.5x, 1x, 2x, 4x)
- Event list with filters
- Screenshot overlay at current timestamp
- Play/pause/step controls

**Effort**: High (600-900 lines)

---

### 4.3 Screenshot Diff & Visual Regression

**Vision**: Capture screenshots over time, diff them to find visual changes.

#### Workflow

1. Capture baseline screenshot (mirror or CDP `Page.captureScreenshot`)
2. Perform action on device
3. Capture after screenshot
4. Pixel-by-pixel diff with highlight overlay
5. Store baseline, flag regressions

#### Implementation

```typescript
// Use pixelmatch library for diffing
import pixelmatch from "pixelmatch";

function diffScreenshots(
  baseline: ImageData,
  current: ImageData,
  diff: ImageData,
  threshold: number = 0.1,
): { mismatches: number; similarity: number } {
  const mismatches = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold },
  );
  return {
    mismatches,
    similarity: 1 - mismatches / (baseline.width * baseline.height),
  };
}
```

**Effort**: Medium (200-300 lines + pixelmatch dependency)

---

### 4.4 Network Throttling & Mocking

**What's Needed**:

#### Network Throttle

```typescript
// CDP Network.emulateNetworkConditions
await cdpClient.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 500, // 500ms delay
  downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
  uploadThroughput: (750 * 1024) / 8, // 750 Kbps
});
```

#### Request Mock

```typescript
// CDP Network.setRequestInterception + FulfillRequest
await cdpClient.send("Network.setRequestInterception", {
  patterns: [{ urlPattern: "*/api/*", interceptionStage: "HeadersReceived" }],
});

cdpClient.on("Network.requestIntercepted", async (params) => {
  const mockResponse = getMockForRequest(params.request);
  await cdpClient.send("Network.fulfillRequest", {
    interceptionId: params.interceptionId,
    responseCode: mockResponse.status,
    body: btoa(mockResponse.body),
    responseHeaders: mockResponse.headers,
  });
});
```

**Effort**: Medium (300-400 lines)

---

## Implementation Priority

### Phase 1: Foundation (Ship MVP) — Weeks 1-4

| Feature              | Tier | Effort     | Priority       |
| -------------------- | ---- | ---------- | -------------- |
| Live Network Capture | 1    | Medium     | 🔴 Must have   |
| Console REPL         | 1    | Low-Medium | 🔴 Must have   |
| Capacitor Live Data  | 1    | Medium     | 🔴 Must have   |
| Performance Charts   | 2B   | Medium     | 🟡 Should have |

### Phase 2: Differentiators (Stand Out) — Weeks 5-10

| Feature                         | Tier | Effort     | Priority       |
| ------------------------------- | ---- | ---------- | -------------- |
| AI Assistant for DB Queries     | 2A   | High       | 🔴 Must have   |
| DB Change Tracking / Delta Diff | 2B   | Medium     | 🔴 Must have   |
| Plugin Log Aggregation          | 2C   | Medium     | 🟡 Should have |
| Network WebSocket Inspector     | 1    | Low-Medium | 🟡 Should have |

### Phase 3: Expansion (New Markets) — Weeks 11-18

| Feature                 | Tier | Effort | Priority        |
| ----------------------- | ---- | ------ | --------------- |
| React DevTools Bridge   | 1/3A | High   | 🔴 Must have    |
| Metro Integration       | 3A   | Medium | 🟡 Should have  |
| Multi-Device Comparison | 4A   | Medium | 🟡 Should have  |
| Network Throttle/Mock   | 4D   | Medium | 🟢 Nice to have |

### Phase 4: Power Features (Lock-In) — Weeks 19-26

| Feature                      | Tier | Effort    | Priority        |
| ---------------------------- | ---- | --------- | --------------- |
| Session Recording & Playback | 4B   | High      | 🟡 Should have  |
| Automated Audits             | 5    | Medium    | 🟢 Nice to have |
| Screenshot Diff              | 4C   | Medium    | 🟢 Nice to have |
| Hermes Debugger              | 3A   | Very High | 🟢 Nice to have |

---

## Dependencies & Prerequisites

### Must Be Completed First

1. **Live Network Capture** → Required for Network Waterfall chart, Session Recording
2. **Console REPL** → Required for Plugin Log Aggregation
3. **Capacitor Live Data** → Required for Plugin Log Aggregation
4. **Performance Charts** → Required for Multi-Device Comparison

### Can Be Built In Parallel

- AI Assistant (independent of other features)
- DB Change Tracking (independent)
- React DevTools (follows Vue DevTools pattern)
- Multi-Device Comparison (follows existing component patterns)

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                               |
| -------------------------------- | ---------- | ------ | ---------------------------------------- |
| LLM API costs for AI Assistant   | High       | Medium | Hybrid local/cloud model, query caching  |
| React DevTools bridge complexity | Medium     | High   | Mirror Vue pattern exactly, test early   |
| Session recording file size      | Medium     | Medium | Screenshot at 1fps, compress events      |
| Hermes debugger protocol changes | High       | High   | Document version compatibility           |
| Scope creep across all tiers     | High       | High   | Strict Phase boundaries, ship each phase |

---

## Success Criteria

### Phase 1 Success

- [ ] Network requests captured in real-time with full detail
- [ ] Console REPL executes expressions and displays results
- [ ] Capacitor plugins discovered from live app data
- [ ] Performance charts render with real metrics data

### Phase 2 Success

- [ ] AI assistant handles "show me X with Y" cross-store queries
- [ ] DB snapshots can be captured, compared, and diffs displayed
- [ ] Plugin logs unified across JS and native sources
- [ ] WebSocket frames captured and displayed

### Phase 3 Success

- [ ] React component tree visible in Inspect tab
- [ ] Metro console logs captured
- [ ] Multi-device comparison view functional
- [ ] Network throttling works with real CDP emulation

### Phase 4 Success

- [ ] Sessions can be recorded, saved, and replayed
- [ ] Screenshot diffs highlight pixel changes
- [ ] Automated audits identify common issues

---

## Appendix: File Inventory

### Files to Create (Estimated)

| Phase | File                                            | Purpose                          |
| ----- | ----------------------------------------------- | -------------------------------- |
| 1     | `composables/useNetworkCapture.ts`              | CDP Network event capture        |
| 1     | `composables/useConsoleREPL.ts`                 | Runtime.evaluate wrapper         |
| 1     | `composables/useCapacitorLiveData.ts`           | Plugin discovery, config reading |
| 1     | `components/perf/CPUTimeline.vue`               | CPU chart                        |
| 1     | `components/perf/MemoryTimeline.vue`            | Memory chart                     |
| 1     | `components/perf/NetworkWaterfall.vue`          | Network waterfall                |
| 2     | `composables/useAIAssistant.ts`                 | AI query translation             |
| 2     | `components/ai/AIQueryPanel.vue`                | AI query UI                      |
| 2     | `composables/useSnapshotManager.ts`             | Snapshot capture/diff            |
| 2     | `components/storage/SnapshotPanel.vue`          | Snapshot UI                      |
| 2     | `composables/usePluginLogs.ts`                  | Plugin log aggregation           |
| 2     | `components/console/PluginLogTimeline.vue`      | Unified log view                 |
| 3     | `composables/useReactDevtoolsBridge.ts`         | React DevTools RPC               |
| 3     | `inspect/react-devtools/ReactDevtoolsPanel.vue` | React panel                      |
| 3     | `composables/useMetroIntegration.ts`            | Metro WebSocket                  |
| 3     | `components/compare/DeviceComparison.vue`       | Multi-device view                |
| 4     | `composables/useSessionRecording.ts`            | Recording management             |
| 4     | `components/recording/SessionPlayer.vue`        | Playback UI                      |
| 4     | `composables/useScreenshotDiff.ts`              | Screenshot comparison            |

### Files to Modify (Estimated)

| File                                        | Change                           |
| ------------------------------------------- | -------------------------------- |
| `router/index.ts`                           | Add routes for new features      |
| `data/mock-data.ts`                         | Remove or reduce mock data usage |
| `types/ipc.types.ts`                        | Uncomment and extend IPC types   |
| `modules/network/NetworkRequests.vue`       | Wire to live data                |
| `modules/console/ConsoleRepl.vue`           | Add evaluation logic             |
| `modules/capacitor/*.vue`                   | Replace mock data with live data |
| `modules/inspect/plugins/react-devtools.ts` | Implement bridge                 |
| `package.json`                              | Add pixelmatch, etc.             |

---

## Notes

- This document is a **living roadmap** — update it as features are completed or priorities shift.
- Each feature should get its own implementation plan (via `writing-plans` skill) before coding.
- Phase boundaries are guidelines — if a feature completes early, pull from the next phase.
- The `hybrid/` module should be either deleted or repurposed — it currently adds no value.
