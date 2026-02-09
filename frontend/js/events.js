console.log("events.js loaded");

const API_BASE_URL = "http://ticket-alb-1078491885.ap-south-1.elb.amazonaws.com";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "/";
    return;
  }

  fetchEvents(token);
});

async function fetchEvents(token) {
  try {
    console.log("Calling /events API");

    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Events status:", res.status);

    if (res.status === 401) {
      alert("Session expired");
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", text);
      return;
    }

    const events = await res.json();
    renderEvents(events);

  } catch (err) {
    console.error("Fetch failed:", err);
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

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
