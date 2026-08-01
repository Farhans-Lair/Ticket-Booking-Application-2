

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

    }
  }
});

describe("Database Connection", () => {
  it("should connect and authenticate with MySQL", async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
