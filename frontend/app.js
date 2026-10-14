const grid = document.querySelector("#event-grid");
const resultsLabel = document.querySelector("#results-label");
const searchInput = document.querySelector("#event-search");
const dialog = document.querySelector("#event-dialog");
const form = document.querySelector("#create-form");
const formError = document.querySelector("#form-error");
const toast = document.querySelector("#toast");
let selectedCategory = "All";
let events = [];
let toastTimer;

const categoryClass = {
  Workshop: "category-workshop",
  Social: "category-social",
  Talk: "category-talk",
  Outdoors: "category-outdoors",
  Other: "category-other"
};

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong.");
  return result;
}

function renderEvents(items) {
  resultsLabel.textContent = items.length
    ? `${items.length} ${items.length === 1 ? "good thing" : "good things"} coming up`
    : "No events match just yet — try another filter or host one yourself.";

  grid.replaceChildren();
  for (const event of items) {
    const card = document.createElement("article");
    card.className = "event-card";

    const top = document.createElement("div");
    top.className = `event-card-top ${categoryClass[event.category] || "category-other"}`;
    const category = document.createElement("span");
    category.className = "category-pill";
    category.textContent = event.category;
    const date = document.createElement("span");
    date.className = "event-date";
    date.textContent = `${formatDate(event.date)} · ${event.time}`;
    top.append(category, date);

    const details = document.createElement("div");
    details.className = "event-card-body";
    const title = document.createElement("h3");
    title.textContent = event.title;
    const description = document.createElement("p");
    description.className = "event-description";
    description.textContent = event.description;
    const location = document.createElement("p");
    location.className = "event-location";
    location.textContent = `⌖  ${event.location}`;
    const footer = document.createElement("div");
    footer.className = "event-card-footer";
    const host = document.createElement("span");
    host.className = "event-host";
    host.textContent = `by ${event.host}`;
    const spots = document.createElement("span");
    spots.className = "event-spots";
    const remaining = event.capacity - event.attendees;
    spots.textContent = `${remaining} ${remaining === 1 ? "spot" : "spots"} left`;
    footer.append(host, spots);
    const rsvp = document.createElement("button");
    rsvp.type = "button";
    rsvp.className = "rsvp-button";
    rsvp.textContent = remaining > 0 ? "Count me in ↗" : "Full";
    rsvp.disabled = remaining <= 0;
    rsvp.addEventListener("click", () => reserveSpot(event.id, rsvp));
    details.append(title, description, location, footer, rsvp);
    card.append(top, details);
    grid.append(card);
  }
}

async function loadEvents() {
  const parameters = new URLSearchParams();
  if (selectedCategory !== "All") parameters.set("category", selectedCategory);
  if (searchInput.value.trim()) parameters.set("q", searchInput.value.trim());
  try {
    events = await api(`/api/events?${parameters}`);
    renderEvents(events);
  } catch (error) {
    resultsLabel.textContent = error.message;
    grid.replaceChildren();
  }
}

async function reserveSpot(id, button) {
  button.disabled = true;
  try {
    await api(`/api/events/${encodeURIComponent(id)}/rsvp`, { method: "POST" });
    showToast("You're on the list. See you there! ✳");
    await loadEvents();
  } catch (error) {
    showToast(error.message);
    button.disabled = false;
  }
}

function openDialog() {
  formError.textContent = "";
  dialog.showModal();
}

document.querySelectorAll("#open-create, #open-create-secondary, #open-create-footer")
  .forEach((button) => button.addEventListener("click", openDialog));
document.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    document.querySelector(".filter-chip.selected").classList.remove("selected");
    button.classList.add("selected");
    loadEvents();
  });
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadEvents, 180);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  const values = Object.fromEntries(new FormData(form));
  values.capacity = Number(values.capacity);
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    await api("/api/events", { method: "POST", body: JSON.stringify(values) });
    form.reset();
    dialog.close();
    selectedCategory = "All";
    document.querySelector(".filter-chip.selected").classList.remove("selected");
    document.querySelector('[data-category="All"]').classList.add("selected");
    searchInput.value = "";
    await loadEvents();
    showToast("Your event is live. Let the good things happen! ✳");
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadEvents();
