const token = localStorage.getItem("token");

if (!token) {
  alert("Login required");
  window.location.href = "/";
}

async function createEvent() {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: document.getElementById("name").value,
        description: document.getElementById("description").value,
        available_tickets: Number(
          document.getElementById("tickets").value
        ),
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

    alert("Event created!");
  } catch (err) {
    alert("Network error");
  }
}
