import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

export function extractRtkErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === "string") return err;

  // RTK FetchBaseQueryError has .status and .data
  const fetchErr = err as FetchBaseQueryError;
  if (fetchErr && (fetchErr as any).status !== undefined) {
    const data = (fetchErr as any).data;

    // 1) Your server envelope: { statusCode, data, error: { message, ... } }
    if (data && typeof data === "object") {
      const maybeMsg =
        // inner `error.message`
        (data as any)?.error?.message ||
        // sometimes backends put message at top-level data.message
        (data as any)?.message ||
        // very common: data.error or data.errors
        (data as any)?.error ||
        (data as any)?.errors;

      if (typeof maybeMsg === "string") return maybeMsg;
      if (maybeMsg && typeof maybeMsg === "object") {
        // if it's an object with message
        if (typeof (maybeMsg as any).message === "string")
          return (maybeMsg as any).message;
      }

      // fallback: stringify smaller objects so UX is readable
      try {
        const s = JSON.stringify(data);
        if (s && s !== "{}" && s.length < 300) return s;
      } catch {
        // ignore
      }
    }

    // fallback to status code text
    return `HTTP ${String((fetchErr as any).status)}`;
  }

  // SerializedError from Redux createAsyncThunk
  const ser = err as SerializedError;
  if (ser && typeof ser.message === "string") return ser.message;

  // last resort: try picking common nested props
  if (typeof (err as any)?.message === "string") return (err as any).message;
  try {
    return String(err);
  } catch {
    return null;
  }
}
