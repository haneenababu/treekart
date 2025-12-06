const express = require("express");
const router = express.Router();
const treeController = require("../controllers/treeController");
const Tree = require("../models/Tree");

// Debug route - get ALL trees
router.get("/debug/all", async (req, res) => {
  try {
    const allTrees = await Tree.find({});
    console.log("🔍 DEBUG: Total trees in database:", allTrees.length);
    res.json({
      total: allTrees.length,
      trees: allTrees.map(t => ({
        id: t._id,
        name: t.name,
        status: t.status,
        farmerPhone: t.farmerPhone,
        bookedBy: t.bookedBy,
        vendorPhone: t.vendorPhone,
        acceptedPrice: t.acceptedPrice
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new tree
router.post("/", treeController.postTree);

// Get trees
router.get("/", treeController.getAvailableTrees);

// Mark tree as sold (MUST be before /:id routes)
router.put("/:id/mark-sold", treeController.markTreeAsSold);

// Vendor books a tree (MUST be before /:id routes)
router.put("/:id/book", treeController.bookTree);

// Vendor pays for an approved (pending) tree
router.post("/:id/pay", treeController.payForTree);

// Get single tree by ID
router.get("/:id", treeController.getTreeById);

// Delete a tree
router.delete("/:id", treeController.deleteTree);

module.exports = router;
