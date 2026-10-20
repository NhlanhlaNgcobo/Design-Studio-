/* Local server: the static site plus the real /api handlers.
 *
 *   node build/dev-server.mjs            → http://127.0.0.1:8125 (uses your env vars)
 *   MOCK=1 node build/dev-server.mjs     → also runs an in-memory S3 on :8124 and
 *                                          writes outgoing email to build/.outbox/
 *
 * MOCK mode is how the Studio's send flow is tested end to end without a
 * storage bucket or an email account: presigned PUTs land in memory, the job
 * handler reads them back and sniffs them, and the email it would send is
 * saved as HTML you can open.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const PORT = +(process.env.PORT || 8125);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain" };

if (process.env.MOCK) {
  const store = new Map();
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,PUT,DELETE,HEAD", "Access-Control-Allow-Headers": "*", "Access-Control-Expose-Headers": "ETag,Content-Range" };
  http.createServer(async (req, res) => {
    const key = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method === "PUT") {
      const chunks = []; for await (const c of req) chunks.push(c);
      store.set(key, Buffer.concat(chunks)); res.writeHead(200, { ...cors, ETag: '"mock"' }); return res.end();
    }
    if (req.method === "DELETE") { store.delete(key); res.writeHead(204, cors); return res.end(); }
    const b = store.get(key);
    if (!b) { res.writeHead(404, cors); return res.end(); }
    const m = /bytes=(\d+)-(\d+)/.exec(req.headers.range || "");
    if (m) { const s = +m[1], e = Math.min(+m[2], b.length - 1); res.writeHead(206, { ...cors, "Content-Range": `bytes ${s}-${e}/${b.length}`, "Content-Length": e - s + 1 }); return res.end(b.subarray(s, e + 1)); }
    res.writeHead(200, { ...cors, "Content-Length": b.length }); res.end(b);
  }).listen(8124, "127.0.0.1");
  Object.assign(process.env, { S3_ENDPOINT: "http://127.0.0.1:8124", S3_BUCKET: "eminence-jobs", S3_ACCESS_KEY_ID: "mock", S3_SECRET_ACCESS_KEY: "mock", JOB_SECRET: "mock-secret", RESEND_API_KEY: "mock" });

  const outbox = path.join(ROOT, "build", ".outbox");
  fs.mkdirSync(outbox, { recursive: true });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith("https://api.resend.com")) {
      const mail = JSON.parse(opts.body);
      const f = path.join(outbox, `${Date.now()}.html`);
      fs.writeFileSync(f, `<!-- to: ${mail.to} | subject: ${mail.subject} | reply-to: ${mail.reply_to ?? "-"} -->\n${mail.html}`);
      console.log(`[mail] "${mail.subject}" → ${f}`);
      return new Response(JSON.stringify({ id: "mock" }), { status: 200 });
    }
    return realFetch(url, opts);
  };
  console.log("MOCK: S3 on :8124, mail → build/.outbox/");
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.slice(5).replace(/\/$/, "");
    const file = path.join(SITE, "api", `${name}.js`);
    if (!/^[a-z-]+$/.test(name) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, res);
  }
  let p = path.join(SITE, decodeURIComponent(url.pathname));
  if (!p.startsWith(SITE)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  else if (!fs.existsSync(p) && fs.existsSync(p + ".html")) p += ".html";
  if (!fs.existsSync(p)) { res.writeHead(404, { "Content-Type": TYPES[".html"] }); return res.end(fs.readFileSync(path.join(SITE, "404.html"))); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`site on http://127.0.0.1:${PORT}`));
