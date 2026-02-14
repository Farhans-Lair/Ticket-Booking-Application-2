const API_BASE_URL = "http://ticket-alb-90792609.ap-south-1.elb.amazonaws.com";

// 🔐 Get auth data
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");


// 🔐 Check Admin Access
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== "admin") {
    alert("Access Denied! Admins only.");
    window.location.href = "index.html";
    return;
  }

  loadEvents();
});

// 🔹 Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// 🔹 Create Event
async function createEvent() {
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const date = document.getElementById("date").value;
  const price = document.getElementById("price").value;
  const availableTickets = document.getElementById("availableTickets").value;

  if (!title || !description || !date || !price || !availableTickets) {
    alert("Please fill all fields");
    return;
  }

  try {
    await apiRequest("/events", "POST", {
      title,
      description,
      date,
      price,
      availableTickets
    });

    alert("Event created successfully!");
    loadEvents();
  } catch (err) {
    alert("Error creating event");
  }
}

// 🔹 Load Events
async function loadEvents() {
  const eventsList = document.getElementById("events-list");
  eventsList.innerHTML = "";

  try {
    const events = await apiRequest("/events");

    events.forEach(event => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${event.title}</h3>
        <p>${event.description}</p>
        <p>Date: ${event.date}</p>
        <p>Price: ${event.price}</p>
        <p>Available: ${event.availableTickets}</p>
        <button onclick="deleteEvent(${event.id})">Delete</button>
        <hr>
      `;
      eventsList.appendChild(div);
    });

  } catch (err) {
    alert("Error loading events");
  }
}

// 🔹 Delete Event
async function deleteEvent(id) {
  if (!confirm("Are you sure?")) return;

  try {
    await apiRequest(`/events/${id}`, "DELETE");
    alert("Event deleted successfully!");
    loadEvents();
  } catch (err) {
    alert("Error deleting event");
  }
}
