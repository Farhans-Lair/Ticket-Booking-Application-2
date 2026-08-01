
let seatService;
let mockSeatUpdate;
let mockSeatFindAll;
let mockTransaction;

beforeAll(() => {
  jest.isolateModules(() => {

    const fakeTxn = { LOCK: { UPDATE: "UPDATE" } };
    mockTransaction = jest.fn((cb) => cb(fakeTxn));

    jest.mock("../config/database", () => ({
      transaction: mockTransaction,
    }));

    mockSeatUpdate  = jest.fn();
    mockSeatFindAll = jest.fn();

    jest.mock("../models", () => ({
      Seat: {
        update:  mockSeatUpdate,
        findAll: mockSeatFindAll,
      },
    }));

    seatService = require("../services/seat.services");
  });
});

afterEach(() => jest.clearAllMocks());
afterAll(() => jest.restoreAllMocks());

describe("holdSeats", () => {
  it("releases prior hold, checks availability, then holds seats", async () => {

    mockSeatFindAll.mockResolvedValue([
      { seat_number: "A1" },
      { seat_number: "A2" },
    ]);
    mockSeatUpdate.mockResolvedValue([2]);

    const result = await seatService.holdSeats(1, ["A1", "A2"], 99);

    expect(mockSeatUpdate).toHaveBeenNthCalledWith(
      1,
      { status: "available", held_until: null, held_by_user_id: null },
      expect.objectContaining({ where: expect.objectContaining({ held_by_user_id: 99 }) })
    );

    expect(mockSeatUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: "held", held_by_user_id: 99 }),
      expect.any(Object)
    );

    expect(result.seatNumbers).toEqual(["A1", "A2"]);
    expect(result.heldUntil).toBeInstanceOf(Date);

    expect(result.heldUntil.getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
  });

  it("throws when requested seats are not all available", async () => {

    mockSeatFindAll.mockResolvedValue([{ seat_number: "A1" }]);
    mockSeatUpdate.mockResolvedValue([1]);

    await expect(seatService.holdSeats(1, ["A1", "A2"], 99))
      .rejects.toThrow("no longer available");
  });
});

describe("releaseExpiredHolds", () => {
  it("updates held seats whose held_until is in the past", async () => {
    mockSeatUpdate.mockResolvedValue([3]);

    const released = await seatService.releaseExpiredHolds();

    expect(mockSeatUpdate).toHaveBeenCalledWith(
      { status: "available", held_until: null, held_by_user_id: null },
      expect.objectContaining({
        where: expect.objectContaining({ status: "held" }),
      })
    );
    expect(released).toBe(3);
  });

  it("returns 0 when no holds have expired", async () => {
    mockSeatUpdate.mockResolvedValue([0]);
    const released = await seatService.releaseExpiredHolds();
    expect(released).toBe(0);
  });
});
