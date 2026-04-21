import { Data, Effect } from "effect";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export class TauriInvokeError extends Data.TaggedError("TauriInvokeError")<{
  command: string;
  cause: unknown;
}> {}

export class TauriListenError extends Data.TaggedError("TauriListenError")<{
  eventName: string;
  cause: unknown;
}> {}

export function invokeEffect<Result>(
  command: string,
  args?: Record<string, unknown>,
): Effect.Effect<Result, TauriInvokeError> {
  return Effect.tryPromise({
    try: () => invoke<Result>(command, args),
    catch: (cause) => new TauriInvokeError({ command, cause }),
  });
}

export function listenEffect<Payload>(
  eventName: string,
  onMessage: (payload: Payload) => void,
): Effect.Effect<() => void, TauriListenError> {
  return Effect.tryPromise({
    try: () =>
      listen<Payload>(eventName, (event) => {
        onMessage(event.payload);
      }),
    catch: (cause) => new TauriListenError({ eventName, cause }),
  });
}
