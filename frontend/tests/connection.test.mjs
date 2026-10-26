import test from "node:test";
import assert from "node:assert/strict";
import { backendApiUrl, backendVisionUrl } from "../lib/backend-config.ts";
import { proxyRequest } from "../lib/wastewise-proxy.ts";
import { proxyVision } from "../lib/vision-proxy.ts";
import { readApiJson } from "../lib/api-response.ts";

test("changing one base URL moves API and models together, preserving optional prefixes", async () => {
  for (const base of ["https://one.example", "https://two.example/api/", "https://three.example/service/api"]){
    const env = { WASTEWISE_API_BASE_URL: base };
    const expected = base.replace(/\/+$/, "").replace(/\/api$/, "");
    assert.equal(backendApiUrl(env, "rules").href, expected + "/api/rules");
    assert.equal(backendVisionUrl(env, "model/model.json").href, expected + "/vision/model/model.json");
    const called = [];
    const fetcher = async (url, init) => { called.push(String(url)); assert.equal(new Headers(init.headers).get("ngrok-skip-browser-warning"), "true"); return Response.json({ rules: [], weightsManifest: [] }); };
    assert.equal((await proxyRequest(new Request("http://frontend/api/wastewise/rules"), "rules", env, fetcher)).status, 200);
    assert.equal((await proxyVision(new Request("http://frontend/vision/model/model.json"), "model/model.json", env, fetcher)).status, 200);
    assert.deepEqual(called, [expected + "/api/rules", expected + "/vision/model/model.json"]);
  }
});
test("missing/invalid backend configuration fails clearly without dialing a hidden tunnel", async () => {
  for (const base of [undefined, "", "not-a-url", "file:///tmp/data", "https://user:password@example.com", "https://example.com/?key=secret"]) {
    const env = { WASTEWISE_API_BASE_URL: base }, never = () => assert.fail("must not connect");
    assert.equal((await proxyRequest(new Request("http://frontend/api/wastewise/rules"), "rules", env, never)).status, 503);
    assert.equal((await proxyVision(new Request("http://frontend/vision/tf.min.js"), "tf.min.js", env, never)).status, 503);
  }
});
test("vision forwarding refuses traversal and HTML tunnel interstitials", async () => {
  const env = { WASTEWISE_API_BASE_URL: "https://backend.example" };
  assert.equal((await proxyVision(new Request("http://frontend/vision/x"), "../.env", env, () => assert.fail())).status, 404);
  const result = await proxyVision(new Request("http://frontend/vision/tf.min.js"), "tf.min.js", env, async () => new Response("<html>ngrok</html>", { headers: { "content-type": "text/html" } }));
  assert.equal(result.status, 502);
});
test("browser errors report status rather than JSON syntax errors or raw HTML", async () => {
  await assert.rejects(readApiJson(new Response("Internal Server Error", {status: 500})), /non-JSON.*500/);
  await assert.rejects(readApiJson(Response.json({error: "Please sign in"}, {status: 401})), /Please sign in/);
  assert.deepEqual(await readApiJson(Response.json({rules: []})), {rules: []});
});
