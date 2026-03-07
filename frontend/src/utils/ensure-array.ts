export function ensureArray<T>(resp: unknown): T[] {
  // Accept: raw array, {payload: [...]}, {data: [...]}, {items: [...]}
  if (Array.isArray(resp)) return resp as T[];
  if (resp && typeof resp === "object") {
    const anyResp = resp as any;
    if (Array.isArray(anyResp.payload)) return anyResp.payload as T[];
    if (Array.isArray(anyResp.data)) return anyResp.data as T[];
    if (Array.isArray(anyResp.items)) return anyResp.items as T[];
    if (Array.isArray(anyResp?.payload?.data))
      return anyResp.payload.data as T[];
    if (Array.isArray(anyResp?.payload?.items))
      return anyResp.payload.items as T[];
  }
  return [];
}
