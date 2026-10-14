const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createStore } = require("./store");

const categories = new Set(["Workshop", "Social", "Talk", "Outdoors", "Other"]);
const frontendDirectory = path.join(__dirname, "..", "frontend");
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
]);
const serverStartedAt = Date.now();
let requestCount = 0;

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_384) {
        reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function validateEvent(input) {
  const fields = ["title", "category", "date", "time", "location", "description", "host"];
  for (const field of fields) {
    if (typeof input[field] !== "string" || input[field].trim().length === 0) {
      return `${field} is required.`;
    }
  }
  if (!categories.has(input.category)) {
    return "Choose a supported event category.";
  }
  const eventDate = new Date(`${input.date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(eventDate.getTime()) ||
    eventDate.toISOString().slice(0, 10) !== input.date
  ) {
    return "Enter a valid event date.";
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
    return "Enter a valid event time.";
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 1000) {
    return "Capacity must be a whole number from 1 to 1000.";
  }
  if (fields.some((field) => input[field].length > 500)) {
    return "Event fields must be 500 characters or fewer.";
  }
  return null;
}

function createAppServer({ dataDirectory = path.join(__dirname, "..", ".data") } = {}) {
  const store = createStore(dataDirectory);

  return http.createServer(async (request, response) => {
    requestCount += 1;
    const url = new URL(request.url, "http://localhost");

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { status: "ok" });
      }

      if (request.method === "GET" && url.pathname === "/metrics") {
        const uptimeSeconds = (Date.now() - serverStartedAt) / 1000;
        response.writeHead(200, {
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
          "X-Content-Type-Options": "nosniff"
        });
        return response.end(
          `# HELP campusconnect_http_requests_total Total HTTP requests handled.\n` +
          `# TYPE campusconnect_http_requests_total counter\n` +
          `campusconnect_http_requests_total ${requestCount}\n` +
          `# HELP campusconnect_process_uptime_seconds Process uptime in seconds.\n` +
          `# TYPE campusconnect_process_uptime_seconds gauge\n` +
          `campusconnect_process_uptime_seconds ${uptimeSeconds}\n`
        );
      }

      if (request.method === "GET" && url.pathname === "/api/events") {
        const events = await store.list({
          category: url.searchParams.get("category") || "",
          query: url.searchParams.get("q") || ""
        });
        return sendJson(response, 200, events);
      }

      if (request.method === "POST" && url.pathname === "/api/events") {
        const input = await readJson(request);
        const validationError = validateEvent(input);
        if (validationError) {
          return sendJson(response, 400, { error: validationError });
        }
        return sendJson(response, 201, await store.create(input));
      }

      const rsvpMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/rsvp$/);
      if (request.method === "POST" && rsvpMatch) {
        const result = await store.rsvp(decodeURIComponent(rsvpMatch[1]));
        if (result.kind === "not_found") {
          return sendJson(response, 404, { error: "Event not found." });
        }
        if (result.kind === "full") {
          return sendJson(response, 409, { error: "This event is full." });
        }
        return sendJson(response, 200, result.event);
      }

      const staticFile = request.method === "GET" && staticFiles.get(url.pathname);
      if (staticFile) {
        const [fileName, contentType] = staticFile;
        const contents = await fs.readFile(path.join(frontendDirectory, fileName));
        response.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff"
        });
        return response.end(contents);
      }

      return sendJson(response, 404, { error: "Route not found." });
    } catch (error) {
      if (error.status) {
        return sendJson(response, error.status, { error: error.message });
      }
      console.error("Request failed:", error);
      return sendJson(response, 500, { error: "An unexpected server error occurred." });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const dataDirectory = process.env.DATA_DIR || path.join(__dirname, "..", ".data");
  createAppServer({ dataDirectory }).listen(port, "0.0.0.0", () => {
    console.log(`CampusConnect API listening on port ${port}`);
  });
}

module.exports = { createAppServer };
