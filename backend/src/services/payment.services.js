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

  const order = await getRazorpayInstance().orders.create(options);
  return order;
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
