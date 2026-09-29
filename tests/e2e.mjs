/**
 * Optional browser check. Not part of `node tests/run.mjs`.
 * Needs Playwright (PLAYWRIGHT_MODULE) and a Chrome binary (CHROME_PATH).
 * GitHub Actions does not run this: the account cannot start jobs, and the
 * unit gate stays free of npm.
 */
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = normalize(join(root, rel));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const body = readFileSync(file);
      statSync(file);
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch (e) {
      res.writeHead(404);
      res.end("missing");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const server = await startServer();
const port = server.address().port;
let browser;
try {
  const mod = process.env.PLAYWRIGHT_MODULE || "playwright";
  const { chromium } = await import(mod);
  const executablePath = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.go === "function");
  await page.evaluate(() => go("hole"));
  const nav = await page.locator("#screen-hole .hole-nav .btn").first().boundingBox();
  if (!nav || nav.height < 48) throw new Error("pie del hoyo por debajo de 48px: " + JSON.stringify(nav));
  if (await page.locator("#holeBagBtn").count()) throw new Error("la bolsa sigue en el hoyo");
  const tel = await page.locator("#holeCallCaddie").getAttribute("href");
  if (tel !== "tel:+34918905111") throw new Error("el teléfono del caddie cambió");
  if (errors.length) throw new Error(errors.join("\n"));
  const shot = process.env.E2E_SHOT;
  if (shot) await page.screenshot({ path: shot, fullPage: true });
  console.log("e2e ok", { port, navHeight: nav.height });
} finally {
  if (browser) await browser.close();
  server.close();
}
