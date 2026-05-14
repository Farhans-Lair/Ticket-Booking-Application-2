// ─────────────────────────────────────────────────────────────
// health.test.js — HTTP health-check smoke test
//
// With resetModules:true, requiring app here gives a completely
// fresh Express app + Sequelize instance, independent of what
// db.test.js loaded and closed.
// ─────────────────────────────────────────────────────────────

const request = require("supertest");

let app;
let sequelize;

beforeAll(() => {
  app      = require("../app");
  sequelize = require("../config/database");
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

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });
});
