# DevBridge — Phase 1 Tasks

> Cut scope: foundation + IDB read. Done when you can connect a USB Android device and browse its IndexedDB.

---

## Task List

### T01 — Project scaffold ✅

- ~~Init Tauri 2 project~~ — Adapted to monorepo: Vue 3 + deps added to `apps/desktop`
- Installed all Phase 1 deps via `vp add` (vue, pinia, @tanstack/vue-query, @tanstack/vue-table, unocss, lucide-vue-next, @tauri-apps/api, @vueuse/core)
- Configured UnoCSS with Tailwind preset (`apps/desktop/uno.config.ts`)
- TypeScript strict mode + path aliases `@/` configured in `apps/desktop/tsconfig.json`
- Linter (`vp check`) passes clean
- Replaced vanilla TS scaffold with Vue entry point (`src/main.ts`, `src/App.vue`)

**Status:** ✅ Done — `vp check` passes, `vp run tauri` starts the app

---

### T02 — Design tokens + AppShell ✅

- Created `src/assets/styles/tokens.css` with all CSS custom properties from SPEC.md §11
- Created `AppShell.vue` — grid layout (sidebar + main + status bar)
- Created `Sidebar.vue` — 52px icon nav, 5 panels + settings, active state highlight
- Created `PanelHeader.vue` — 40px top bar with title + target slot
- Created `StatusBar.vue` — 24px bottom bar with left/center/right slots
- Created placeholder views for all 6 panels

**Status:** ✅ Done

---

### T03 — Routing ✅

- Installed Vue Router 4 (via catalog)
- Set up all routes from SPEC.md §12 — all lazy loaded
- Default redirect `/` → `/devices`
- Storage panel has child routes: `/storage/idb/:db?/:store?`, `/localstorage`, `/cache`, `/opfs`
- Using `createWebHashHistory` (Tauri-compatible — no server-side routing)

**Status:** ✅ Done

---

### T04 — Pinia + store skeleton ✅

- Created `devices.store.ts` — polling, device list, selection
- Created `targets.store.ts` — CDP target list, port management
- Created `connection.store.ts` — WebSocket connection map, status tracking
- Created `ui.store.ts` — sidebar state, active panel
- All stores wired in `main.ts`
- All TypeScript types in `src/types/` (adb.types.ts, cdp.types.ts, storage.types.ts, ipc.types.ts)

**Status:** ✅ Done

---

### T05 — Tauri: adb_list_devices ✅

- Added `tauri-plugin-shell = "2"` to Cargo.toml
- Registered `tauri_plugin_shell::init()` in `lib.rs`
- Added `shell:allow-execute` and `shell:allow-spawn` to `capabilities/default.json`
- Implemented `adb_list_devices()` in `src-tauri/src/commands/adb.rs`
- Implemented `parse_devices()` + `parse_device_line()` — parses `adb devices -l` output
- WiFi device detection via serial format (IP:port pattern)

**Status:** ✅ Done

---

### T06 — Device panel: device list UI ✅

- `DevicesPanel.vue` — starts/stops polling on mount/unmount
- `DeviceList.vue` — shows device cards, empty state, error bar
- `DeviceCard.vue` — model, serial, status badge (online/offline/unauthorized), connection type icon (USB/WiFi)
- Error state shown inline, wired to `devicesStore.error`

**Status:** ✅ Done

---

### T07 — Tauri: adb_forward_cdp ✅

- `adb_forward_cdp(serial, local_port)` — forward `tcp:<port>` to `localabstract:chrome_devtools_remote`
- `adb_remove_forward(serial, local_port)` — remove the forward
- Both registered in `invoke_handler`

**Status:** ✅ Done

---

### T08 — CDP client ✅

- `CDPClient` class in `packages/utils/src/cdp/client.ts`
  - `send<T>()` — typed command/response with pending map
  - `on()` — event subscription, returns unsubscribe fn
  - `waitForOpen()` — Promise that resolves when WS is open
  - `close()` — clean disconnect
- `fetchLocalTargets(port)` in `packages/utils/src/cdp/targets.ts`
- Both exported from `packages/utils` — used by `apps/desktop` via workspace dep

**Status:** ✅ Done — unit tests in `packages/utils/tests/`

---

### T09 — Targets store + target picker ✅

- `targets.store.ts` — fetches from `http://localhost:{port}/json`, filters page/background_page
- `connection.store.ts` — `connect()` creates native `WebSocket`, tracks status per target
- `useCDP.ts` composable — `forwardAndFetchTargets()`, `connectToTarget()`, `getClient()`
- `TargetSelector.vue` in `PanelHeader` — dropdown with connection status dot
- Auto-forward + auto-fetch when device is selected (watcher in `TargetSelector`)

**Status:** ✅ Done

---

### T10 — IDB domain wrapper ✅

- `IDBDomain` class in `packages/utils/src/cdp/domains/indexeddb.ts`
- Methods: `enable()`, `getDatabases()`, `getDatabase()`, `getData()`, `deleteRecord()`, `clearStore()`
- `deserializeRemoteObject()` — flattens CDP remote object representation to plain JS
- Pagination via `skipCount` + `pageSize`, returns `hasMore` boolean
- Exported from `packages/utils`

**Status:** ✅ Done

---

### T11 — Storage panel: IDB table (read-only) ✅

- `StoragePanel.vue` — sidebar + RouterView layout
- `StorageSidebar.vue` — IDB database tree, expands to object stores, navigates on click; links to LS/Cache/OPFS
- `IDBExplorer.vue` — reads `:db` and `:store` from route params, wires to `useRecords()`
- `IDBTableToolbar.vue` — store name, record count, page size selector, pagination buttons, refresh
- `IDBTable.vue` (TanStack Table v8):
  - Auto-generates columns from first record's keys (up to 20)
  - Sortable columns
  - Server-side pagination (50/100/500 per page)
  - Loading shimmer skeleton
  - Empty state
- `useIDB.ts` composable — `useDatabases()` and `useRecords()` via TanStack Query

**Note:** `JsonTree.vue` deferred — cells render objects as `JSON.stringify()` for Phase 1; tree rendering is Phase 2.

**Status:** ✅ Done

---

### T12 — Status bar wiring ✅

- Left slot: selected device model/serial
- Center slot: active target URL
- Right slot: CDP connection status dot + label

**Status:** ✅ Done — wired in `AppShell.vue`

---

## Phase 1 Definition of Done

- [ ] App opens on macOS, Windows, Linux (dev mode) — _pending manual test_
- [ ] USB Android device appears in device panel within 3 seconds of connecting — _pending manual test_
- [ ] Selecting a device + target connects CDP (green status dot) — _pending manual test_
- [ ] IDB sidebar shows all databases and object stores — _pending manual test_
- [ ] Clicking a store loads records into TanStack Table — _pending manual test_
- [ ] Pagination works for stores with 1000+ records — _pending manual test_
- [x] No TypeScript / lint errors (`vp check` passes clean)
- [x] Unit tests pass for CDPClient and IDBDomain (`vp test` in packages/utils)
