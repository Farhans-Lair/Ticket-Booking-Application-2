const sequelize = require("../config/database");

describe("Database Connection", () => {
  it("should connect and authenticate with MySQL", async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
