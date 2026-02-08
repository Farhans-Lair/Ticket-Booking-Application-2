const eventService = require("../services/event.services");

const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (err) {
     err.statusCode = 400;
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

module.exports = {
  createEvent,
  getEvents,
};
