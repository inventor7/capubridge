export interface CDPTarget {
  id: string;
  type: "page" | "background_page" | "worker" | "iframe";
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  deviceSerial?: string;
  faviconUrl?: string;
}

export interface CDPConnection {
  targetId: string;
  ws: WebSocket;
  sessionId?: string;
  status: "connecting" | "connected" | "disconnected" | "error";
}
