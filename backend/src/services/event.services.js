const { Event } = require("../models");

const createEvent = async (eventData) => {
  return Event.create(eventData);
};

const getAllEvents = async () => {
  return Event.findAll();
};

module.exports = {
  createEvent,
  getAllEvents,
};
