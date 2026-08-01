const express        = require("express");
const router         = express.Router();
const searchCtrl     = require("../controllers/search.controllers");

router.get("/",        searchCtrl.globalSearch);

router.get("/events",  searchCtrl.filteredEvents);

router.get("/cities",  searchCtrl.cities);

module.exports = router;
