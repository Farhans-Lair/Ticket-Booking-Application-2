/**
 * search.controllers.js — #5: FULLTEXT search using MATCH() AGAINST()
 *
 * Requires FULLTEXT index on events(title, description, location, city).
 * Falls back to LIKE search if FULLTEXT is unavailable (e.g. in CI tests).
 */
const { Event }  = require("../models");
const { Op, literal, fn, col } = require("sequelize");
const sequelize  = require("../config/database");
const logger     = require("../config/logger");

/* ─── Full-text search using MATCH() AGAINST() ───────────────────────────── */
const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Query param 'q' is required." });

    logger.info("Full-text search", { q });

    // Sanitise input — remove MySQL boolean mode special chars
    const safeQ = q.replace(/[+\-><()\~*"@]/g, " ").trim();

    let events;
    try {
      // FULLTEXT MATCH AGAINST — much faster than LIKE on large datasets
      // IN BOOLEAN MODE supports prefix search (e.g. "jazz*")
      events = await Event.findAll({
        where: {
          status: "approved",
          [Op.and]: [
            literal(
              `MATCH(title, description, location, city) AGAINST(${sequelize.escape(safeQ)} IN BOOLEAN MODE)`
            ),
          ],
        },
        order: [
          // Relevance score: highest match first
          [literal(`MATCH(title, description, location, city) AGAINST(${sequelize.escape(safeQ)} IN BOOLEAN MODE)`), "DESC"],
          ["event_date", "ASC"],
        ],
      });
    } catch (ftErr) {
      // Fallback to LIKE if FULLTEXT index doesn't exist yet (fresh deploys, CI)
      logger.warn("FULLTEXT search failed, falling back to LIKE", { error: ftErr.message });
      events = await Event.findAll({
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
    }

    res.json({ query: q, events, total: events.length });
  } catch (err) {
    next(err);
  }
};

/* ─── Filtered event listing (unchanged — uses indexed columns) ──────────── */
const filteredEvents = async (req, res, next) => {
  try {
    const { city, category, minPrice, maxPrice, dateFrom, dateTo, q } = req.query;

    const where = { status: "approved" };

    if (city     && city.trim())     where.city     = { [Op.like]: `%${city.trim()}%` };
    if (category && category.trim()) where.category = category.trim();
    if (minPrice) where.price      = { ...(where.price      || {}), [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.price      = { ...(where.price      || {}), [Op.lte]: parseFloat(maxPrice) };
    if (dateFrom) where.event_date = { ...(where.event_date || {}), [Op.gte]: new Date(dateFrom) };
    if (dateTo)   where.event_date = { ...(where.event_date || {}), [Op.lte]: new Date(`${dateTo}T23:59:59`) };

    // Optional text search within filtered results
    if (q && q.trim()) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { title:    { [Op.like]: `%${q.trim()}%` } },
          { location: { [Op.like]: `%${q.trim()}%` } },
        ],
      });
    }

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
      attributes: [[fn("DISTINCT", col("city")), "city"]],
      raw:        true,
    });

    res.json(rows.map(r => r.city).filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch, filteredEvents, cities };
