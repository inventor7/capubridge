use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use parking_lot::RwLock;
use tauri::{AppHandle, State};

use crate::commands::adb::{
    adb_list_devices, AdbDevice, DeviceInfo, PackageListScope, ReverseRule, WebViewSocket,
};
use crate::session::cache_store::SessionCacheStore;
use crate::session::device_session::DeviceSession;
use crate::session::events::emit_registry_snapshot;
use crate::session::guards::require_online_session;
use crate::session::types::{
    SessionDeviceSnapshot, SessionRegistrySnapshot, SessionTargetSnapshot, SessionTemperature,
    SessionTrackerStatus,
};

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn session_temperature(
    serial: &str,
    active_serial: Option<&str>,
    is_stale: bool,
) -> SessionTemperature {
    if !is_stale && active_serial == Some(serial) {
        return SessionTemperature::Hot;
    }
    if is_stale {
        return SessionTemperature::Cold;
    }
    SessionTemperature::Warm
}

fn device_rank(device: &SessionDeviceSnapshot) -> u8 {
    if !device.is_stale && matches!(device.temperature, SessionTemperature::Hot) {
        return 0;
    }
    if !device.is_stale && device.status == "online" {
        return 1;
    }
    if !device.is_stale {
        return 2;
    }
    3
}

fn to_session_device(
    device: AdbDevice,
    active_serial: Option<&str>,
    timestamp: u64,
) -> SessionDeviceSnapshot {
    SessionDeviceSnapshot {
        serial: device.serial.clone(),
        model: device.model,
        product: device.product,
        transport_id: device.transport_id,
        connection_type: device.connection_type,
        status: device.status,
        temperature: session_temperature(&device.serial, active_serial, false),
        is_stale: false,
        last_seen_at: Some(timestamp),
        last_updated_at: timestamp,
    }
}

#[derive(Debug)]
struct SessionRegistryInner {
    devices: HashMap<String, SessionDeviceSnapshot>,
    active_serial: Option<String>,
    tracker_status: SessionTrackerStatus,
    revision: u64,
    last_error: Option<String>,
    updated_at: u64,
}

#[derive(Debug)]
pub struct SessionRegistry {
    inner: RwLock<SessionRegistryInner>,
    sessions: RwLock<HashMap<String, Arc<DeviceSession>>>,
    cache_store: RwLock<Option<Arc<SessionCacheStore>>>,
}

#[derive(Clone)]
pub struct SessionRegistryState(pub Arc<SessionRegistry>);

impl SessionRegistry {
    pub fn new() -> Self {
        let now = now_millis();
        Self {
            inner: RwLock::new(SessionRegistryInner {
                devices: HashMap::new(),
                active_serial: None,
                tracker_status: SessionTrackerStatus::Stopped,
                revision: 0,
                last_error: None,
                updated_at: now,
            }),
            sessions: RwLock::new(HashMap::new()),
            cache_store: RwLock::new(None),
        }
    }

    pub fn snapshot(&self) -> SessionRegistrySnapshot {
        let inner = self.inner.read();
        let mut devices = inner.devices.values().cloned().collect::<Vec<_>>();
        devices.sort_by(|left, right| {
            device_rank(left)
                .cmp(&device_rank(right))
                .then_with(|| left.serial.cmp(&right.serial))
        });
        SessionRegistrySnapshot {
            devices,
            active_serial: inner.active_serial.clone(),
            tracker_status: inner.tracker_status.clone(),
            revision: inner.revision,
            last_error: inner.last_error.clone(),
            updated_at: inner.updated_at,
        }
    }

    pub fn list_devices(&self) -> Vec<SessionDeviceSnapshot> {
        self.snapshot().devices
    }

    pub fn device_snapshot(&self, serial: &str) -> Option<SessionDeviceSnapshot> {
        self.inner.read().devices.get(serial).cloned()
    }

    pub fn session_for_serial(&self, serial: &str) -> Option<Arc<DeviceSession>> {
        self.sessions.read().get(serial).cloned()
    }

    pub fn ensure_session(&self, serial: &str) -> Arc<DeviceSession> {
        if let Some(session) = self.session_for_serial(serial) {
            return session;
        }

        let session = DeviceSession::new(serial.to_string());
        let mut sessions = self.sessions.write();
        sessions
            .entry(serial.to_string())
            .or_insert_with(|| session.clone())
            .clone()
    }

