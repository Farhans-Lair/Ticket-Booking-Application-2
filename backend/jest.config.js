module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/jest.setup.js"],

  // ─────────────────────────────────────────────────────────────
  // DO NOT use resetModules:true globally — in Jest 30 it resets
  // the registry before every individual it() test, not just
  // between files. This causes route handlers loaded in beforeAll
  // to become undefined by the time the test actually runs.
  //
  // Instead each test file that needs module isolation calls
  // jest.isolateModules() explicitly inside beforeAll.
  // ─────────────────────────────────────────────────────────────

  // Give async DB operations time to finish
  testTimeout: 15000,

  // Show individual test names in CI output
  verbose: true,
};
