use adb_client::ADBDeviceExt;
use crate::commands::adb::get_server;
use crate::commands::files::{read_file_bytes_with_runas, shell_escape};
use parking_lot::Mutex;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::LazyLock;

// ─── Types ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqliteDbFile {
    pub name: String,
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqliteTableInfo {
    pub name: String,
    pub table_type: String, // "table" | "view"
    pub row_count: i64,
    pub sql: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqliteColumnInfo {
    pub cid: i64,
    pub name: String,
    pub col_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqliteIndexInfo {
    pub name: String,
    pub unique: bool,
    pub columns: Vec<String>,
    pub sql: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SqliteQueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
    pub row_count: usize,
    pub changes: u64,
    pub duration_ms: u64,
}

// ─── DB Cache ───────────────────────────────────────────────────────────────────
// Maps "serial::package::dbpath" → local temp file path
static DB_CACHE: LazyLock<Mutex<HashMap<String, PathBuf>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn cache_key(serial: &str, package: &str, db_path: &str) -> String {
    format!("{serial}::{package}::{db_path}")
}

fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("capubridge-sqlite");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// Pull a SQLite database from the device into a local temp file.
/// Uses `run-as <package>` to access app-private databases.
fn pull_db_to_temp(
    serial: &str,
    package: &str,
    db_path: &str,
    force: bool,
) -> Result<PathBuf, String> {
    let key = cache_key(serial, package, db_path);

    // Check cache unless forced refresh
    if !force {
        let cache = DB_CACHE.lock();
        if let Some(path) = cache.get(&key) {
            if path.exists() {
                return Ok(path.clone());
            }
        }
    }

    // Pull via ADB
    let bytes = pull_db_bytes(serial, package, db_path)?;
    if bytes.len() < 16 {
        return Err("File too small to be a valid SQLite database".to_string());
    }

    // Verify SQLite header magic
    if &bytes[0..16] != b"SQLite format 3\0" {
        return Err("Not a valid SQLite database file".to_string());
    }

    // Write to temp file
    let safe_name = db_path
        .replace('/', "_")
        .replace('\\', "_")
        .trim_start_matches('_')
        .to_string();
    let filename = format!("{}_{}_{}", serial, package, safe_name);
    let local_path = temp_dir().join(filename);
    std::fs::write(&local_path, &bytes)
        .map_err(|e| format!("Failed to write temp DB: {e}"))?;

    // Also pull -wal and -shm if they exist (best-effort)
    for suffix in ["-wal", "-shm"] {
        let wal_path = format!("{db_path}{suffix}");
        if let Ok(wal_bytes) = pull_db_bytes(serial, package, &wal_path) {
            if !wal_bytes.is_empty() {
                let wal_local = local_path.with_extension(
                    format!(
                        "{}{}",
                        local_path
                            .extension()
                            .map(|e| e.to_string_lossy().to_string())
                            .unwrap_or_default(),
                        suffix
                    ),
                );
                let _ = std::fs::write(&wal_local, &wal_bytes);
            }
        }
    }

    // Update cache
    DB_CACHE.lock().insert(key, local_path.clone());

    Ok(local_path)
}

fn pull_db_bytes(serial: &str, package: &str, path: &str) -> Result<Vec<u8>, String> {
    let mut server = get_server().lock();
    let mut device = server
        .get_device_by_name(serial)
        .map_err(|e| format!("Device not found: {e}"))?;

    read_file_bytes_with_runas(&mut device, path, package)
}

fn open_db(local_path: &PathBuf) -> Result<Connection, String> {
    Connection::open_with_flags(
        local_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| format!("Failed to open database: {e}"))
}

fn sqlite_value_to_json(val: &rusqlite::types::Value) -> Value {
    match val {
        rusqlite::types::Value::Null => Value::Null,
        rusqlite::types::Value::Integer(i) => Value::Number((*i).into()),
        rusqlite::types::Value::Real(f) => {
            serde_json::Number::from_f64(*f)
                .map(Value::Number)
                .unwrap_or(Value::Null)
        }
        rusqlite::types::Value::Text(s) => Value::String(s.clone()),
        rusqlite::types::Value::Blob(b) => {
            // Show blob as hex preview (first 64 bytes)
            let hex: String = b.iter().take(64).map(|byte| format!("{byte:02x}")).collect();
            let suffix = if b.len() > 64 { "…" } else { "" };
            Value::String(format!("[BLOB {len}B] {hex}{suffix}", len = b.len()))
        }
    }
}

// ─── Commands ───────────────────────────────────────────────────────────────────

/// List .db files inside a package's databases/ directory.
#[tauri::command]
pub async fn sqlite_list_databases(
    serial: String,
    package: String,
) -> Result<Vec<SqliteDbFile>, String> {
    tokio::task::spawn_blocking(move || {
        let mut server = get_server().lock();
        let mut device = server
            .get_device_by_name(&serial)
            .map_err(|e| format!("Device not found: {e}"))?;

        let db_dir = format!("/data/data/{package}/databases");
        let escaped = shell_escape(&db_dir);
        let cmd = format!(
            "run-as '{}' ls -la '{}'",
            shell_escape(&package),
            escaped
        );

        let mut stdout = Vec::new();
        let _ = device.shell_command(
            &cmd,
            Some(&mut stdout),
            None::<&mut dyn std::io::Write>,
        );
        let output = String::from_utf8_lossy(&stdout);

        let mut dbs = Vec::new();
        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with("total") || line.starts_with("d") {
                continue;
            }
            // Skip WAL/SHM/journal files
            if line.ends_with("-wal")
                || line.ends_with("-shm")
                || line.ends_with("-journal")
            {
                continue;
            }

            // Parse ls -la line: permissions links owner group size date time name
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 7 {
                continue;
            }

            let size: u64 = parts[4].parse().unwrap_or(0);

            // Determine name start index (toybox vs busybox date format)
            let name_start =
                if parts[5].len() == 10 && parts[5].as_bytes().get(4) == Some(&b'-') {
                    7usize
                } else {
                    8usize
                };

            if name_start >= parts.len() {
                continue;
            }

            let name = parts[name_start..].join(" ");
            if name == "." || name == ".." {
                continue;
            }

            let path = format!("{db_dir}/{name}");
            dbs.push(SqliteDbFile { name, path, size });
        }

        Ok(dbs)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Pull a database from the device and open it. Returns table list.
#[tauri::command]
pub async fn sqlite_open_database(
    serial: String,
    package: String,
    db_path: String,
) -> Result<Vec<SqliteTableInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let local = pull_db_to_temp(&serial, &package, &db_path, true)?;
        let conn = open_db(&local)?;

        let mut stmt = conn
            .prepare(
                "SELECT name, type, sql FROM sqlite_master \
                 WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' \
                 ORDER BY type, name",
            )
            .map_err(|e| format!("Failed to query schema: {e}"))?;

        let tables: Vec<SqliteTableInfo> = stmt
            .query_map([], |row| {
                let name: String = row.get(0)?;
                let table_type: String = row.get(1)?;
                let sql: String = row.get::<_, Option<String>>(2)?.unwrap_or_default();
                Ok((name, table_type, sql))
            })
            .map_err(|e| format!("Failed to read tables: {e}"))?
            .filter_map(|r| r.ok())
            .map(|(name, table_type, sql)| {
                let row_count = conn
                    .query_row(
                        &format!("SELECT COUNT(*) FROM \"{}\"", name.replace('"', "\"\"")),
                        [],
                        |row| row.get::<_, i64>(0),
                    )
                    .unwrap_or(0);
                SqliteTableInfo {
                    name,
                    table_type,
                    row_count,
                    sql,
                }
            })
            .collect();

        Ok(tables)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Get column info for a specific table.
#[tauri::command]
pub async fn sqlite_table_columns(
    serial: String,
    package: String,
    db_path: String,
    table_name: String,
) -> Result<Vec<SqliteColumnInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let local = pull_db_to_temp(&serial, &package, &db_path, false)?;
        let conn = open_db(&local)?;

        let mut stmt = conn
            .prepare(&format!(
                "PRAGMA table_info(\"{}\")",
                table_name.replace('"', "\"\"")
            ))
            .map_err(|e| format!("Failed to get column info: {e}"))?;

        let columns = stmt
            .query_map([], |row| {
                Ok(SqliteColumnInfo {
                    cid: row.get(0)?,
                    name: row.get(1)?,
                    col_type: row.get(2)?,
                    notnull: row.get::<_, bool>(3)?,
                    default_value: row.get(4)?,
                    pk: row.get::<_, bool>(5)?,
                })
            })
            .map_err(|e| format!("Failed to read columns: {e}"))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(columns)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Get indexes for a specific table.
#[tauri::command]
pub async fn sqlite_table_indexes(
    serial: String,
    package: String,
    db_path: String,
    table_name: String,
) -> Result<Vec<SqliteIndexInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let local = pull_db_to_temp(&serial, &package, &db_path, false)?;
        let conn = open_db(&local)?;

        let mut stmt = conn
            .prepare(&format!(
                "PRAGMA index_list(\"{}\")",
                table_name.replace('"', "\"\"")
            ))
            .map_err(|e| format!("Failed to get index list: {e}"))?;

        let indexes: Vec<SqliteIndexInfo> = stmt
            .query_map([], |row| {
                let name: String = row.get(1)?;
                let unique: bool = row.get(2)?;
                Ok((name, unique))
            })
            .map_err(|e| format!("Failed to read indexes: {e}"))?
            .filter_map(|r| r.ok())
            .map(|(name, unique)| {
                let sql = conn
                    .query_row(
                        "SELECT sql FROM sqlite_master WHERE name = ?1",
                        [&name],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .unwrap_or(None);

                let columns: Vec<String> = conn
                    .prepare(&format!("PRAGMA index_info(\"{}\")", name.replace('"', "\"\"")))
                    .ok()
                    .map(|mut s| {
                        s.query_map([], |row| row.get::<_, String>(2))
                            .ok()
                            .map(|rows| rows.filter_map(|r| r.ok()).collect())
                            .unwrap_or_default()
                    })
                    .unwrap_or_default();

                SqliteIndexInfo {
                    name,
                    unique,
                    columns,
                    sql,
                }
            })
            .collect();

        Ok(indexes)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Fetch paginated rows from a table.
#[tauri::command]
pub async fn sqlite_table_rows(
    serial: String,
    package: String,
    db_path: String,
    table_name: String,
    offset: i64,
    limit: i64,
    order_by: Option<String>,
    order_dir: Option<String>,
) -> Result<SqliteQueryResult, String> {
    tokio::task::spawn_blocking(move || {
        let local = pull_db_to_temp(&serial, &package, &db_path, false)?;
        let conn = open_db(&local)?;

        let safe_table = table_name.replace('"', "\"\"");
        let order_clause = match order_by {
            Some(ref col) => {
                let safe_col = col.replace('"', "\"\"");
                let dir = match order_dir.as_deref() {
                    Some("desc" | "DESC") => "DESC",
                    _ => "ASC",
                };
                format!(" ORDER BY \"{safe_col}\" {dir}")
            }
            None => String::new(),
        };

        let sql = format!(
            "SELECT * FROM \"{safe_table}\"{order_clause} LIMIT {limit} OFFSET {offset}"
        );

        let start = std::time::Instant::now();
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Query failed: {e}"))?;

        let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let col_count = columns.len();

        let rows: Vec<Vec<Value>> = stmt
            .query_map([], |row| {
                let mut vals = Vec::with_capacity(col_count);
                for i in 0..col_count {
                    let val = row.get_ref(i).map(|v| v.into()).unwrap_or(rusqlite::types::Value::Null);
                    vals.push(sqlite_value_to_json(&val));
                }
                Ok(vals)
            })
            .map_err(|e| format!("Failed to read rows: {e}"))?
            .filter_map(|r| r.ok())
            .collect();

        let duration_ms = start.elapsed().as_millis() as u64;
        let row_count = rows.len();

        Ok(SqliteQueryResult {
            columns,
            rows,
            row_count,
            changes: 0,
            duration_ms,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Execute arbitrary SQL (SELECT only for safety).
#[tauri::command]
pub async fn sqlite_execute_query(
    serial: String,
    package: String,
    db_path: String,
    sql: String,
) -> Result<SqliteQueryResult, String> {
    tokio::task::spawn_blocking(move || {
        let local = pull_db_to_temp(&serial, &package, &db_path, false)?;
        let conn = open_db(&local)?;

        let trimmed = sql.trim();

        let start = std::time::Instant::now();
        let mut stmt = conn
            .prepare(trimmed)
            .map_err(|e| format!("SQL error: {e}"))?;

        let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let col_count = columns.len();

        if col_count == 0 {
            // Non-SELECT statement (but on read-only connection, so it will fail)
            return Err("Only SELECT queries are supported on read-only databases".to_string());
        }

        let rows: Vec<Vec<Value>> = stmt
            .query_map([], |row| {
                let mut vals = Vec::with_capacity(col_count);
                for i in 0..col_count {
                    let val = row.get_ref(i).map(|v| v.into()).unwrap_or(rusqlite::types::Value::Null);
                    vals.push(sqlite_value_to_json(&val));
                }
                Ok(vals)
            })
            .map_err(|e| format!("Query failed: {e}"))?
            .filter_map(|r| r.ok())
            .collect();

        let duration_ms = start.elapsed().as_millis() as u64;
        let row_count = rows.len();

        Ok(SqliteQueryResult {
            columns,
            rows,
            row_count,
            changes: 0,
            duration_ms,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Re-pull the database from the device (refresh).
#[tauri::command]
pub async fn sqlite_refresh_database(
    serial: String,
    package: String,
    db_path: String,
) -> Result<Vec<SqliteTableInfo>, String> {
    // Just re-open with force=true, which re-pulls from device
    sqlite_open_database(serial, package, db_path).await
}

/// Clean up cached temp files for a specific database.
#[tauri::command]
pub fn sqlite_close_database(serial: String, package: String, db_path: String) {
    let key = cache_key(&serial, &package, &db_path);
    let mut cache = DB_CACHE.lock();
    if let Some(path) = cache.remove(&key) {
        let _ = std::fs::remove_file(&path);
        // Also remove -wal and -shm
        for suffix in ["-wal", "-shm"] {
            let wal = path.with_extension(format!(
                "{}{}",
                path.extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default(),
                suffix
            ));
            let _ = std::fs::remove_file(&wal);
        }
    }
}