    pub fn set_active_serial(
        &self,
        serial: Option<String>,
    ) -> Result<SessionRegistrySnapshot, String> {
        let timestamp = now_millis();
        {
            let mut inner = self.inner.write();
            if let Some(ref next_serial) = serial {
                if !inner.devices.contains_key(next_serial) {
                    return Err(format!("Unknown device serial: {next_serial}"));
                }
            }

            inner.active_serial = serial;
            let active_serial = inner.active_serial.clone();
            for device in inner.devices.values_mut() {
                device.temperature =
                    session_temperature(&device.serial, active_serial.as_deref(), device.is_stale);
                device.last_updated_at = timestamp;
            }
            inner.revision += 1;
            inner.updated_at = timestamp;
        }
        let snapshot = self.snapshot();
        self.persist_snapshot(&snapshot);
        Ok(snapshot)
    }

    pub fn update_tracker_status(
        &self,
        status: SessionTrackerStatus,
        last_error: Option<String>,
    ) -> SessionRegistrySnapshot {
        let timestamp = now_millis();
        {
            let mut inner = self.inner.write();
            inner.tracker_status = status;
            inner.last_error = last_error;
            inner.revision += 1;
            inner.updated_at = timestamp;
        }
        let snapshot = self.snapshot();
        self.persist_snapshot(&snapshot);
        snapshot
    }

    pub fn refresh_from_adb(&self) -> Result<SessionRegistrySnapshot, String> {
        let devices = adb_list_devices()?;
        Ok(self.replace_devices(devices))
    }

    pub fn replace_devices(&self, devices: Vec<AdbDevice>) -> SessionRegistrySnapshot {
        let timestamp = now_millis();
        {
            let mut inner = self.inner.write();
            let active_serial = inner.active_serial.clone();
            let fresh_serials = devices
                .iter()
                .map(|device| device.serial.clone())
                .collect::<HashSet<_>>();

            for device in devices {
                self.ensure_session(&device.serial);
                inner.devices.insert(
                    device.serial.clone(),
                    to_session_device(device, active_serial.as_deref(), timestamp),
                );
            }

            for device in inner.devices.values_mut() {
                if !fresh_serials.contains(&device.serial) {
                    device.is_stale = true;
                    device.status = "offline".to_string();
                    device.temperature =
                        session_temperature(&device.serial, active_serial.as_deref(), true);
                    device.last_updated_at = timestamp;
                    if let Some(session) = self.session_for_serial(&device.serial) {
                        session.mark_targets_stale();
                        session.mark_packages_stale();
                    }
                } else {
                    device.is_stale = false;
                    device.temperature =
                        session_temperature(&device.serial, active_serial.as_deref(), false);
                }
            }

            inner.last_error = None;
            inner.revision += 1;
            inner.updated_at = timestamp;
        }
        let snapshot = self.snapshot();
        self.persist_snapshot(&snapshot);
        snapshot
    }

    pub fn configure_cache_store(
        &self,
        cache_store: Arc<SessionCacheStore>,
    ) -> Result<Option<SessionRegistrySnapshot>, String> {
        {
            let mut configured = self.cache_store.write();
            *configured = Some(cache_store.clone());
        }

        let Some(snapshot) = cache_store.load_registry_snapshot()? else {
            return Ok(None);
        };

        {
            let mut inner = self.inner.write();
            inner.devices = snapshot
                .devices
                .iter()
                .cloned()
                .map(|device| (device.serial.clone(), device))
                .collect();
            inner.active_serial = snapshot.active_serial.clone();
            inner.tracker_status = snapshot.tracker_status.clone();
            inner.revision = snapshot.revision;
            inner.last_error = snapshot.last_error.clone();
            inner.updated_at = snapshot.updated_at;
        }

        Ok(Some(self.snapshot()))
    }

    fn persist_snapshot(&self, snapshot: &SessionRegistrySnapshot) {
        let cache_store = self.cache_store.read().clone();
        let Some(cache_store) = cache_store else {
            return;
        };

        if let Err(error) = cache_store.save_registry_snapshot(snapshot) {
            log::warn!("[session-cache] Failed to persist registry snapshot: {error}");
        }
    }
}

impl SessionRegistryState {
    pub fn new() -> Self {
        Self(Arc::new(SessionRegistry::new()))
    }

    pub fn registry(&self) -> Arc<SessionRegistry> {
        self.0.clone()
    }
}

fn session_for_online_serial(
    state: &State<'_, SessionRegistryState>,
    serial: &str,
) -> Result<Arc<DeviceSession>, String> {
    require_online_session(&state.registry(), serial)
}

#[tauri::command]
pub fn session_list_devices(
    state: State<'_, SessionRegistryState>,
) -> Result<Vec<SessionDeviceSnapshot>, String> {
    Ok(state.registry().list_devices())
}

