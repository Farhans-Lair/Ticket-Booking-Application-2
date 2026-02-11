const eventService = require("../services/event.services");

const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      location,
      event_date,
      total_tickets
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

    if (new Date(event_date) < new Date()) {
      return res.status(400).json({
        error: "Event date must be in the future"
      });
    }

    // ✅ Call service with clean, controlled data
    const event = await eventService.createEvent({
      title,
      description,
      location,
      event_date,
      total_tickets,
      available_tickets: total_tickets
    });

    res.status(201).json(event);
  } catch (err) {
    // Preserve global error handling flow
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const events = await eventService.getAllEvents();
    res.json(events);
  } catch (err) {
    err.statusCode = 500;
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
  getEvents,
  deleteEvent
};
