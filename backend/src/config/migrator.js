const path                = require("path");
const { Umzug, SequelizeStorage } = require("umzug");
const sequelize            = require("./database");

<<<<<<< HEAD
const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, "..", "migrations", "*.js"),
=======
const migrationsGlob = path
  .join(__dirname, "..", "migrations", "*.js")
  .replace(/\\/g, "/");

const migrator = new Umzug({
  migrations: {
    glob: migrationsGlob,
>>>>>>> bootstrap
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

module.exports = migrator;
