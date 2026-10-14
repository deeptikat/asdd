const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const seedEvents = [
  {
    id: "event-001",
    title: "Build Night: Ship Your First App",
    category: "Workshop",
    date: "2026-10-24",
    time: "17:30",
    location: "Innovation Lab, Block B",
    description: "Pair up, build a tiny project, and get it online before the evening ends.",
    capacity: 36,
    attendees: 22,
    host: "Developer Student Club"
  },
  {
    id: "event-002",
    title: "Open Mic on the Quad",
    category: "Social",
    date: "2026-10-26",
    time: "18:00",
    location: "The Main Quad",
    description: "A laid-back evening for live music, poetry, and meeting people across campus.",
    capacity: 80,
    attendees: 51,
    host: "Campus Arts Society"
  },
  {
    id: "event-003",
    title: "Designing for Everyone",
    category: "Talk",
    date: "2026-10-29",
    time: "16:00",
    location: "Lecture Hall 04",
    description: "A hands-on introduction to inclusive design and practical accessibility checks.",
    capacity: 60,
    attendees: 34,
    host: "Design Circle"
  },
  {
    id: "event-004",
    title: "Sunday Trail & Coffee",
    category: "Outdoors",
    date: "2026-11-01",
    time: "08:30",
    location: "Meet at the North Gate",
    description: "Take the riverside loop at an easy pace and finish with coffee together.",
    capacity: 24,
    attendees: 18,
    host: "Outdoor Club"
  }
];

function createStore(dataDirectory) {
  const filePath = path.join(dataDirectory, "events.json");

  async function readEvents() {
    try {
      const contents = await fs.readFile(filePath, "utf8");
      const events = JSON.parse(contents);
      if (!Array.isArray(events)) {
        throw new Error("The events data file must contain a JSON array.");
      }
      return events;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await fs.mkdir(dataDirectory, { recursive: true });
      await writeEvents(seedEvents);
      return structuredClone(seedEvents);
    }
  }

  async function writeEvents(events) {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, filePath);
  }

  return {
    async list({ category, query }) {
      const events = await readEvents();
      return events.filter((event) => {
        const matchesCategory = !category || category === "All" || event.category === category;
        const searchableText = `${event.title} ${event.description} ${event.location} ${event.host}`;
        const matchesQuery = !query || searchableText.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      });
    },

    async create(input) {
      const events = await readEvents();
      const event = {
        id: randomUUID(),
        title: input.title.trim(),
        category: input.category,
        date: input.date,
        time: input.time,
        location: input.location.trim(),
        description: input.description.trim(),
        capacity: input.capacity,
        attendees: 0,
        host: input.host.trim()
      };
      events.push(event);
      await writeEvents(events);
      return event;
    },

    async rsvp(id) {
      const events = await readEvents();
      const event = events.find((item) => item.id === id);
      if (!event) {
        return { kind: "not_found" };
      }
      if (event.attendees >= event.capacity) {
        return { kind: "full", event };
      }
      event.attendees += 1;
      await writeEvents(events);
      return { kind: "reserved", event };
    }
  };
}

module.exports = { createStore };
