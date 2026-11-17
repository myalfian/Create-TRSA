import { resolve, sep } from "node:path";

const PORT = Number(process.env.PORT) || 3000;
const ROOT = import.meta.dir;

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

function jsonResponse(data) {
  return Response.json(data, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === "/" || pathname === "/health") {
      return jsonResponse({ status: "ok" });
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
    const filePath = resolve(ROOT, `.${requestedPath}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const extension = filePath.slice(filePath.lastIndexOf("."));
    return new Response(file, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      },
    });
  },
});

console.log(`TRSA Studio server listening on http://localhost:${PORT}`);
