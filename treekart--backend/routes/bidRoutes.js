const express = require("express");
const router = express.Router();
const bidController = require("../controllers/bidController");

console.log("📋 Loading bid routes...");

// Vendor submits a bid
router.post("/submit", bidController.submitBid);

// Get all bids for a specific tree (for farmer)
router.get("/tree/:treeId", bidController.getBidsForTree);

// Farmer accepts a bid
router.put("/accept/:bidId", bidController.acceptBid);

// Farmer rejects a bid
router.put("/reject/:bidId", bidController.rejectBid);

// Get all booked trees for a vendor (MUST be before generic vendor route)
router.get("/vendor/:vendorPhone/booked-trees", bidController.getVendorBookedTrees);

// Get all completed/sold trees for a vendor (MUST be before generic vendor route)
router.get("/vendor/:vendorPhone/completed-trees", bidController.getVendorCompletedTrees);

// Get all bids by a vendor
router.get("/vendor/:vendorPhone", bidController.getVendorBids);

// Get all trees posted by farmer with their bids
router.get("/farmer/:farmerPhone/trees", bidController.getFarmerTreesWithBids);

console.log("✅ Bid routes loaded:");
console.log("  POST /api/bids/submit");
console.log("  GET /api/bids/tree/:treeId");
console.log("  PUT /api/bids/accept/:bidId");
console.log("  PUT /api/bids/reject/:bidId");
console.log("  GET /api/bids/vendor/:vendorPhone/booked-trees");
console.log("  GET /api/bids/vendor/:vendorPhone");
console.log("  GET /api/bids/farmer/:farmerPhone/trees");

module.exports = router;
