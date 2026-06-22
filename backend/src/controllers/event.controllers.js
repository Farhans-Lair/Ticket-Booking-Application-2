const eventService = require("../services/event.services");
<<<<<<< HEAD
const logger       = require("../config/logger");
=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac

const createEvent = async (req, res, next) => {
  try {
    const {
<<<<<<< HEAD
      title, description, location, event_date,
      price, total_tickets, category, images,
    } = req.body;

    if (!title || !event_date || !total_tickets) {
      return res.status(400).json({ error: "Title, event date and total tickets are required." });
    }
    if (total_tickets <= 0) {
      return res.status(400).json({ error: "Total tickets must be greater than zero." });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(event_date); selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: "Event date must be today or a future date." });
    }

    // Admin-created events are pre-approved and not featured by default
    const event = await eventService.createEvent({
      title, description, location, event_date, price, total_tickets,
      available_tickets: total_tickets,
      category: category || "Other",
      images: Array.isArray(images) && images.length > 0 ? images : null,
      organizer_id: null,
      status: "approved",         // admin events skip moderation
      is_featured: false,
    });

    logger.info("Event created successfully", { adminId: req.user?.id, eventId: event.id, title: event.title });
    res.status(201).json(event);
  } catch (err) {
    logger.error("Event creation failed", { adminId: req.user?.id, error: err.message });
=======
      title,
      description,
      location,
      event_date,
      price,
      total_tickets,

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
      available_tickets: total_tickets
    });

    res.status(201).json(event);
  } catch (err) {
    // Preserve global error handling flow
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
    next(err);
  }
};

<<<<<<< HEAD
// GET /events — only approved events (public)
const getEvents = async (req, res, next) => {
  try {
    const { category } = req.query;
    const events = await eventService.getAllEvents(category);
    res.json(events);
  } catch (err) {
=======
const getEvents = async (req, res, next) => {
  try {
    const events = await eventService.getAllEvents();
    res.json(events);
  } catch (err) {
    err.statusCode = 500;
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
    next(err);
  }
};

<<<<<<< HEAD
// GET /events/featured — Feature 2: featured events for homepage
const getFeaturedEvents = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit) || 8;
    const events = await eventService.getFeaturedEvents(limit);
    res.json(events);
  } catch (err) {
    next(err);
  }
};

// GET /events/trending — Feature 2: trending events by booking volume
const getTrendingEvents = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit) || 6;
    const events = await eventService.getTrendingEvents(limit);
    res.json(events);
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const {
      title, description, location, event_date,
      price, total_tickets, category, images,
    } = req.body;

    const updatedEvent = await eventService.updateEvent(
      eventId,
      { title, description, location, event_date, price, total_tickets, category, images },
      null   // null = admin, bypasses ownership check
    );

    if (!updatedEvent) return res.status(404).json({ error: "Event not found." });
    res.json(updatedEvent);
  } catch (err) {
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id, null);
    if (!deleted) return res.status(404).json({ error: "Event not found." });
    res.json({ message: "Event deleted successfully." });
=======
const updateEvent = async (req,res,next)=>{

 try{

 const eventId = req.params.id;

 const {
   title,
   description,
   location,
   event_date,
   price,
   total_tickets
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
       total_tickets
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
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  } catch (err) {
    next(err);
  }
};

<<<<<<< HEAD
module.exports = { createEvent, updateEvent, getEvents, getFeaturedEvents, getTrendingEvents, deleteEvent };
=======

module.exports = {
  createEvent,
  updateEvent,
  getEvents,
  deleteEvent
};
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
