// ─────────────────────────────────────────────────────────────
// db.test.js — Database connectivity smoke test
//
// Uses jest.isolateModules() so the Sequelize instance created
// here lives in its own module scope and never pollutes the
// shared module cache used by health.test.js.
// Calling sequelize.close() in afterAll is therefore safe:
// it only destroys THIS file's private instance.
// ─────────────────────────────────────────────────────────────

let sequelize;

beforeAll(() => {
  jest.isolateModules(() => {
    sequelize = require("../config/database");
  });
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
