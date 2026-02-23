const express = require("express");
const router = express.Router();


const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const revenueController = require("../controllers/revenue.controllers");


router.get("/revenue",authenticate,authorizeAdmin,(req,res,next)=>revenueController.getRevenue(req,res,next));

module.exports = router;