/**
 * seatHold.scheduler.js — Feature 1: Seat Hold Expiry Sweep
 *
 * Runs every minute and releases any seat whose held_until < NOW()
 * back to 'available', clearing held_by_user_id and held_until.
 *
 * Called once from app.js via startSeatHoldScheduler().
 */
const cron        = require("node-cron");
const seatService = require("./seat.services");
const logger      = require("../config/logger");

const startSeatHoldScheduler = () => {
  // Run every minute
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
