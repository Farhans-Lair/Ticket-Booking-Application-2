/**
 * search.routes.js — Feature 2: Search + city/price/date filters
 */
const express        = require("express");
const router         = express.Router();
const searchCtrl     = require("../controllers/search.controllers");

// GET /search?q=...           → full-text search (public)
router.get("/",        searchCtrl.globalSearch);

// GET /search/events?city=... → filtered listing (public)
router.get("/events",  searchCtrl.filteredEvents);

// GET /search/cities          → city dropdown data (public)
router.get("/cities",  searchCtrl.cities);

module.exports = router;
