const {Event,Booking}
= require("../models");

const getRevenue =
async(req,res,next)=>{

try{

const events =
await Event.findAll({

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

res.json(events);

}
catch(err){

next(err);

}

};

module.exports={
getRevenue
};