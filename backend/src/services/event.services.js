
const { Op } = require("sequelize");
const Event  = require("../models/Event");
const { Seat } = require("../models");

/*
====================================================
 GENERATE SEATS FOR AN EVENT
 10 seats per row, rows A-Z (max 260 seats)
====================================================
*/
const generateSeats = (eventId, totalTickets) => {
  const seats = [];
  const seatsPerRow = 10;
  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let count = 0;

  for (let r = 0; r < rows.length && count < totalTickets; r++) {
    for (let s = 1; s <= seatsPerRow && count < totalTickets; s++) {
      seats.push({
        event_id: eventId,
        seat_number: `${rows[r]}${s}`,
        status: 'available',
      });
      count++;
    }
  }
  return seats;
};

const createEvent = async (eventData) => {
  const event = await Event.create(eventData);
  // Auto-generate seats when event is created
  const seats = generateSeats(event.id, event.total_tickets);
  await Seat.bulkCreate(seats);
  return event;

};

const getAllEvents = async (category) => {
  const where = category ? { category } : {};
  return Event.findAll({where, order: [["event_date", "ASC"]]});
};

const updateEvent = async (id,data)=>{
 const event =await Event.findByPk(id);
 if(!event) return null;


/*
🔥 IMPORTANT BUSINESS RULE

Tickets already sold must be preserved.
*/

 const soldTickets =event.total_tickets - event.available_tickets;

 if(data.total_tickets && data.total_tickets < soldTickets){
 throw new Error(`Cannot reduce below sold tickets (${soldTickets})`);
}

 // adjust available tickets

 if(data.total_tickets)
  { const difference = data.total_tickets - event.total_tickets;
  event.available_tickets += difference;

  // If tickets increased, generate new seats for the added tickets
    if (difference > 0) {
      const existingSeats = await Seat.count({ where: { event_id: id } });
      const newSeats = generateSeats(id, data.total_tickets).slice(existingSeats);
      if (newSeats.length > 0) await Seat.bulkCreate(newSeats);
  }
}

 await event.update({
  
  title:
     data.title ?? event.title,

   description:
     data.description ?? event.description,

   location:
     data.location ?? event.location,

   price:
     data.price ?? event.price,

   event_date:
     data.event_date ?? event.event_date,

   total_tickets:
     data.total_tickets ??
     event.total_tickets,

   available_tickets:
     event.available_tickets,

   category:          
     data.category ?? 
     event.category
});

 return event;

};

const deleteEvent = async (id) => {
  const result = await Event.destroy({ where: { id } });
  return result > 0;
};

module.exports = {
  createEvent,
  updateEvent,
  getAllEvents,
  deleteEvent
};
