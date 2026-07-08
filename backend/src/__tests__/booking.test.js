/**
 * booking.test.js
 * Tests: confirmBooking, calculateBookingAmount, getUserBookings
 *
 * Uses jest.isolateModules() so Sequelize instance is private to this file.
 * All external I/O (DB, QR, coupon) is mocked so tests run without a live DB.
 */

let bookingService;
let mockEventFindByPk;
let mockBookingCreate;
let mockBookingUpdate;
let mockBookingFindAll;
let mockSeatBookSeats;
let mockQrGenerateToken;
let mockSequelizeTransaction;

beforeAll(() => {
  jest.isolateModules(() => {
    // ── Mock Sequelize transaction ──────────────────────────────────────────
    const fakeTransaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit:   jest.fn(),
      rollback: jest.fn(),
    };
    mockSequelizeTransaction = jest.fn((cb) => cb(fakeTransaction));

    jest.mock("../config/database", () => ({
      transaction: mockSequelizeTransaction,
    }));

    // ── Mock Event ──────────────────────────────────────────────────────────
    mockEventFindByPk = jest.fn();
    jest.mock("../models", () => ({
      Event:   { findByPk: mockEventFindByPk },
      Booking: {
        create:  jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
      },
    }));

    // ── Mock seat service ───────────────────────────────────────────────────
    mockSeatBookSeats = jest.fn().mockResolvedValue([]);
    jest.mock("../services/seat.services", () => ({
      bookSeats:          mockSeatBookSeats,
      calculateTierPrice: jest.fn().mockResolvedValue({ total: 0, seats: [] }),
    }));

    // ── Mock QR service ─────────────────────────────────────────────────────
    mockQrGenerateToken = jest.fn().mockReturnValue("mock-qr-token");
    jest.mock("../services/qr.services", () => ({
      generateToken: mockQrGenerateToken,
    }));

    // ── Mock coupon service ─────────────────────────────────────────────────
    jest.mock("../services/coupon.services", () => ({
      validate: jest.fn().mockResolvedValue({ valid: false }),
      redeem:   jest.fn().mockRejectedValue(new Error("No coupon")),
    }));

    bookingService = require("../services/booking.services");

    // Get references to mocked model methods
    const { Booking } = require("../models");
    mockBookingCreate  = Booking.create;
    mockBookingUpdate  = Booking.update;
    mockBookingFindAll = Booking.findAll;
  });
});

afterAll(() => jest.restoreAllMocks());

// ─── calculateBookingAmount ───────────────────────────────────────────────────

describe("calculateBookingAmount", () => {
  it("computes correct fees for a paid event", async () => {
    mockEventFindByPk.mockResolvedValue({
      id: 1, price: 1000, available_tickets: 10, title: "Test Event",
    });

    const result = await bookingService.calculateBookingAmount(1, 2);

    // ticket: 1000 × 2 = 2000
    expect(result.ticketAmount).toBe(2000);
    // conv fee: 2000 × 0.10 = 200
    expect(result.convenienceFee).toBe(200);
    // gst: 200 × 0.09 = 18
    expect(result.gstAmount).toBe(18);
    // total: 2000 + 200 + 18 = 2218
    expect(result.totalPaid).toBe(2218);
  });

  it("throws when event not found", async () => {
    mockEventFindByPk.mockResolvedValue(null);
    await expect(bookingService.calculateBookingAmount(999, 1))
      .rejects.toThrow("Event not found");
  });

  it("throws when not enough tickets", async () => {
    mockEventFindByPk.mockResolvedValue({ price: 500, available_tickets: 1 });
    await expect(bookingService.calculateBookingAmount(1, 5))
      .rejects.toThrow("Not enough tickets");
  });
});

// ─── confirmBooking ───────────────────────────────────────────────────────────

describe("confirmBooking", () => {
  beforeEach(() => {
    const mockEvent = {
      id: 1, price: 500, available_tickets: 10,
      save: jest.fn().mockResolvedValue(true),
    };
    mockEventFindByPk.mockResolvedValue(mockEvent);

    const mockBooking = {
      id: 42,
      update: jest.fn().mockResolvedValue(true),
    };
    mockBookingCreate.mockResolvedValue(mockBooking);
  });

  it("creates booking and generates QR token", async () => {
    const booking = await bookingService.confirmBooking(
      1, 1, 2,
      "order_abc", "pay_xyz",
      [], null
    );

    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:         1,
        event_id:        1,
        tickets_booked:  2,
        payment_status:  "paid",
      }),
      expect.any(Object)
    );
    expect(mockQrGenerateToken).toHaveBeenCalledWith(42, 1, 1);
    expect(booking.update).toHaveBeenCalledWith(
      { qr_token: "mock-qr-token" },
      expect.any(Object)
    );
  });

  it("decrements available_tickets", async () => {
    const mockEvent = {
      id: 1, price: 500, available_tickets: 8,
      save: jest.fn().mockResolvedValue(true),
    };
    mockEventFindByPk.mockResolvedValue(mockEvent);
    mockBookingCreate.mockResolvedValue({ id: 1, update: jest.fn() });

    await bookingService.confirmBooking(1, 1, 3, "o1", "p1", [], null);

    expect(mockEvent.available_tickets).toBe(5);
    expect(mockEvent.save).toHaveBeenCalled();
  });

  it("throws when event not found inside transaction", async () => {
    mockEventFindByPk.mockResolvedValue(null);
    await expect(
      bookingService.confirmBooking(1, 999, 1, "o", "p", [], null)
    ).rejects.toThrow("Event not found");
  });
});
