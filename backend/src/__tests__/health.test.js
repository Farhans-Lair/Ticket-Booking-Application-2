<<<<<<< HEAD
// ─────────────────────────────────────────────────────────────
// health.test.js — HTTP health-check smoke test
//
// jest.isolateModules() gives this test its own private module
// registry. Even when db.test.js has already connected (and
// closed) a Sequelize instance, the app loaded here gets a
// completely fresh Sequelize instance and all route handlers
// (including seatController.holdSeats) are properly defined.
// ─────────────────────────────────────────────────────────────

const request = require("supertest");

let app;
let sequelize;

beforeAll(() => {
  jest.isolateModules(() => {
    app      = require("../app");
    sequelize = require("../config/database");
  });
});

afterAll(async () => {
  if (sequelize) {
    try {
      await sequelize.close();
    } catch (_) {
      // Ignore
    }
  }
});
=======
const request = require("supertest");
const app = require("../app");
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });
});
