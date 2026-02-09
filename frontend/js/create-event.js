const token = localStorage.getItem("token");

if (!token) {
  alert("Login required");
  window.location.href = "/";
}

// ✅ renamed to avoid DOM createEvent() collision
async function handleCreateEvent() {
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
        "Authorization": `Bearer ${token}`,
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
      alert(text);
      return;
    }

    alert("Event created successfully");
    window.location.href = "/events";

  } catch (err) {
    console.error("Create event failed:", err);
    alert("Network error");
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
