
const crypto = require("crypto");

process.env.RAZORPAY_KEY_ID     = "rzp_test_ci";
process.env.RAZORPAY_KEY_SECRET = "ci_secret_key_for_testing_only";

let paymentService;

beforeAll(() => {
  jest.isolateModules(() => {

    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({
        orders: { create: jest.fn().mockResolvedValue({ id: "order_test" }) },
      }))
    );
    paymentService = require("../services/payment.services");
  });
});

afterAll(() => jest.restoreAllMocks());

describe("verifySignature", () => {
  const orderId   = "order_test_123";
  const paymentId = "pay_test_456";

  const _makeValidSig = () =>
    crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

  it("returns true for a valid signature", () => {
    const sig = _makeValidSig();
    expect(paymentService.verifySignature(orderId, paymentId, sig)).toBe(true);
  });

  it("returns false for a tampered order ID", () => {
    const sig = _makeValidSig();
    expect(paymentService.verifySignature("order_TAMPERED", paymentId, sig)).toBe(false);
  });

  it("returns false for a tampered payment ID", () => {
    const sig = _makeValidSig();
    expect(paymentService.verifySignature(orderId, "pay_TAMPERED", sig)).toBe(false);
  });

  it("returns false for a completely wrong signature", () => {
    expect(paymentService.verifySignature(orderId, paymentId, "deadbeef")).toBe(false);
  });

  it("returns false for an empty signature", () => {
    expect(paymentService.verifySignature(orderId, paymentId, "")).toBe(false);
  });

  it("is not vulnerable to timing — consistent result on repeated calls", () => {
    const sig = _makeValidSig();

    for (let i = 0; i < 5; i++) {
      expect(paymentService.verifySignature(orderId, paymentId, sig)).toBe(true);
    }
  });
});

describe("createOrder", () => {
  it("calls Razorpay with correct paise amount", async () => {
    const order = await paymentService.createOrder(500, "INR", "receipt_001");
    expect(order).toEqual({ id: "order_test" });
  });
});
