/**
 * seat-selection.js
 * FIX Issue 4: Loads tier data, colours seats by tier, computes
 * total from tier prices instead of fixed event.price.
 */

let selectedSeats  = [];
let requiredCount  = 0;
let currentEventId = null;
let tierPriceMap   = {};   // { seatNumber: price }
let tierColorMap   = {};   // { tierName: cssColor }

// Tier colour palette
const TIER_COLORS = [
  { bg: "rgba(245,200,66,0.18)",  border: "rgba(245,200,66,0.6)",  sel: "#c9a227", text: "#f5c842" },
  { bg: "rgba(124,106,247,0.18)", border: "rgba(124,106,247,0.6)", sel: "#7c6af7", text: "#b8b0ff" },
  { bg: "rgba(66,230,149,0.18)",  border: "rgba(66,230,149,0.6)",  sel: "#25a265", text: "#42e695" },
  { bg: "rgba(247,74,106,0.18)",  border: "rgba(247,74,106,0.6)",  sel: "#c73459", text: "#f74a6a" },
  { bg: "rgba(56,189,248,0.18)",  border: "rgba(56,189,248,0.6)",  sel: "#0284c7", text: "#38bdf8" },
];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const session = await apiRequest("/auth/me", "GET");
    sessionStorage.setItem("userId", String(session.userId));
  } catch { return; }

  const raw = sessionStorage.getItem("seat_selection_meta");
  if (!raw) { alert("No booking session found. Please select an event first."); window.location.replace("/events-page"); return; }

  const meta = JSON.parse(raw);
  currentEventId = meta.event_id;
  requiredCount  = meta.tickets_booked;

  document.getElementById("required-count").textContent = requiredCount;
  document.getElementById("seat-info").textContent = `Please select ${requiredCount} seat(s)`;
  document.getElementById("proceed-btn").addEventListener("click", proceedToPayment);

  await loadSeatsWithTiers(currentEventId);
});

/*
====================================================
 LOAD SEATS & TIERS
====================================================
*/
async function loadSeatsWithTiers(eventId) {
  try {
    // Try tier endpoint first (returns { seats, tiers })
    const data = await apiRequest(`/seats/${eventId}/tiers`, "GET", null, true);
    const { seats, tiers } = data;

    // Assign colours to each tier
    tiers.forEach((t, i) => {
      tierColorMap[t.tier] = TIER_COLORS[i % TIER_COLORS.length];
    });

    // Build price lookup
    seats.forEach(s => { tierPriceMap[s.seat_number] = parseFloat(s.tier_price) || 0; });

    // Build legend
    buildTierLegend(tiers);

    // Render grid
    renderSeatGrid(seats);
  } catch {
    // Fallback: load seats without tier data
    try {
      const seats = await apiRequest(`/seats/${eventId}`, "GET", null, true);
      renderSeatGrid(seats);
    } catch (err) {
      document.getElementById("seat-grid").innerHTML =
        `<p style="color:red;">Error loading seats: ${err.message}</p>`;
    }
  }
}

/*
====================================================
 BUILD TIER LEGEND
====================================================
*/
function buildTierLegend(tiers) {
  const legendEl = document.querySelector(".legend");
  if (!legendEl || !tiers.length) return;

  // Replace legend with tier legend
  const tierItems = tiers.map(t => {
    const c = tierColorMap[t.tier] || TIER_COLORS[0];
    return `
      <div class="legend-item">
        <div class="legend-box" style="background:${c.bg};border:2px solid ${c.border};width:22px;height:22px;border-radius:5px;"></div>
        <span>${t.tier} — ₹${parseFloat(t.price).toFixed(0)} (${t.available}/${t.total} left)</span>
      </div>`;
  });

  legendEl.innerHTML = `
    ${tierItems.join("")}
    <div class="legend-item"><div class="legend-box selected" style="width:22px;height:22px;border-radius:5px;"></div> Selected</div>
    <div class="legend-item"><div class="legend-box booked"   style="width:22px;height:22px;border-radius:5px;"></div> Booked</div>`;
}

