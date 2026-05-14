// ─────────────────────────────────────────────────────────────
// db.test.js — Database connectivity smoke test
//
// FIX: With resetModules:true each test file gets a fresh
// require() cache. We let Jest handle teardown through the
// module lifecycle rather than manually closing sequelize,
// which was poisoning the shared instance for later test files.
// ─────────────────────────────────────────────────────────────

let sequelize;

beforeAll(() => {
  // Require inside beforeAll so resetModules gives a fresh instance
  sequelize = require("../config/database");
});

afterAll(async () => {
  if (sequelize) {
    try {
      await sequelize.close();
    } catch (_) {
      // Ignore errors on close — connection may already be gone
    }
  }
});

describe("Database Connection", () => {
  it("should connect and authenticate with MySQL", async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
