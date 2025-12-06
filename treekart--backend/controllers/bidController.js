const Bid = require("../models/Bid");
const Tree = require("../models/Tree");

// 🌿 Vendor submits a bid for a tree
exports.submitBid = async (req, res) => {
  try {
    const { treeId, vendorName, vendorPhone, vendorEmail, vendorAddress, vendorLocation, proposedPrice, message } = req.body;

    // Check if tree exists and is available
    const tree = await Tree.findById(treeId);
    if (!tree) {
      return res.status(404).json({ message: "Tree not found" });
    }

    if (tree.status !== "available") {
      return res.status(400).json({ message: "Tree is not available for bidding" });
    }

    const newBid = new Bid({
      treeId,
      vendorName,
      vendorPhone,
      vendorEmail,
      vendorAddress,
      vendorLocation,
      proposedPrice,
      message,
      status: "pending"
    });

    const savedBid = await newBid.save();
    res.status(201).json({ message: "Bid submitted successfully", bid: savedBid });
  } catch (error) {
    console.error("Error submitting bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get all bids for a specific tree (for farmer to view)
exports.getBidsForTree = async (req, res) => {
  try {
    const { treeId } = req.params;

    const bids = await Bid.find({ treeId }).sort({ createdAt: -1 });
    res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Farmer accepts a bid
exports.acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    console.log("🔵 Accepting bid:", bidId);

    // Find the bid
    const bid = await Bid.findById(bidId);
    if (!bid) {
      console.log("❌ Bid not found:", bidId);
      return res.status(404).json({ message: "Bid not found" });
    }

    console.log("✅ Bid found:", {
      bidId: bid._id,
      treeId: bid.treeId,
      vendorName: bid.vendorName,
      vendorPhone: bid.vendorPhone,
      proposedPrice: bid.proposedPrice
    });

    // Update bid status to accepted
    bid.status = "accepted";
    await bid.save();
    console.log("✅ Bid status updated to accepted");

    // Update tree status to pending (awaiting vendor payment) and store vendor details
    const updateData = {
      $set: {
        status: "pending",
        acceptedBidId: bidId,
        bookedBy: bid.vendorName,
        vendorPhone: bid.vendorPhone,
        vendorEmail: bid.vendorEmail || null,
        vendorLocation: bid.vendorLocation,
        vendorAddress: bid.vendorAddress || null,
        acceptedPrice: bid.proposedPrice,
        paymentStatus: "pending",
        paymentDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    };
    
    console.log("🔵 Updating tree with data:", updateData.$set);
    
    const tree = await Tree.findByIdAndUpdate(
      bid.treeId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!tree) {
      console.log("❌ Tree not found:", bid.treeId);
      return res.status(404).json({ message: "Tree not found" });
    }

    console.log("✅ Tree updated successfully:", {
      treeId: tree._id,
      status: tree.status,
      bookedBy: tree.bookedBy,
      vendorPhone: tree.vendorPhone,
      acceptedPrice: tree.acceptedPrice
    });
    
    // Verify the update was saved
    const verifyTree = await Tree.findById(tree._id);
    console.log("🔍 Verification - Tree in DB:", {
      status: verifyTree.status,
      bookedBy: verifyTree.bookedBy,
      vendorPhone: verifyTree.vendorPhone
    });

    // Reject all other bids for this tree
    const rejectedResult = await Bid.updateMany(
      { treeId: bid.treeId, _id: { $ne: bidId }, status: "pending" },
      { status: "rejected" }
    );
    
    console.log("✅ Rejected other bids:", rejectedResult.modifiedCount);

    res.status(200).json({ 
      message: "Bid accepted successfully", 
      bid, 
      tree 
    });
  } catch (error) {
    console.error("❌ Error accepting bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Farmer rejects a bid
exports.rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findByIdAndUpdate(
      bidId,
      { status: "rejected" },
      { new: true }
    );

    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    res.status(200).json({ message: "Bid rejected", bid });
  } catch (error) {
    console.error("Error rejecting bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get all bids by a specific vendor
exports.getVendorBids = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    console.log("🔵 Fetching bids for vendor:", vendorPhone);

    const bids = await Bid.find({ vendorPhone })
      .populate('treeId')
      .sort({ createdAt: -1 });
    
    console.log("✅ Found bids:", bids.length);
    console.log("Bids by status:", {
      accepted: bids.filter(b => b.status === "accepted").length,
      pending: bids.filter(b => b.status === "pending").length,
      rejected: bids.filter(b => b.status === "rejected").length
    });
    
    if (bids.length > 0) {
      console.log("Sample bid:", {
        id: bids[0]._id,
        status: bids[0].status,
        treeId: bids[0].treeId?._id,
        treeName: bids[0].treeId?.name,
        hasTreeData: !!bids[0].treeId
      });
    }
    
    res.status(200).json(bids);
  } catch (error) {
    console.error("❌ Error fetching vendor bids:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get all trees posted by a farmer with their bids
exports.getFarmerTreesWithBids = async (req, res) => {
  try {
    const { farmerPhone } = req.params;

    const trees = await Tree.find({ farmerPhone }).sort({ createdAt: -1 });
    
    // Get bids for each tree
    const treesWithBids = await Promise.all(
      trees.map(async (tree) => {
        const bids = await Bid.find({ treeId: tree._id }).sort({ createdAt: -1 });
        return {
          ...tree.toObject(),
          bids
        };
      })
    );

    res.status(200).json(treesWithBids);
  } catch (error) {
    console.error("Error fetching farmer trees with bids:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get all booked trees for a vendor (only booked, not sold)
exports.getVendorBookedTrees = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    console.log("🔵 Fetching booked trees for vendor phone:", vendorPhone);

    // Find only booked trees (not sold)
    const bookedTrees = await Tree.find({ 
      vendorPhone: vendorPhone,
      status: "booked"
    }).sort({ createdAt: -1 });

    console.log("✅ Found booked trees:", bookedTrees.length);
    res.status(200).json(bookedTrees);
  } catch (error) {
    console.error("❌ Error fetching vendor booked trees:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🌿 Get all completed/sold trees for a vendor
exports.getVendorCompletedTrees = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    console.log("🔵 Fetching completed trees for vendor phone:", vendorPhone);

    // Find only sold trees
    const completedTrees = await Tree.find({ 
      vendorPhone: vendorPhone,
      status: "sold"
    }).sort({ createdAt: -1 });

    console.log("✅ Found completed trees:", completedTrees.length);
    res.status(200).json(completedTrees);
  } catch (error) {
    console.error("❌ Error fetching vendor completed trees:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
