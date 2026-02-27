const paymentService = require("../services/payment.services");
const bookingService = require("../services/booking.services");

/*
====================================================
 POST /payments/create-order
 Step 1 of payment flow.
 - Validates ticket availability
 - Calculates total amount
 - Creates a Razorpay order
 - Returns order details + Razorpay key_id to frontend
====================================================
*/

const createOrder = async (req, res, next) => {
  try {
    const userId         = req.user.id;
    const event_id       = parseInt(req.body.event_id, 10);
    const tickets_booked = parseInt(req.body.tickets_booked, 10);

    if (!event_id || !tickets_booked || tickets_booked <= 0) {
      return res.status(400).json({ error: "Valid event_id and tickets_booked required" });
    }

    // Phase 1 — calculate amount (no DB write yet)
    const { event, ticketAmount, convenienceFee, gstAmount, totalPaid } =
      await bookingService.calculateBookingAmount(event_id, tickets_booked);

    // Create Razorpay order
    const receipt = `rcpt_u${userId}_e${event_id}_${Date.now()}`;
    const order   = await paymentService.createOrder(totalPaid, "INR", receipt);

    res.status(200).json({
      order_id:       order.id,
      amount:         order.amount,           // in paise
      currency:       order.currency,
      key_id:         process.env.RAZORPAY_KEY_ID,
      // Pass breakdown so frontend can show a summary
      breakdown: {
        event_title:     event.title,
        tickets_booked,
        ticket_amount:   ticketAmount,
        convenience_fee: convenienceFee,
        gst_amount:      gstAmount,
        total_paid:      totalPaid,
      },
      // Pass booking meta so frontend can send it back on verify
      meta: {
        user_id:         userId,
        event_id,
        tickets_booked,
      },
    });

  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

/*
====================================================
 POST /payments/verify
 Step 2 of payment flow — called by frontend AFTER
 Razorpay checkout succeeds on the client side.
 - Verifies Razorpay signature (prevents tampering)
 - Confirms booking in DB (deducts tickets + saves booking)
====================================================
*/

const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      event_id,
      tickets_booked,
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay payment fields" });
    }
    if (!event_id || !tickets_booked) {
      return res.status(400).json({ error: "Missing booking meta fields" });
    }

    // Verify signature — if false, payment is invalid or tampered
    const isValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    // Phase 2 — confirm booking in DB
    const booking = await bookingService.confirmBooking(
      userId,
      parseInt(event_id, 10),
      parseInt(tickets_booked, 10),
      razorpay_order_id,
      razorpay_payment_id
    );

    res.status(201).json({
      message: "Payment verified and booking confirmed!",
      booking,
    });

  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
