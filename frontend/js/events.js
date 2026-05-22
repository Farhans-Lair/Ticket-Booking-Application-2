/**
 * events.js — rewritten to match the new events.html layout.
 *
 * events.html uses: #eventsGrid, #featuredCarousel, #trendingGrid,
 *                   #searchInput, #cityFilter, #minPrice, #maxPrice,
 *                   #dateFrom, #dateTo, #logoutBtn
 *
 * The old version used #events-list and #category-filters which no
 * longer exist in the updated HTML — causing the blank "Loading…" state.
 */

window.addEventListener("pageshow", function (event) {
  if (event.persisted) window.location.reload();
});

const token   = sessionStorage.getItem("token");
if (!token) location.href = "/";
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

let allEvents      = [];
let activeCategory = "";
let wishlistIds    = new Set();
let waitlistIds    = new Set();

const CATEGORY_ICONS = {
  Music: "🎵", Sports: "🏆", Comedy: "😂", Theatre: "🎭",
  Conference: "📋", Festival: "🎪", Workshop: "🔧", Other: "🎟️",
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ─── init ─────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const session = await apiRequest("/auth/me", "GET");
    sessionStorage.setItem("role",   session.role);
    sessionStorage.setItem("userId", String(session.userId));
  } catch {
    return; // api.js 401 handler redirects to "/"
  }

  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Wire filter inputs
  document.getElementById("searchInput")?.addEventListener("input",  applyFilters);
  document.getElementById("cityFilter")?.addEventListener("change",  applyFilters);
  document.getElementById("minPrice")?.addEventListener("input",     applyFilters);
  document.getElementById("maxPrice")?.addEventListener("input",     applyFilters);
  document.getElementById("dateFrom")?.addEventListener("change",    applyFilters);
  document.getElementById("dateTo")?.addEventListener("change",      applyFilters);

  // Wire "All" category button
  document.querySelectorAll(".filter-btn[data-cat='']").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = "";
      applyFilters();
    });
  });

  // Load everything in parallel
  await Promise.all([
    loadFeatured(),
    loadTrending(),
    loadCategoryFilters(),
    loadCities(),
    loadUserWishlist(),
    loadUserWaitlist(),
    loadEvents(),
  ]);
});

/* ─── featured ──────────────────────────────────────────────────────────────── */
async function loadFeatured() {
  try {
    const r    = await fetch("/events/featured");
    const data = await r.json();
    if (!data.length) {
      document.getElementById("featuredSection").style.display = "none";
      return;
    }
    document.getElementById("featuredCarousel").innerHTML = data.map(ev => {
      const icon = CATEGORY_ICONS[ev.category] || "🎟️";
      return `
        <div class="featured-card" onclick="goToBooking(${ev.id})">
          <div class="featured-badge-overlay">★ Featured</div>
          <div class="featured-img">${icon}</div>
          <div class="featured-body">
            <div class="featured-cat">${ev.category || "Other"}</div>
            <div class="featured-title">${ev.title}</div>
            <div class="featured-meta">
              <span>${fmtDate(ev.event_date)}</span>
              <span class="featured-price">${ev.price > 0 ? "₹" + ev.price : "Free"}</span>
            </div>
          </div>
        </div>`;
    }).join("");
  } catch {
    document.getElementById("featuredSection").style.display = "none";
  }
}

/* ─── trending ──────────────────────────────────────────────────────────────── */
async function loadTrending() {
  try {
    const r    = await fetch("/events/trending");
    const data = await r.json();
    if (!data.length) {
      document.getElementById("trendingSection").style.display = "none";
      return;
    }
    document.getElementById("trendingGrid").innerHTML = data.map((ev, i) => `
      <div class="trending-card" onclick="goToBooking(${ev.id})">
        <div class="trending-rank ${i < 3 ? "top3" : ""}">${i + 1}</div>
        <div class="trending-info">
          <div class="t-title">${ev.title}</div>
          <div class="t-meta">${fmtDate(ev.event_date)} · ${ev.category}${ev.average_rating ? " · ★ " + ev.average_rating : ""}</div>
        </div>
        <div class="trending-price">${ev.price > 0 ? "₹" + ev.price : "Free"}</div>
      </div>`).join("");
  } catch {
    document.getElementById("trendingSection").style.display = "none";
  }
}

