use std::sync::mpsc;
use std::sync::Arc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use parking_lot::RwLock;

use crate::commands::adb::{
    adb_cancel_list_packages_inner, adb_get_device_info_inner, adb_list_packages_inner,
    adb_list_reverse_inner, adb_list_webview_sockets_inner, adb_open_package_inner,
    adb_reboot_inner, adb_remove_reverse_inner, adb_reverse_inner, adb_root_inner,
    adb_shell_command_inner, adb_tcpip_inner, catch_adb_panic, AdbPackage, DeviceInfo,
    PackageListScope, ReverseRule, WebViewSocket,
};
use crate::commands::port_forward::{adb_discover_targets_inner, AdbDiscoveredTarget};
use crate::session::job_queue::SessionJobResult::{
    DeviceInfo as DeviceInfoResult, Packages, ReverseRules, ShellOutput, Targets, Unit,
    WebViewSockets,
};
use crate::session::job_queue::{
    SessionJobQueue, SessionJobResult, SessionWorkerJob, SessionWorkerRequest,
};
use crate::session::types::SessionTargetSnapshot;

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn to_target_snapshot(
    serial: &str,
    updated_at: u64,
    target: AdbDiscoveredTarget,
) -> SessionTargetSnapshot {
    SessionTargetSnapshot {
        serial: serial.to_string(),
        id: target.id,
        target_type: target.target_type,
        title: target.title,
        url: target.url,
        devtools_frontend_url: target.devtools_frontend_url,
        web_socket_debugger_url: target.web_socket_debugger_url,
        favicon_url: target.favicon_url,
        package_name: target.package_name,
        is_stale: false,
        last_updated_at: updated_at,
    }
}

#[derive(Debug)]
pub struct DeviceSession {
    serial: String,
    sender: mpsc::Sender<SessionWorkerRequest>,
    queue: Arc<SessionJobQueue>,
    targets: RwLock<Vec<SessionTargetSnapshot>>,
}

impl DeviceSession {
    pub fn new(serial: String) -> Arc<Self> {
        let queue = Arc::new(SessionJobQueue::default());
        let (sender, receiver) = mpsc::channel::<SessionWorkerRequest>();

        let session = Arc::new(Self {
            serial: serial.clone(),
            sender,
            queue: queue.clone(),
            targets: RwLock::new(Vec::new()),
        });

        thread::Builder::new()
            .name(format!("capubridge-device-session-{serial}"))
            .spawn(move || worker_loop(serial, queue, receiver))
            .expect("failed to spawn device session worker");

        session
    }

    pub fn get_device_info(&self) -> Result<DeviceInfo, String> {
        match self.request(SessionWorkerJob::GetDeviceInfo)? {
            DeviceInfoResult(info) => Ok(info),
            _ => Err("session-invalid-response: device-info".to_string()),
        }
    }

    pub fn shell_command(&self, command: String) -> Result<String, String> {
        match self.request(SessionWorkerJob::ShellCommand { command })? {
            ShellOutput(output) => Ok(output),
            _ => Err("session-invalid-response: shell-command".to_string()),
        }
    }

    pub fn tcpip(&self, port: u16) -> Result<(), String> {
        match self.request(SessionWorkerJob::TcpIp { port })? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: tcpip".to_string()),
        }
    }

    pub fn root(&self) -> Result<(), String> {
        match self.request(SessionWorkerJob::Root)? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: root".to_string()),
        }
    }

    pub fn reboot(&self, mode: Option<String>) -> Result<(), String> {
        match self.request(SessionWorkerJob::Reboot { mode })? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: reboot".to_string()),
        }
    }

    pub fn list_packages(
        &self,
        scope: Option<PackageListScope>,
    ) -> Result<Vec<AdbPackage>, String> {
        match self.request(SessionWorkerJob::ListPackages { scope })? {
            Packages(packages) => Ok(packages),
            _ => Err("session-invalid-response: list-packages".to_string()),
        }
    }

    pub fn cancel_packages(&self) -> Result<(), String> {
        match self.request(SessionWorkerJob::CancelPackages)? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: cancel-packages".to_string()),
        }
    }

    pub fn open_package(&self, package_name: String) -> Result<String, String> {
        match self.request(SessionWorkerJob::OpenPackage { package_name })? {
            ShellOutput(output) => Ok(output),
            _ => Err("session-invalid-response: open-package".to_string()),
        }
    }

    pub fn reverse(&self, remote_port: u16, local_port: u16) -> Result<(), String> {
        match self.request(SessionWorkerJob::Reverse {
            remote_port,
            local_port,
        })? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: reverse".to_string()),
        }
    }

    pub fn remove_reverse(&self, remote_port: u16) -> Result<(), String> {
        match self.request(SessionWorkerJob::RemoveReverse { remote_port })? {
            Unit => Ok(()),
            _ => Err("session-invalid-response: remove-reverse".to_string()),
        }
    }

    pub fn list_reverse(&self) -> Result<Vec<ReverseRule>, String> {
        match self.request(SessionWorkerJob::ListReverse)? {
            ReverseRules(rules) => Ok(rules),
            _ => Err("session-invalid-response: list-reverse".to_string()),
        }
    }

    pub fn list_webview_sockets(&self) -> Result<Vec<WebViewSocket>, String> {
        match self.request(SessionWorkerJob::ListWebViewSockets)? {
            WebViewSockets(sockets) => Ok(sockets),
            _ => Err("session-invalid-response: webview-sockets".to_string()),
        }
    }

    pub fn list_targets(&self) -> Vec<SessionTargetSnapshot> {
        self.targets.read().clone()
    }

    pub fn refresh_targets(&self) -> Result<Vec<SessionTargetSnapshot>, String> {
        match self.request(SessionWorkerJob::RefreshTargets)? {
            Targets(targets) => {
                *self.targets.write() = targets.clone();
                Ok(targets)
            }
            _ => Err("session-invalid-response: targets".to_string()),
        }
    }

    pub fn mark_targets_stale(&self) {
        let updated_at = now_millis();
        let mut targets = self.targets.write();
        for target in targets.iter_mut() {
            target.is_stale = true;
            target.last_updated_at = updated_at;
        }
    }

    fn request(&self, job: SessionWorkerJob) -> Result<SessionJobResult, String> {
        let receiver = self.queue.enqueue(&self.sender, job);
        receiver.recv().map_err(|error| {
            format!("Failed waiting for session worker {}: {error}", self.serial)
        })?
    }
}

