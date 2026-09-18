import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = http.createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative =
      pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    // Only serve public site files, never tooling, dotfiles, or source documents.
    const permitted =
      [
        "index.html",
        "styles.css",
        "eras.css",
        "time-machine.css",
        "script.js",
        "time-machine.js",
      ].includes(relative) || /^assets\/[a-zA-Z0-9_./-]+$/.test(relative);
    const filename = path.resolve(root, relative);
    if (
      !permitted ||
      relative.split(/[\\/]/).includes("..") ||
      !filename.startsWith(`${root}${path.sep}`)
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    if (!(await stat(filename)).isFile()) throw new Error("Not a file");
    const body = await readFile(filename);
    response.writeHead(200, {
      "Content-Type":
        types[path.extname(filename).toLowerCase()] ||
        "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response
      .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Not found");
  }
});

server.listen(port, "127.0.0.1", () =>
  console.log(`Portfolio available at http://localhost:${port}`),
);