/* ─── category filter buttons ───────────────────────────────────────────────── */
async function loadCategoryFilters() {
  const bar = document.querySelector(".filter-bar");
  if (!bar) return;
  try {
    const r    = await fetch("/categories");
    const cats = await r.json();
    bar.querySelectorAll("[data-cat]:not([data-cat=''])").forEach(b => b.remove());
    cats.forEach(c => {
      const btn = document.createElement("button");
      btn.className  = "filter-btn";
      btn.dataset.cat = c.slug;
      btn.textContent = `${c.icon_emoji || "🎟️"} ${c.name}`;
      CATEGORY_ICONS[c.slug] = c.icon_emoji || "🎟️";
      bar.appendChild(btn);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = c.slug;
        applyFilters();
      });
    });
  } catch { /* keep defaults */ }
}

/* ─── city dropdown ──────────────────────────────────────────────────────────── */
async function loadCities() {
  try {
    const r      = await fetch("/search/cities");
    const cities = await r.json();
    const sel    = document.getElementById("cityFilter");
    if (!sel || !cities.length) return;
    cities.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city.charAt(0).toUpperCase() + city.slice(1);
      sel.appendChild(opt);
    });
  } catch { /* city filter stays empty */ }
}

/* ─── wishlist ───────────────────────────────────────────────────────────────── */
async function loadUserWishlist() {
  try {
    const r = await fetch("/wishlist", { headers });
    if (!r.ok) return;
    const data = await r.json();
    wishlistIds = new Set(data.map(w => w.event_id));
  } catch { /* silent */ }
}

/* ─── waitlist ───────────────────────────────────────────────────────────────── */
async function loadUserWaitlist() {
  try {
    const r = await fetch("/waitlist", { headers });
    if (!r.ok) return;
    const data = await r.json();
    waitlistIds = new Set(data.map(w => w.event_id));
  } catch { /* silent */ }
}

/* ─── all events ─────────────────────────────────────────────────────────────── */
async function loadEvents() {
  try {
    const r = await fetch("/events", { headers });
    allEvents = await r.json();
    renderEvents();
  } catch {
    const grid = document.getElementById("eventsGrid");
    if (grid) grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Failed to load events.</div>';
  }
}

/* ─── apply all active filters ───────────────────────────────────────────────── */
async function applyFilters() {
  const search   = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const city     = (document.getElementById("cityFilter")?.value  || "").trim();
  const minPrice = document.getElementById("minPrice")?.value || "";
  const maxPrice = document.getElementById("maxPrice")?.value || "";
  const dateFrom = document.getElementById("dateFrom")?.value || "";
  const dateTo   = document.getElementById("dateTo")?.value   || "";

  const hasAdvanced = city || minPrice || maxPrice || dateFrom || dateTo;

  if (search && !hasAdvanced) {
    // Full-text search via API
    try {
      const r = await fetch(`/search?q=${encodeURIComponent(search)}`);
      const d = await r.json();
      let filtered = d.events || [];
      if (activeCategory) filtered = filtered.filter(e => e.category === activeCategory);
      renderEventsData(filtered);
      return;
    } catch { /* fallback to local */ }
  }

  if (hasAdvanced || search) {
    // Advanced filtered search via API
    try {
      const qs = new URLSearchParams();
      if (city)          qs.set("city",     city);
      if (activeCategory) qs.set("category", activeCategory);
      if (minPrice)      qs.set("minPrice", minPrice);
      if (maxPrice)      qs.set("maxPrice", maxPrice);
      if (dateFrom)      qs.set("dateFrom", dateFrom);
      if (dateTo)        qs.set("dateTo",   dateTo);
      if (search)        qs.set("q",        search);
      const r = await fetch(`/search/events?${qs}`);
      renderEventsData(await r.json());
      return;
    } catch { /* fallback */ }
  }

  renderEvents();
}

