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
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
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
  hostname: "0.0.0.0",
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const acceptHeader = request.headers.get("accept") || "";

    if (pathname === "/health" || (pathname === "/" && !acceptHeader.includes("text/html"))) {
      return jsonResponse({ status: "ok" });
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;

    if (requestedPath.split("/").some((segment) => segment.startsWith("."))) {
      return new Response("Forbidden", { status: 403 });
    }

    let filePath = resolve(ROOT, `.${requestedPath}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
      return new Response("Forbidden", { status: 403 });
    }

    let file = Bun.file(filePath);
    if (!(await file.exists())) {
      const publicPath = resolve(ROOT, "public", `.${requestedPath}`);
      if (publicPath.startsWith(`${resolve(ROOT, "public")}${sep}`)) {
        const publicFile = Bun.file(publicPath);
        if (await publicFile.exists()) {
          filePath = publicPath;
          file = publicFile;
        }
      }
    }

    if (!(await file.exists())) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const dotIndex = filePath.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filePath.slice(dotIndex).toLowerCase() : "";
    return new Response(file, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      },
    });
  },
});

console.log(`TRSA Studio server listening on http://0.0.0.0:${PORT}`);
