const API_BASE_URL =
  "http://ticket-alb-230646725.ap-south-1.elb.amazonaws.com";

const token = localStorage.getItem("token");
const role = localStorage.getItem("token");

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

// ✅ Create Event
async function handleCreateEvent() {
  try {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const location = document.getElementById("location").value;
    const eventDate = document.getElementById("event_date").value;
    const totalTickets = Number(
      document.getElementById("total_tickets").value
    );

    // 🔒 FRONTEND VALIDATION (HERE 👇)
    if (!title || !eventDate || !totalTickets) {
      alert("Please fill all required fields");
      return;
    }

    if (totalTickets <= 0) {
      alert("Tickets must be greater than 0");
      return;
    }

    const payload = {
      title,
      description,
      location,
      event_date: eventDate,
      total_tickets: totalTickets,
      available_tickets: totalTickets
    };

    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 403) {
      alert("Admin access required");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("Create event failed:", err);
      alert("Failed to create event");
      return;
    }

    alert("Event created successfully");
    window.location.href = "/events";

  } catch (err) {
    console.error("Network error:", err);
    alert("Network error");
  }
}

// ✅ Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
