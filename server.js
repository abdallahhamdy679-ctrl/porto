import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);
const root = __dirname;
const distDir = path.join(root, "dist");
const dataPath = path.join(root, "public", "data", "site.json");
const uploadsDir = path.join(root, "public", "uploads");
const adminPassword = process.env.ADMIN_PASSWORD || "abdo123";

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, uploadsDir); },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-()+]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function authorized(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") && h.slice(7) === adminPassword;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 20 * 1024 * 1024) req.destroy(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = decoded === "/" ? "/index.html" : decoded;
  const candidate = path.normalize(path.join(distDir, rel));
  return candidate.startsWith(distDir + path.sep) || candidate === distDir ? candidate : null;
}

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf", ".ico": "image/x-icon",
};

async function serveStatic(req, res) {
  const requested = safePath(req.url || "/");
  if (!requested) return json(res, 400, { error: "Invalid path" });
  let file = requested;
  try { if ((await fs.promises.stat(file)).isDirectory()) file = path.join(file, "index.html"); }
  catch { /* continue */ }
  try {
    const data = await fs.promises.readFile(file);
    res.statusCode = 200;
    res.setHeader("Content-Type", mime[path.extname(file).toLowerCase()] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  try {
    if (url === "/api/health" && req.method === "GET") return json(res, 200, { ok: true, adminConfigured: Boolean(adminPassword) });

    if (url === "/api/auth" && req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      return body.password === adminPassword ? json(res, 200, { ok: true }) : json(res, 401, { error: "كلمة مرور غير صحيحة." });
    }

    if (url === "/api/content" && req.method === "GET") {
      const raw = await fs.promises.readFile(dataPath, "utf8");
      return json(res, 200, JSON.parse(raw));
    }

    if (url === "/api/content" && req.method === "PUT") {
      if (!authorized(req)) return json(res, 401, { error: "كلمة مرور غير صحيحة." });
      const parsed = JSON.parse(await readBody(req));
      await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
      await fs.promises.writeFile(dataPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      return json(res, 200, { ok: true });
    }

    if (url === "/api/upload" && req.method === "POST") {
      if (!authorized(req)) return json(res, 401, { error: "كلمة مرور غير صحيحة." });
      return upload.single("file")(req, res, err => {
        if (err) return json(res, 400, { error: err.message || "فشل الرفع." });
        if (!req.file) return json(res, 400, { error: "لم يُرْفَع ملف." });
        return json(res, 200, { ok: true, path: `/uploads/${req.file.filename}`, name: req.file.originalname });
      });
    }

    if (url.startsWith("/uploads/")) {
      const rel = url.slice("/uploads/".length);
      const file = path.normalize(path.join(uploadsDir, rel));
      if (!file.startsWith(uploadsDir + path.sep)) return json(res, 400, { error: "Invalid path" });
      try {
        const data = await fs.promises.readFile(file);
        res.statusCode = 200;
        res.setHeader("Content-Type", mime[path.extname(file).toLowerCase()] || "application/octet-stream");
        return res.end(data);
      } catch { return json(res, 404, { error: "Not found" }); }
    }

    if (req.method === "GET") return serveStatic(req, res);
    return json(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: "Server error" });
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Porto server listening on ${port}`));
