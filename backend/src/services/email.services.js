const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { Buffer } = require("buffer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

if (process.env.NODE_ENV !== "test") {
transporter.verify((error) => {
  if (error) console.error("Mail transporter error:", error);
  else console.log("Mail server ready");
});
}

function generateTicketPDF(booking, user, event) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Parse seats
    let seatsDisplay = "N/A";
    try {
      const seats = JSON.parse(booking.selected_seats || "[]");
      seatsDisplay = seats.length > 0 ? seats.join(", ") : "N/A";
    } catch (_) {}

    doc.fontSize(22).font("Helvetica-Bold").text("🎟 Ticket Confirmation", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica").text(`Booking ID   : ${booking.id}`);
    doc.text(`Name         : ${user.name}`);
    doc.text(`Email        : ${user.email}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Event Details");
    doc.font("Helvetica");
    doc.text(`Event        : ${event.title}`);
    doc.text(`Date         : ${new Date(event.event_date).toLocaleDateString("en-IN", { dateStyle: "long" })}`);
    doc.text(`Location     : ${event.location || "N/A"}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Booking Details");
    doc.font("Helvetica");
    doc.text(`Tickets      : ${booking.tickets_booked}`);
    doc.text(`Seats        : ${seatsDisplay}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Payment Summary");
    doc.font("Helvetica");
    doc.text(`Ticket Amount   : ₹${booking.ticket_amount.toFixed(2)}`);
    doc.text(`Convenience Fee : ₹${booking.convenience_fee.toFixed(2)}`);
    doc.text(`GST (18%)       : ₹${booking.gst_amount.toFixed(2)}`);
    doc.font("Helvetica-Bold").text(`Total Paid      : ₹${booking.total_paid.toFixed(2)}`);
    doc.moveDown();
    doc.font("Helvetica").fontSize(10).fillColor("gray")
      .text("Payment ID : " + (booking.razorpay_payment_id || "N/A"));
    doc.text("Thank you for your booking. Enjoy the event!", { align: "center" });

    doc.end();
  });
}

async function sendTicketEmail(user, booking, event) {
  try {
    const pdfBuffer = await generateTicketPDF(booking, user, event);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Your Ticket for ${event.title} – Booking Confirmed!`,
      text: `Hi ${user.name}, your booking for ${event.title} is confirmed. Ticket attached.`,
      html: `
        <h2>Booking Confirmed! 🎉</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your booking for <strong>${event.title}</strong> on <strong>${new Date(event.event_date).toLocaleDateString("en-IN", { dateStyle: "long" })}</strong> is confirmed.</p>
        <table style="border-collapse:collapse; width:100%; max-width:480px; font-family:sans-serif;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Booking ID</b></td><td style="padding:8px;border:1px solid #ddd;">${booking.id}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Tickets</b></td><td style="padding:8px;border:1px solid #ddd;">${booking.tickets_booked}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Ticket Amount</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.ticket_amount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Convenience Fee</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.convenience_fee.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>GST (18%)</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.gst_amount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Total Paid</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.total_paid.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:16px;">Your ticket PDF is attached. See you at the event! 🎶</p>
        <p style="color:#888;font-size:12px;">Payment ID: ${booking.razorpay_payment_id || "N/A"}</p>
      `,
      attachments: [{
        filename: `ticket-${booking.id}.pdf`,
        content: pdfBuffer,
      }],
    });

    console.log(`Ticket email sent to ${user.email} for booking ${booking.id}`);
  } catch (err) {
    console.error("Failed to send ticket email:", err);
    throw err;
  }
}

/**
 * Send a 6-digit OTP email.
 * purpose: "signup" | "login"
 */
async function sendOTPEmail(toEmail, otp, purpose) {
  const isSignup = purpose === "signup";
  const subject = isSignup
    ? "Verify your email – Ticket Booking"
    : "Your login verification code – Ticket Booking";

  const heading = isSignup
    ? "Complete Your Registration"
    : "Login Verification Code";

  const bodyText = isSignup
    ? "You requested to create a Ticket Booking account."
    : "Someone (hopefully you) is trying to log in to your Ticket Booking account.";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="margin-top:0;">${heading}</h2>
        <p>${bodyText}</p>
        <p>Use the code below. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;
                    padding:24px;background:#f3f4f6;border-radius:8px;margin:24px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`OTP email (${purpose}) sent to ${toEmail}`);
}

module.exports = { sendTicketEmail, generateTicketPDF, sendOTPEmail };