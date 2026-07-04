/**
 * seatHold.scheduler.js — Feature 1: Seat Hold Expiry Sweep
 *
 * Runs every minute and releases any seat whose held_until < NOW()
 * back to 'available', clearing held_by_user_id and held_until.
 *
 * FIX: Added NODE_ENV !== "test" guard.
 * Without it, health.test.js loads app.js which calls
 * startSeatHoldScheduler(), leaving an active cron timer that
 * prevents Jest from exiting cleanly (--forceExit masks this but
 * it is the wrong fix — the scheduler simply should not run in test).
 */
const cron        = require("node-cron");
const seatService = require("./seat.services");
const logger      = require("../config/logger");

const startSeatHoldScheduler = () => {
  // Never start the cron in test — it keeps the Jest process alive
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
