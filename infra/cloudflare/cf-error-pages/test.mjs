// Quick local check of the worker's routing logic: node infra/cloudflare/cf-error-pages/test.mjs
import assert from "node:assert/strict";
import worker from "./src/index.js";

const json401 = () =>
  new Response('{"error":"Invalid email or password","code":"INVALID_CREDENTIALS"}', {
    status: 401,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://gem.aidanlenahan.com" },
  });

async function run(url, init, originResponse) {
  globalThis.fetch = async () => (originResponse instanceof Error ? Promise.reject(originResponse) : originResponse());
  return worker.fetch(new Request(url, init));
}

// API 401 from fetch() keeps JSON body + CORS header
let r = await run("https://api-gem.aidanlenahan.com/auth/login", { method: "POST", headers: { Origin: "https://gem.aidanlenahan.com" } }, json401);
assert.equal(r.status, 401);
assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://gem.aidanlenahan.com");
assert.match(await r.text(), /INVALID_CREDENTIALS/);

// API host even with navigation headers passes through
r = await run("https://api-gem.aidanlenahan.com/users/me", { headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" } }, json401);
assert.match(r.headers.get("Content-Type"), /json/);

// API origin down → JSON 503 with CORS for allowed origin
r = await run("https://api-gem.aidanlenahan.com/users/me", { headers: { Origin: "https://gem.aidanlenahan.com" } }, new Error("tunnel down"));
assert.equal(r.status, 503);
assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://gem.aidanlenahan.com");
assert.match(r.headers.get("Content-Type"), /json/);

// Web navigation with a bare 502 → branded HTML
r = await run("https://gem.aidanlenahan.com/", { headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" } }, () => new Response("bad gateway", { status: 502 }));
assert.equal(r.status, 502);
assert.match(await r.text(), /Bad Gateway/);

// Web navigation down → branded 503
r = await run("https://gem.aidanlenahan.com/", { headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" } }, new Error("down"));
assert.equal(r.status, 503);
assert.match(await r.text(), /<title>503/);

// Static asset 404 on web host passes through
r = await run("https://gem.aidanlenahan.com/assets/x.js", { headers: { Accept: "*/*", "Sec-Fetch-Mode": "no-cors" } }, () => new Response("nope", { status: 404 }));
assert.equal(await r.text(), "nope");

console.log("cf-error-pages: all checks passed");
