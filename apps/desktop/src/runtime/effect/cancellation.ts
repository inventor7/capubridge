import { SessionCommandFailedError, SessionInterruptedError } from "@/runtime/effect/tags";

export interface SessionRequestOptions {
  signal?: AbortSignal;
  operation: string;
}

export function normalizeSessionError(cause: unknown, options: SessionRequestOptions): never {
  if (options.signal?.aborted) {
    throw new SessionInterruptedError({ operation: options.operation });
  }

  throw new SessionCommandFailedError({
    operation: options.operation,
    cause,
  });
}
