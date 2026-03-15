document.addEventListener("DOMContentLoaded", async () => {

  // ── Verify session with server via cookie ─────────────────────────────────
  try {
    const session = await apiRequest("/auth/me", "GET");
    localStorage.setItem("role", session.role);
  } catch (err) {
    return; // api.js 401 handler redirects to "/"
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

    // Parse selected_seats JSON string
    let seatsDisplay = "N/A";
    if (b.selected_seats) {
      try {
        const seats = JSON.parse(b.selected_seats);
        seatsDisplay = seats.length > 0 ? seats.join(", ") : "N/A";
        }catch (e) {
         seatsDisplay = b.selected_seats;
        }
      }


      const div = document.createElement("div");

      div.innerHTML = `
        <h3>${b.Event.title}</h3>
        <p>Event Date: ${new Date(b.Event.event_date).toLocaleDateString()}</p>
        <p>Tickets Booked: ${b.tickets_booked}</p>
        <p>Seats: ${seatsDisplay}</p>
        <p>Price per Ticket: ₹${b.Event.price}</p>
        <p>Convenience Fee: ₹${b.convenience_fee.toFixed(2)}</p>
        <p>GST (18%): ₹${b.gst_amount.toFixed(2)}</p>
        <p><strong>Total Paid: ₹${b.total_paid.toFixed(2)}</strong></p>
        <p>Payment ID: <code>${b.razorpay_payment_id || "N/A"}</code></p>
        <p>Payment Status: <span style="color:${statusColor}; font-weight:bold; text-transform:uppercase;">${b.payment_status}</span></p>
        <p>Booked On: ${new Date(b.booking_date).toLocaleString()}</p>
        ${b.payment_status === "paid"
          ? `<a href="/bookings/${b.id}/download-ticket" 
               onclick="downloadTicket(event, ${b.id})" 
               style="display:inline-block; margin-bottom:12px; padding:8px 16px; background:#4CAF50; color:white; border-radius:4px; text-decoration:none; font-weight:bold;">
               ⬇ Download Ticket PDF
             </a>`
          : ""}
        <hr>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    alert(err.message || "Error loading bookings");
  }
}

async function downloadTicket(e, bookingId) {
  e.preventDefault();
  try {
    const response = await fetch(`/bookings/${bookingId}/download-ticket`, {
      credentials : "include"
    });

    if (!response.ok) throw new Error("Failed to download ticket");

    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ticket-${bookingId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Could not download ticket: " + err.message);
  }
}

function goBack() {
  window.location.replace("/events-page");
}

function logout() {
  const userId = localStorage.getItem('userId');
  // Broadcast to all other tabs of this same user so they redirect immediately.
  // Tabs belonging to a different user (different userId) will ignore this.
  // _authChannel is set by auth-channel.js which must be loaded on the page.
  if (window._authChannel && userId) {
    window._authChannel.postMessage({ type: 'LOGOUT', userId });
  }
  // Clear the server-side HttpOnly cookie, then wipe localStorage and redirect.
  fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    .finally(() => {
      localStorage.clear();
      window.location.replace('/');
    });
}



