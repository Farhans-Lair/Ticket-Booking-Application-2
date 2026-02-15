console.log("admin-dashboard.js loaded");

// 🔐 Check Admin Access
document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  if (!token || role !== "admin") {
    alert("Access Denied! Admins only.");
    window.location.href = "/";
    return;
  }

  loadEvents();

  // Attach event listeners properly
  document
    .getElementById("createEventBtn")
    .addEventListener("click", createEvent);

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);
});


// 🔹 Create Event
async function createEvent() {

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const event_date = document.getElementById("event_date").value;
  const price = document.getElementById("price").value;
  const total_tickets = document.getElementById("total_tickets").value;
  const available_tickets = document.getElementById("available_tickets").value;

  if (!title || !event_date || !total_tickets || !available_tickets) {
    alert("Title, Date, Total Tickets and Available Tickets are required");
    return;
  }

  try {
    await apiRequest("/events", "POST", {
      title,
      description,
      event_date,
      price,
      total_tickets,
      available_tickets
    }, true);   // 🔥 IMPORTANT → auth = true

    alert("Event created successfully!");

    // Clear form
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    document.getElementById("event_date").value = "";
    document.getElementById("price").value = "";
    document.getElementById("total_tickets").value = "";
    document.getElementById("available_tickets").value = "";

    loadEvents();

  } catch (err) {
    alert("Error creating event: " + err.message);
  }
}


// 🔹 Load Events
async function loadEvents() {
  const eventsList = document.getElementById("events-list");
  eventsList.innerHTML = "";

  try {
    const events = await apiRequest("/events", "GET", null, true);  // 🔥 auth true

    if (!events || events.length === 0) {
      eventsList.innerHTML = "<p>No events available</p>";
      return;
    }

    events.forEach(event => {
      const div = document.createElement("div");

      div.innerHTML = `
  <h3>${event.title}</h3>
  <p>${event.description || ""}</p>
  <p>Date: ${new Date(event.event_date).toLocaleDateString()}</p>
  <p>Total Tickets: ${event.total_tickets}</p>
  <p>Available Tickets: ${event.available_tickets}</p>
  <button data-id="${event.id}" class="delete-btn">Delete</button>
  <hr>
`;

      eventsList.appendChild(div);
    });

    // Attach delete handlers
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async function () {
        const id = this.getAttribute("data-id");
        await deleteEvent(id);
      });
    });

  } catch (err) {
    alert("Error loading events: " + err.message);
  }
}


// 🔹 Delete Event
async function deleteEvent(id) {
  if (!confirm("Are you sure?")) return;

  try {
    await apiRequest(`/events/${id}`, "DELETE", null, true);  // 🔥 auth true
    alert("Event deleted successfully!");
    loadEvents();
  } catch (err) {
    alert("Error deleting event: " + err.message);
  }
}


// 🔹 Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/";
}
