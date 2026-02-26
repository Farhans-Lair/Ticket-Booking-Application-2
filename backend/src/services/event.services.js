const Event  = require("../models/Event");

const createEvent = async (eventData) => {
  return Event.create(eventData);
};

const getAllEvents = async () => {
  return Event.findAll({order: [["event_date", "ASC"]]});
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
     event.available_tickets
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
