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
      }
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", text);
      alert("Failed to load events");
      return;
    }

    const events = await res.json();
    const list = document.getElementById("events-list");
    list.innerHTML = "";

    if (events.length === 0) {
      list.innerHTML = "<p>No events available</p>";
      return;
    }

    events.forEach(event => {
      const div = document.createElement("div");
      li.innerHTML = `
        <strong>${event.name}</strong><br/>
        ${event.description}<br/>
        Tickets: ${event.available_tickets}
        <hr/>
      `;
      list.appendChild(div);
    });

  } catch (err) {
    console.error("Fetch error:", err);
    alert("Error fetching events");
  }
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

// Load events on page load
fetchEvents();

