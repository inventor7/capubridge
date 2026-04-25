import { buildInjectionScript } from "@/lib/replay/rrweb-inject-script";
import type { CDPClient } from "utils";
import type { useSessionWriter } from "./useSessionWriter";

type Writer = ReturnType<typeof useSessionWriter>;

/**
 * Manages rrweb injection into a CDP target WebView.
 *
 * Flow:
 * 1. Call Runtime.addBinding to create the `__capuEmit` bridge in the target
 * 2. Call Page.addScriptToEvaluateOnNewDocument to inject the rrweb recorder
 *    (persists across full navigations, rrweb keeps running on SPA pushState)
 * 3. Listen for Runtime.bindingCalled events → parse batch → push to writer
 * 4. On stop: remove the script + binding
 *
 * @param client — The CDPClient instance for the active target
 * @param writer — The session writer for this recording session
 */
export function useRrwebRecorder(client: CDPClient, writer: Writer) {
  const BINDING_NAME = "__capuEmit";
  let scriptIdentifier: string | null = null;
  let cleanupHandler: (() => void) | null = null;

  async function start(opts: { reloadTarget: boolean }) {
    // 1. Register the binding — creates window.__capuEmit in the target JS context
    await client.send("Runtime.addBinding", { name: BINDING_NAME });

    // 2. Inject the rrweb recorder script (survives full-page navigations)
    const script = buildInjectionScript();
    const response = await client.send<{ identifier: string }>(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: script },
    );
    scriptIdentifier = response.identifier;

    // 3. Listen for binding calls (each call = one batch of rrweb events).
    // CDPClient.on() returns an unsubscribe function — store it for cleanup.
    const handler = (params: unknown) => {
      const p = params as { name: string; payload: string };
      if (p.name !== BINDING_NAME) return;
      try {
        const events = JSON.parse(p.payload) as Array<{ timestamp: number; [k: string]: unknown }>;
        for (const event of events) {
          // Use rrweb's own timestamp as the wall time for accurate offsets
          writer.pushAt("rrweb", event, event.timestamp);
        }
      } catch {
        // Malformed payload — skip
      }
    };

    // on() returns an unsubscribe fn — CDPClient has no separate .off() method
    const unsub = client.on("Runtime.bindingCalled", handler);
    cleanupHandler = unsub;

    // 4. Optionally reload the target so rrweb initialises from a clean page load
    if (opts.reloadTarget) {
      await client.send("Page.reload", {});
    }
  }

  async function stop() {
    // Remove the persistent script injection
    if (scriptIdentifier) {
      try {
        await client.send("Page.removeScriptToEvaluateOnNewDocument", {
          identifier: scriptIdentifier,
        });
      } catch {
        // Best-effort — target may have disconnected
      }
      scriptIdentifier = null;
    }

    // Remove the binding
    try {
      await client.send("Runtime.removeBinding", { name: BINDING_NAME });
    } catch {
      // Best-effort
    }

    // Detach event listener
    cleanupHandler?.();
    cleanupHandler = null;
  }

  return { start, stop };
}
