import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const ROOT = resolve(__dirname);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = requestUrl;

    if (pathname === "/health") {
      res.writeHead(200, {
        ...BASE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      res.writeHead(400, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad Request");
      return;
    }

    const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;

    // Prevent access to dotfiles (e.g., .env, .git)
    if (requestedPath.split("/").some((segment) => segment.startsWith("."))) {
      res.writeHead(403, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const filePath = resolve(ROOT, `.${requestedPath}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
      res.writeHead(403, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
    } catch {
      res.writeHead(404, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    if (!fileStats.isFile()) {
      res.writeHead(404, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const content = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    res.writeHead(200, {
      ...BASE_HEADERS,
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    });
    res.end(content);
  } catch (err) {
    console.error("Server error:", err);
    res.writeHead(500, { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TRSA Studio server listening on http://${HOST}:${PORT}`);
});
