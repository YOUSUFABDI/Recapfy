export function loadToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("auth:token")
  } catch {
    return null
  }
}
