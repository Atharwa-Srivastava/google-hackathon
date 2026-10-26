import { backendVisionUrl, BackendConfigurationError, type BackendConnectionEnv } from "./backend-config.ts";
const litter = new Set(["model.json", "name_map.json", ...Array.from({ length: 7 }, (_, i) => `group1-shard${i + 1}of7.bin`)]);
const household = new Set(["model.json", ...Array.from({ length: 5 }, (_, i) => `group1-shard${i + 1}of5`)]);
export function isVisionAsset(path: string) {
  if (["tf.min.js", "coco-ssd.min.js"].includes(path)) return true;
  const [dir, file, ...rest] = path.split("/");
  return rest.length === 0 && !!file && (dir === "model" ? litter.has(file) : dir === "household" ? household.has(file) : false);
}
export async function proxyVision(request: Request, path: string, env: BackendConnectionEnv, fetcher: typeof fetch = fetch) {
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (!isVisionAsset(path)) return fail("Unknown detector asset.", 404);
  try {
    const response = await fetcher(backendVisionUrl(env, path), {
      headers: { "ngrok-skip-browser-warning": "true", "x-api-client": "wastewise" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]), redirect: "manual",
    });
    if (!response.ok) return fail(`Backend detector download failed (HTTP ${response.status}).`, 502);
    const type = response.headers.get("content-type") || "";
    if (/text\/html/i.test(type)) return fail("The backend returned an HTML page instead of a detector asset. Check the backend URL/tunnel.", 502);
    return new Response(response.body, { headers: {
      "Content-Type": path.endsWith(".js") ? "text/javascript" : path.endsWith(".json") ? "application/json" : "application/octet-stream",
      "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff",
    } });
  } catch (e) {
    return fail(e instanceof BackendConfigurationError ? e.message : "Cannot download detector assets from the configured backend.", e instanceof BackendConfigurationError ? 503 : 502);
  }
}
