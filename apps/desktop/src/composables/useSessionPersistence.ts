const KEYS = {
  deviceSerial: "capubridge:device-serial",
  targetUrl: "capubridge:target-url",
  chromePort: "capubridge:chrome-port",
} as const;

export function saveSelectedDeviceSerial(serial: string) {
  localStorage.setItem(KEYS.deviceSerial, serial);
}

export function restoreSelectedDeviceSerial(): string | null {
  return localStorage.getItem(KEYS.deviceSerial);
}

export function saveSelectedTargetUrl(url: string) {
  localStorage.setItem(KEYS.targetUrl, url);
}

export function restoreSelectedTargetUrl(): string | null {
  return localStorage.getItem(KEYS.targetUrl);
}

export function saveChromePort(port: number) {
  localStorage.setItem(KEYS.chromePort, String(port));
}

export function restoreChromePort(): number | null {
  const saved = localStorage.getItem(KEYS.chromePort);
  if (!saved) return null;
  const port = parseInt(saved, 10);
  return isNaN(port) ? null : port;
}
