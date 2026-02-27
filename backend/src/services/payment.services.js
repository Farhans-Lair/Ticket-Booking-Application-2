const Razorpay  = require("razorpay");
const crypto    = require("crypto");

/*
====================================================
 RAZORPAY INSTANCE
 Initialized once — key/secret from env variables
====================================================
*/

/*
====================================================
 RAZORPAY INSTANCE — LAZY INITIALIZED
 We use a getter function instead of creating the
 instance at module load time. This prevents crashes
 when env vars are not set (e.g. during Jest tests
 that don't need payment functionality).
====================================================
*/

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

/*
====================================================
 CREATE RAZORPAY ORDER
 amount   : number in paise (INR × 100)
 currency : "INR"
 receipt  : short unique label for your records
====================================================
*/

const createOrder = async (amount, currency = "INR", receipt) => {
  const options = {
    amount:   Math.round(amount * 100),   // Razorpay expects paise
    currency,
    receipt,
    payment_capture: 1,                   // auto-capture on success
  };

  const order = await razorpay.orders.create(options);
  return order;
};

/*
====================================================
 VERIFY RAZORPAY SIGNATURE
 After the user pays on the frontend, Razorpay sends
 back three values. We verify them by re-hashing
 order_id + "|" + payment_id with our key_secret.
 If the hashes match, the payment is authentic.
====================================================
*/

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
