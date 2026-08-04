const Razorpay  = require("razorpay");
const crypto    = require("crypto");

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
    );
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
  });
};

const createOrder = async (amount, currency = "INR", receipt) => {
  const options = {
    amount:   Math.round(amount * 100),
    currency,
    receipt,
    payment_capture: 1,
  };

  try {
    const order = await getRazorpayInstance().orders.create(options);
    return order;
  } catch (err) {
    // The razorpay SDK rejects with a plain object shaped like
    // { statusCode, error: { description, code, reason, ... } } — not a
    // real Error instance — so err.message is undefined and the generic
    // "Internal Server Error" fallback fires instead of Razorpay's actual
    // reason. Re-throw as a proper Error carrying that real description.
    const description = err?.error?.description || err?.message;
    const wrapped = new Error(
      description ? `Razorpay error: ${description}` : "Razorpay order creation failed"
    );
    wrapped.razorpayCode = err?.error?.code;
    wrapped.razorpayReason = err?.error?.reason;
    throw wrapped;
  }
};

const verifySignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const body      = razorpay_order_id + "|" + razorpay_payment_id;
  const expected  = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expected === razorpay_signature;
};

module.exports = {
  createOrder,
  verifySignature,
};
