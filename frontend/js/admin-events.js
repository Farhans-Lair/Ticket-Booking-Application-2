const API_BASE_URL = "http://ticket-alb-1095121885.ap-south-1.elb.amazonaws.com";

// 🔐 Get auth data
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

/* =====================================================
   🔐 FRONTEND ACCESS CONTROL
===================================================== */

document.addEventListener("DOMContentLoaded", () =>{

// Not logged in
  if (!token) {
    alert("Login required");
    window.location.href = "/";
    return;
  }

// Not admin
  if (role !== "admin") {
    alert("Admin access only");
    localStorage.clear();
    window.location.href = "/events";
    return;
  }

  // ✅ If admin, load events  
  loadEvents();

});
/* =====================================================
   📦 Load Events
===================================================== */

async function loadEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      logout();
      return;
    }

    if (!res.ok) {
      throw new Error("Failed to fetch events");
    }

    const events = await res.json();
    renderEvents(events);
  } catch (err) {
    console.error("Error loading events:", err);
    alert("Failed to load events");
  }
}

/* =====================================================
   🖥 Render Events
===================================================== */

function renderEvents(events) {
  const list = document.getElementById("events-list");
  list.innerHTML = "";

  if (!events.length) {
    list.innerHTML = "<p>No events available</p>";
    return;
  }

  events.forEach(event => {
    const div = document.createElement("div");

    div.innerHTML = `
      <strong>${event.title}</strong><br/>
      Date: ${new Date(event.event_date).toLocaleDateString()}<br/>
      Location: ${event.location || "N/A"}<br/>
      Tickets: ${event.available_tickets}/${event.total_tickets}<br/>
      <button onclick="deleteEvent(${event.id})">Delete</button>
      <hr/>
    `;
    list.appendChild(div);
  });
}

/* =====================================================
   ❌ Delete Event (Admin Only)
===================================================== */

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 403) {
      alert("Admin access required");
      return;
    }

    if (!res.ok) {
      throw new Error("Delete failed");
    }

    alert("Event deleted successfully");
    loadEvents(); // refresh
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete event");
  }
}

/* =====================================================
   🚪 Logout
===================================================== */

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/";
}