fn worker_loop(
    serial: String,
    queue: Arc<SessionJobQueue>,
    receiver: mpsc::Receiver<SessionWorkerRequest>,
) {
    while let Ok(request) = receiver.recv() {
        let key = request.job.coalescing_key();
        let result = execute_job(&serial, &request.job);

        if let Some(key) = key {
            queue.resolve_snapshot(&key, result);
        } else {
            SessionJobQueue::resolve_direct(request.response, result);
        }
    }
}

fn execute_job(serial: &str, job: &SessionWorkerJob) -> Result<SessionJobResult, String> {
    match job {
        SessionWorkerJob::GetDeviceInfo => catch_adb_panic("session_get_device_info", || {
            adb_get_device_info_inner(serial).map(DeviceInfoResult)
        }),
        SessionWorkerJob::ShellCommand { command } => {
            catch_adb_panic("session_shell_command", || {
                adb_shell_command_inner(serial, command).map(ShellOutput)
            })
        }
        SessionWorkerJob::TcpIp { port } => catch_adb_panic("session_tcpip", || {
            adb_tcpip_inner(serial, *port).map(|_| Unit)
        }),
        SessionWorkerJob::Root => {
            catch_adb_panic("session_root", || adb_root_inner(serial).map(|_| Unit))
        }
        SessionWorkerJob::Reboot { mode } => catch_adb_panic("session_reboot", || {
            adb_reboot_inner(serial, mode.as_deref()).map(|_| Unit)
        }),
        SessionWorkerJob::ListPackages { scope } => {
            catch_adb_panic("session_list_packages", || {
                adb_list_packages_inner(serial, *scope).map(Packages)
            })
        }
        SessionWorkerJob::CancelPackages => catch_adb_panic("session_cancel_list_packages", || {
            adb_cancel_list_packages_inner(serial);
            Ok(Unit)
        }),
        SessionWorkerJob::OpenPackage { package_name } => {
            catch_adb_panic("session_open_package", || {
                adb_open_package_inner(serial, package_name).map(ShellOutput)
            })
        }
        SessionWorkerJob::Reverse {
            remote_port,
            local_port,
        } => catch_adb_panic("session_reverse", || {
            adb_reverse_inner(serial, *remote_port, *local_port).map(|_| Unit)
        }),
        SessionWorkerJob::RemoveReverse { remote_port } => {
            catch_adb_panic("session_remove_reverse", || {
                adb_remove_reverse_inner(serial, *remote_port).map(|_| Unit)
            })
        }
        SessionWorkerJob::ListReverse => catch_adb_panic("session_list_reverse", || {
            adb_list_reverse_inner(serial).map(ReverseRules)
        }),
        SessionWorkerJob::ListWebViewSockets => {
            catch_adb_panic("session_list_webview_sockets", || {
                adb_list_webview_sockets_inner(serial).map(WebViewSockets)
            })
        }
        SessionWorkerJob::RefreshTargets => catch_adb_panic("session_refresh_targets", || {
            let updated_at = now_millis();
            adb_discover_targets_inner(serial)
                .map(|targets| {
                    targets
                        .into_iter()
                        .map(|target| to_target_snapshot(serial, updated_at, target))
                        .collect::<Vec<_>>()
                })
                .map(Targets)
        }),
    }
}
