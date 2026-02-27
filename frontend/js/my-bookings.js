document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.replace("/");
    return;
  }

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);

  loadBookings();
});

async function loadBookings() {
  try {
    const bookings = await apiRequest("/bookings/my-bookings","GET",null,true);

    const container = document.getElementById("bookings-list");
    container.innerHTML = "";

    if (!bookings.length) {
      container.innerHTML = "<p>No bookings yet</p>";
      return;
    }

    bookings.forEach(b => {
      const statusColor = b.payment_status === "paid"   ? "green"
                        : b.payment_status === "failed" ? "red"
                        : "orange";


      const div = document.createElement("div");

      div.innerHTML = `
        <h3>${b.Event.title}</h3>
        <p>Event Date: ${new Date(b.Event.event_date).toLocaleDateString()}</p>
        <p>Tickets Booked: ${b.tickets_booked}</p>
        <p>Price per Ticket: ₹${b.Event.price}</p>
        <p>Convenience Fee: ₹${b.convenience_fee.toFixed(2)}</p>
        <p>GST (18%): ₹${b.gst_amount.toFixed(2)}</p>
        <p><strong>Total Paid: ₹${b.total_paid.toFixed(2)}</strong></p
        <p>Payment ID: <code>${b.razorpay_payment_id || "N/A"}</code></p>
        <p>Payment Status: <span style="color:${statusColor}; font-weight:bold; text-transform:uppercase;">${b.payment_status}</span></p>
        <p>Booked On: ${new Date(b.booking_date).toLocaleString()}</p>
        <hr>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    alert(err.message || "Error loading bookings");
  }
}

function goBack() {
  window.location.replace("/events-page");
}

function logout() {
  localStorage.clear();
  window.location.replace("/");
}

