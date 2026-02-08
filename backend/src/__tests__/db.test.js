const sequelize = require("../config/database");

describe("Database Connection", () => {
  afterAll(async () => {
    await sequelize.close(); // ✅ IMPORTANT
  });

  it("should connect and authenticate with MySQL", async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
