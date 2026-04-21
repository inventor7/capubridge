use tauri::{AppHandle, Emitter};

use crate::session::types::{SessionEvent, SessionRegistrySnapshot};

pub const SESSION_EVENT_NAME: &str = "capubridge:session-event";

pub fn emit_registry_snapshot(app: &AppHandle, snapshot: SessionRegistrySnapshot) {
    let _ = app.emit(
        SESSION_EVENT_NAME,
        SessionEvent::RegistryUpdated { snapshot },
    );
}
