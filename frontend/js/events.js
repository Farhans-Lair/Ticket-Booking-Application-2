// Auth guard
const token = localStorage.getItem("token");

if (!token) 
  {
  alert("Please login first");
  window.location.href = "/";
  }

async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });

    // Session expired
    if (res.status === 401) {
      alert("Session expired. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    // 304 = cached + no body
    if (res.status === 304) {
      renderEmptyEvents();
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", text);
      alert("Failed to load events");
      return;
    }

    const events = await res.json();
    renderEvents(events);

  } catch (err) {
    console.error("Fetch failed:", err);
    alert("Network error while fetching events");
  }
}

function renderEvents(events) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  if (!events || events.length === 0) {
    list.innerHTML = "<p>No events available</p>";
    return;
  }

  events.forEach(event => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${event.name}</strong><br/>
      ${event.description}<br/>
      Tickets: ${event.available_tickets}
      <hr/>
    `;
    list.appendChild(div);
  });
}

function renderEmptyEvents() {
  const list = document.getElementById("events-list");
  list.innerHTML = "<p>No events available</p>";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

// Load events on page load
fetchEvents();

