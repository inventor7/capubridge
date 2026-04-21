import { Context, Data, Effect } from "effect";
import type { TauriInvokeError, TauriListenError } from "@/runtime/effect/tauri";
import type { AdbPackage, DeviceInfo, ReverseRule, WebViewSocket } from "@/types/adb.types";
import type {
  SessionDeviceSnapshot,
  SessionEvent,
  SessionLeaseState,
  SessionRegistrySnapshot,
  SessionTargetSnapshot,
} from "@/types/session.types";

export type SessionPackageScope = "third-party" | "all";

export class SessionInterruptedError extends Data.TaggedError("SessionInterruptedError")<{
  operation: string;
}> {}

export class SessionCommandFailedError extends Data.TaggedError("SessionCommandFailedError")<{
  operation: string;
  cause: unknown;
}> {}

export interface SessionBridgeService {
  getRegistryState: () => Effect.Effect<SessionRegistrySnapshot, TauriInvokeError>;
  listDevices: () => Effect.Effect<SessionDeviceSnapshot[], TauriInvokeError>;
  refreshDevices: () => Effect.Effect<SessionRegistrySnapshot, TauriInvokeError>;
  setActiveDevice: (
    serial: string | null,
  ) => Effect.Effect<SessionRegistrySnapshot, TauriInvokeError>;
  getDeviceInfo: (serial: string) => Effect.Effect<DeviceInfo, TauriInvokeError>;
  shellCommand: (serial: string, command: string) => Effect.Effect<string, TauriInvokeError>;
  tcpip: (serial: string, port: number) => Effect.Effect<void, TauriInvokeError>;
  root: (serial: string) => Effect.Effect<void, TauriInvokeError>;
  reboot: (
    serial: string,
    mode?: "recovery" | "bootloader",
  ) => Effect.Effect<void, TauriInvokeError>;
  listPackages: (
    serial: string,
    scope?: SessionPackageScope,
  ) => Effect.Effect<AdbPackage[], TauriInvokeError>;
  refreshPackages: (
    serial: string,
    scope?: SessionPackageScope,
  ) => Effect.Effect<AdbPackage[], TauriInvokeError>;
  cancelPackages: (serial: string) => Effect.Effect<void, TauriInvokeError>;
  openPackage: (serial: string, packageName: string) => Effect.Effect<string, TauriInvokeError>;
  reverse: (
    serial: string,
    remotePort: number,
    localPort: number,
  ) => Effect.Effect<void, TauriInvokeError>;
  removeReverse: (serial: string, remotePort: number) => Effect.Effect<void, TauriInvokeError>;
  listReverse: (serial: string) => Effect.Effect<ReverseRule[], TauriInvokeError>;
  listWebViewSockets: (serial: string) => Effect.Effect<WebViewSocket[], TauriInvokeError>;
  listTargets: (serial: string) => Effect.Effect<SessionTargetSnapshot[], TauriInvokeError>;
  refreshTargets: (serial: string) => Effect.Effect<SessionTargetSnapshot[], TauriInvokeError>;
  startLogcatLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  stopLogcatLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  startPerfLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  stopPerfLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  startMirrorLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  stopMirrorLease: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  attachConsoleTarget: (
    serial: string,
    targetId: string,
  ) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  detachConsoleTarget: (serial: string) => Effect.Effect<SessionLeaseState, TauriInvokeError>;
  subscribe: (
    onEvent: (event: SessionEvent) => void,
  ) => Effect.Effect<() => void, TauriListenError>;
}

export class SessionBridge extends Context.Tag("SessionBridge")<
  SessionBridge,
  SessionBridgeService
>() {}

export function isSessionInterruptedError(error: unknown): error is SessionInterruptedError {
  return error instanceof SessionInterruptedError;
}
