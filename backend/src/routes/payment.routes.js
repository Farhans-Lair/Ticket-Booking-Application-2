const express           = require("express");
const router            = express.Router();
const authenticate      = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controllers");

// Step 1 — Create Razorpay order (protected)
router.post(
  "/create-order",
  authenticate,
  (req, res, next) => paymentController.createOrder(req, res, next)
);

// Step 2 — Verify payment & confirm booking (protected)
router.post(
  "/verify",
  authenticate,
  (req, res, next) => paymentController.verifyPayment(req, res, next)
);

module.exports = router;