#[tauri::command]
pub fn session_get_registry_state(
    state: State<'_, SessionRegistryState>,
) -> Result<SessionRegistrySnapshot, String> {
    Ok(state.registry().snapshot())
}

#[tauri::command]
pub fn session_refresh_devices(
    app: AppHandle,
    state: State<'_, SessionRegistryState>,
) -> Result<SessionRegistrySnapshot, String> {
    let snapshot = state.registry().refresh_from_adb()?;
    emit_registry_snapshot(&app, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub fn session_get_device_info(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<DeviceInfo, String> {
    session_for_online_serial(&state, &serial)?.get_device_info()
}

#[tauri::command]
pub fn session_shell_command(
    state: State<'_, SessionRegistryState>,
    serial: String,
    command: String,
) -> Result<String, String> {
    session_for_online_serial(&state, &serial)?.shell_command(command)
}

#[tauri::command]
pub fn session_tcpip(
    state: State<'_, SessionRegistryState>,
    serial: String,
    port: u16,
) -> Result<(), String> {
    session_for_online_serial(&state, &serial)?.tcpip(port)
}

#[tauri::command]
pub fn session_root(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<(), String> {
    session_for_online_serial(&state, &serial)?.root()
}

#[tauri::command]
pub fn session_reboot(
    state: State<'_, SessionRegistryState>,
    serial: String,
    mode: Option<String>,
) -> Result<(), String> {
    session_for_online_serial(&state, &serial)?.reboot(mode)
}

#[tauri::command]
pub fn session_list_packages(
    state: State<'_, SessionRegistryState>,
    serial: String,
    scope: Option<PackageListScope>,
) -> Result<Vec<crate::commands::adb::AdbPackage>, String> {
    if state.registry().device_snapshot(&serial).is_none() {
        return Err(format!("Unknown device serial: {serial}"));
    }

    state.registry().ensure_session(&serial).list_packages(scope)
}

#[tauri::command]
pub fn session_refresh_packages(
    state: State<'_, SessionRegistryState>,
    serial: String,
    scope: Option<PackageListScope>,
) -> Result<Vec<crate::commands::adb::AdbPackage>, String> {
    session_for_online_serial(&state, &serial)?.refresh_packages(scope)
}

#[tauri::command]
pub fn session_cancel_list_packages(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<(), String> {
    state.registry().ensure_session(&serial).cancel_packages()
}

#[tauri::command]
pub fn session_open_package(
    state: State<'_, SessionRegistryState>,
    serial: String,
    package_name: String,
) -> Result<String, String> {
    session_for_online_serial(&state, &serial)?.open_package(package_name)
}

#[tauri::command]
pub fn session_reverse(
    state: State<'_, SessionRegistryState>,
    serial: String,
    remote_port: u16,
    local_port: u16,
) -> Result<(), String> {
    session_for_online_serial(&state, &serial)?.reverse(remote_port, local_port)
}

#[tauri::command]
pub fn session_remove_reverse(
    state: State<'_, SessionRegistryState>,
    serial: String,
    remote_port: u16,
) -> Result<(), String> {
    session_for_online_serial(&state, &serial)?.remove_reverse(remote_port)
}

#[tauri::command]
pub fn session_list_reverse(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<Vec<ReverseRule>, String> {
    session_for_online_serial(&state, &serial)?.list_reverse()
}

#[tauri::command]
pub fn session_list_webview_sockets(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<Vec<WebViewSocket>, String> {
    session_for_online_serial(&state, &serial)?.list_webview_sockets()
}

#[tauri::command]
pub fn session_list_targets(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<Vec<SessionTargetSnapshot>, String> {
    if state.registry().device_snapshot(&serial).is_none() {
        return Err(format!("Unknown device serial: {serial}"));
    }

    Ok(state
        .registry()
        .session_for_serial(&serial)
        .map(|session| session.list_targets())
        .unwrap_or_default())
}

#[tauri::command]
pub fn session_refresh_targets(
    state: State<'_, SessionRegistryState>,
    serial: String,
) -> Result<Vec<SessionTargetSnapshot>, String> {
    session_for_online_serial(&state, &serial)?.refresh_targets()
}

#[tauri::command]
pub fn session_set_active_device(
    app: AppHandle,
    state: State<'_, SessionRegistryState>,
    serial: Option<String>,
) -> Result<SessionRegistrySnapshot, String> {
    let snapshot = state.registry().set_active_serial(serial)?;
    emit_registry_snapshot(&app, snapshot.clone());
    Ok(snapshot)
}
