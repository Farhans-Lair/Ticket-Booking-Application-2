/**
 * cancellation.test.js
 * Fix: service reads booking.Event.event_date (Sequelize include association)
 *      so the booking mock must include an Event property.
 */

let cancellationService;
let mockBookingFindOne;
let mockPolicyFindOne;

beforeAll(() => {
  jest.isolateModules(() => {
    const fakeTxn = { LOCK: { UPDATE: "UPDATE" } };
    jest.mock("../config/database", () => ({
      transaction: jest.fn((cb) => cb(fakeTxn)),
    }));

    mockBookingFindOne = jest.fn();
    mockPolicyFindOne  = jest.fn();

    jest.mock("../models", () => ({
      Booking:            { findOne: mockBookingFindOne, findAll: jest.fn().mockResolvedValue([]) },
      Event:              {},
      CancellationPolicy: { findOne: mockPolicyFindOne },
    }));

    jest.mock("../services/seat.services", () => ({
      releaseSeats: jest.fn().mockResolvedValue(true),
    }));

    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({
        payments: { refund: jest.fn().mockResolvedValue({ id: "rfnd_test" }) },
      }))
    );

    process.env.RAZORPAY_KEY_ID     = "rzp_test_ci";
    process.env.RAZORPAY_KEY_SECRET = "ci_secret_key";

    cancellationService = require("../services/cancellation.services");
  });
});

afterAll(() => jest.restoreAllMocks());

const _futureDate = (hoursFromNow) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

// FIX: booking includes Event association — service reads booking.Event.event_date
const _baseBooking = (eventDate) => ({
  id: 1, user_id: 1, event_id: 1,
  tickets_booked: 2, ticket_amount: 1000,
  convenience_fee: 100, gst_amount: 9, total_paid: 1109,
  payment_status: "paid", cancellation_status: "active",
  selected_seats: "[]", razorpay_payment_id: "pay_test",
  Event: { event_date: eventDate, id: 1 },
  update: jest.fn().mockResolvedValue(true),
});

const _basePolicy = () => ({
  is_cancellation_allowed: true,
  tiers: [{ hours_before: 72, refund_percent: 100 }],
  cancellation_fee_flat: 0,
  cancellation_fee_percent: 0,
});

describe("previewCancellation", () => {
  it("allows cancellation when event is in the future", async () => {
    mockBookingFindOne.mockResolvedValue(_baseBooking(_futureDate(100)));
    mockPolicyFindOne.mockResolvedValue(_basePolicy());

    const result = await cancellationService.previewCancellation(1, 1);
    expect(result.cancellationAllowed).toBe(true);
    expect(result.refundAmount).toBeGreaterThan(0);
  });

  it("disallows cancellation when booking not found", async () => {
    mockBookingFindOne.mockResolvedValue(null);
    await expect(cancellationService.previewCancellation(999, 1)).rejects.toThrow();
  });

  it("disallows cancellation when event has already passed", async () => {
    mockBookingFindOne.mockResolvedValue(_baseBooking(_futureDate(-2)));
    mockPolicyFindOne.mockResolvedValue(_basePolicy());

    const result = await cancellationService.previewCancellation(1, 1);
    expect(result.cancellationAllowed).toBe(false);
    expect(result.reason).toMatch(/started|passed/i);
  });

  it("disallows cancellation when organizer has disabled it", async () => {
    mockBookingFindOne.mockResolvedValue(_baseBooking(_futureDate(100)));
    mockPolicyFindOne.mockResolvedValue({ ..._basePolicy(), is_cancellation_allowed: false });

    const result = await cancellationService.previewCancellation(1, 1);
    expect(result.cancellationAllowed).toBe(false);
    expect(result.reason).toMatch(/not enabled/i);
  });
});
