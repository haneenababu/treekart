const express = require("express");
const router = express.Router();
const fruitController = require("../controllers/fruitController");

// Post a fruit
router.post("/", fruitController.postFruit);

// Get all available fruits
router.get("/available", fruitController.getAvailableFruits);

// Get fruits by vendor
router.get("/vendor/:vendorPhone", fruitController.getVendorFruits);

// Get vendor's pending bookings (need approval)
router.get("/vendor/:vendorPhone/pending", fruitController.getVendorPendingBookings);

// Get vendor's approved bookings (ready for delivery)
router.get("/vendor/:vendorPhone/approved", fruitController.getVendorApprovedBookings);

// Get all customer bookings (pending, approved, delivered)
router.get("/customer/:customerPhone/bookings", fruitController.getCustomerBookings);

// Get delivered fruits for a customer
router.get("/customer/:customerPhone/delivered", fruitController.getCustomerDeliveredFruits);

// Buy a fruit
router.put("/:fruitId/buy", fruitController.buyFruit);

// Get a single fruit by id (for booking page)
router.get("/:fruitId", fruitController.getFruitById);

// Approve a booking
router.put("/:fruitId/booking/:bookingId/approve", fruitController.approveBooking);

// Reject a booking
router.put("/:fruitId/booking/:bookingId/reject", fruitController.rejectBooking);

// Mark fruit as delivered (all bookings)
router.put("/:fruitId/deliver", fruitController.markDelivered);

// Mark specific booking as delivered
router.put("/:fruitId/booking/:bookingId/deliver", fruitController.markBookingDelivered);

// Cancel a specific booking within 24 hours
router.put("/:fruitId/booking/:bookingId/cancel", fruitController.cancelBooking);

// Increase fruit quantity
router.patch("/:fruitId/increase-quantity", fruitController.increaseFruitQuantity);

// Delete a fruit
router.delete("/:id", fruitController.deleteFruit);

module.exports = router;
