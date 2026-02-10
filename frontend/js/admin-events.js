const API_BASE_URL = "http://<ALB-DNS>";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "admin") {
  alert("Admin access only");
  window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", loadEvents);

async function loadEvents() {
  const res = await fetch(`${API_BASE_URL}/events/admin`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const events = await res.json();
  renderEvents(events);
}

function renderEvents(events) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  events.forEach(event => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${event.title}</strong><br/>
      Tickets: ${event.available_tickets}/${event.total_tickets}<br/>
      <button onclick="deleteEvent(${event.id})">Delete</button>
      <hr/>
    `;
    list.appendChild(div);
  });
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;

  await fetch(`${API_BASE_URL}/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  loadEvents(); // refresh
}

function logout() {
  localStorage.clear();
  window.location.href = "/";
}