/* ─── local filter + render ──────────────────────────────────────────────────── */
function renderEvents() {
  const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const filtered = allEvents.filter(ev => {
    const matchCat    = !activeCategory || ev.category === activeCategory;
    const matchSearch = !search
      || ev.title.toLowerCase().includes(search)
      || (ev.location || "").toLowerCase().includes(search)
      || (ev.description || "").toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
  renderEventsData(filtered);
}

/* ─── render event cards into #eventsGrid ────────────────────────────────────── */
function renderEventsData(events) {
  const grid = document.getElementById("eventsGrid");
  if (!grid) return;

  if (!events.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">No events found.</div>';
    return;
  }

  grid.innerHTML = events.map(ev => {
    const icon    = CATEGORY_ICONS[ev.category] || "🎟️";
    const sold    = ev.total_tickets - ev.available_tickets;
    const pct     = Math.round((sold / ev.total_tickets) * 100);
    const soldOut = ev.available_tickets === 0;
    const onWish  = wishlistIds.has(ev.id);
    const onWait  = waitlistIds.has(ev.id);

    const ratingHtml = ev.average_rating
      ? `<span class="ev-rating">★ ${ev.average_rating} <span class="ev-rating-count">(${ev.review_count || 0})</span></span>`
      : "";

    const heartBtn = `
      <button class="wish-btn ${onWish ? "wished" : ""}"
        onclick="toggleWishlist(event,${ev.id})"
        title="${onWish ? "Remove from wishlist" : "Save to wishlist"}">
        ${onWish ? "❤️" : "🤍"}
      </button>`;

    let actionHtml;
    if (soldOut) {
      actionHtml = onWait
        ? `<button class="btn-waitlist active" onclick="leaveWaitlist(event,${ev.id})">✓ On Waitlist</button>`
        : `<button class="btn-waitlist" onclick="joinWaitlist(event,${ev.id})">🔔 Join Waitlist</button>`;
    } else {
      actionHtml = `
        <div class="book-action">
          <input type="number" class="qty-input" id="qty-${ev.id}"
            min="1" max="${ev.available_tickets}" value="1" />
          <button class="btn-book" onclick="goToBooking(${ev.id})">Book Now</button>
        </div>`;
    }

    return `
      <div class="event-card">
        <div class="ev-img">${icon}</div>
        <div class="ev-body">
          <div class="ev-cat-row" style="display:flex;align-items:center;justify-content:space-between;">
            <div class="ev-cat">
              ${ev.is_featured ? '<span class="featured-star">★</span>' : ""}
              ${ev.category || "Other"}
            </div>
            ${heartBtn}
          </div>
          <div class="ev-title">${ev.title}</div>
          <div class="ev-meta">
            <span>📅 ${fmtDate(ev.event_date)}</span>
            <span>📍 ${ev.location || "TBA"}${ev.city ? " · " + ev.city : ""}</span>
          </div>
          ${ratingHtml}
          <div class="ev-footer">
            <div>
              <div class="ev-price">${ev.price > 0 ? "₹" + ev.price : "Free"}</div>
              <div class="ev-tickets">
                ${soldOut ? "Sold Out" : ev.available_tickets + " left · " + pct + "% sold"}
              </div>
            </div>
            ${actionHtml}
          </div>
        </div>
      </div>`;
  }).join("");
}

/* ─── wishlist toggle ────────────────────────────────────────────────────────── */
async function toggleWishlist(e, eventId) {
  e.stopPropagation();
  try {
    if (wishlistIds.has(eventId)) {
      await fetch(`/wishlist/${eventId}`, { method: "DELETE", headers });
      wishlistIds.delete(eventId);
    } else {
      await fetch(`/wishlist/${eventId}`, { method: "POST", headers, body: JSON.stringify({ notify: false }) });
      wishlistIds.add(eventId);
    }
    renderEvents();
  } catch (err) { alert("Could not update wishlist: " + err.message); }
}

/* ─── waitlist ───────────────────────────────────────────────────────────────── */
async function joinWaitlist(e, eventId) {
  e.stopPropagation();
  try {
    const r = await fetch(`/waitlist/${eventId}`, { method: "POST", headers, body: JSON.stringify({ tickets_wanted: 1 }) });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
    waitlistIds.add(eventId);
    renderEvents();
  } catch (err) { alert("Could not join waitlist: " + err.message); }
}

async function leaveWaitlist(e, eventId) {
  e.stopPropagation();
  if (!confirm("Leave the waitlist for this event?")) return;
  try {
    await fetch(`/waitlist/${eventId}`, { method: "DELETE", headers });
    waitlistIds.delete(eventId);
    renderEvents();
  } catch (err) { alert("Could not leave waitlist: " + err.message); }
}

/* ─── navigate to booking ────────────────────────────────────────────────────── */
function goToBooking(eventId) {
  const input          = document.getElementById("qty-" + eventId);
  const tickets_booked = input ? Math.max(1, parseInt(input.value, 10) || 1) : 1;
  sessionStorage.setItem("seat_selection_meta", JSON.stringify({ event_id: eventId, tickets_booked }));
  location.href = "/seat-selection";
}

// backward-compat aliases used by older HTML snippets
function goToSeatSelection(eventId) { goToBooking(eventId); }
function bookTicket(eventId)         { goToBooking(eventId); }

/* ─── logout ──────────────────────────────────────────────────────────────────── */
function logout() {
  const userId = sessionStorage.getItem("userId");
  if (window._authChannel && userId) {
    window._authChannel.postMessage({ type: "LOGOUT", userId });
  }
  fetch("/auth/logout", { method: "POST", credentials: "include" })
    .finally(() => { sessionStorage.clear(); window.location.replace("/"); });
}
