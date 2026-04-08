use crate::commands::adb::{get_server, map_adb_server_err};
use adb_client::ADBDeviceExt;
use base64::{engine::general_purpose, Engine};
use serde::{Deserialize, Serialize};
use std::io::Write;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub size: u64,
    pub modified: String,    // "YYYY-MM-DD HH:MM" or "Mon DD HH:MM"
    pub entry_type: String,  // "file" | "dir" | "symlink" | "other"
    pub permissions: String, // 9-char string like "rwxr-xr-x"
}

/// Strip ANSI escape sequences (color codes) from ls output on Android.
fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' && chars.peek() == Some(&'[') {
            chars.next(); // consume '['
            for nc in chars.by_ref() {
                if nc.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            result.push(c);
        }
    }
    result
}

/// Parse one line from `ls -la` output into a FileEntry.
/// Handles both toybox (YYYY-MM-DD HH:MM) and busybox (Mon DD HH:MM) date formats.
fn parse_ls_line(line: &str) -> Option<FileEntry> {
    let clean = strip_ansi(line);
    let clean = clean.trim();

    let first_char = clean.chars().next()?;
    if !matches!(first_char, 'd' | '-' | 'l' | 'c' | 'b' | 's' | 'p') {
        return None;
    }

    let parts: Vec<&str> = clean.split_whitespace().collect();
    // Minimum: perm links owner group size date time name => 8 (toybox)
    //          perm links owner group size month day time name => 9 (busybox)
    if parts.len() < 8 {
        return None;
    }

    let perm_str = parts[0];
    if perm_str.len() < 10 {
        return None;
    }

    let entry_type_str = match first_char {
        'd' => "dir",
        'l' => "symlink",
        '-' => "file",
        _ => "other",
    };

    let size: u64 = parts[4].parse().unwrap_or(0);

    // Toybox date: YYYY-MM-DD (length 10, hyphen at index 4)
    let (modified, name_start) =
        if parts[5].len() == 10 && parts[5].as_bytes().get(4) == Some(&b'-') {
            if parts.len() < 8 {
                return None;
            }
            (format!("{} {}", parts[5], parts[6]), 7usize)
        } else {
            // Busybox: Mon DD HH:MM name
            if parts.len() < 9 {
                return None;
            }
            (format!("{} {} {}", parts[5], parts[6], parts[7]), 8usize)
        };

    if name_start >= parts.len() {
        return None;
    }

    let name_raw = parts[name_start..].join(" ");
    // For symlinks, strip the " -> target" suffix
    let name = if entry_type_str == "symlink" {
        name_raw
            .split(" -> ")
            .next()
            .unwrap_or(&name_raw)
            .to_string()
    } else {
        name_raw
    };

    if name == "." || name == ".." {
        return None;
    }

    // permissions: chars 1..10 of perm_str (skip the type char)
    let permissions: String = perm_str.chars().skip(1).take(9).collect();

    Some(FileEntry {
        name,
        size,
        modified,
        entry_type: entry_type_str.to_string(),
        permissions,
    })
}

/// List directory contents on the device via `ls -la`.
#[tauri::command]
pub fn adb_list_dir(serial: String, path: String) -> Result<Vec<FileEntry>, String> {
    let mut server = get_server().lock();
    let mut device = server
        .get_device_by_name(&serial)
        .map_err(|e| format!("Device not found: {}", map_adb_server_err(e)))?;

    let escaped = path.replace('\'', "'\\''");
    let cmd = format!("ls -la '{}' 2>/dev/null", escaped);

    let mut output = Vec::new();
    device
        .shell_command(&cmd, Some(&mut output), None::<&mut dyn Write>)
        .map_err(|e| format!("ls failed: {e}"))?;

    let output_str = String::from_utf8_lossy(&output);
    let entries: Vec<FileEntry> = output_str.lines().filter_map(parse_ls_line).collect();

    Ok(entries)
}

/// Pull a file from the device to the host's Downloads folder.
/// Returns the local path where the file was saved.
#[tauri::command]
pub async fn adb_pull_file(serial: String, path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let mut server = get_server().lock();
        let mut device = server
            .get_device_by_name(&serial)
            .map_err(|e| format!("Device not found: {}", map_adb_server_err(e)))?;

        // Read file via cat | base64 (proven pattern from adb_get_app_icon)
        let escaped = path.replace('\'', "'\\''");
        let cmd = format!("cat '{}' 2>/dev/null | base64", escaped);

        let mut out = Vec::new();
        let _ = device.shell_command(&cmd, Some(&mut out), None::<&mut dyn Write>);

        // Strip whitespace (base64 wraps at 76 chars on Android)
        let b64: String = out
            .iter()
            .filter(|&&b| !matches!(b, b'\n' | b'\r' | b' '))
            .map(|&b| b as char)
            .collect();

        if b64.is_empty() {
            return Err("File not found or is a directory".to_string());
        }

        let bytes = general_purpose::STANDARD
            .decode(&b64)
            .map_err(|e| format!("Decode failed: {e}"))?;

        let filename = std::path::Path::new(&path)
            .file_name()
            .unwrap_or(std::ffi::OsStr::new("downloaded_file"))
            .to_string_lossy()
            .to_string();

        // Save to ~/Downloads/
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".to_string());
        let downloads = std::path::Path::new(&home).join("Downloads");
        std::fs::create_dir_all(&downloads)
            .map_err(|e| format!("Cannot create Downloads dir: {e}"))?;

        let local_path = downloads.join(&filename);
        std::fs::write(&local_path, bytes)
            .map_err(|e| format!("Failed to write file: {e}"))?;

        Ok(local_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Delete a file or directory on the device.
#[tauri::command]
pub fn adb_delete_file(serial: String, path: String, is_dir: bool) -> Result<(), String> {
    let mut server = get_server().lock();
    let mut device = server
        .get_device_by_name(&serial)
        .map_err(|e| format!("Device not found: {}", map_adb_server_err(e)))?;

    let escaped = path.replace('\'', "'\\''");
    let cmd = if is_dir {
        format!("rm -rf '{}' 2>&1", escaped)
    } else {
        format!("rm -f '{}' 2>&1", escaped)
    };

    let mut output = Vec::new();
    device
        .shell_command(&cmd, Some(&mut output), None::<&mut dyn Write>)
        .map_err(|e| format!("Delete command failed: {e}"))?;

    let out = strip_ansi(&String::from_utf8_lossy(&output));
    let out = out.trim();
    if out.contains("Permission denied") || out.contains("Operation not permitted") {
        return Err(out.to_string());
    }

    Ok(())
}
