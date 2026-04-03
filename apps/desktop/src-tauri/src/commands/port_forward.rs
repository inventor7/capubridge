use tauri_plugin_shell::ShellExt;

/// Forward a local TCP port to the CDP abstract socket on the device.
/// After this, `fetch("http://localhost:{local_port}/json")` works from the frontend.
#[tauri::command]
pub async fn adb_forward_cdp(
    app: tauri::AppHandle,
    serial: String,
    local_port: u16,
) -> Result<(), String> {
    let forward_spec = format!("tcp:{local_port}");
    let output = app
        .shell()
        .command("adb")
        .args([
            "-s",
            &serial,
            "forward",
            &forward_spec,
            "localabstract:chrome_devtools_remote",
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("adb forward error: {stderr}"));
    }

    Ok(())
}

/// Remove a previously established port forward.
#[tauri::command]
pub async fn adb_remove_forward(
    app: tauri::AppHandle,
    serial: String,
    local_port: u16,
) -> Result<(), String> {
    let forward_spec = format!("tcp:{local_port}");
    let output = app
        .shell()
        .command("adb")
        .args(["-s", &serial, "forward", "--remove", &forward_spec])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("adb forward --remove error: {stderr}"));
    }

    Ok(())
}
