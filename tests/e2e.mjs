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
  const blocked = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/holes/") || url.includes("ign.es") || url.includes("pnoa")) blocked.push(url);
  });
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.go === "function");
  const version = await page.locator(".app-version").innerText();
  if (version.trim() !== "4.1.4") throw new Error("versión en inicio: " + version);
  await page.evaluate(() => go("hole"));
  const nav = await page.locator("#screen-hole .hole-nav .btn").first().boundingBox();
  if (!nav || nav.height < 48) throw new Error("pie del hoyo por debajo de 48px: " + JSON.stringify(nav));
  if (await page.locator("#holeBagBtn").count()) throw new Error("la bolsa sigue en el hoyo");
  if (await page.locator("#holeFotoLink, #holeFotoImg, #holeFotoPane").count()) throw new Error("sigue la UI de mapas");
  const access = await page.locator("#holeAccess").innerText();
  if (/Mapa/i.test(access)) throw new Error("la ficha Mapa sigue: " + access);
  const tel = await page.locator("#holeCallCaddie").getAttribute("href");
  if (tel !== "tel:+34918905111") throw new Error("el teléfono del caddie cambió");
  await page.locator('#playerCarousel button[aria-label="Más"]').click();
  const holeAfter = await page.evaluate(() => {
    const p = (typeof PLAYERS !== "undefined") ? PLAYERS[0] : null;
    return p && p.scores ? p.scores[state.hole] : null;
  });
  if (holeAfter == null) throw new Error("el golpe no se anotó");
  await page.locator("#holeNextBtn").click();
  const holeNum = (await page.locator("#holeNum").innerText()).trim();
  if (holeNum !== "2") throw new Error("siguiente hoyo no avanzó: " + holeNum);
  await page.locator("#screen-hole .topnav .btn-icon").click();
  const onHome = await page.locator("#screen-home").evaluate((el) => el.classList.contains("active"));
  if (!onHome) throw new Error("el atrás del marcador no volvió a Inicio");
  await page.evaluate(() => go("scorecard"));
  const onCard = await page.locator("#screen-scorecard").evaluate((el) => el.classList.contains("active"));
  if (!onCard) throw new Error("la tarjeta no abrió");
  await page.locator("#screen-scorecard .topnav .btn-icon").click();
  if (!(await page.locator("#inviteSheet").count())) throw new Error("falta la hoja de invitar");
  await page.evaluate(() => go("perfil"));
  const drive = await page.locator("#perfilBody").innerText();
  if (!drive.includes("Conectar Google Drive")) throw new Error("Drive no está en el perfil");
  if (!drive.includes("4.1.4")) throw new Error("el perfil no dice 4.1.4");
  if (blocked.length) throw new Error("pidió mapas: " + blocked.join(", "));
  if (errors.length) throw new Error(errors.join("\n"));
  const shot = process.env.E2E_SHOT;
  if (shot) await page.screenshot({ path: shot, fullPage: true });
  console.log("e2e ok", { port, navHeight: nav.height, strokes: holeAfter });
} finally {
  if (browser) await browser.close();
  server.close();
}
