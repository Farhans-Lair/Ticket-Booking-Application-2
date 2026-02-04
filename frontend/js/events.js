// Auth guard
const token = localStorage.getItem("token");

if (!token) {
  alert("Please login first");
  window.location.href = "/";
}

async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      alert("Failed to load events");
      return;
    }

    const events = await res.json();
    const list = document.getElementById("events-list");

    list.innerHTML = "";

    events.forEach(event => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${event.name}</strong><br/>
        ${event.description}<br/>
        Tickets: ${event.available_tickets}
        <hr/>
      `;
      list.appendChild(li);
    });

  } catch (err) {
    alert("Error fetching events");
  }
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
