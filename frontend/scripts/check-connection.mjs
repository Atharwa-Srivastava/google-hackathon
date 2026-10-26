// No credentials or provider keys are printed. Run after editing .env.
import { backendApiUrl, backendVisionUrl } from "../lib/backend-config.ts";
try { process.loadEnvFile(".env"); } catch (e) { if (e.code !== "ENOENT") throw e; }
const env = process.env;
let failed = false;
const checks = [
  ["config", "GET"], ["rules", "GET"], ["catalog?q=bottle", "GET"],
  ["dlc/bins", "GET"], ["classify", "POST", {text: "banana peel"}],
];
for (const [endpoint, method, body] of checks) {
  const url = backendApiUrl(env, endpoint);
  const response = await fetch(url, {method, headers: {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true", "x-api-client": "wastewise"}, ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(10000)});
  const data = await response.json().catch(() => null);
  console.log(`${method} ${url.pathname}: ${response.status}${!data ? " (not JSON)" : ""}`);
  failed ||= !response.ok || !data;
}
const vision = await fetch(backendVisionUrl(env, "model/model.json"), {headers: {"ngrok-skip-browser-warning": "true"}, signal: AbortSignal.timeout(20000)});
const model = await vision.json().catch(() => null);
console.log(`Detector model manifest: ${vision.status}`);
failed ||= !vision.ok || !model?.weightsManifest;
process.exitCode = failed ? 1 : 0;