/*
====================================================
 RENDER SEAT GRID
====================================================
*/
function renderSeatGrid(seats) {
  if (!seats || !seats.length) {
    document.getElementById("seat-grid").innerHTML = "<p>No seats found for this event.</p>";
    return;
  }

  // Group by row
  const rows = {};
  seats.forEach(seat => {
    const row = seat.seat_number[0];
    if (!rows[row]) rows[row] = [];
    rows[row].push(seat);
  });

  const grid = document.getElementById("seat-grid");
  grid.innerHTML = "";

  Object.keys(rows).sort().forEach(rowLabel => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "seat-row";

    const label = document.createElement("span");
    label.className = "row-label";
    label.textContent = rowLabel;
    rowDiv.appendChild(label);

    rows[rowLabel].forEach(seat => {
      const btn = document.createElement("button");
      const isBooked = seat.status === "booked";
      const tier = seat.seat_tier || "General";
      const c    = tierColorMap[tier];

      if (isBooked) {
        btn.className = "seat booked";
      } else {
        btn.className = "seat available";
        if (c) {
          btn.style.background   = c.bg;
          btn.style.borderColor  = c.border;
          btn.style.color        = c.text;
        }
      }

      btn.textContent  = seat.seat_number;
      btn.dataset.seat = seat.seat_number;
      btn.dataset.tier = tier;
      btn.disabled     = isBooked;
      btn.title        = isBooked ? "Booked" : `${tier} — ₹${parseFloat(seat.tier_price || 0).toFixed(0)}`;

      if (!isBooked) {
        btn.addEventListener("click", () => toggleSeat(btn, seat.seat_number, c));
      }

      rowDiv.appendChild(btn);
    });

    grid.appendChild(rowDiv);
  });
}

/*
====================================================
 TOGGLE SEAT SELECTION
====================================================
*/
function toggleSeat(btn, seatNumber, tierColor) {
  const isSelected = selectedSeats.includes(seatNumber);

  if (isSelected) {
    selectedSeats = selectedSeats.filter(s => s !== seatNumber);
    btn.classList.remove("selected");
    btn.classList.add("available");
    if (tierColor) {
      btn.style.background  = tierColor.bg;
      btn.style.borderColor = tierColor.border;
      btn.style.color       = tierColor.text;
    }
  } else {
    if (selectedSeats.length >= requiredCount) {
      alert(`You can only select ${requiredCount} seat(s). Deselect one first.`);
      return;
    }
    selectedSeats.push(seatNumber);
    btn.classList.remove("available");
    btn.classList.add("selected");
    if (tierColor) {
      btn.style.background  = tierColor.sel;
      btn.style.borderColor = tierColor.sel;
      btn.style.color       = "#fff";
    }
  }

  document.getElementById("selected-count").textContent = selectedSeats.length;
  document.getElementById("proceed-btn").disabled = selectedSeats.length !== requiredCount;
  updatePricePreview();
}

/*
====================================================
 UPDATE PRICE PREVIEW (tier-based total)
====================================================
*/
function updatePricePreview() {
  const hasTiers = Object.keys(tierPriceMap).length > 0;
  if (!hasTiers) return;

  let total = 0;
  selectedSeats.forEach(sn => { total += tierPriceMap[sn] || 0; });

  // Show/create price preview element
  let previewEl = document.getElementById("tier-price-preview");
  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.id = "tier-price-preview";
    previewEl.style.cssText = "margin-top:12px;font-size:.88rem;color:rgba(240,238,232,0.6);";
    document.querySelector(".selection-count").after(previewEl);
  }

  if (selectedSeats.length > 0) {
    const conv  = total * 0.10;
    const gst   = conv  * 0.09;
    const grand = total + conv + gst;
    previewEl.innerHTML = `
      Ticket: ₹${total.toFixed(2)} + Conv: ₹${conv.toFixed(2)} + GST: ₹${gst.toFixed(2)}
      &nbsp;=&nbsp; <strong style="color:#f5c842">₹${grand.toFixed(2)}</strong>`;
  } else {
    previewEl.innerHTML = "";
  }
}

/*
====================================================
 PROCEED TO PAYMENT
====================================================
*/
async function proceedToPayment() {
  if (selectedSeats.length !== requiredCount) {
    alert(`Please select exactly ${requiredCount} seat(s)`); return;
  }

  document.getElementById("proceed-btn").disabled   = true;
  document.getElementById("proceed-btn").textContent = "Processing...";

  try {
    const meta = JSON.parse(sessionStorage.getItem("seat_selection_meta"));
    const data = await apiRequest("/payments/create-order", "POST", {
      event_id:       meta.event_id,
      tickets_booked: meta.tickets_booked,
      selected_seats: selectedSeats,
    }, true);

    sessionStorage.setItem("razorpay_order", JSON.stringify(data));
    sessionStorage.removeItem("seat_selection_meta");
    window.location.href = "/payment";
  } catch (err) {
    alert("Could not initiate payment: " + err.message);
    document.getElementById("proceed-btn").disabled   = false;
    document.getElementById("proceed-btn").textContent = "Proceed to Payment →";
  }
}
