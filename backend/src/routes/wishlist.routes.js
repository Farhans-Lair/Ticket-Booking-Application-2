/**
 * wishlist.routes.js — Feature 6: Wishlist / save event
 */
const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const wishlistCtrl   = require("../controllers/wishlist.controllers");

// POST   /wishlist/:eventId   → save event  (auth required)
router.post("/:eventId",   authenticate, wishlistCtrl.saveEvent);

// DELETE /wishlist/:eventId   → remove      (auth required)
router.delete("/:eventId", authenticate, wishlistCtrl.removeEvent);

// GET    /wishlist            → my wishlist (auth required)
router.get("/",            authenticate, wishlistCtrl.getMyWishlist);

module.exports = router;
