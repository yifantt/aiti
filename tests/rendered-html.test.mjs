import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AITI home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AITI｜你的 AI 使用人格<\/title>/i);
  assert.match(html, /测测你的/);
  assert.match(html, /aria-label="AI"/);
  assert.match(html, /hero-title-word">人格/);
  assert.match(html, /24 题/);
  assert.match(html, /19 种人格/);
  assert.match(html, /开始测试/);
  assert.match(html, /人格图鉴/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the pixel title treatment in source", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../app/AitiApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /function PixelAI\(\)/);
  assert.match(app, /className="hero-title-second"/);
  assert.match(app, /className="hero-title-word">人格/);
  assert.match(css, /\.hero-title-second/);
  assert.match(css, /\.hero-ai[^}]*drop-shadow\([^)]*var\(--acid\)\)/s);
  assert.match(css, /\.pixel-letter \.pixel-on\s*\{[^}]*var\(--ink\)/s);
  assert.doesNotMatch(css, /\.pixel-letter \.pixel-accent/);
});
