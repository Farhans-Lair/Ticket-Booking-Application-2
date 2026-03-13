const paymentService = require("../services/payment.services");
const bookingService = require("../services/booking.services");
const { User, Event } = require("../models");
const { sendTicketEmail, generateTicketPDF } = require("../services/email.services");
const { uploadTicketToS3 }                   = require("../services/s3.services");
const logger          = require("../config/logger");


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
    const selected_seats = req.body.selected_seats || [];  // array of seat numbers

    if (!event_id || !tickets_booked || tickets_booked <= 0) {
      logger.warn("Create order rejected — invalid input", { userId, event_id, tickets_booked });
      return res.status(400).json({ error: "Valid event_id and tickets_booked required" });
    }

    if (selected_seats.length !== tickets_booked) {
      logger.warn("Create order rejected — seat count mismatch", {
        userId, event_id, tickets_booked, seats_provided: selected_seats.length,
      });
      return res.status(400).json({
        error: `Please select exactly ${tickets_booked} seat(s)`
      });
    }

    logger.info("Razorpay order creation started", { userId, event_id, tickets_booked, selected_seats });


    // Phase 1 — calculate amount (no DB write yet)
    const { event, ticketAmount, convenienceFee, gstAmount, totalPaid } =
      await bookingService.calculateBookingAmount(event_id, tickets_booked);

    // Create Razorpay order
    const receipt = `rcpt_u${userId}_e${event_id}_${Date.now()}`;
    const order   = await paymentService.createOrder(totalPaid, "INR", receipt);

    logger.info("Razorpay order created successfully", {
      userId,
      event_id,
      tickets_booked,
      razorpay_order_id: order.id,
      total_paid:        totalPaid,
    });

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
        selected_seats,
      },
    });

  } catch (err) {
    logger.error("Razorpay order creation failed", {
      userId:   req.user?.id,
      event_id: req.body?.event_id,
      error:    err.message,
    });

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
      selected_seats,
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.warn("Payment verification rejected — missing Razorpay fields", { userId });
      return res.status(400).json({ error: "Missing Razorpay payment fields" });
    }
    if (!event_id || !tickets_booked) {
      logger.warn("Payment verification rejected — missing booking meta", { userId });
      return res.status(400).json({ error: "Missing booking meta fields" });
    }

    logger.info("Payment verification started", {
      userId,
      event_id,
      tickets_booked,
      razorpay_order_id,
      razorpay_payment_id,
    });


    // Verify signature — if false, payment is invalid or tampered
    const isValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      logger.error("Payment signature verification failed — possible tampering", {
        userId,
        razorpay_order_id,
        razorpay_payment_id,
      });

      return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    logger.info("Payment signature verified", { userId, razorpay_order_id });

    // Phase 2 — confirm booking in DB
    const booking = await bookingService.confirmBooking(
      userId,
      parseInt(event_id, 10),
      parseInt(tickets_booked, 10),
      razorpay_order_id,
      razorpay_payment_id,
      selected_seats || []    
    );

    logger.info("Booking confirmed", {
      userId,
      event_id,
      tickets_booked,
      bookingId:          booking.id,
      razorpay_order_id,
      razorpay_payment_id,
      total_paid:         booking.total_paid,
    });


    // ── Fetch user + event once — shared by S3 upload and email ──────────────
    const user  = await User.findByPk(userId);
    const event = await Event.findByPk(parseInt(event_id, 10));

    // ✅ Generate ticket PDF → upload to S3 → persist S3 key on booking record
    // Failure here does NOT roll back the confirmed booking.
    try {
      logger.info("Generating ticket PDF for S3 upload", { userId, bookingId: booking.id });

      const pdfBuffer = await generateTicketPDF(booking, user, event);
      const s3Key     = await uploadTicketToS3(pdfBuffer, booking.id, userId);

      // Persist the S3 key so future downloads stream from S3
      await booking.update({ ticket_pdf_s3_key: s3Key });

      logger.info("Ticket PDF stored in S3", { userId, bookingId: booking.id, s3Key });
    } catch (s3Err) {
      logger.error("S3 PDF upload failed (booking still confirmed)", {
        userId,
        bookingId: booking.id,
        error:     s3Err.message,
      });
    }

    // ✅ Send ticket email — failure must NOT block booking confirmation
    try {
      logger.info("Sending ticket email", { userId, email: user?.email, bookingId: booking.id });
      await sendTicketEmail(user, booking, event);
      logger.info("Ticket email sent", { userId, email: user?.email, bookingId: booking.id });
    } catch (emailErr) {
      logger.error("Ticket email failed (booking still confirmed)", {
        userId,
        bookingId: booking.id,
        error:     emailErr.message,
      });
    }


    res.status(201).json({
      message: "Payment verified and booking confirmed!",
      booking,
    });

  } catch (err) {
    logger.error("Payment verification flow failed", {
      userId:            req.user?.id,
      event_id:          req.body?.event_id,
      razorpay_order_id: req.body?.razorpay_order_id,
      error:             err.message,
    });
    err.statusCode = 400;
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
