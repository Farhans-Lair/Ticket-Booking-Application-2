const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controllers");

const validate = require("../middleware/validate.middleware");

const {
  registerValidator,
  loginValidator,
} = require("../validators/auth.validator");

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;

