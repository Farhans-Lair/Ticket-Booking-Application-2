console.log("admin-dashboard.js loaded");

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});


// 🔐 Check Admin Access
document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  if (!token || role !== 'admin') {
    alert("Access Denied! Admins only.");
    window.location.replace("/");
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
  const location = document.getElementById("location").value;
  const event_date = document.getElementById("event_date").value;
  const price = Number(document.getElementById("price").value);
  const total_tickets = Number(document.getElementById("total_tickets").value);

  const category      = document.getElementById("category").value
  

 if (!title || !event_date || !price || !total_tickets){
    alert("Title, Date, Total Tickets and Available Tickets are required");
    return;
  }

  try {
    await apiRequest("/events", "POST", {
      title,
      description,
      location,
      event_date,
      price,
      total_tickets,
      category,
    
    }, true);   // 🔥 IMPORTANT → auth = true

    alert("Event created successfully!");

    // Clear form
[ "title","description","location","event_date","price","total_tickets"].forEach(
      id => document.getElementById(id).value = ""
    );
    document.getElementById("category").value = "Other";

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
      const soldTickets =
      event.total_tickets -
      event.available_tickets;

      const revenue =
      soldTickets *
      event.price;

      const div = document.createElement("div");

        div.innerHTML = `
        <span class="category-badge">${event.category || 'Other'}</span><br/>

        Title: <input id="title-${event.id}" value="${event.title}" /><br/>
        Category:
        <select id="cat-${event.id}">
          ${["Music","Sports","Comedy","Theatre","Conference","Festival","Workshop","Other"]
            .map(c => `<option value="${c}" ${c === event.category ? 'selected' : ''}>${c}</option>`)
            .join("")}
        </select><br/>
        Price: <input type="number" id="price-${event.id}" value="${event.price}" oninput="ticketPreview(${event.id})" /><br/>
        Date: <input type="date" id="date-${event.id}" value="${event.event_date ? event.event_date.split("T")[0] : ""}" /><br/>
        Total Tickets: <input type="number" id="total-${event.id}" value="${event.total_tickets}" oninput="ticketPreview(${event.id})" /><br/>
        Available Tickets: <span id="available-${event.id}">${event.available_tickets}</span><br/>
        Sold Tickets: <span id="sold-${event.id}">${soldTickets}</span><br/>
        Revenue: <span id="revenue-${event.id}" style="color:green; font-weight:bold;">₹${revenue}</span><br/><br/>

        <button onclick="updateEvent(${event.id})">Save</button>
        <button onclick="deleteEvent(${event.id})">Delete</button>
        <hr/>
      `;
      eventsList.appendChild(div);
    });

  } catch (err) {
    alert("Error loading events: " + err.message);
  }
}

// 🔹 Update Event
async function updateEvent(id) {
  try {
    const title         = document.getElementById(`title-${id}`).value;
    const price         = Number(document.getElementById(`price-${id}`).value);
    const event_date    = document.getElementById(`date-${id}`).value;
    const total_tickets = Number(document.getElementById(`total-${id}`).value);
    const category      = document.getElementById(`cat-${id}`).value;

    if (!title)              { alert("Title required"); return; }
    if (!price || price <= 0){ alert("Price must be > 0"); return; }
    if (total_tickets <= 0)  { alert("Total tickets must be > 0"); return; }

    await apiRequest(`/events/${id}`, "PUT", {
      title, price, event_date, total_tickets, category
    }, true);

    alert("Event Updated");
    loadEvents();
  } catch (err) {
    alert(err.message || "Update Failed");
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

function ticketPreview(id) {
  document.getElementById(`available-${id}`).innerText = "Will auto adjust after save";
  document.getElementById(`sold-${id}`).innerText      = "Auto recalculated";
  document.getElementById(`revenue-${id}`).innerText   = "Preview updates after save";
}

/*function goToRevenue(){
window.location.href =
"/admin-revenue";

}
*/

function openRevenue(){
window.location.href="/admin/revenue";
}

// 🔹 Logout
function logout() {
  localStorage.clear();
  window.location.replace("/");
}
