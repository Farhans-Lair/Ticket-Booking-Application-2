
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

    const fakeTransaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit:   jest.fn(),
      rollback: jest.fn(),
    };
    mockSequelizeTransaction = jest.fn((cb) => cb(fakeTransaction));

    jest.mock("../config/database", () => ({
      transaction: mockSequelizeTransaction,
    }));

    mockEventFindByPk = jest.fn();
    jest.mock("../models", () => ({
      Event:   { findByPk: mockEventFindByPk },
      Booking: {
        create:  jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
      },
    }));

    mockSeatBookSeats = jest.fn().mockResolvedValue([]);
    jest.mock("../services/seat.services", () => ({
      bookSeats:          mockSeatBookSeats,
      calculateTierPrice: jest.fn().mockResolvedValue({ total: 0, seats: [] }),
    }));

    mockQrGenerateToken = jest.fn().mockReturnValue("mock-qr-token");
    jest.mock("../services/qr.services", () => ({
      generateToken: mockQrGenerateToken,
    }));

    jest.mock("../services/coupon.services", () => ({
      validate: jest.fn().mockResolvedValue({ valid: false }),
      redeem:   jest.fn().mockRejectedValue(new Error("No coupon")),
    }));

    bookingService = require("../services/booking.services");

    const { Booking } = require("../models");
    mockBookingCreate  = Booking.create;
    mockBookingUpdate  = Booking.update;
    mockBookingFindAll = Booking.findAll;
  });
});

afterAll(() => jest.restoreAllMocks());

describe("calculateBookingAmount", () => {
  it("computes correct fees for a paid event", async () => {
    mockEventFindByPk.mockResolvedValue({
      id: 1, price: 1000, available_tickets: 10, title: "Test Event",
    });

    const result = await bookingService.calculateBookingAmount(1, 2);

    expect(result.ticketAmount).toBe(2000);

    expect(result.convenienceFee).toBe(200);

    expect(result.gstAmount).toBe(18);

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
