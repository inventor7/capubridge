mod commands;

use commands::adb::adb_list_devices;
use commands::chrome::{chrome_fetch_targets, chrome_find, chrome_is_running, chrome_kill_all, chrome_launch, chrome_verify_port};
use commands::port_forward::{adb_forward_cdp, adb_remove_forward};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            adb_list_devices,
            adb_forward_cdp,
            adb_remove_forward,
            chrome_find,
            chrome_is_running,
            chrome_kill_all,
            chrome_launch,
            chrome_verify_port,
            chrome_fetch_targets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
