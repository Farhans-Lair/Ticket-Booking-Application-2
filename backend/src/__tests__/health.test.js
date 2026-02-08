const request = require("supertest");
import app from "../app.js";

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });
});
