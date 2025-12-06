  const express = require("express");
  const router = express.Router();

  const User = require("../models/user");
  const Tree = require("../models/Tree");
  const Fruit = require("../models/Fruit");
  const Payment = require("../models/Payment");

  // ---------- Users ----------
  router.get("/users", async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/reports/fruits/details?month=10&year=2025&status=available
  router.get("/reports/fruits/details", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);
      const status = (req.query.status || "").toLowerCase();

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }
      if (!["available", "sold", ""].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use available|sold or omit." });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const match = {};
      if (status === "available") match.createdAt = { $gte: start, $lte: end }, match.status = "available";
      if (status === "sold") match.updatedAt = { $gte: start, $lte: end }, match.status = "sold";
      if (!status) {
        match.$or = [
          { createdAt: { $gte: start, $lte: end }, status: "available" },
          { updatedAt: { $gte: start, $lte: end }, status: "sold" }
        ];
      }

      const fruits = await Fruit.find(match).select(
        "name vendor vendorName vendorPhone price quantity status createdAt updatedAt"
      ).sort({ updatedAt: -1, createdAt: -1 });

      res.json({ month, year, status: status || "all", count: fruits.length, fruits });
    } catch (err) {
      console.error("Error building fruit details report:", err);
      res.status(500).json({ message: err.message || "Failed to build fruit details report" });
    }
  });

  // GET /api/admin/reports/trees/bids?month=10&year=2025&status=pending
  router.get("/reports/trees/bids", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);
      const status = (req.query.status || "").toLowerCase();

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }
      if (!["pending", "accepted", "rejected", ""].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use pending|accepted|rejected or omit." });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const match = { createdAt: { $gte: start, $lte: end } };
      if (status) match.status = status;

      const Bid = require("../models/Bid");
      const records = await Bid.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "trees",
            localField: "treeId",
            foreignField: "_id",
            as: "tree"
          }
        },
        // Do not preserve bids whose tree has been deleted; drop null trees
        { $unwind: { path: "$tree", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            bidId: "$_id",
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            vendorName: 1,
            vendorPhone: 1,
            vendorEmail: 1,
            proposedPrice: 1,
            message: 1,
            treeId: "$tree._id",
            treeName: "$tree.name",
            farmerName: "$tree.farmerName",
            farmerPhone: "$tree.farmerPhone",
            farmerEmail: "$tree.farmerEmail",
            treeLocation: "$tree.location",
            expectedRent: "$tree.expectedRent",
            rateValue: "$tree.rateValue",
            treeCount: "$tree.treeCount"
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      res.json({ month, year, status: status || "all", count: records.length, bids: records });
    } catch (err) {
      console.error("Error building tree bids report:", err);
      res.status(500).json({ message: err.message || "Failed to build tree bids report" });
    }
  });

  // GET /api/admin/reports/trees/details?month=10&year=2025&status=booked
  router.get("/reports/trees/details", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);
      const status = (req.query.status || "").toLowerCase();

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }
      if (!["available", "pending", "booked", "sold", ""].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use available|booked|sold or omit." });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      // Compute effective date like summary endpoint
      const addFields = {
        $addFields: {
          effectiveDate: {
            $cond: [ { $eq: ["$status", "available"] }, "$createdAt", "$updatedAt" ]
          }
        }
      };

      const match = { effectiveDate: { $gte: start, $lte: end } };
      if (status) match.status = status;

      const trees = await Tree.aggregate([
        addFields,
        { $match: match },
        // Lookup accepted bid to retrieve acceptance (booked) timestamp
        {
          $lookup: {
            from: "bids",
            localField: "acceptedBidId",
            foreignField: "_id",
            as: "acceptedBid"
          }
        },
        { $unwind: { path: "$acceptedBid", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1,
            description: 1,
            expectedRent: 1,
            treeCount: 1,
            rateValue: 1,
            leaseDuration: 1,
            image: 1,
            location: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            // Farmer details
            farmerName: 1,
            farmerPhone: 1,
            farmerEmail: 1,
            // Booking/vendor details if any
            bookedBy: 1,
            vendorPhone: 1,
            vendorEmail: 1,
            vendorLocation: 1,
            vendorAddress: 1,
            acceptedPrice: 1,
            // Booked timestamp from accepted bid
            bookedAt: "$acceptedBid.updatedAt"
          }
        },
        { $sort: { updatedAt: -1, createdAt: -1 } }
      ]);

      res.json({ month, year, status: status || "all", count: trees.length, trees });
    } catch (err) {
      console.error("Error building detailed trees report:", err);
      res.status(500).json({ message: err.message || "Failed to build detailed trees report" });
    }
  });

  // GET /api/admin/reports/fruits/bookings?month=10&year=2025&status=pending
  router.get("/reports/fruits/bookings", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);
      const status = (req.query.status || "").toLowerCase();

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }
      if (!["pending", "approved", "rejected", "canceled", ""].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use pending|approved|rejected|canceled or omit." });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      // Build matching conditions
      const matchStage = { $and: [] };
      // For cancellations, include records where either canceledAt OR bookedAt falls in range
      if (status === "canceled") {
        matchStage.$and.push({ "bookings.canceled": true });
        matchStage.$and.push({
          $or: [
            { "bookings.canceledAt": { $gte: start, $lte: end } },
            { "bookings.bookedAt": { $gte: start, $lte: end } }
          ]
        });
      } else {
        // Default: use bookedAt window
        matchStage.$and.push({ "bookings.bookedAt": { $gte: start, $lte: end } });
        if (status) matchStage.$and.push({ "bookings.status": status });
      }

      const records = await Fruit.aggregate([
        { $unwind: "$bookings" },
        { $match: matchStage.$and.length ? matchStage : {} },
        // Effective date: canceledAt if canceled else bookedAt for consistent sorting
        {
          $addFields: {
            effectiveDate: {
              $cond: [ { $eq: [ "$bookings.canceled", true ] }, "$bookings.canceledAt", "$bookings.bookedAt" ]
            }
          }
        },
        {
          $project: {
            // Vendor/Fruit info
            fruitId: "$_id",
            fruitName: "$name",
            vendor: "$vendor",
            vendorName: "$vendorName",
            vendorPhone: "$vendorPhone",
            fruitPrice: "$price",
            fruitStatus: "$status",
            // Customer/Booking info
            bookingStatus: "$bookings.status",
            bookedAt: "$bookings.bookedAt",
            delivered: "$bookings.delivered",
            deliveredAt: "$bookings.deliveredAt",
            canceled: { $ifNull: [ "$bookings.canceled", false ] },
            canceledAt: "$bookings.canceledAt",
            customerName: "$bookings.customerName",
            customerPhone: "$bookings.customerPhone",
            customerEmail: "$bookings.customerEmail",
            alternativePhone: "$bookings.alternativePhone",
            deliveryAddress: "$bookings.deliveryAddress",
            location: "$bookings.location",
            quantity: "$bookings.quantity",
            effectiveDate: 1
          }
        },
        { $sort: { effectiveDate: -1 } }
      ]);

      res.json({ month, year, status: status || "all", count: records.length, bookings: records });
    } catch (err) {
      console.error("Error building fruit bookings report:", err);
      res.status(500).json({ message: err.message || "Failed to build fruit bookings report" });
    }
  });

  // ---------- Trees ----------
  router.get("/trees", async (req, res) => {
    try {
      const trees = await Tree.find();
      res.json(trees);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin routes - no approval/rejection needed, trees are posted directly as available

  // ---------- Fruits ----------
  router.get("/fruits", async (req, res) => {
    try {
      const fruits = await Fruit.find();
      res.json(fruits);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ---------- Reports (Month/Year) ----------
  // GET /api/admin/reports/trees?month=10&year=2025
  router.get("/reports/trees", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

      // Use effectiveDate: createdAt for 'available', updatedAt for 'booked'/'sold'
      const pipeline = [
        {
          $addFields: {
            effectiveDate: {
              $cond: [
                { $eq: ["$status", "available"] },
                "$createdAt",
                "$updatedAt"
              ]
            }
          }
        },
        { $match: { effectiveDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ];

      const results = await Tree.aggregate(pipeline);
      const counts = results.reduce(
        (acc, r) => ({ ...acc, [r._id]: r.count }),
        { available: 0, booked: 0, sold: 0 }
      );

      res.json({ month, year, ...counts, total: counts.available + counts.booked + counts.sold });
    } catch (err) {
      console.error("Error building tree report:", err);
      res.status(500).json({ message: err.message || "Failed to build tree report" });
    }
  });

  // GET /api/admin/reports/fruits?month=10&year=2025
  router.get("/reports/fruits", async (req, res) => {
    try {
      const month = parseInt(req.query.month, 10);
      const year = parseInt(req.query.year, 10);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month/year. Use ?month=1-12&year=YYYY" });
      }

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      // Use $facet to compute fruit status and booking status in one round trip
      const [result] = await Fruit.aggregate([
        {
          $facet: {
            availableFruits: [
              { $match: { status: "available", createdAt: { $gte: start, $lte: end } } },
              { $count: "count" }
            ],
            soldFruits: [
              { $match: { status: "sold", updatedAt: { $gte: start, $lte: end } } },
              { $count: "count" }
            ],
            pendingBookings: [
              { $unwind: "$bookings" },
              { $match: { "bookings.status": "pending", "bookings.bookedAt": { $gte: start, $lte: end } } },
              { $count: "count" }
            ],
            approvedBookings: [
              { $unwind: "$bookings" },
              { $match: { "bookings.status": "approved", "bookings.bookedAt": { $gte: start, $lte: end } } },
              { $count: "count" }
            ],
            canceledBookings: [
              { $unwind: "$bookings" },
              { $match: { 
                "bookings.canceled": true,
                $or: [
                  { "bookings.canceledAt": { $gte: start, $lte: end } },
                  { "bookings.bookedAt": { $gte: start, $lte: end } }
                ]
              } },
              { $count: "count" }
            ]
          }
        }
      ]);

      const getCount = (arr) => (Array.isArray(arr) && arr[0]?.count) || 0;
      const available = getCount(result?.availableFruits);
      const sold = getCount(result?.soldFruits);
      const pending = getCount(result?.pendingBookings);
      const booked = getCount(result?.approvedBookings);

      const canceled = getCount(result?.canceledBookings);

      res.json({ month, year, available, booked, sold, pending, canceled });
    } catch (err) {
      console.error("Error building fruit report:", err);
      res.status(500).json({ message: err.message || "Failed to build fruit report" });
    }
  });

  // ---------- Payments ----------
  router.get("/payments", async (req, res) => {
    try {
      const payments = await Payment.find();
      res.json(payments);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  module.exports = router;
