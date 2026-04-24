use axum::{
    body::Body,
    extract::State,
    http::{HeaderName, HeaderValue, Method, Request, StatusCode},
    response::Response,
    Router,
};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc, time};
use tauri::{AppHandle, Emitter, Manager};
use tower_http::cors::{Any, CorsLayer};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockRuleRust {
    pub id: String,
    pub method: String,
    pub url_pattern: String,
    pub url_match_type: String,
    pub status_code: u16,
    pub response_headers: Vec<[String; 2]>,
    pub response_body: String,
    pub delay_ms: u64,
}

#[derive(Clone)]
struct AxumState {
    rules: Arc<RwLock<Vec<MockRuleRust>>>,
    app: AppHandle,
}

pub struct MockServerManager {
    pub rules: Arc<RwLock<Vec<MockRuleRust>>>,
    shutdown_tx: parking_lot::Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
    pub port: parking_lot::Mutex<u16>,
}

impl MockServerManager {
    pub fn new() -> Self {
        Self {
            rules: Arc::new(RwLock::new(vec![])),
            shutdown_tx: parking_lot::Mutex::new(None),
            port: parking_lot::Mutex::new(3001),
        }
    }

    pub fn is_running(&self) -> bool {
        self.shutdown_tx.lock().is_some()
    }
}

async fn handle_any(State(state): State<Arc<AxumState>>, req: Request<Body>) -> Response<Body> {
    let method = req.method().clone();
    let uri = req.uri().to_string();

    // Handle CORS preflight
    if method == Method::OPTIONS {
        return Response::builder()
            .status(StatusCode::NO_CONTENT)
            .body(Body::empty())
            .unwrap();
    }

    let rules = state.rules.read().clone();

    for rule in &rules {
        if !matches_rule(rule, method.as_str(), &uri) {
            continue;
        }

        if rule.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay_ms)).await;
        }

        let ts = time::SystemTime::now()
            .duration_since(time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let _ = state.app.emit(
            "mock-server-request",
            serde_json::json!({
                "ruleId": rule.id,
                "method": method.as_str(),
                "url": uri,
                "statusCode": rule.status_code,
                "timestamp": ts,
            }),
        );

        let status = StatusCode::from_u16(rule.status_code).unwrap_or(StatusCode::OK);
        let mut builder = Response::builder().status(status);

        for [k, v] in &rule.response_headers {
            if let (Ok(name), Ok(val)) = (k.parse::<HeaderName>(), v.parse::<HeaderValue>()) {
                builder = builder.header(name, val);
            }
        }

        return builder
            .body(Body::from(rule.response_body.clone()))
            .unwrap_or_else(|_| Response::builder().status(500).body(Body::empty()).unwrap());
    }

    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({"error": "No mock rule matched", "method": method.as_str(), "url": uri})
                .to_string(),
        ))
        .unwrap()
}

fn matches_rule(rule: &MockRuleRust, method: &str, uri: &str) -> bool {
    if rule.method != "ANY" && !rule.method.eq_ignore_ascii_case(method) {
        return false;
    }
    match rule.url_match_type.as_str() {
        "contains" => uri.contains(rule.url_pattern.as_str()),
        "exact" => uri == rule.url_pattern,
        "glob" => glob_match(&rule.url_pattern, uri),
        "regex" => glob_match(&rule.url_pattern, uri), // fallback — no regex crate
        _ => uri.contains(rule.url_pattern.as_str()),
    }
}

fn glob_match(pattern: &str, text: &str) -> bool {
    let (pb, tb) = (pattern.as_bytes(), text.as_bytes());
    let (mut pi, mut ti) = (0usize, 0usize);
    let (mut star_pi, mut star_ti) = (usize::MAX, 0usize);

    while ti < tb.len() {
        if pi < pb.len() && (pb[pi] == b'?' || pb[pi].to_ascii_lowercase() == tb[ti].to_ascii_lowercase()) {
            pi += 1;
            ti += 1;
        } else if pi < pb.len() && pb[pi] == b'*' {
            star_pi = pi;
            star_ti = ti;
            pi += 1;
        } else if star_pi != usize::MAX {
            pi = star_pi + 1;
            star_ti += 1;
            ti = star_ti;
        } else {
            return false;
        }
    }
    while pi < pb.len() && pb[pi] == b'*' {
        pi += 1;
    }
    pi == pb.len()
}

#[tauri::command]
pub async fn mock_server_start(app: AppHandle, port: u16) -> Result<(), String> {
    let manager = app.state::<MockServerManager>();

    if manager.is_running() {
        return Err("Mock server is already running".into());
    }

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let rules = manager.rules.clone();
    let state = Arc::new(AxumState { rules, app: app.clone() });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let router = Router::new()
        .fallback(axum::routing::any(handle_any))
        .with_state(state)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind port {port}: {e}"))?;

    *manager.port.lock() = port;
    *manager.shutdown_tx.lock() = Some(shutdown_tx);

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    Ok(())
}

#[tauri::command]
pub async fn mock_server_stop(app: AppHandle) -> Result<(), String> {
    let manager = app.state::<MockServerManager>();
    if let Some(tx) = manager.shutdown_tx.lock().take() {
        let _ = tx.send(());
    }
    Ok(())
}

#[tauri::command]
pub async fn mock_server_sync_rules(
    app: AppHandle,
    rules: Vec<MockRuleRust>,
) -> Result<(), String> {
    let manager = app.state::<MockServerManager>();
    *manager.rules.write() = rules;
    Ok(())
}

#[tauri::command]
pub async fn mock_server_status(app: AppHandle) -> serde_json::Value {
    let manager = app.state::<MockServerManager>();
    serde_json::json!({
        "running": manager.is_running(),
        "port": *manager.port.lock(),
    })
}
