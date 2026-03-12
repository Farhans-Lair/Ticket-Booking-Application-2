const eventService = require("../services/event.services");
const logger       = require("../config/logger");


const createEvent = async (req, res, next) => {
  try {
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

    // 🔒 Required fields validation
    if (!title || !event_date || !total_tickets) {
      logger.warn("Event creation rejected — missing required fields", {
        adminId: req.user?.id, title, event_date, total_tickets,
      });
      return res.status(400).json({
        error: "Title, event date and total tickets are required"
      });
    }

    // 🔒 Business rules
    if (total_tickets <= 0) {
      logger.warn("Event creation rejected — invalid ticket count", {
        adminId: req.user?.id, total_tickets,
      });
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
  logger.warn("Event creation rejected — past date", { adminId: req.user?.id, event_date });
  return res.status(400).json({
    error: "Event date must be today or future"
  });
}

logger.info("Event creation started", { adminId: req.user?.id, title, event_date, total_tickets });


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

    logger.info("Event created successfully", {
      adminId:  req.user?.id,
      eventId:  event.id,
      title:    event.title,
      category: event.category,
    });


    res.status(201).json(event);
  } catch (err) {
    logger.error("Event creation failed", { adminId: req.user?.id, error: err.message });
    // Preserve global error handling flow
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const { category } = req.query;
    logger.info("Fetching events", { category: category || "all" });
    const events = await eventService.getAllEvents(category);
    logger.info("Events fetched", { category: category || "all", count: events.length });
    res.json(events);
  } catch (err) {
    logger.error("Failed to fetch events", { category: req.query?.category, error: err.message });
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

 logger.info("Event update started", { adminId: req.user?.id, eventId });

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
   logger.warn("Event update failed — not found", { adminId: req.user?.id, eventId });
   return res.status(404).json({
     error:"Event not found"
   });

 }

 logger.info("Event updated successfully", { adminId: req.user?.id, eventId });


 res.json(updatedEvent);

 }
 catch(err){
  logger.error("Event update failed", { adminId: req.user?.id, eventId: req.params?.id, error: err.message });
  next(err);

 }

};


const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    logger.info("Event deletion started", { adminId: req.user?.id, eventId });

    const deleted = await eventService.deleteEvent(eventId);

    if (!deleted) {
      logger.warn("Event deletion failed — not found", { adminId: req.user?.id, eventId });
      return res.status(404).json({ error: "Event not found" });
    }

    logger.info("Event deleted successfully", { adminId: req.user?.id, eventId });


    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    logger.error("Event deletion failed", { adminId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};


module.exports = {
  createEvent,
  updateEvent,
  getEvents,
  deleteEvent
};
