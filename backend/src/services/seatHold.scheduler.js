const cron        = require("node-cron");
const seatService = require("./seat.services");
const logger      = require("../config/logger");

const startSeatHoldScheduler = () => {

  if (process.env.NODE_ENV === "test") return;

  cron.schedule("* * * * *", async () => {
    try {
      const released = await seatService.releaseExpiredHolds();
      if (released > 0) {
        logger.info("Seat hold sweep", { releasedSeats: released });
      }
    } catch (err) {
      logger.error("Seat hold sweep failed", { error: err.message });
    }
  });

  logger.info("Seat hold scheduler started (runs every minute)");
};

module.exports = { startSeatHoldScheduler };
