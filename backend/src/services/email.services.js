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

    const W = 595.28;  // A4 width in points
    const H = 841.89;  // A4 height in points
    const MARGIN = 48;

    // Parse seats
    let seatsDisplay = "N/A";
    try {
      const seats = JSON.parse(booking.selected_seats || "[]");
      seatsDisplay = seats.length > 0 ? seats.join(", ") : "N/A";
    } catch (_) {}

    const eventDate = new Date(event.event_date).toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // ─────────────────────────────────────────
    // BACKGROUND
    // ─────────────────────────────────────────
    doc.rect(0, 0, W, H).fill("#0f0f1a");

    // Top accent bar
    doc.rect(0, 0, W, 8).fill("#6c63ff");

    // Decorative side strip
    doc.rect(0, 0, 6, H).fill("#6c63ff");

    // Subtle dot pattern (decorative circles)
    doc.fillColor("#ffffff").opacity(0.03);
    for (let x = 60; x < W; x += 40) {
      for (let y = 60; y < H; y += 40) {
        doc.circle(x, y, 2).fill();
      }
    }
    doc.opacity(1);

    // ─────────────────────────────────────────
    // HEADER SECTION
    // ─────────────────────────────────────────
    // Header background card
    doc.roundedRect(MARGIN, 30, W - MARGIN * 2, 130, 12).fill("#1a1a2e");

    // Brand name
    doc.fontSize(11)
      .font("Helvetica")
      .fillColor("#6c63ff")
      .text("TICKET BOOKING", MARGIN + 24, 52, { characterSpacing: 4 });

    // Event title
    doc.fontSize(26)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text(event.title, MARGIN + 24, 72, { width: W - MARGIN * 2 - 48 });

    // Category badge
    if (event.category) {
      const badgeText = event.category.toUpperCase();
      doc.fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#6c63ff");
      const badgeX = W - MARGIN - 90;
      doc.roundedRect(badgeX, 52, 80, 20, 10).stroke("#6c63ff");
      doc.text(badgeText, badgeX, 57, { width: 80, align: "center" });
    }

    // ─────────────────────────────────────────
    // TICKET VERSE / TAGLINE
    // ─────────────────────────────────────────
    const verseY = 178;
    doc.roundedRect(MARGIN, verseY, W - MARGIN * 2, 70, 10).fill("#16213e");

    doc.fontSize(10)
      .font("Helvetica-Oblique")
      .fillColor("#a78bfa")
      .text("✦  Every great memory begins with a single ticket.", MARGIN + 20, verseY + 12, {
        width: W - MARGIN * 2 - 40, align: "center"
      });

    doc.fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#7c7c9a")
      .text(
        "Tonight, you're not just attending an event — you're becoming part of a story.",
        MARGIN + 20, verseY + 32,
        { width: W - MARGIN * 2 - 40, align: "center" }
      );

    doc.fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#7c7c9a")
      .text(
        "Hold on to this moment. It belongs to you.",
        MARGIN + 20, verseY + 48,
        { width: W - MARGIN * 2 - 40, align: "center" }
      );

    // ─────────────────────────────────────────
    // PERFORATED DIVIDER
    // ─────────────────────────────────────────
    const perfY = 264;
    doc.fillColor("#6c63ff").circle(0, perfY, 16).fill();
    doc.circle(W, perfY, 16).fill();

    doc.dash(6, { space: 5 });
    doc.moveTo(MARGIN, perfY).lineTo(W - MARGIN, perfY)
      .strokeColor("#3a3a5c").lineWidth(1.5).stroke();
    doc.undash();

    // Scissors icon text
    doc.fontSize(12).fillColor("#3a3a5c").text("✂", MARGIN + 8, perfY - 8);

    // ─────────────────────────────────────────
    // EVENT INFO SECTION
    // ─────────────────────────────────────────
    const infoY = 282;

    // Left column
    const col1X = MARGIN + 16;
    const col2X = W / 2 + 16;

    function infoBlock(label, value, x, y) {
      doc.fontSize(8).font("Helvetica").fillColor("#6c63ff")
        .text(label.toUpperCase(), x, y, { characterSpacing: 1.5 });
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
        .text(value, x, y + 14, { width: (W / 2) - MARGIN - 16 });
    }

    infoBlock("Date", eventDate, col1X, infoY);
    infoBlock("Location", event.location || "To Be Announced", col2X, infoY);

    infoBlock("Seat(s)", seatsDisplay, col1X, infoY + 70);
    infoBlock("Tickets", `${booking.tickets_booked} ticket(s)`, col2X, infoY + 70);

    // ─────────────────────────────────────────
    // ATTENDEE SECTION
    // ─────────────────────────────────────────
    const attendeeY = infoY + 150;
    doc.roundedRect(MARGIN, attendeeY, W - MARGIN * 2, 80, 10).fill("#1a1a2e");

    doc.fontSize(8).font("Helvetica").fillColor("#6c63ff")
      .text("ATTENDEE", col1X, attendeeY + 14, { characterSpacing: 1.5 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#ffffff")
      .text(user.name, col1X, attendeeY + 28);
    doc.fontSize(10).font("Helvetica").fillColor("#7c7c9a")
      .text(user.email, col1X, attendeeY + 50);

    // Booking ID badge on right
    doc.fontSize(8).font("Helvetica").fillColor("#6c63ff")
      .text("BOOKING ID", col2X, attendeeY + 14, { characterSpacing: 1.5 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#ffffff")
      .text(`#${booking.id}`, col2X, attendeeY + 28);

    // ─────────────────────────────────────────
    // PAYMENT SUMMARY
    // ─────────────────────────────────────────
    const payY = attendeeY + 104;
    doc.roundedRect(MARGIN, payY, W - MARGIN * 2, 150, 10).fill("#1a1a2e");

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#6c63ff")
      .text("PAYMENT SUMMARY", col1X, payY + 16, { characterSpacing: 2 });

    function payRow(label, value, y, highlight = false) {
      doc.fontSize(10).font("Helvetica").fillColor("#9ca3af")
        .text(label, col1X, y);
      doc.fontSize(10)
        .font(highlight ? "Helvetica-Bold" : "Helvetica")
        .fillColor(highlight ? "#ffffff" : "#d1d5db")
        .text(value, 0, y, { align: "right", width: W - MARGIN * 2 - 32 });
    }

    payRow("Ticket Amount", `Rs. ${booking.ticket_amount.toFixed(2)}`, payY + 40);
    payRow("Convenience Fee", `Rs. ${booking.convenience_fee.toFixed(2)}`, payY + 62);
    payRow("GST (18%)", `Rs. ${booking.gst_amount.toFixed(2)}`, payY + 84);

    // Divider
    doc.moveTo(col1X, payY + 106).lineTo(W - MARGIN - 16, payY + 106)
      .strokeColor("#3a3a5c").lineWidth(1).stroke();

    payRow("Total Paid", `Rs. ${booking.total_paid.toFixed(2)}`, payY + 116, true);

    // ─────────────────────────────────────────
    // PAYMENT ID & STATUS
    // ─────────────────────────────────────────
    const pidY = payY + 168;
    doc.fontSize(8).font("Helvetica").fillColor("#4b5563")
      .text(`Payment ID: ${booking.razorpay_payment_id || "N/A"}`, MARGIN, pidY, {
        width: W - MARGIN * 2, align: "center"
      });

    // Status badge
    doc.roundedRect(W / 2 - 50, pidY + 16, 100, 24, 12).fill("#14532d");
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#4ade80")
      .text("✔  CONFIRMED", W / 2 - 50, pidY + 21, { width: 100, align: "center" });

    // ─────────────────────────────────────────
    // FOOTER
    // ─────────────────────────────────────────
    const footerY = H - 72;
    doc.moveTo(MARGIN, footerY).lineTo(W - MARGIN, footerY)
      .strokeColor("#1e1e3f").lineWidth(1).stroke();

    doc.fontSize(8).font("Helvetica").fillColor("#4b5563")
      .text(
        "This is your official e-ticket. Please present this at the venue entry.",
        MARGIN, footerY + 12,
        { width: W - MARGIN * 2, align: "center" }
      );

    doc.fontSize(8).fillColor("#3a3a5c")
      .text(
        `Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}  •  Ticket Booking Platform`,
        MARGIN, footerY + 28,
        { width: W - MARGIN * 2, align: "center" }
      );

    // Bottom accent bar
    doc.rect(0, H - 8, W, 8).fill("#6c63ff");

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