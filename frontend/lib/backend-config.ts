/** Server-only connection configuration. Never derive the upstream from browser input. */
export type BackendConnectionEnv = { WASTEWISE_API_BASE_URL?: string };
export class BackendConfigurationError extends Error {}
export function backendRoot(env: BackendConnectionEnv): URL {
  const value = env.WASTEWISE_API_BASE_URL?.trim();
  if (!value) throw new BackendConfigurationError("Set WASTEWISE_API_BASE_URL in the frontend server environment, then restart the frontend.");
  let url: URL;
  try { url = new URL(value); } catch { throw new BackendConfigurationError("WASTEWISE_API_BASE_URL must be a complete http:// or https:// URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new BackendConfigurationError("Use an HTTP(S) backend base URL without credentials, query parameters or a fragment.");
  // Accept either the server root or its /api prefix, preserving reverse-proxy prefixes.
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "") + "/";
  return url;
}
export function backendApiUrl(env: BackendConnectionEnv, endpoint: string): URL {
  return new URL("api/" + endpoint, backendRoot(env));
}
export function backendVisionUrl(env: BackendConnectionEnv, path: string): URL {
  return new URL("vision/" + path, backendRoot(env));
}
