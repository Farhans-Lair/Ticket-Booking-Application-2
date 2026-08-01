const path                = require("path");
const { Umzug, SequelizeStorage } = require("umzug");
const sequelize            = require("./database");

const migrationsGlob = path
  .join(__dirname, "..", "migrations", "*.js")
  .replace(/\\/g, "/");

const migrator = new Umzug({
  migrations: {
    glob: migrationsGlob,
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

module.exports = migrator;
