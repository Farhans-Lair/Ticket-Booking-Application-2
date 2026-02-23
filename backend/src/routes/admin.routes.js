const express = require("express");
const router = express.Router();
const path = require("path");

const authenticate =
require("../middleware/auth.middleware");

const authorizeAdmin =
require("../middleware/authorizeadmin");


// MAIN DASHBOARD

router.get(
"/admin",
authenticate,
authorizeAdmin,
(req,res)=>{

res.sendFile(
path.join(__dirname,
"../frontend/admin-dashboard.html")
);

});


// REVENUE PAGE

router.get(
"/admin/revenue",
authenticate,
authorizeAdmin,
(req,res)=>{

res.sendFile(
path.join(__dirname,
"../frontend/admin-revenue.html")
);

});



module.exports = router;