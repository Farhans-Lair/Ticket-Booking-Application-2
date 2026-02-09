// frontend/js/create-events.js

const API_BASE_URL = "http://ticket-alb-XXXXX.ap-south-1.elb.amazonaws.com";

// 🔐 Token check
const token = localStorage.getItem("token");

if (!token) {
  alert("Login required");
  window.location.href = "/";
  throw new Error("No token");
}

// 🔍 Decode JWT to check admin
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const decoded = parseJwt(token);

if (!decoded || decoded.role !== "admin") {
  alert("Admin access required");
  window.location.href = "/events.html";
  throw new Error("Not admin");
}

// 📌 Form handler
async function createEvent(e) {
  e.preventDefault(); // 🔥 VERY IMPORTANT

  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("description").value.trim();
  const tickets = document.getElementById("tickets").value;

  if (!name || !tickets) {
    alert("Name and tickets are required");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        description,
        available_tickets: Number(tickets),
      }),
    });

    if (res.status === 401 || res.status === 403) {
      alert("Admin session expired");
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", text);
      alert("Failed to create event");
      return;
    }

    alert("✅ Event created successfully");
    window.location.href = "/events.html";

  } catch (err) {
    console.error("Create event failed:", err);
    alert("Network error");
  }
}

// 🚪 Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
