const API_BASE_URL = "http://ticket-alb-144501438.ap-south-1.elb.amazonaws.com";

document.addEventListener("DOMContentLoaded", () =>
{

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
  window.location.href = "/";
}

if (role !== "admin") {
  alert("Unauthorized");
  localStorage.clear();
  window.location.href = "/";

  loadEvents();
}

});

// 🔐 Not logged in
if (!token) {
  alert("Login required");
  window.location.href = "/";
}

// 🔥 Not admin
if (role !== "admin") {
  alert("Admin access only");
  window.location.href = "/events";
}

async function loadEvents() {
  const res = await fetch(`${API_BASE_URL}/events`, {
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

// ✅ Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
