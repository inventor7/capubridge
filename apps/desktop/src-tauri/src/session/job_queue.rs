use std::collections::HashMap;
use std::sync::mpsc;

use parking_lot::Mutex;

use crate::commands::adb::{AdbPackage, DeviceInfo, PackageListScope, ReverseRule, WebViewSocket};
use crate::session::types::SessionTargetSnapshot;

#[derive(Debug, Clone)]
pub enum SessionJobResult {
    DeviceInfo(DeviceInfo),
    ShellOutput(String),
    Packages(Vec<AdbPackage>),
    ReverseRules(Vec<ReverseRule>),
    WebViewSockets(Vec<WebViewSocket>),
    Targets(Vec<SessionTargetSnapshot>),
    Unit,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SessionJobKey {
    DeviceInfo,
    Packages(PackageListScope),
    ReverseRules,
    WebViewSockets,
    Targets,
}

#[derive(Debug)]
pub enum SessionWorkerJob {
    GetDeviceInfo,
    ShellCommand { command: String },
    TcpIp { port: u16 },
    Root,
    Reboot { mode: Option<String> },
    RefreshPackages { scope: PackageListScope },
    CancelPackages,
    OpenPackage { package_name: String },
    Reverse { remote_port: u16, local_port: u16 },
    RemoveReverse { remote_port: u16 },
    ListReverse,
    ListWebViewSockets,
    RefreshTargets,
}

impl SessionWorkerJob {
    pub fn coalescing_key(&self) -> Option<SessionJobKey> {
        match self {
            Self::GetDeviceInfo => Some(SessionJobKey::DeviceInfo),
            Self::RefreshPackages { scope } => Some(SessionJobKey::Packages(*scope)),
            Self::ListReverse => Some(SessionJobKey::ReverseRules),
            Self::ListWebViewSockets => Some(SessionJobKey::WebViewSockets),
            Self::RefreshTargets => Some(SessionJobKey::Targets),
            Self::ShellCommand { .. }
            | Self::TcpIp { .. }
            | Self::Root
            | Self::Reboot { .. }
            | Self::CancelPackages
            | Self::OpenPackage { .. }
            | Self::Reverse { .. }
            | Self::RemoveReverse { .. } => None,
        }
    }
}

type SessionResponse = Result<SessionJobResult, String>;
type SessionResponseSender = mpsc::Sender<SessionResponse>;

#[derive(Debug)]
pub struct SessionWorkerRequest {
    pub job: SessionWorkerJob,
    pub response: Option<SessionResponseSender>,
}

#[derive(Debug, Default)]
struct SessionJobQueueInner {
    snapshot_waiters: HashMap<SessionJobKey, Vec<SessionResponseSender>>,
}

#[derive(Debug, Default)]
pub struct SessionJobQueue {
    inner: Mutex<SessionJobQueueInner>,
}

impl SessionJobQueue {
    pub fn enqueue(
        &self,
        sender: &mpsc::Sender<SessionWorkerRequest>,
        job: SessionWorkerJob,
    ) -> mpsc::Receiver<SessionResponse> {
        let (response_tx, response_rx) = mpsc::channel();
        let maybe_key = job.coalescing_key();

        if let Some(key) = maybe_key.clone() {
            let mut inner = self.inner.lock();
            if let Some(waiters) = inner.snapshot_waiters.get_mut(&key) {
                waiters.push(response_tx);
                return response_rx;
            }

            inner
                .snapshot_waiters
                .insert(key, vec![response_tx.clone()]);
        }

        let request = SessionWorkerRequest {
            job,
            response: maybe_key.is_none().then_some(response_tx.clone()),
        };

        if let Err(error) = sender.send(request) {
            if let Some(key) = maybe_key {
                let mut inner = self.inner.lock();
                inner.snapshot_waiters.remove(&key);
            }
            let _ = response_tx.send(Err(format!("Failed to enqueue session job: {error}")));
        }

        response_rx
    }

    pub fn resolve_snapshot(&self, key: &SessionJobKey, result: SessionResponse) {
        let waiters = {
            let mut inner = self.inner.lock();
            inner.snapshot_waiters.remove(key).unwrap_or_default()
        };

        for waiter in waiters {
            let _ = waiter.send(result.clone());
        }
    }

    pub fn resolve_direct(response: Option<SessionResponseSender>, result: SessionResponse) {
        if let Some(sender) = response {
            let _ = sender.send(result);
        }
    }
}
