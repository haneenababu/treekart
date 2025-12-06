const Tree = require("../models/Tree");
const Bid = require("../models/Bid");
const Payment = require("../models/Payment");
const TreeOrder = require("../models/TreeOrder");

// 🌿 Farmer posting a tree
exports.postTree = async (req, res) => {
  try {
    const { name, description, expectedRent, leaseDuration, image, farmerName, farmerPhone, farmerEmail, location, treeCount, rateValue } = req.body;

    const newTree = new Tree({
      name,
      description,
      expectedRent,
      treeCount,
      rateValue,
      leaseDuration,
      image,
      farmerName,
      farmerPhone,
      farmerEmail,
      location,
      status: "available",   // default posted as available
    });

    const savedTree = await newTree.save();
    res.status(201).json({ message: "Tree posted successfully", tree: savedTree });
  } catch (error) {
    console.error("Error posting tree:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get trees (with optional filters)
exports.getAvailableTrees = async (req, res) => {
  try {
    const { status, farmerPhone } = req.query;
    
    console.log("🔵 GET /api/trees - Query params:", { status, farmerPhone });
    
    // Auto-expire pending payments older than 5 days
    try {
      const now = new Date();
      const overdueTrees = await Tree.find({ status: "pending", paymentStatus: "pending", paymentDueAt: { $lt: now } });
      for (const t of overdueTrees) {
        if (t.acceptedBidId) {
          await Bid.findByIdAndUpdate(t.acceptedBidId, { status: "rejected" }).catch(() => {});
        }
        await Tree.findByIdAndUpdate(t._id, {
          $set: {
            status: "available",
            acceptedBidId: null,
            bookedBy: null,
            vendorPhone: null,
            vendorEmail: null,
            vendorLocation: null,
            vendorAddress: null,
            acceptedPrice: null,
            paymentStatus: null,
            paymentDueAt: null,
            paidAt: null
          }
        });
      }
    } catch (cleanupErr) {
      console.warn("⚠️ Pending payment cleanup failed:", cleanupErr?.message || cleanupErr);
    }

    let filter = {};
    
    // Filter by status if provided
    if (status) {
      filter.status = status;
    }
    
    // Filter by farmer phone if provided AND not empty
    if (farmerPhone && farmerPhone.trim() !== "") {
      filter.farmerPhone = farmerPhone;
    }
    
    console.log("🔍 Filter:", filter);
    
    const trees = await Tree.find(filter).sort({ createdAt: -1 });
    
    console.log("✅ Found trees:", trees.length);
    if (trees.length > 0) {
      console.log("Trees:", trees.map(t => ({
        name: t.name,
        status: t.status,
        farmerPhone: t.farmerPhone,
        bookedBy: t.bookedBy
      })));
    }
    
    res.status(200).json(trees);
  } catch (error) {
    console.error("Error fetching trees:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Vendor books a tree
exports.bookTree = async (req, res) => {
  try {
    const { bookedBy, vendorPhone, vendorAddress, vendorLocation } = req.body;

    const tree = await Tree.findByIdAndUpdate(
      req.params.id,
      {
        status: "booked",
        bookedBy,
        vendorPhone,
        vendorAddress,
        vendorLocation
      },
      { new: true }
    );

    if (!tree) return res.status(404).json({ message: "Tree not found" });

    res.json({ message: "Tree booked successfully", tree });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🌿 Delete a tree
exports.deleteTree = async (req, res) => {
  try {
    const tree = await Tree.findByIdAndDelete(req.params.id);
    
    if (!tree) {
      return res.status(404).json({ message: "Tree not found" });
    }

    res.status(200).json({ message: "Tree deleted successfully" });
  } catch (error) {
    console.error("Error deleting tree:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get a single tree by ID (for debugging)
exports.getTreeById = async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);
    
    if (!tree) {
      return res.status(404).json({ message: "Tree not found" });
    }

    console.log("Tree details:", tree);
    res.status(200).json(tree);
  } catch (error) {
    console.error("Error fetching tree:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Mark tree as sold
exports.markTreeAsSold = async (req, res) => {
  try {
    const tree = await Tree.findByIdAndUpdate(
      req.params.id,
      { status: "sold" },
      { new: true }
    );
    
    if (!tree) {
      return res.status(404).json({ message: "Tree not found" });
    }

    console.log("✅ Tree marked as sold:", tree.name);
    res.status(200).json({ message: "Tree marked as sold successfully", tree });
  } catch (error) {
    console.error("Error marking tree as sold:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Record payment for a tree (vendor pays for an approved/pending tree)
exports.payForTree = async (req, res) => {
  try {
    const { transactionId, amount, paymentMethod, upiId } = req.body || {};

    // Basic validations
    const amtNum = typeof amount === 'string' ? Number(amount) : amount;
    if (!amtNum || amtNum <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    let method = paymentMethod;
    if (typeof method === 'string') {
      method = method.toUpperCase(); // normalize 'upi' -> 'UPI'
    }

    if (method === 'UPI') {
      const upi = (upiId || '').trim();
      const upiRegex = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upi || !upiRegex.test(upi)) {
        return res.status(400).json({ message: "Invalid UPI ID. Expected format like name@bank" });
      }
    }

    const update = {
      $set: {
        paymentStatus: "paid",
        paidAt: new Date(),
      },
    };

    if (transactionId) update.$set.paymentTransactionId = transactionId;
    if (typeof amtNum === "number") update.$set.paidAmount = amtNum;
    if (method) update.$set.paymentMethod = method;
    if (upiId) update.$set.upiId = upiId;

    let tree = await Tree.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!tree) {
      return res.status(404).json({ message: "Tree not found" });
    }

    // If tree was pending payment, move to booked after payment
    if (tree.status === "pending") {
      tree.status = "booked";
      tree = await tree.save();
    }

    // Create a Payment record (non-blocking failure)
    try {
      await Payment.create({
        type: 'tree',
        treeId: tree._id,
        amount: amtNum,
        status: 'Paid',
        paymentMethod: method || 'UPI',
        transactionId: transactionId || undefined,
        upiId: req.body?.upiId || undefined,
        vendorPhone: tree.vendorPhone || undefined,
        vendorEmail: tree.vendorEmail || undefined,
        farmerName: tree.farmerName || undefined,
        farmerPhone: tree.farmerPhone || undefined,
      });
    } catch (payErr) {
      console.warn("⚠️ Payment document creation failed:", payErr?.message || payErr);
    }

    // Create a TreeOrder record (non-blocking failure)
    try {
      await TreeOrder.create({
        treeId: tree._id,
        treeName: tree.name,
        farmerName: tree.farmerName,
        farmerPhone: tree.farmerPhone,
        vendorName: tree.bookedBy,
        vendorPhone: tree.vendorPhone,
        vendorEmail: tree.vendorEmail,
        vendorLocation: tree.vendorLocation,
        vendorAddress: tree.vendorAddress,
        acceptedPrice: tree.acceptedPrice || amtNum,
        paymentStatus: 'paid',
        paymentMethod: method || 'UPI',
        transactionId: transactionId || undefined,
        upiId: req.body?.upiId || undefined,
        paidAt: new Date(),
        status: tree.status // likely 'booked' now
      });
    } catch (orderErr) {
      console.warn("⚠️ TreeOrder creation failed:", orderErr?.message || orderErr);
    }

    return res.status(200).json({ message: "Payment recorded successfully", tree });
  } catch (error) {
    console.error("Error recording payment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
