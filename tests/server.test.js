const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { createAppServer } = require("../backend/server");

let dataDirectory;
let server;
let baseUrl;

before(async () => {
  dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "campusconnect-test-"));
  server = createAppServer({ dataDirectory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(dataDirectory, { recursive: true, force: true });
});

test("health endpoint reports the API as ready", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("web routes serve the frontend while unknown paths stay unavailable", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /CampusConnect/);

  const asset = await fetch(`${baseUrl}/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /javascript/);
  assert.equal((await fetch(`${baseUrl}/missing.js`)).status, 404);
});

test("events can be listed and filtered", async () => {
  const response = await fetch(`${baseUrl}/api/events?category=Workshop&q=build`);
  const events = await response.json();
  assert.equal(response.status, 200);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "event-001");
});

test("event creation validates input and persists valid events", async () => {
  const invalid = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Missing fields" })
  });
  assert.equal(invalid.status, 400);

  const response = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Reading on the lawn",
      category: "Social",
      date: "2026-11-08",
      time: "14:00",
      location: "Library Garden",
      description: "Bring a book and something warm to drink.",
      capacity: 12,
      host: "Book Club"
    })
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  const saved = JSON.parse(await fs.readFile(path.join(dataDirectory, "events.json"), "utf8"));
  assert.equal(saved.find((event) => event.id === created.id).title, "Reading on the lawn");
});

test("event creation rejects impossible calendar dates", async () => {
  const response = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Impossible date",
      category: "Social",
      date: "2026-02-30",
      time: "14:00",
      location: "Library Garden",
      description: "This date should fail validation.",
      capacity: 12,
      host: "Book Club"
    })
  });
  assert.equal(response.status, 400);
});

test("RSVP updates capacity, rejects full events, and reports missing events", async () => {
  const eventsResponse = await fetch(`${baseUrl}/api/events`);
  const events = await eventsResponse.json();
  const event = events.find((item) => item.id === "event-004");
  const response = await fetch(`${baseUrl}/api/events/${event.id}/rsvp`, { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).attendees, event.attendees + 1);

  const fullEventResponse = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "One seat only",
      category: "Workshop",
      date: "2026-11-08",
      time: "14:00",
      location: "Library Garden",
      description: "A small event for testing seat limits.",
      capacity: 1,
      host: "Book Club"
    })
  });
  const fullEvent = await fullEventResponse.json();
  assert.equal(fullEventResponse.status, 201);
  assert.equal((await fetch(`${baseUrl}/api/events/${fullEvent.id}/rsvp`, { method: "POST" })).status, 200);
  const fullResponse = await fetch(`${baseUrl}/api/events/${fullEvent.id}/rsvp`, { method: "POST" });
  assert.equal(fullResponse.status, 409);

  const noEvent = await fetch(`${baseUrl}/api/events/no-such-event/rsvp`, { method: "POST" });
  assert.equal(noEvent.status, 404);
});

test("metrics endpoint exposes Prometheus-formatted request metrics", async () => {
  const response = await fetch(`${baseUrl}/metrics`);
  const metrics = await response.text();
  assert.equal(response.status, 200);
  assert.match(metrics, /campusconnect_http_requests_total \d+/);
});
