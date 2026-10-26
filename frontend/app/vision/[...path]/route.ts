import { env } from "cloudflare:workers";
import { proxyVision } from "../../../lib/vision-proxy.ts";
import type { BackendConnectionEnv } from "../../../lib/backend-config.ts";

// Models and API calls follow the same server-side base URL.
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyVision(request, ((await context.params).path || []).join("/"), env as BackendConnectionEnv);
}
