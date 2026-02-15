console.log("events.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "/";
    return;
  }

  loadEvents();

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);
});

async function loadEvents() {
  try {
    const events = await apiRequest("/events", "GET", null, true);

    const list = document.getElementById("events-list");
    list.innerHTML = "";

    if (!events || events.length === 0) {
      list.innerHTML = "<p>No events available</p>";
      return;
    }

    events.forEach(event => {
      const div = document.createElement("div");

      div.innerHTML = `
     <strong>${event.title}</strong><br/>
     ${event.description || ""}<br/>
     Date: ${new Date(event.event_date).toLocaleDateString()}<br/>
     Available Tickets: ${event.available_tickets} / ${event.total_tickets}
     <hr/>
     `;


      list.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading events:", err);
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/";
}
