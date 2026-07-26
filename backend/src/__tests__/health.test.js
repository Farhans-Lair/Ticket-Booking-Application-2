

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

    }
  }
});

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });
});
