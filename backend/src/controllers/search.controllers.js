/**
 * search.controllers.js — Feature 2: Global search + city / price / date filters
 *
 * GET /search?q=...           → full-text search across title, description, location, city
 * GET /search/events?city=... → filtered listing (all params optional, approved events only)
 * GET /search/cities          → distinct city list for the city-picker dropdown
 */
const { Event } = require("../models");
const { Op }    = require("sequelize");
const logger    = require("../config/logger");

/* ─── Global full-text search ─────────────────────────────────────────────── */
const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Query param 'q' is required." });

    logger.info("Global search", { q });

    const events = await Event.findAll({
      where: {
        status: "approved",
        [Op.or]: [
          { title:       { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { location:    { [Op.like]: `%${q}%` } },
          { city:        { [Op.like]: `%${q}%` } },
        ],
      },
      order: [["event_date", "ASC"]],
    });

    res.json({ query: q, events, total: events.length });
  } catch (err) {
    next(err);
  }
};

/* ─── Filtered event listing ─────────────────────────────────────────────── */
const filteredEvents = async (req, res, next) => {
  try {
    const { city, category, minPrice, maxPrice, dateFrom, dateTo } = req.query;

    const where = { status: "approved" };

    if (city     && city.trim())     where.city     = { [Op.like]: `%${city.trim()}%` };
    if (category && category.trim()) where.category = category.trim();
    if (minPrice) where.price = { ...(where.price || {}), [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...(where.price || {}), [Op.lte]: parseFloat(maxPrice) };
    if (dateFrom) where.event_date = { ...(where.event_date || {}), [Op.gte]: new Date(dateFrom) };
    if (dateTo)   where.event_date = { ...(where.event_date || {}), [Op.lte]: new Date(`${dateTo}T23:59:59`) };

    const events = await Event.findAll({ where, order: [["event_date", "ASC"]] });

    logger.info("Filtered search", { city, category, minPrice, maxPrice, count: events.length });
    res.json(events);
  } catch (err) {
    next(err);
  }
};

/* ─── Distinct city list ──────────────────────────────────────────────────── */
const cities = async (req, res, next) => {
  try {
    const rows = await Event.findAll({
      where:      { status: "approved", city: { [Op.not]: null } },
      attributes: [[Event.sequelize.fn("DISTINCT", Event.sequelize.col("city")), "city"]],
      raw:        true,
    });

    const cityList = rows
      .map(r => r.city)
      .filter(Boolean)
      .sort();

    res.json(cityList);
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch, filteredEvents, cities };
