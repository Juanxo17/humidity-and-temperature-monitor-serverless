#!/usr/bin/env node
/**
 * Regenera el diagrama de arquitectura.
 *
 *   node docs/generar_diagrama.mjs
 *
 * 1. archify valida y renderiza docs/arquitectura.json → docs/arquitectura.html
 * 2. Chrome headless abre ese HTML (tema claro) y usa el export PNG del visor
 *    → docs/arquitectura.png (solo el diagrama, sin la interfaz del visor).
 *
 * Requisitos: Node ≥ 22 (WebSocket nativo), Google Chrome o Edge y la skill
 * archify (por defecto en ~/.claude/skills/archify; se cambia con ARCHIFY_HOME).
 * Rutas personalizadas: CHROME_PATH=... node docs/generar_diagrama.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DOCS = dirname(fileURLToPath(import.meta.url));
const SPEC = join(DOCS, "arquitectura.json");
const HTML = join(DOCS, "arquitectura.html");
const PNG = join(DOCS, "arquitectura.png");
const ARCHIFY = resolve(process.env.ARCHIFY_HOME ?? join(homedir(), ".claude", "skills", "archify"), "bin", "archify.mjs");

// ── 1. Validar y renderizar con archify ──────────────────────────────
if (!existsSync(ARCHIFY)) fail(`No se encontró archify en ${ARCHIFY}. Define ARCHIFY_HOME.`);
const r = spawnSync(process.execPath, [ARCHIFY, "deliver", "architecture", SPEC, HTML, "--quality", "showcase"], {
  stdio: "inherit",
});
if (r.status !== 0) fail("archify deliver falló; revisa los diagnósticos de arriba.");

// ── 2. Exportar PNG con Chrome headless (protocolo DevTools) ─────────
const chrome = findChrome();
const port = 9300 + Math.floor(Math.random() * 500);
const downloads = mkdtempSync(join(tmpdir(), "arquitectura-"));
const profile = mkdtempSync(join(tmpdir(), "arquitectura-profile-"));
const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--window-size=1600,1000",
  "about:blank",
]);

try {
  const version = await retry(() => fetch(`http://127.0.0.1:${port}/json/version`).then((x) => x.json()));
  const browser = await cdp(version.webSocketDebuggerUrl);
  await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });

  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((x) => x.json());
  const page = await cdp(pages.find((p) => p.type === "page").webSocketDebuggerUrl);
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await page.send("Page.enable");
  await page.send("Page.navigate", { url: pathToFileURL(HTML).href });
  await retry(async () => {
    const { result } = await page.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && !!document.querySelector('#export-menu button[data-format=\"png\"]')",
    });
    if (!result.value) throw new Error("página no lista");
  });
  await new Promise((ok) => setTimeout(ok, 800)); // fuentes y layout
  await page.send("Runtime.evaluate", {
    expression: `document.getElementById('btn-export').click();
                 document.querySelector('#export-menu button[data-format="png"]').click();`,
  });

  const file = await retry(() => {
    const f = readdirSync(downloads).find((n) => n.endsWith(".png"));
    if (!f) throw new Error("PNG aún no descargado");
    return f;
  }, 60);
  renameSync(join(downloads, file), PNG);
  console.log(`✓ Diagrama exportado: ${PNG}`);
  browser.close();
  page.close();
} finally {
  proc.kill();
  await new Promise((ok) => setTimeout(ok, 500));
  rmSync(downloads, { recursive: true, force: true });
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

// ── utilidades ───────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((c) => existsSync(c)) ?? fail("No se encontró Chrome/Edge. Define CHROME_PATH.");
}

async function cdp(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, ko) => ((ws.onopen = ok), (ws.onerror = ko)));
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const w = waiting.get(msg.id);
    if (!w) return;
    waiting.delete(msg.id);
    msg.error ? w.ko(new Error(msg.error.message)) : w.ok(msg.result);
  };
  return {
    send: (method, params = {}) =>
      new Promise((ok, ko) => {
        waiting.set(++id, { ok, ko });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    close: () => ws.close(),
  };
}

async function retry(fn, tries = 40, ms = 250) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((ok) => setTimeout(ok, ms));
    }
  }
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
