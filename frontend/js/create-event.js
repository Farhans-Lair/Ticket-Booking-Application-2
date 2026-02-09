const API_BASE_URL = "http://ticket-alb-1078491885.ap-south-1.elb.amazonaws.com";

// Auth guard
const token = localStorage.getItem("token");
if (!token) {
  alert("Login required");
  window.location.href = "/";
}

/**
 * ✅ Global function (required for onclick)
 */
window.createEvent = async function () {
  try {
    const name = document.getElementById("name").value.trim();
    const description = document.getElementById("description").value.trim();
    const tickets = Number(document.getElementById("tickets").value);

    if (!name || !tickets) {
      alert("Name and tickets are required");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        available_tickets: tickets,
      }),
    });

    if (res.status === 403) {
      alert("Admin access required");
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", text);
      alert("Failed to create event");
      return;
    }

    alert("Event created successfully ✅");
    window.location.reload();

  } catch (err) {
    console.error("Create event failed:", err);
    alert("Network error");
  }
};

/**
 * ✅ Logout must also be global
 */
window.logout = function () {
  localStorage.removeItem("token");
  window.location.href = "/";
};
