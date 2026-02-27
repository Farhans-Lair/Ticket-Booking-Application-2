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

       // Show Sold Out label instead of booking input when no tickets left
      const bookingSection = event.available_tickets === 0
        ? `<p style="color:red; font-weight:bold;">Sold Out</p>`
        : `
          <input type="number" min="1" max="${event.available_tickets}"
            id="qty-${event.id}" placeholder="Number of tickets" />
          <button onclick="bookTicket(${event.id})">Book Ticket</button>
        `;

      div.innerHTML = `
     <strong>${event.title}</strong><br/>
     ${event.description || ""}<br/>
     <p>${event.location || ""}</p>
     Date: ${new Date(event.event_date).toLocaleDateString()}<br/>
     Available Tickets: ${event.available_tickets} / ${event.total_tickets}
     Price: ₹${event.price}<br/>
     ${bookingSection}
     <hr/>
     `;
      list.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading events:", err);
  }
}

/*
====================================================
 INITIATE PAYMENT — replaces old bookTicket()
 1. Calls POST /payments/create-order
 2. Stores order + meta in sessionStorage
 3. Redirects to /payment page for Razorpay checkout
====================================================
*/
async function initiatePayment(eventId) {
  const tickets_booked = parseInt(
    document.getElementById(`qty-${eventId}`).value, 10
  );

  if (!tickets_booked || tickets_booked <= 0) {
    alert("Enter a valid number of tickets");
    return;
  }

  try {
    const data = await apiRequest("/payments/create-order", "POST", {
      event_id:       eventId,
      tickets_booked,
    }, true);

    // Store order details for the payment page
    sessionStorage.setItem("razorpay_order", JSON.stringify(data));

    // Redirect to dedicated payment page
    window.location.href = "/payment";

  } catch (err) {
    alert("Could not initiate payment: " + err.message);
  }
}


function goMyBookings(){
window.location.replace ("/my-bookings");}


function logout() {
 localStorage.clear();
  window.location.replace("/");
}
