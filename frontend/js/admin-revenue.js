<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
  const role = sessionStorage.getItem("role");

  if (role !== "admin") {
    alert("Admins Only");
    window.location.replace("/");
    return;
  }
  loadRevenue();
});

async function loadRevenue() {
  const container = document.getElementById("adminRevenueContent");
  if (!container) return;

  container.innerHTML = '<div class="loading">Loading revenue data…</div>';

  try {
    // API returns { events: [...], grandTotals: {...} }
    // Previously the code did  events.forEach(...)  on the whole response
    // object, which threw "events.forEach is not a function" and fell into catch.
    const data = await apiRequest("/api/revenue", "GET", null, true);
    const { events, grandTotals } = data;

    // ── KPI cards ─────────────────────────────────────────────────────────
    const totalBookings = events.reduce(
      (sum, e) => sum + (e.Bookings ? e.Bookings.length : 0), 0
    );

    const kpiRevenue  = document.getElementById("kpiRevenue");
    const kpiBookings = document.getElementById("kpiBookings");
    const kpiFees     = document.getElementById("kpiFees");
    const kpiTickets  = document.getElementById("kpiTickets");

    if (kpiRevenue)  kpiRevenue.textContent  = "₹" + grandTotals.effective_total.toFixed(2);
    if (kpiBookings) kpiBookings.textContent = totalBookings;
    if (kpiFees)     kpiFees.textContent     = "₹" + grandTotals.effective_conv.toFixed(2);
    if (kpiTickets)  kpiTickets.textContent  = grandTotals.tickets_sold;

    if (!events.length) {
      container.innerHTML = '<div class="empty">No revenue data found.</div>';
      return;
    }

    // ── Per-event breakdown table ──────────────────────────────────────────
    const rows = events.map(ev => {
      const t = ev.eventTotals;
      return `
        <tr>
          <td><strong>${escHtml(ev.title)}</strong></td>
          <td>${t.tickets_sold}</td>
          <td>₹${t.effective_ticket.toFixed(2)}</td>
          <td>₹${t.effective_conv.toFixed(2)}</td>
          <td>₹${t.effective_gst.toFixed(2)}</td>
          <td>₹${t.effective_cancellation.toFixed(2)}</td>
          <td style="font-weight:700;color:var(--green)">₹${t.effective_total.toFixed(2)}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
      <div style="overflow:auto">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Tickets Sold</th>
              <th>Ticket Revenue</th>
              <th>Conv. Fee</th>
              <th>GST</th>
              <th>Cancellation</th>
              <th>Effective Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="font-weight:700;border-top:2px solid var(--border)">
              <td>Grand Total</td>
              <td>${grandTotals.tickets_sold}</td>
              <td>₹${grandTotals.effective_ticket.toFixed(2)}</td>
              <td>₹${grandTotals.effective_conv.toFixed(2)}</td>
              <td>₹${grandTotals.effective_gst.toFixed(2)}</td>
              <td>₹${grandTotals.effective_cancellation.toFixed(2)}</td>
              <td style="color:var(--green)">₹${grandTotals.effective_total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  } catch (err) {
    container.innerHTML = `<div class="empty">Failed to load revenue data.</div>`;
    console.error("Revenue load error:", err);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function goBack() {
  window.location.href = "/admin";
}

function logout() {
  const userId = sessionStorage.getItem("userId");
  if (window._authChannel && userId) {
    window._authChannel.postMessage({ type: "LOGOUT", userId });
  }
  fetch("/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
    sessionStorage.clear();
    window.location.replace("/");
  });
}
=======
document.addEventListener("DOMContentLoaded",()=>{

const token =
localStorage.getItem("token");

const role =
localStorage.getItem("role");

if(!token || role !== "admin"){
alert("Admins Only");
window.location.replace("/");
return;
}
loadRevenue();
});

async function loadRevenue(){
try{
const events =
await apiRequest("/revenue","GET",null,true);

const container =
document.getElementById(
"revenue-list"
);

container.innerHTML="";
events.forEach(event=>{

let soldTickets = 0;
let ticketRevenue = 0;
let convenienceRevenue = 0;
let gstCollected = 0;
let totalCollection = 0;

if(event.Bookings){
event.Bookings.forEach(b=>{

soldTickets +=
b.tickets_booked;

ticketRevenue +=
b.ticket_amount;

convenienceRevenue +=
b.convenience_fee;

gstCollected +=
b.gst_amount;

totalCollection +=
b.total_paid;

});

}

const div =
document.createElement("div");

div.innerHTML = `

<h2>

${event.title}

</h2>

Tickets Sold :

${soldTickets}

<br/>

Ticket Revenue :

₹${ticketRevenue.toFixed(2)}

<br/>

Convenience Fee Revenue :

₹${convenienceRevenue.toFixed(2)}

<br/>

GST Collected :

₹${gstCollected.toFixed(2)}

<br/>

Total Collection :

₹${totalCollection.toFixed(2)}

<hr/>
`;
container.appendChild(div);

});

}

catch(err){
alert(
"Failed loading revenue"
);
}
}

function logout(){
localStorage.clear();
window.location.replace("/");

}

function goBack(){
window.location.href = "/admin";
}
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
