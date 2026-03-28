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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function fmtCurrency(amount) {
  return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET PDF  (fancy event-style — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function generateTicketPDF(booking, user, event) {
  return new Promise((resolve, reject) => {
    const W = 595.28;
    const H = 420;
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const M = 28;

    let seatsDisplay = "N/A";
    try {
      const seats = JSON.parse(booking.selected_seats || "[]");
      seatsDisplay = seats.length > 0 ? seats.join(", ") : "N/A";
    } catch (_) {}

    const eventDate = fmtDate(event.event_date);

    doc.rect(0, 0, W, H).fill("#0f0f1a");
    doc.fillColor("#ffffff").opacity(0.025);
    for (let x = 30; x < W; x += 30) {
      for (let y = 30; y < H; y += 30) {
        doc.circle(x, y, 1.5).fill();
      }
    }
    doc.opacity(1);
    doc.rect(0, 0, 6, H).fill("#6c63ff");
    doc.rect(6, 0, W - 6, 70).fill("#1a1a2e");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6c63ff")
      .text("TicketVerse", M, 12, { characterSpacing: 2 });
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#ffffff")
      .text(event.title, M, 28, { width: W - M * 2 - 100, lineBreak: false, ellipsis: true });
    if (event.category) {
      const bx = W - M - 88;
      doc.roundedRect(bx, 14, 82, 18, 9).stroke("#6c63ff");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#6c63ff")
        .text(event.category.toUpperCase(), bx, 19, { width: 82, align: "center" });
    }
    doc.rect(6, 70, W - 6, 36).fill("#16213e");
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#a78bfa")
      .text("✦  Every great memory begins with a single ticket.  Every moment here belongs to you.", M, 80, { width: W - M * 2, align: "center" });
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#6b6b8a")
      .text("Tonight you're not just attending an event — you're becoming part of a story.", M, 93, { width: W - M * 2, align: "center" });

    const perfY = 116;
    doc.fillColor("#6c63ff").circle(0, perfY, 10).fill();
    doc.circle(W, perfY, 10).fill();
    doc.dash(5, { space: 4 });
    doc.moveTo(M, perfY).lineTo(W - M, perfY).strokeColor("#2e2e50").lineWidth(1).stroke();
    doc.undash();
    doc.fontSize(10).fillColor("#2e2e50").text("✂", M + 6, perfY - 7);

    const bodyY = 126;
    const bodyH = H - bodyY - 50;
    const splitX = W * 0.60;
    doc.roundedRect(M, bodyY, splitX - M - 8, bodyH, 8).fill("#1a1a2e");
    doc.roundedRect(splitX, bodyY, W - splitX - M, bodyH, 8).fill("#1a1a2e");

    const lx = M + 12;
    let ly = bodyY + 12;

    function label(txt, x, y) {
      doc.fontSize(7).font("Helvetica").fillColor("#6c63ff").text(txt.toUpperCase(), x, y, { characterSpacing: 1 });
    }
    function value(txt, x, y, w = 120) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#ffffff").text(txt, x, y + 10, { width: w, lineBreak: false, ellipsis: true });
    }

    label("Date", lx, ly);
    label("Location", lx + 148, ly);
    value(eventDate, lx, ly, 138);
    value(event.location || "TBA", lx + 148, ly, 138);
    ly += 44;

    label("Seat(s)", lx, ly);
    label("Tickets", lx + 148, ly);
    value(seatsDisplay, lx, ly, 138);
    value(`${booking.tickets_booked} ticket(s)`, lx + 148, ly, 138);
    ly += 44;

    doc.moveTo(lx, ly).lineTo(splitX - M - 8, ly).strokeColor("#2e2e50").lineWidth(0.8).stroke();
    ly += 10;

    label("Attendee", lx, ly);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
      .text(user.name, lx, ly + 10, { width: splitX - M - 32, lineBreak: false, ellipsis: true });
    doc.fontSize(8.5).font("Helvetica").fillColor("#7c7c9a")
      .text(user.email, lx, ly + 26, { width: splitX - M - 32, lineBreak: false, ellipsis: true });

    const rx = splitX + 12;
    let ry = bodyY + 12;

    label("Booking ID", rx, ry);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#6c63ff").text(`#${booking.id}`, rx, ry + 10);
    ry += 48;

    label("Payment Summary", rx, ry);
    ry += 14;

    function payRow(lbl, amt, y) {
      doc.fontSize(8.5).font("Helvetica").fillColor("#9ca3af").text(lbl, rx, y);
      doc.fontSize(8.5).font("Helvetica").fillColor("#d1d5db")
        .text(amt, splitX, y, { width: W - splitX - M - 4, align: "right" });
    }

    payRow("Ticket Amount",   `Rs. ${booking.ticket_amount.toFixed(2)}`,   ry);
    payRow("Convenience Fee", `Rs. ${booking.convenience_fee.toFixed(2)}`, ry + 14);
    payRow("GST (9%)",        `Rs. ${booking.gst_amount.toFixed(2)}`,      ry + 28);

    doc.moveTo(rx, ry + 42).lineTo(W - M - 4, ry + 42).strokeColor("#2e2e50").lineWidth(0.8).stroke();
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#9ca3af").text("Total Paid", rx, ry + 48);
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
      .text(`Rs. ${booking.total_paid.toFixed(2)}`, splitX, ry + 48, { width: W - splitX - M - 4, align: "right" });

    ry += 70;
    const bw = 90;
    const bx2 = rx + ((W - splitX - M - bw) / 2);
    doc.roundedRect(bx2, ry, bw, 20, 10).fill("#14532d");
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#4ade80")
      .text("✔  CONFIRMED", bx2, ry + 5, { width: bw, align: "center" });

    const fy = H - 46;
    doc.moveTo(M, fy).lineTo(W - M, fy).strokeColor("#1e1e3f").lineWidth(0.8).stroke();
    doc.fontSize(7).font("Helvetica").fillColor("#4b5563")
      .text("This is your official e-ticket. Please present this at the venue entry.", M, fy + 8, { width: W - M * 2, align: "center" });
    doc.fontSize(7).fillColor("#2e2e50")
      .text(`Payment ID: ${booking.razorpay_payment_id || "N/A"}  •  Generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}  •  TicketVerse`, M, fy + 20, { width: W - M * 2, align: "center" });

    doc.rect(0, H - 6, W, 6).fill("#6c63ff");
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING INVOICE PDF  (professional A4 billing document)
// Triggered: on verifyPayment (booking confirmed event)
// ─────────────────────────────────────────────────────────────────────────────

function generateBookingInvoicePDF(booking, user, event) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const W  = 595.28;
    const H  = 841.89;
    const M  = 48;
    const CW = W - M * 2;

    const BRAND   = "#6c63ff";
    const DARK    = "#0f0f1a";
    const MID     = "#1a1a2e";
    const MUTED   = "#6b7280";
    const LIGHT   = "#f9fafb";
    const WHITE   = "#ffffff";
    const SUCCESS = "#16a34a";
    const DIVIDER = "#e5e7eb";

    // Header band
    doc.rect(0, 0, W, 88).fill(DARK);
    doc.rect(0, 0, 6, 88).fill(BRAND);
    doc.fontSize(20).font("Helvetica-Bold").fillColor(BRAND)
      .text("TicketVerse", M, 20, { characterSpacing: 1 });
    doc.fontSize(9).font("Helvetica").fillColor("#a78bfa")
      .text("ticketverse.in  •  support@ticketverse.in", M, 46);
    doc.fontSize(22).font("Helvetica-Bold").fillColor(WHITE)
      .text("INVOICE", W - M - 120, 18, { width: 120, align: "right" });
    const invoiceNumber = `INV-BKG-${String(booking.id).padStart(6, "0")}`;
    doc.fontSize(9).font("Helvetica").fillColor("#a78bfa")
      .text(invoiceNumber, W - M - 120, 48, { width: 120, align: "right" });

    let y = 108;

    // Billed to + invoice meta
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("BILLED TO", M, y, { characterSpacing: 1.5 });
    doc.fontSize(12).font("Helvetica-Bold").fillColor(DARK)
      .text(user.name, M, y + 14);
    doc.fontSize(9).font("Helvetica").fillColor(MUTED)
      .text(user.email, M, y + 30);

    const rCol = W - M - 180;
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("INVOICE DETAILS", rCol, y, { characterSpacing: 1.5 });

    function metaRow(lbl, val, offsetY) {
      doc.fontSize(8.5).font("Helvetica").fillColor(MUTED).text(lbl, rCol, y + 14 + offsetY);
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(DARK)
        .text(val, rCol + 90, y + 14 + offsetY, { width: 90, align: "right" });
    }
    metaRow("Invoice No.", invoiceNumber, 0);
    metaRow("Issue Date",  new Date().toLocaleDateString("en-IN", { dateStyle: "medium" }), 14);
    metaRow("Booking ID",  `#${booking.id}`, 28);
    metaRow("Status",      "PAID", 42);

    y += 80;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(DIVIDER).lineWidth(1).stroke();
    y += 20;

    // Event details
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("EVENT DETAILS", M, y, { characterSpacing: 1.5 });
    y += 14;
    doc.roundedRect(M, y, CW, 60, 6).fill(LIGHT);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(DARK)
      .text(event.title, M + 16, y + 10, { width: CW - 32, lineBreak: false, ellipsis: true });
    doc.fontSize(8.5).font("Helvetica").fillColor(MUTED)
      .text(
        `${fmtDate(event.event_date)}  •  ${event.location || "TBA"}  •  ${event.category || ""}`,
        M + 16, y + 32, { width: CW - 32 }
      );
    y += 78;

    // Items table
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("BILLING BREAKDOWN", M, y, { characterSpacing: 1.5 });
    y += 12;

    const COL = { desc: M, qty: M + 270, rate: M + 340, total: M + 430 };
    const rowH = 28;

    doc.roundedRect(M, y, CW, rowH, 4).fill(MID);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
    doc.text("Description", COL.desc + 8, y + 9, { width: 260 });
    doc.text("Qty",         COL.qty,       y + 9, { width: 68,  align: "center" });
    doc.text("Unit Price",  COL.rate,      y + 9, { width: 88,  align: "right" });
    doc.text("Amount",      COL.total,     y + 9, { width: CW - (COL.total - M) - 4, align: "right" });
    y += rowH;

    const unitPrice = parseFloat(event.price || 0);
    const rows = [
      { desc: `Event Ticket — ${event.title}`, qty: booking.tickets_booked, rate: unitPrice, total: booking.ticket_amount, bg: WHITE },
      { desc: "Convenience Fee (10% of ticket amount)", qty: 1, rate: booking.convenience_fee, total: booking.convenience_fee, bg: LIGHT },
      { desc: "GST on Convenience Fee (9%)", qty: 1, rate: booking.gst_amount, total: booking.gst_amount, bg: WHITE },
    ];

    rows.forEach((row) => {
      doc.rect(M, y, CW, rowH).fill(row.bg);
      doc.fontSize(8.5).font("Helvetica").fillColor(DARK);
      doc.text(row.desc, COL.desc + 8, y + 9, { width: 260, lineBreak: false, ellipsis: true });
      doc.text(String(row.qty), COL.qty, y + 9, { width: 68, align: "center" });
      doc.text(fmtCurrency(row.rate),  COL.rate,  y + 9, { width: 88, align: "right" });
      doc.text(fmtCurrency(row.total), COL.total, y + 9, { width: CW - (COL.total - M) - 4, align: "right" });
      y += rowH;
    });

    // Totals
    y += 8;
    const totBlockW = 220;
    const totBlockX = W - M - totBlockW;

    function totRow(lbl, val, bold = false, color = DARK) {
      doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(MUTED).text(lbl, totBlockX, y);
      doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color)
        .text(val, totBlockX, y, { width: totBlockW, align: "right" });
      y += 16;
    }

    totRow("Ticket Amount",   fmtCurrency(booking.ticket_amount));
    totRow("Convenience Fee", fmtCurrency(booking.convenience_fee));
    totRow("GST (9%)",        fmtCurrency(booking.gst_amount));
    doc.moveTo(totBlockX, y).lineTo(W - M, y).strokeColor(DIVIDER).lineWidth(0.8).stroke();
    y += 8;
    totRow("Total Paid", fmtCurrency(booking.total_paid), true, DARK);

    // Payment info chip
    y += 12;
    doc.roundedRect(M, y, CW, 44, 6).fill(LIGHT);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND)
      .text("PAYMENT INFORMATION", M + 16, y + 8, { characterSpacing: 1 });
    doc.fontSize(8.5).font("Helvetica").fillColor(MUTED)
      .text(
        `Payment ID: ${booking.razorpay_payment_id || "N/A"}   •   Order ID: ${booking.razorpay_order_id || "N/A"}   •   Method: Razorpay`,
        M + 16, y + 22, { width: CW - 32 }
      );

    // Status badge
    y += 60;
    const badgeW = 160;
    const badgeX = (W - badgeW) / 2;
    doc.roundedRect(badgeX, y, badgeW, 26, 13).fill("#dcfce7");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(SUCCESS)
      .text("✔  PAYMENT CONFIRMED", badgeX, y + 7, { width: badgeW, align: "center" });

    // Seats + booking date
    let seatsDisplay = "N/A";
    try {
      const seats = JSON.parse(booking.selected_seats || "[]");
      if (seats.length > 0) seatsDisplay = seats.join(", ");
    } catch (_) {}

    y += 44;
    doc.fontSize(8).font("Helvetica").fillColor(MUTED)
      .text(
        `Seat(s): ${seatsDisplay}  •  Booking Date: ${new Date(booking.booking_date || Date.now()).toLocaleDateString("en-IN", { dateStyle: "medium" })}`,
        M, y, { width: CW, align: "center" }
      );

    // Footer
    const footerY = H - 52;
    doc.rect(0, footerY, W, 52).fill(DARK);
    doc.rect(0, footerY, 6, 52).fill(BRAND);
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280")
      .text("Thank you for booking with TicketVerse! For support, reach us at support@ticketverse.in", M, footerY + 12, { width: CW, align: "center" });
    doc.fontSize(7).fillColor("#374151")
      .text(`${invoiceNumber}  •  This is a computer-generated invoice and requires no signature.`, M, footerY + 30, { width: CW, align: "center" });

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATION INVOICE PDF  (professional A4 — shows refund breakdown)
// Triggered: on cancelBooking (cancellation confirmed event)
// ─────────────────────────────────────────────────────────────────────────────

function generateCancellationInvoicePDF(booking, user, event, cancellationResult) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const W  = 595.28;
    const H  = 841.89;
    const M  = 48;
    const CW = W - M * 2;

    const BRAND   = "#6c63ff";
    const DARK    = "#0f0f1a";
    const MID     = "#1a1a2e";
    const MUTED   = "#6b7280";
    const LIGHT   = "#f9fafb";
    const WHITE   = "#ffffff";
    const WARN    = "#dc2626";
    const INFO    = "#2563eb";
    const DIVIDER = "#e5e7eb";

    const {
      refundAmount       = 0,
      refundPercent      = 0,
      cancellationFee    = 0,
      cancellationFeeGst = 0,
      isHighTier         = false,
      cancellationStatus = "cancelled",
    } = cancellationResult || {};

    const invoiceNumber   = `INV-CXL-${String(booking.id).padStart(6, "0")}`;
    const cancelledAt     = booking.cancelled_at
      ? new Date(booking.cancelled_at).toLocaleDateString("en-IN", { dateStyle: "medium" })
      : new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });

    const totalCancCharge = parseFloat(cancellationFee || 0) + parseFloat(cancellationFeeGst || 0);
    const refund          = parseFloat(refundAmount || 0);

    // Header band
    doc.rect(0, 0, W, 88).fill(DARK);
    doc.rect(0, 0, 6, 88).fill(BRAND);
    doc.fontSize(20).font("Helvetica-Bold").fillColor(BRAND)
      .text("TicketVerse", M, 20, { characterSpacing: 1 });
    doc.fontSize(9).font("Helvetica").fillColor("#a78bfa")
      .text("ticketverse.in  •  support@ticketverse.in", M, 46);
    doc.fontSize(22).font("Helvetica-Bold").fillColor(WHITE)
      .text("CANCELLATION", W - M - 160, 12, { width: 160, align: "right" });
    doc.fontSize(11).font("Helvetica-Bold").fillColor(WHITE)
      .text("INVOICE", W - M - 160, 38, { width: 160, align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#a78bfa")
      .text(invoiceNumber, W - M - 160, 58, { width: 160, align: "right" });

    let y = 108;

    // Meta
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("BILLED TO", M, y, { characterSpacing: 1.5 });
    doc.fontSize(12).font("Helvetica-Bold").fillColor(DARK).text(user.name, M, y + 14);
    doc.fontSize(9).font("Helvetica").fillColor(MUTED).text(user.email, M, y + 30);

    const rCol = W - M - 190;
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("CANCELLATION DETAILS", rCol, y, { characterSpacing: 1.5 });

    function metaRow(lbl, val, offsetY) {
      doc.fontSize(8.5).font("Helvetica").fillColor(MUTED).text(lbl, rCol, y + 14 + offsetY);
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(DARK)
        .text(val, rCol + 100, y + 14 + offsetY, { width: 90, align: "right" });
    }
    metaRow("Invoice No.",       invoiceNumber, 0);
    metaRow("Cancellation Date", cancelledAt,   14);
    metaRow("Booking ID",        `#${booking.id}`, 28);
    metaRow("Status",            cancellationStatus.toUpperCase(), 42);

    y += 80;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor(DIVIDER).lineWidth(1).stroke();
    y += 20;

    // Event details
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("ORIGINAL BOOKING — EVENT DETAILS", M, y, { characterSpacing: 1.5 });
    y += 14;
    doc.roundedRect(M, y, CW, 60, 6).fill(LIGHT);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(DARK)
      .text(event.title, M + 16, y + 10, { width: CW - 32, lineBreak: false, ellipsis: true });
    doc.fontSize(8.5).font("Helvetica").fillColor(MUTED)
      .text(
        `${fmtDate(event.event_date)}  •  ${event.location || "TBA"}  •  ${event.category || ""}`,
        M + 16, y + 32, { width: CW - 32 }
      );
    y += 78;

    // Breakdown table
    doc.fontSize(7).font("Helvetica-Bold").fillColor(BRAND)
      .text("FINANCIAL BREAKDOWN", M, y, { characterSpacing: 1.5 });
    y += 12;

    const COL = { desc: M, type: M + 280, amount: M + 410 };
    const rowH = 28;

    doc.roundedRect(M, y, CW, rowH, 4).fill(MID);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
    doc.text("Description", COL.desc + 8, y + 9, { width: 270 });
    doc.text("Type",        COL.type,      y + 9, { width: 120, align: "center" });
    doc.text("Amount",      COL.amount,    y + 9, { width: CW - (COL.amount - M) - 4, align: "right" });
    y += rowH;

    const tableRows = [
      { desc: `Original Ticket Amount (${booking.tickets_booked} ticket(s))`, type: "Original Charge",      amount: booking.ticket_amount,  color: DARK, bg: WHITE },
      { desc: "Convenience Fee (10%)",                                         type: "Original Charge",      amount: booking.convenience_fee, color: DARK, bg: LIGHT },
      { desc: "GST on Convenience Fee (9%)",                                   type: "Original Charge",      amount: booking.gst_amount,      color: DARK, bg: WHITE },
      { desc: "Cancellation Fee (5% of ticket + convenience)",                  type: "Cancellation Charge",  amount: cancellationFee,         color: WARN, bg: LIGHT },
      { desc: "GST on Cancellation Fee (5%)",                                  type: "Cancellation Charge",  amount: cancellationFeeGst,      color: WARN, bg: WHITE },
    ];

    tableRows.forEach((row) => {
      doc.rect(M, y, CW, rowH).fill(row.bg);
      doc.fontSize(8.5).font("Helvetica").fillColor(row.color)
        .text(row.desc, COL.desc + 8, y + 9, { width: 270, lineBreak: false, ellipsis: true });
      doc.fillColor(MUTED).text(row.type, COL.type, y + 9, { width: 120, align: "center" });
      doc.fillColor(row.color)
        .text(fmtCurrency(row.amount), COL.amount, y + 9, { width: CW - (COL.amount - M) - 4, align: "right" });
      y += rowH;
    });

    // Summary totals
    y += 8;
    const totBlockW = 240;
    const totBlockX = W - M - totBlockW;

    function totRow(lbl, val, bold = false, color = DARK) {
      doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(MUTED).text(lbl, totBlockX, y);
      doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color)
        .text(val, totBlockX, y, { width: totBlockW, align: "right" });
      y += 16;
    }

    totRow("Total Originally Paid",       fmtCurrency(booking.total_paid));
    totRow("Total Cancellation Charges",  `- ${fmtCurrency(totalCancCharge)}`, false, WARN);
    doc.moveTo(totBlockX, y).lineTo(W - M, y).strokeColor(DIVIDER).lineWidth(0.8).stroke();
    y += 8;
    totRow("Refund to Customer", fmtCurrency(refund), true, refund > 0 ? INFO : WARN);

    // Policy chip
    y += 12;
    doc.roundedRect(M, y, CW, 48, 6).fill(LIGHT);
    const tierLabel = isHighTier
      ? `High-Tier Cancellation (≥72 hrs before event) — ${refundPercent}% refund on ticket amount`
      : `Standard Cancellation — ${refundPercent}% refund on ticket amount`;
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(BRAND)
      .text("CANCELLATION POLICY APPLIED", M + 16, y + 8, { characterSpacing: 1 });
    doc.fontSize(8.5).font("Helvetica").fillColor(MUTED)
      .text(tierLabel, M + 16, y + 24, { width: CW - 32 });

    // Status badge
    y += 68;
    const badgeColor = refund > 0 ? "#dbeafe" : "#fee2e2";
    const badgeText  = refund > 0
      ? `✔  REFUND INITIATED — ${fmtCurrency(refund)}`
      : "✗  NO REFUND APPLICABLE";
    const badgeFont  = refund > 0 ? INFO : WARN;
    const badgeW     = 260;
    const badgeX     = (W - badgeW) / 2;
    doc.roundedRect(badgeX, y, badgeW, 28, 14).fill(badgeColor);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(badgeFont)
      .text(badgeText, badgeX, y + 8, { width: badgeW, align: "center" });

    // Payment ref
    y += 46;
    doc.fontSize(8).font("Helvetica").fillColor(MUTED)
      .text(
        `Original Payment ID: ${booking.razorpay_payment_id || "N/A"}` +
        (booking.razorpay_refund_id ? `  •  Refund ID: ${booking.razorpay_refund_id}` : ""),
        M, y, { width: CW, align: "center" }
      );

    // Footer
    const footerY = H - 52;
    doc.rect(0, footerY, W, 52).fill(DARK);
    doc.rect(0, footerY, 6, 52).fill(BRAND);
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280")
      .text("We're sorry to see you go. For questions about your refund, contact support@ticketverse.in", M, footerY + 12, { width: CW, align: "center" });
    doc.fontSize(7).fillColor("#374151")
      .text(`${invoiceNumber}  •  This is a computer-generated invoice and requires no signature.`, M, footerY + 30, { width: CW, align: "center" });

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SENDERS
// ─────────────────────────────────────────────────────────────────────────────

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
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>GST (9%)</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.gst_amount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><b>Total Paid</b></td><td style="padding:8px;border:1px solid #ddd;">₹${booking.total_paid.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:16px;">Your ticket PDF is attached. See you at the event! 🎶</p>
        <p style="color:#888;font-size:12px;">Payment ID: ${booking.razorpay_payment_id || "N/A"}</p>
      `,
      attachments: [{ filename: `ticket-${booking.id}.pdf`, content: pdfBuffer }],
    });
    console.log(`Ticket email sent to ${user.email} for booking ${booking.id}`);
  } catch (err) {
    console.error("Failed to send ticket email:", err);
    throw err;
  }
}

/**
 * sendBookingInvoiceEmail
 * Triggered after booking is confirmed (verifyPayment event).
 * Sends a professional A4 billing invoice PDF via email.
 */
async function sendBookingInvoiceEmail(user, booking, event) {
  try {
    const invoiceBuffer = await generateBookingInvoicePDF(booking, user, event);
    const invoiceNumber = `INV-BKG-${String(booking.id).padStart(6, "0")}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Booking Invoice ${invoiceNumber} – ${event.title}`,
      text: `Hi ${user.name}, please find your booking invoice for ${event.title} attached.`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#6c63ff;margin-top:0;">Booking Invoice 🧾</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your payment for <strong>${event.title}</strong> has been confirmed. Please find your official invoice attached.</p>
          <table style="border-collapse:collapse;width:100%;font-family:sans-serif;margin:16px 0;">
            <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Invoice No.</td><td style="padding:10px;border:1px solid #e5e7eb;">${invoiceNumber}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Booking ID</td><td style="padding:10px;border:1px solid #e5e7eb;">#${booking.id}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Ticket Amount</td><td style="padding:10px;border:1px solid #e5e7eb;">₹${parseFloat(booking.ticket_amount).toFixed(2)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Convenience Fee</td><td style="padding:10px;border:1px solid #e5e7eb;">₹${parseFloat(booking.convenience_fee).toFixed(2)}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">GST (9%)</td><td style="padding:10px;border:1px solid #e5e7eb;">₹${parseFloat(booking.gst_amount).toFixed(2)}</td></tr>
            <tr style="background:#dcfce7;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;">Total Paid</td><td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;color:#16a34a;">₹${parseFloat(booking.total_paid).toFixed(2)}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;">Payment ID: ${booking.razorpay_payment_id || "N/A"}</p>
          <p style="color:#6b7280;font-size:13px;">This is a computer-generated invoice. For support, contact support@ticketverse.in</p>
        </div>
      `,
      attachments: [{ filename: `invoice-booking-${booking.id}.pdf`, content: invoiceBuffer }],
    });

    console.log(`Booking invoice email sent to ${user.email} for booking ${booking.id}`);
  } catch (err) {
    console.error("Failed to send booking invoice email:", err);
    throw err;
  }
}

