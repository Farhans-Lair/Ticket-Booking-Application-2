console.log("events.js loaded");

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.replace ("/");
    return;
  }

  loadEvents();

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);
});

async function loadEvents() {
  try {
    const events = await apiRequest("/events", "GET", null, true);

    const list = document.getElementById("events-list");
    list.innerHTML = "";

    if (!events || events.length === 0) {
      list.innerHTML = "<p>No events available</p>";
      return;
    }

    events.forEach(event => {
      const div = document.createElement("div");

      div.innerHTML = `
     <strong>${event.title}</strong><br/>
     ${event.description || ""}<br/>
     <p>${event.location || ""}</p>
     Date: ${new Date(event.event_date).toLocaleDateString()}<br/>
     Available Tickets: ${event.available_tickets} / ${event.total_tickets}
     Price: ₹${event.price}<br/>

     <input type="number" min="1" max="${event.available_tickets}" 
         id="qty-${event.id}" placeholder="tickets_booked" />

  <button onclick="bookTicket(${event.id})">
    Book Ticket
  </button>
     <hr/>
     `;


      list.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading events:", err);
  }
}

async function bookTicket(eventId) {

  const tickets_booked = parseInt(document.getElementById(`qty-${eventId}`).value, 10);

  if (!tickets_booked || tickets_booked <= 0) {
    alert("Enter valid quantity");
    return;
  }

  try {

    await apiRequest("/bookings", "POST", {
      event_id: eventId,
      tickets_booked
    }, true);

    alert("Booking successful!");

    loadEvents();  // refresh tickets

  } catch (err) {
    alert("Booking failed: " + err.message);
  }
}

function goMyBookings(){
window.location.replace ("/my-bookings");}


function logout() {
 localStorage.clear();
  window.location.replace("/");
}
