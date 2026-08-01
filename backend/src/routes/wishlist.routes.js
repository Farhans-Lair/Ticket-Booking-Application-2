const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const wishlistCtrl   = require("../controllers/wishlist.controllers");

router.post("/:eventId",   authenticate, wishlistCtrl.saveEvent);

router.delete("/:eventId", authenticate, wishlistCtrl.removeEvent);

router.get("/",            authenticate, wishlistCtrl.getMyWishlist);

module.exports = router;
