const Event  = require("../models/Event");

const createEvent = async (eventData) => {
  return Event.create(eventData);
};

const getAllEvents = async () => {
  return Event.findAll();
};

const deleteEvent = async (id) => {
  const result = await Event.destroy({ where: { id } });
  return result > 0;
};


module.exports = {
  createEvent,
  getAllEvents,
  deleteEvent
};
