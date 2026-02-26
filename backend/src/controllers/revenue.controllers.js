const {Event,Booking}
= require("../models");

const getRevenue = async(req,res,next)=>{

try{

const events = await Event.findAll({
include:[{
model:Booking,
attributes:[
"tickets_booked",
"ticket_amount",
"convenience_fee",
"gst_amount",
"total_paid"
]
}]
});

// Filter out events that have no bookings — no noise in revenue report
    const eventsWithBookings = events.filter(
      event => event.Bookings && event.Bookings.length > 0
    );

res.json(eventsWithBookings);

}
catch(err){
next(err);
}
};

module.exports={getRevenue};