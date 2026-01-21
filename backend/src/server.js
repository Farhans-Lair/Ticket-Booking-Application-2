require("dotenv").config(); // MUST be FIRST LINE

const app = require("./app");
const sequelize = require("./config/database");

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync(); // creates tables
    console.log("Models synchronized successfully");

    app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
} catch (err) {
    console.error("Database initialization failed:", err.message);
    process.exit(1);
  }
})();

