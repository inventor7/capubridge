use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AdbDevice {
    pub serial: String,
    pub model: String,
    pub product: String,
    pub transport_id: String,
    pub connection_type: String,
    pub status: String,
}

#[tauri::command]
pub async fn adb_list_devices(app: tauri::AppHandle) -> Result<Vec<AdbDevice>, String> {
    let output = app
        .shell()
        .command("adb")
        .args(["devices", "-l"])
        .output()
        .await
        .map_err(|e| format!("adb not found: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("adb error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_devices(&stdout))
}

fn parse_devices(output: &str) -> Vec<AdbDevice> {
    output
        .lines()
        .skip(1) // skip "List of devices attached"
        .filter(|line| !line.trim().is_empty() && !line.starts_with('*'))
        .filter_map(parse_device_line)
        .collect()
}

fn parse_device_line(line: &str) -> Option<AdbDevice> {
    let parts: Vec<&str> = line.splitn(2, '\t').collect();
    if parts.len() < 2 {
        return None;
    }

    let serial = parts[0].trim().to_string();
    let rest = parts[1].trim();

    // Status is the first word after the tab
    let words: Vec<&str> = rest.split_whitespace().collect();
    let status = words.first().map(|s| s.to_string()).unwrap_or_default();

    // Parse key:value pairs from the rest of the line
    let mut model = String::new();
    let mut product = String::new();
    let mut transport_id = String::new();

    for word in &words[1..] {
        if let Some(val) = word.strip_prefix("model:") {
            model = val.replace('_', " ");
        } else if let Some(val) = word.strip_prefix("product:") {
            product = val.to_string();
        } else if let Some(val) = word.strip_prefix("transport_id:") {
            transport_id = val.to_string();
        }
    }

    let connection_type = if serial.contains('.') || serial.contains(':') {
        "wifi"
    } else {
        "usb"
    }
    .to_string();

    Some(AdbDevice {
        serial,
        model,
        product,
        transport_id,
        connection_type,
        status,
    })
}
