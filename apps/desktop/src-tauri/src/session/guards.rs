use std::sync::Arc;

use crate::session::device_session::DeviceSession;
use crate::session::registry::SessionRegistry;
use crate::session::types::SessionDeviceSnapshot;

pub fn require_online_device(
    registry: &SessionRegistry,
    serial: &str,
) -> Result<SessionDeviceSnapshot, String> {
    let device = registry
        .device_snapshot(serial)
        .ok_or_else(|| format!("device-not-found: {serial}"))?;

    if device.is_stale || device.status != "online" {
        return Err(format!("device-offline: {serial}"));
    }

    Ok(device)
}

pub fn require_online_session(
    registry: &SessionRegistry,
    serial: &str,
) -> Result<Arc<DeviceSession>, String> {
    require_online_device(registry, serial)?;
    registry
        .session_for_serial(serial)
        .ok_or_else(|| format!("device-session-missing: {serial}"))
}
