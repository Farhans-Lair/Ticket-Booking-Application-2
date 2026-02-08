import express from "express";
import authenticate from "../middleware/auth.middleware.js";
import authorizeAdmin from "../middleware/authorizeadmin.js";
import * as eventController from "../controllers/event.controllers.js";

const router = express.Router();


// Protected
router.get("/", authenticate, eventController.getEvents);

// Protected
router.post("/", authenticate, authorizeAdmin, eventController.createEvent);

export default router;
