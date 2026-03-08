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
    // Custom ticket-sized page — not full A4, avoids overflow to extra pages
    const W = 595.28;
    const H = 420;
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const M = 28;

    // Parse seats
    let seatsDisplay = "N/A";
    try {
      const seats = JSON.parse(booking.selected_seats || "[]");
      seatsDisplay = seats.length > 0 ? seats.join(", ") : "N/A";
    } catch (_) {}

    const eventDate = new Date(event.event_date).toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });

    // ── BACKGROUND ──────────────────────────────
    doc.rect(0, 0, W, H).fill("#0f0f1a");

    // Subtle dot pattern
    doc.fillColor("#ffffff").opacity(0.025);
    for (let x = 30; x < W; x += 30) {
      for (let y = 30; y < H; y += 30) {
        doc.circle(x, y, 1.5).fill();
      }
    }
    doc.opacity(1);

    // Left colour strip
    doc.rect(0, 0, 6, H).fill("#6c63ff");

    // ── HEADER ──────────────────────────────────
    doc.rect(6, 0, W - 6, 70).fill("#1a1a2e");

    // Brand — TicketVerse
    doc.fontSize(9).font("Helvetica-Bold")
      .fillColor("#6c63ff")
      .text("TicketVerse", M, 12, { characterSpacing: 2 });

    // Event title
    doc.fontSize(22).font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text(event.title, M, 28, { width: W - M * 2 - 100, lineBreak: false, ellipsis: true });

    // Category badge — top right
    if (event.category) {
      const bx = W - M - 88;
      doc.roundedRect(bx, 14, 82, 18, 9).stroke("#6c63ff");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#6c63ff")
        .text(event.category.toUpperCase(), bx, 19, { width: 82, align: "center" });
    }

    // ── VERSE STRIP ─────────────────────────────
    doc.rect(6, 70, W - 6, 36).fill("#16213e");
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#a78bfa")
      .text(
        "✦  Every great memory begins with a single ticket.  Every moment here belongs to you.",
        M, 80, { width: W - M * 2, align: "center" }
      );
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#6b6b8a")
      .text(
        "Tonight you're not just attending an event — you're becoming part of a story.",
        M, 93, { width: W - M * 2, align: "center" }
      );

    // ── PERFORATED DIVIDER ──────────────────────
    const perfY = 116;
    doc.fillColor("#6c63ff").circle(0, perfY, 10).fill();
    doc.circle(W, perfY, 10).fill();
    doc.dash(5, { space: 4 });
    doc.moveTo(M, perfY).lineTo(W - M, perfY)
      .strokeColor("#2e2e50").lineWidth(1).stroke();
    doc.undash();
    doc.fontSize(10).fillColor("#2e2e50").text("✂", M + 6, perfY - 7);

    // ── MAIN BODY ───────────────────────────────
    const bodyY = 126;
    const bodyH = H - bodyY - 50;
    const splitX = W * 0.60;

    // Left panel background
    doc.roundedRect(M, bodyY, splitX - M - 8, bodyH, 8).fill("#1a1a2e");
    // Right panel background
    doc.roundedRect(splitX, bodyY, W - splitX - M, bodyH, 8).fill("#1a1a2e");

    // ── LEFT: Event + Attendee info ─────────────
    const lx = M + 12;
    let ly = bodyY + 12;

    function label(txt, x, y) {
      doc.fontSize(7).font("Helvetica").fillColor("#6c63ff")
        .text(txt.toUpperCase(), x, y, { characterSpacing: 1 });
    }
    function value(txt, x, y, w = 120) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#ffffff")
        .text(txt, x, y + 10, { width: w, lineBreak: false, ellipsis: true });
    }

    // Row 1: Date | Location
    label("Date", lx, ly);
    label("Location", lx + 148, ly);
    value(eventDate, lx, ly, 138);
    value(event.location || "TBA", lx + 148, ly, 138);
    ly += 44;

    // Row 2: Seats | Tickets
    label("Seat(s)", lx, ly);
    label("Tickets", lx + 148, ly);
    value(seatsDisplay, lx, ly, 138);
    value(`${booking.tickets_booked} ticket(s)`, lx + 148, ly, 138);
    ly += 44;

    // Thin divider
    doc.moveTo(lx, ly).lineTo(splitX - M - 8, ly)
      .strokeColor("#2e2e50").lineWidth(0.8).stroke();
    ly += 10;

    // Attendee
    label("Attendee", lx, ly);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
      .text(user.name, lx, ly + 10, { width: splitX - M - 32, lineBreak: false, ellipsis: true });
    doc.fontSize(8.5).font("Helvetica").fillColor("#7c7c9a")
      .text(user.email, lx, ly + 26, { width: splitX - M - 32, lineBreak: false, ellipsis: true });

    // ── RIGHT: Payment + Booking ID ─────────────
    const rx = splitX + 12;
    let ry = bodyY + 12;

    // Booking ID
    label("Booking ID", rx, ry);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#6c63ff")
      .text(`#${booking.id}`, rx, ry + 10);
    ry += 48;

    // Payment summary
    label("Payment Summary", rx, ry);
    ry += 14;

    function payRow(lbl, amt, y) {
      doc.fontSize(8.5).font("Helvetica").fillColor("#9ca3af").text(lbl, rx, y);
      doc.fontSize(8.5).font("Helvetica").fillColor("#d1d5db")
        .text(amt, splitX, y, { width: W - splitX - M - 4, align: "right" });
    }

    payRow("Ticket Amount",    `Rs. ${booking.ticket_amount.toFixed(2)}`,   ry);
    payRow("Convenience Fee",  `Rs. ${booking.convenience_fee.toFixed(2)}`, ry + 14);
    payRow("GST (18%)",        `Rs. ${booking.gst_amount.toFixed(2)}`,      ry + 28);

    // Total divider
    doc.moveTo(rx, ry + 42).lineTo(W - M - 4, ry + 42)
      .strokeColor("#2e2e50").lineWidth(0.8).stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#9ca3af")
      .text("Total Paid", rx, ry + 48);
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
      .text(`Rs. ${booking.total_paid.toFixed(2)}`, splitX, ry + 48, {
        width: W - splitX - M - 4, align: "right",
      });

    // Status badge
    ry += 70;
    const bw = 90;
    const bx2 = rx + ((W - splitX - M - bw) / 2);
    doc.roundedRect(bx2, ry, bw, 20, 10).fill("#14532d");
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#4ade80")
      .text("✔  CONFIRMED", bx2, ry + 5, { width: bw, align: "center" });

    // ── FOOTER ──────────────────────────────────
    const fy = H - 46;
    doc.moveTo(M, fy).lineTo(W - M, fy).strokeColor("#1e1e3f").lineWidth(0.8).stroke();
    doc.fontSize(7).font("Helvetica").fillColor("#4b5563")
      .text(
        "This is your official e-ticket. Please present this at the venue entry.",
        M, fy + 8, { width: W - M * 2, align: "center" }
      );
    doc.fontSize(7).fillColor("#2e2e50")
      .text(
        `Payment ID: ${booking.razorpay_payment_id || "N/A"}  •  Generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}  •  TicketVerse`,
        M, fy + 20, { width: W - M * 2, align: "center" }
      );

    // Bottom accent bar
    doc.rect(0, H - 6, W, 6).fill("#6c63ff");

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