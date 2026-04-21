export type SessionTrackerStatus = "stopped" | "starting" | "running" | "error";

export type SessionTemperature = "cold" | "warm" | "hot";

export type SessionDeviceStatus =
  | "online"
  | "offline"
  | "unauthorized"
  | "connecting"
  | "bootloader"
  | "host"
  | "recovery"
  | "sideload"
  | "no_device"
  | "authorizing"
  | "no_perm"
  | "detached"
  | "rescue";

export interface SessionDeviceSnapshot {
  serial: string;
  model: string;
  product: string;
  transportId: string;
  connectionType: string;
  status: SessionDeviceStatus;
  temperature: SessionTemperature;
  isStale: boolean;
  lastSeenAt: number | null;
  lastUpdatedAt: number;
}

export interface SessionRegistrySnapshot {
  devices: SessionDeviceSnapshot[];
  activeSerial: string | null;
  trackerStatus: SessionTrackerStatus;
  revision: number;
  lastError: string | null;
  updatedAt: number;
}

export interface SessionTargetSnapshot {
  serial: string;
  id: string;
  type: string;
  title: string;
  url: string;
  devtoolsFrontendUrl?: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
  packageName?: string;
  isStale: boolean;
  lastUpdatedAt: number;
}

export type SessionEvent = {
  type: "registryUpdated";
  snapshot: SessionRegistrySnapshot;
};
