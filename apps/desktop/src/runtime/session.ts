import { Effect } from "effect";
import { invokeEffect, listenEffect } from "@/runtime/effect/tauri";
import { normalizeSessionError, type SessionRequestOptions } from "@/runtime/effect/cancellation";
import type { SessionPackageScope } from "@/runtime/effect/tags";
import type { AdbPackage, DeviceInfo, ReverseRule, WebViewSocket } from "@/types/adb.types";
import type {
  SessionDeviceSnapshot,
  SessionEvent,
  SessionRegistrySnapshot,
  SessionTargetSnapshot,
} from "@/types/session.types";

export const SESSION_EVENT_NAME = "capubridge:session-event";

export function getRegistryStateEffect() {
  return invokeEffect<SessionRegistrySnapshot>("session_get_registry_state");
}

export function listDevicesEffect() {
  return invokeEffect<SessionDeviceSnapshot[]>("session_list_devices");
}

export function refreshDevicesEffect() {
  return invokeEffect<SessionRegistrySnapshot>("session_refresh_devices");
}

export function setActiveDeviceEffect(serial: string | null) {
  return invokeEffect<SessionRegistrySnapshot>("session_set_active_device", { serial });
}

export function getDeviceInfoEffect(serial: string) {
  return invokeEffect<DeviceInfo>("session_get_device_info", { serial });
}

export function shellCommandEffect(serial: string, command: string) {
  return invokeEffect<string>("session_shell_command", { serial, command });
}

export function tcpipEffect(serial: string, port: number) {
  return invokeEffect<void>("session_tcpip", { serial, port });
}

export function rootEffect(serial: string) {
  return invokeEffect<void>("session_root", { serial });
}

export function rebootEffect(serial: string, mode?: "recovery" | "bootloader") {
  return invokeEffect<void>("session_reboot", { serial, mode });
}

export function listPackagesEffect(serial: string, scope: SessionPackageScope = "all") {
  return invokeEffect<AdbPackage[]>("session_list_packages", { serial, scope });
}

export function refreshPackagesEffect(serial: string, scope: SessionPackageScope = "all") {
  return invokeEffect<AdbPackage[]>("session_refresh_packages", { serial, scope });
}

export function cancelListPackagesEffect(serial: string) {
  return invokeEffect<void>("session_cancel_list_packages", { serial });
}

export function openPackageEffect(serial: string, packageName: string) {
  return invokeEffect<string>("session_open_package", { serial, packageName });
}

export function reverseEffect(serial: string, remotePort: number, localPort: number) {
  return invokeEffect<void>("session_reverse", { serial, remotePort, localPort });
}

export function removeReverseEffect(serial: string, remotePort: number) {
  return invokeEffect<void>("session_remove_reverse", { serial, remotePort });
}

export function listReverseEffect(serial: string) {
  return invokeEffect<ReverseRule[]>("session_list_reverse", { serial });
}

export function listWebViewSocketsEffect(serial: string) {
  return invokeEffect<WebViewSocket[]>("session_list_webview_sockets", { serial });
}

export function listTargetsEffect(serial: string) {
  return invokeEffect<SessionTargetSnapshot[]>("session_list_targets", { serial });
}

export function refreshTargetsEffect(serial: string) {
  return invokeEffect<SessionTargetSnapshot[]>("session_refresh_targets", { serial });
}

export function subscribeSessionEventsEffect(onEvent: (event: SessionEvent) => void) {
  return listenEffect<SessionEvent>(SESSION_EVENT_NAME, onEvent);
}

export function runSessionEffect<Success, Error>(
  effect: Effect.Effect<Success, Error>,
  options: SessionRequestOptions,
): Promise<Success> {
  return Effect.runPromise(effect, { signal: options.signal }).catch((cause) =>
    normalizeSessionError(cause, options),
  );
}
