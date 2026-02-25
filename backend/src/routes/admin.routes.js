const express = require("express");
const router = express.Router();
const path = require("path");

// MAIN DASHBOARD
router.get("/",(req,res)=>{res.sendFile(path.join(__dirname,"../../../frontend/admin-dashboard.html"));});

// REVENUE PAGE

router.get("/revenue",(req,res)=>{res.sendFile(path.join(__dirname,"../../../frontend/admin-revenue.html"));});

module.exports = router;