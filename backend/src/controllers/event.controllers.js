const eventService = require("../services/event.services");

const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      location,
      event_date,
      price,
      total_tickets,
      category

    } = req.body;

    // 🔒 Required fields validation
    if (!title || !event_date || !total_tickets) {
      return res.status(400).json({
        error: "Title, event date and total tickets are required"
      });
    }

    // 🔒 Business rules
    if (total_tickets <= 0) {
      return res.status(400).json({
        error: "Total tickets must be greater than zero"
      });
    }
// 🔥 FIXED DATE VALIDATION (Allows today)
const today = new Date();
today.setHours(0, 0, 0, 0);

const selectedDate = new Date(event_date);
selectedDate.setHours(0, 0, 0, 0);

if (selectedDate < today) {
  return res.status(400).json({
    error: "Event date must be today or future"
  });
}

    // ✅ Call service with clean, controlled data
    const event = await eventService.createEvent({
      title,
      description,
      location,
      event_date,
      price,
      total_tickets,
      available_tickets: total_tickets,
      category: category || 'Other',
      images: Array.isArray(images) && images.length > 0 ? images : null,  // ← NEW

    });

    res.status(201).json(event);
  } catch (err) {
    // Preserve global error handling flow
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const { category } = req.query;
    const events = await eventService.getAllEvents(category);
    res.json(events);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};

const updateEvent = async (req,res,next)=>{

 try{

 const eventId = req.params.id;

 const {
   title,
   description,
   location,
   event_date,
   price,
   total_tickets,
   category,
   images,
 } = req.body;

 const updatedEvent =
   await eventService.updateEvent(
      eventId,
      {
       title,
       description,
       location,
       event_date,
       price,
       total_tickets,
       category,
       images,
      }
   );

 if(!updatedEvent){

   return res.status(404).json({
     error:"Event not found"
   });

 }

 res.json(updatedEvent);

 }
 catch(err){

 next(err);

 }

};


const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    const deleted = await eventService.deleteEvent(eventId);

    if (!deleted) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  createEvent,
  updateEvent,
  getEvents,
  deleteEvent
};
