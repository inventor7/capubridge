Place bundled Android platform-tools here.

Recommended flow:

- run `apps/desktop/scripts/sync-platform-tools.mjs`
- default downloads current host platform
- use `--all` to fetch `windows`, `linux`, `darwin`

Supported lookup shapes:

- `resources/adb/platform-tools/adb`
- `resources/adb/<platform>/platform-tools/adb`
- `resources/platform-tools/adb`

Platform keys:

- `windows`
- `linux`
- `darwin`

Runtime priority:

1. `CAPUBRIDGE_ADB_PATH`
2. bundled resource adb
3. system `adb` in PATH

Packaged app auto-starts bundled adb daemon on launch when found.
