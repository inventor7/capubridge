import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { CDPTarget, CDPConnection } from "@/types/cdp.types";

export const useConnectionStore = defineStore("connection", () => {
  // Map: targetId → CDPConnection
  const connections = ref<Map<string, CDPConnection>>(new Map());

  const activeConnection = computed(() => {
    for (const conn of connections.value.values()) {
      if (conn.status === "connected") return conn;
    }
    return null;
  });

  async function connect(target: CDPTarget): Promise<CDPConnection> {
    // Close any existing connection to this target
    const existing = connections.value.get(target.id);
    if (existing?.ws.readyState === WebSocket.OPEN) {
      return existing;
    }

    const conn: CDPConnection = {
      targetId: target.id,
      ws: new WebSocket(target.webSocketDebuggerUrl),
      status: "connecting",
    };

    connections.value.set(target.id, conn);

    return new Promise((resolve, reject) => {
      conn.ws.addEventListener("open", () => {
        conn.status = "connected";
        resolve(conn);
      });

      conn.ws.addEventListener("close", () => {
        conn.status = "disconnected";
      });

      conn.ws.addEventListener("error", () => {
        conn.status = "error";
        reject(new Error(`WebSocket error connecting to ${target.url}`));
      });
    });
  }

  function disconnect(targetId: string) {
    const conn = connections.value.get(targetId);
    if (conn) {
      conn.ws.close();
      connections.value.delete(targetId);
    }
  }

  function getConnection(targetId: string): CDPConnection | undefined {
    return connections.value.get(targetId);
  }

  function setStatus(targetId: string, status: CDPConnection["status"]) {
    const conn = connections.value.get(targetId);
    if (conn) conn.status = status;
  }

  return {
    connections,
    activeConnection,
    connect,
    disconnect,
    getConnection,
    setStatus,
  };
});
