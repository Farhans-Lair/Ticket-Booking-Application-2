const {Event,Booking} = require("../models");
const logger          = require("../config/logger");


const getRevenue = async(req,res,next)=>{

try{

logger.info("Revenue report requested", { adminId: req.user?.id });

const events = await Event.findAll({
include:[{
model: Booking,
attributes:["tickets_booked","ticket_amount","convenience_fee","gst_amount","total_paid"]
}]
});

// Filter out events that have no bookings — no noise in revenue report
    const eventsWithBookings = events.filter(
      event => event.Bookings && event.Bookings.length > 0
    );

// Compute aggregate totals for the log
    const totalRevenue = eventsWithBookings.reduce((sum, event) => {
      return sum + event.Bookings.reduce((s, b) => s + (b.total_paid || 0), 0);
    }, 0);

    logger.info("Revenue report generated", {
      adminId:           req.user?.id,
      eventsWithRevenue: eventsWithBookings.length,
      totalRevenue:      totalRevenue.toFixed(2),
    });



res.json(eventsWithBookings);

}
catch(err){
  logger.error("Revenue report generation failed", {
      adminId: req.user?.id,
      error:   err.message,
    });
next(err);
}
};

module.exports={getRevenue};