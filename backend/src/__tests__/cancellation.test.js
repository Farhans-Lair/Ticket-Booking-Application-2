/**
 * cancellation.test.js
 * Tests: previewCancellation, cancelBooking refund calculations
 */

let cancellationService;
let mockBookingFindOne;
let mockPolicyFindOne;
let mockEventFindByPk;

beforeAll(() => {
  jest.isolateModules(() => {
    const fakeTxn = { LOCK: { UPDATE: "UPDATE" } };
    jest.mock("../config/database", () => ({
      transaction: jest.fn((cb) => cb(fakeTxn)),
    }));

    mockBookingFindOne = jest.fn();
    mockPolicyFindOne  = jest.fn();
    mockEventFindByPk  = jest.fn();

    jest.mock("../models", () => ({
      Booking: {
        findOne: mockBookingFindOne,
        findAll: jest.fn().mockResolvedValue([]),
      },
      Event:             { findByPk: mockEventFindByPk },
      CancellationPolicy:{ findOne:  mockPolicyFindOne  },
    }));

    jest.mock("../services/seat.services", () => ({
      releaseSeats: jest.fn().mockResolvedValue(true),
    }));

    // Mock razorpay refund call
    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({
        payments: {
          refund: jest.fn().mockResolvedValue({ id: "rfnd_test" }),
        },
      }))
    );

    process.env.RAZORPAY_KEY_ID     = "rzp_test_ci";
    process.env.RAZORPAY_KEY_SECRET = "ci_secret_key";

    cancellationService = require("../services/cancellation.services");
  });
});

afterAll(() => jest.restoreAllMocks());

// ── helpers ───────────────────────────────────────────────────────────────────

const _futureDate = (hoursFromNow) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

const _baseBooking = (overrides = {}) => ({
  id: 1, user_id: 1, event_id: 1,
  tickets_booked: 2,
  ticket_amount:  1000,
  convenience_fee: 100,
  gst_amount:      9,
  total_paid:      1109,
  payment_status:  "paid",
  cancellation_status: "active",
  selected_seats:  "[]",
  razorpay_payment_id: "pay_test",
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const _basePolicy = (refundPercent = 100, hoursThreshold = 72) => ({
  allow_cancellation: true,
  tiers: [{ hours_before: hoursThreshold, refund_percent: refundPercent }],
  cancellation_fee_flat: 0,
  cancellation_fee_percent: 0,
  toJSON: function() { return this; },
});

// ─── previewCancellation ──────────────────────────────────────────────────────

describe("previewCancellation", () => {
  it("allows cancellation when event is in the future", async () => {
    mockBookingFindOne.mockResolvedValue(_baseBooking());
    mockEventFindByPk.mockResolvedValue({ event_date: _futureDate(100) });
    mockPolicyFindOne.mockResolvedValue(_basePolicy(100, 72));

    const result = await cancellationService.previewCancellation(1, 1);
    expect(result.cancellationAllowed).toBe(true);
    expect(result.refundAmount).toBeGreaterThan(0);
  });

  it("disallows cancellation when booking not found", async () => {
    mockBookingFindOne.mockResolvedValue(null);
    await expect(cancellationService.previewCancellation(999, 1))
      .rejects.toThrow();
  });

  it("disallows cancellation when event has already passed", async () => {
    mockBookingFindOne.mockResolvedValue(_baseBooking());
    mockEventFindByPk.mockResolvedValue({ event_date: _futureDate(-2) });
    mockPolicyFindOne.mockResolvedValue(_basePolicy(100, 72));

    const result = await cancellationService.previewCancellation(1, 1);
    expect(result.cancellationAllowed).toBe(false);
    expect(result.reason).toMatch(/started|passed/i);
  });
});
