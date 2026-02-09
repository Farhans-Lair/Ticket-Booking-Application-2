const API_BASE_URL =
  "http://ticket-alb-1078491885.ap-south-1.elb.amazonaws.com";

const token = localStorage.getItem("token");

if (!token) {
  alert("Login required");
  window.location.href = "/";
}

// ✅ Create Event
async function handleCreateEvent() {
  try {
    const payload = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      location: document.getElementById("location").value,
      event_date: document.getElementById("event_date").value,
      total_tickets: Number(
        document.getElementById("total_tickets").value
      ),
      available_tickets: Number(
        document.getElementById("available_tickets").value
      ),
    };

    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
