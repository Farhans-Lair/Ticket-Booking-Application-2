const { Sequelize } = require("sequelize");

const replicaHost = process.env.DB_HOST_REPLICA || process.env.DB_HOST;

const sequelizeReplica = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    replicaHost,
    port:    parseInt(process.env.DB_PORT || "3306", 10),
    dialect: "mysql",
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: { connectTimeout: 20000 },
    define: { underscored: true, freezeTableName: true },
  }
);

module.exports = sequelizeReplica;
