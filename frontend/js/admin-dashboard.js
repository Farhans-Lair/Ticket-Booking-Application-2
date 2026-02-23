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

  if (!token || role !== "admin") {
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
  const available_tickets = Number(document.getElementById("available_tickets").value);
  

 if (!title || !event_date || !price || !total_tickets || !available_tickets){
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
      available_tickets
    }, true);   // 🔥 IMPORTANT → auth = true

    alert("Event created successfully!");

    // Clear form
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    document.getElementById("location").value = "";
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
      const soldTickets =
      event.total_tickets -
      event.available_tickets;

      const revenue =
      soldTickets *
      event.price;

      const div = document.createElement("div");

      div.innerHTML = `

Title:

<input id="title-${event.id}"
value="${event.title}" />

<br/>

Price:

<input type="number"
id="price-${event.id}"
value="${event.price}"
oninput="ticketPreview(${event.id})" />

<br/>

Date:

<input type="date"
id="date-${event.id}"
value="${
event.event_date ?
event.event_date.split("T")[0] :
""
}" />

<br/>

Total Tickets:

<input type="number"
id="total-${event.id}"
value="${event.total_tickets}" 
oninput="ticketPreview(${event.id})"
/>

<br/>

Available Tickets:

<span id="available-${event.id}">
${event.available_tickets}
</span>

<br/>

Sold Tickets:

<span id="sold-${event.id}">
${soldTickets}
</span>


<br/>

<br/>

Revenue Generated:

<span id="revenue-${event.id}"
style="color:green; font-weight:bold;">

₹${revenue}

</span>


<button onclick="updateEvent(${event.id})">

Save

</button>

<button onclick="deleteEvent(${event.id})">

Delete

</button>

<hr/>

`;
      eventsList.appendChild(div);
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

async function updateEvent(id){

try{

 const title =
 document.getElementById(
 `title-${id}`
 ).value;

 const price = Number(
document.getElementById(
`price-${id}`
).value
);

 const event_date =
 document.getElementById(
 `date-${id}`
 ).value;

const total_tickets = Number(
document.getElementById(
`total-${id}`
).value
);
/*
Validation
*/

 if(!title){

 alert("Title required");

 return;

 }

if(!price || price <= 0){

 alert("Price must be greater than zero");

 return;

 }

 if(total_tickets <= 0){

 alert("Total tickets must be > 0");

 return;

 }

 

 await apiRequest(

 `/events/${id}`,
 "PUT",
 {

 title,
 price,
 event_date, total_tickets

 },
 true
 );

 alert("Event Updated");
 loadEvents();
}

catch(err){
 alert(
 err.message ||
 "Update Failed"
 );
}
}

function ticketPreview(id){

const total = Number(
document.getElementById(
`total-${id}`
).value
);

const price = Number(
document.getElementById(
`price-${id}`
).value
);

const available =
document.getElementById(
`available-${id}`
);

available.innerText =
"Will auto adjust after save";


const sold =
document.getElementById(
`sold-${id}`
);

if(sold){

sold.innerText =
"Auto recalculated";

}


const revenue =
document.getElementById(
`revenue-${id}`
);

if(revenue){

revenue.innerText =
"Preview updates after save";

}

}

function goToRevenue(){
window.location.href =
"/admin-revenue";

}


function openRevenue(){
window.location.replace="/admin/revenue";
}

// 🔹 Logout
function logout() {
  localStorage.clear();
  window.location.replace("/");
}
