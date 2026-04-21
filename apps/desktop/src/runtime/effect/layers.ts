import { Layer } from "effect";
import { invokeEffect, listenEffect } from "@/runtime/effect/tauri";
import { SessionBridge, type SessionPackageScope } from "@/runtime/effect/tags";
import type { AdbPackage, DeviceInfo, ReverseRule, WebViewSocket } from "@/types/adb.types";
import type {
  SessionDeviceSnapshot,
  SessionEvent,
  SessionLeaseState,
  SessionRegistrySnapshot,
  SessionTargetSnapshot,
} from "@/types/session.types";

const SESSION_EVENT_NAME = "capubridge:session-event";

export const SessionBridgeLive = Layer.succeed(SessionBridge, {
  getRegistryState: () => invokeEffect<SessionRegistrySnapshot>("session_get_registry_state"),
  listDevices: () => invokeEffect<SessionDeviceSnapshot[]>("session_list_devices"),
  refreshDevices: () => invokeEffect<SessionRegistrySnapshot>("session_refresh_devices"),
  setActiveDevice: (serial: string | null) =>
    invokeEffect<SessionRegistrySnapshot>("session_set_active_device", { serial }),
  getDeviceInfo: (serial: string) =>
    invokeEffect<DeviceInfo>("session_get_device_info", { serial }),
  shellCommand: (serial: string, command: string) =>
    invokeEffect<string>("session_shell_command", { serial, command }),
  tcpip: (serial: string, port: number) => invokeEffect<void>("session_tcpip", { serial, port }),
  root: (serial: string) => invokeEffect<void>("session_root", { serial }),
  reboot: (serial: string, mode?: "recovery" | "bootloader") =>
    invokeEffect<void>("session_reboot", { serial, mode }),
  listPackages: (serial: string, scope?: SessionPackageScope) =>
    invokeEffect<AdbPackage[]>("session_list_packages", { serial, scope }),
  refreshPackages: (serial: string, scope?: SessionPackageScope) =>
    invokeEffect<AdbPackage[]>("session_refresh_packages", { serial, scope }),
  cancelPackages: (serial: string) =>
    invokeEffect<void>("session_cancel_list_packages", { serial }),
  openPackage: (serial: string, packageName: string) =>
    invokeEffect<string>("session_open_package", { serial, packageName }),
  reverse: (serial: string, remotePort: number, localPort: number) =>
    invokeEffect<void>("session_reverse", { serial, remotePort, localPort }),
  removeReverse: (serial: string, remotePort: number) =>
    invokeEffect<void>("session_remove_reverse", { serial, remotePort }),
  listReverse: (serial: string) => invokeEffect<ReverseRule[]>("session_list_reverse", { serial }),
  listWebViewSockets: (serial: string) =>
    invokeEffect<WebViewSocket[]>("session_list_webview_sockets", { serial }),
  listTargets: (serial: string) =>
    invokeEffect<SessionTargetSnapshot[]>("session_list_targets", { serial }),
  refreshTargets: (serial: string) =>
    invokeEffect<SessionTargetSnapshot[]>("session_refresh_targets", { serial }),
  startLogcatLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_start_logcat_lease", { serial }),
  stopLogcatLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_stop_logcat_lease", { serial }),
  startPerfLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_start_perf_lease", { serial }),
  stopPerfLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_stop_perf_lease", { serial }),
  startMirrorLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_start_mirror_lease", { serial }),
  stopMirrorLease: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_stop_mirror_lease", { serial }),
  attachConsoleTarget: (serial: string, targetId: string) =>
    invokeEffect<SessionLeaseState>("session_attach_console_target", { serial, targetId }),
  detachConsoleTarget: (serial: string) =>
    invokeEffect<SessionLeaseState>("session_detach_console_target", { serial }),
  subscribe: (onEvent: (event: SessionEvent) => void) =>
    listenEffect<SessionEvent>(SESSION_EVENT_NAME, onEvent),
});