/**
 * sendCancellationInvoiceEmail
 * Triggered after booking is cancelled (cancelBooking event).
 * Sends a cancellation invoice PDF via email showing refund breakdown.
 */
async function sendCancellationInvoiceEmail(user, booking, event, cancellationResult) {
  try {
    const invoiceBuffer = await generateCancellationInvoicePDF(booking, user, event, cancellationResult);
    const invoiceNumber = `INV-CXL-${String(booking.id).padStart(6, "0")}`;

    const {
      refundAmount       = 0,
      cancellationFee    = 0,
      cancellationFeeGst = 0,
      cancellationStatus = "cancelled",
    } = cancellationResult || {};

    const refundLine = parseFloat(refundAmount) > 0
      ? `<p>A refund of <strong style="color:#2563eb;">₹${parseFloat(refundAmount).toFixed(2)}</strong> has been initiated to your original payment method.</p>`
      : `<p style="color:#dc2626;">No refund is applicable based on the cancellation policy.</p>`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Cancellation Invoice ${invoiceNumber} – ${event.title}`,
      text: `Hi ${user.name}, your booking for ${event.title} has been cancelled. Cancellation invoice attached.`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#dc2626;margin-top:0;">Booking Cancelled 🗓️</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your booking for <strong>${event.title}</strong> has been cancelled. Please find your official cancellation invoice attached.</p>
          ${refundLine}
          <table style="border-collapse:collapse;width:100%;font-family:sans-serif;margin:16px 0;">
            <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Invoice No.</td><td style="padding:10px;border:1px solid #e5e7eb;">${invoiceNumber}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Booking ID</td><td style="padding:10px;border:1px solid #e5e7eb;">#${booking.id}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">Cancellation Fee</td><td style="padding:10px;border:1px solid #e5e7eb;color:#dc2626;">₹${parseFloat(cancellationFee).toFixed(2)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600;">GST on Cancellation Fee</td><td style="padding:10px;border:1px solid #e5e7eb;color:#dc2626;">₹${parseFloat(cancellationFeeGst).toFixed(2)}</td></tr>
            <tr style="${parseFloat(refundAmount) > 0 ? "background:#dbeafe;" : "background:#fee2e2;"}">
              <td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;">Refund Amount</td>
              <td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;color:${parseFloat(refundAmount) > 0 ? "#2563eb" : "#dc2626"};">₹${parseFloat(refundAmount).toFixed(2)}</td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:13px;">Status: ${cancellationStatus.toUpperCase()}</p>
          <p style="color:#6b7280;font-size:13px;">For support, contact support@ticketverse.in</p>
        </div>
      `,
      attachments: [{ filename: `invoice-cancellation-${booking.id}.pdf`, content: invoiceBuffer }],
    });

    console.log(`Cancellation invoice email sent to ${user.email} for booking ${booking.id}`);
  } catch (err) {
    console.error("Failed to send cancellation invoice email:", err);
    throw err;
  }
}

/**
 * Send a 6-digit OTP email.
 * purpose: "signup" | "login"
 */
async function sendOTPEmail(toEmail, otp, purpose) {
  const isSignup = purpose === "signup";
  const subject  = isSignup ? "Verify your email – Ticket Booking" : "Your login verification code – Ticket Booking";
  const heading  = isSignup ? "Complete Your Registration" : "Login Verification Code";
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
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;padding:24px;background:#f3f4f6;border-radius:8px;margin:24px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  console.log(`OTP email (${purpose}) sent to ${toEmail}`);
}

module.exports = {
  sendTicketEmail,
  generateTicketPDF,
  generateBookingInvoicePDF,
  generateCancellationInvoicePDF,
  sendBookingInvoiceEmail,
  sendCancellationInvoiceEmail,
  sendOTPEmail,
};
