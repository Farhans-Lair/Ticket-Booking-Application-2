module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/jest.setup.js"],

  // ─────────────────────────────────────────────────────────────
  // FIX: Reset the module registry before every test FILE.
  //
  // Without this, jest --runInBand shares the Node module cache
  // across all test files in the same process. db.test.js calls
  // sequelize.close() in afterAll, which destroys the connection
  // pool on the cached Sequelize instance. When health.test.js
  // then loads models/index.js it gets the same broken Sequelize
  // instance from cache → sequelize.define() misbehaves →
  // Payout is not a Model subclass → hasMany crash.
  //
  // resetModules: true gives every test file a completely fresh
  // require() cache, so each file gets its own live Sequelize
  // instance and models initialise correctly.
  // ─────────────────────────────────────────────────────────────
  resetModules: true,

  // Give async DB operations time to finish
  testTimeout: 15000,

  // Show individual test names in CI output
  verbose: true,
};
