const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
const { MONGO_URI } = process.env;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Create treekart--backend/.env with MONGO_URI.");
  console.error("   Example: MONGO_URI=mongodb://127.0.0.1:27017/treekart");
  process.exit(1);
}

mongoose.connection.on('connected', () => console.log("✅ MongoDB connected"));
mongoose.connection.on('error', (err) => console.error("❌ MongoDB error:", err?.message || err));
mongoose.connection.on('disconnected', () => console.warn("⚠️ MongoDB disconnected"));

mongoose.connect(MONGO_URI)
  .then(async () => {
    try {
      const User = require("./models/user");
      await User.syncIndexes();
      console.log("✅ User indexes synced (phone unique enforced)");
    } catch (e) {
      console.error("⚠️ Failed to sync User indexes (ensure no duplicate phones exist):", e?.message || e);
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err?.message || err);
  });

// Simple test route
app.get("/api/test", (req, res) => {
  console.log("✅ Test route accessed");
  res.json({ message: "Server is working!", timestamp: new Date() });
});

// DB ping route to verify connectivity
app.get('/api/db/ping', async (req, res) => {
  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    res.json({ ok: true, state: mongoose.connection.readyState });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e), state: mongoose.connection.readyState });
  }
});

// Debug route to check database
app.get("/api/debug/all-trees", async (req, res) => {
  try {
    console.log("✅ Debug route accessed");
    const Tree = require("./models/Tree");
    const allTrees = await Tree.find({});
    console.log("🔍 Total trees in DB:", allTrees.length);
    res.json({
      success: true,
      total: allTrees.length,
      trees: allTrees
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug route to check booked trees by vendor phone
app.get("/api/debug/booked-trees/:vendorPhone", async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    console.log("🔍 Debug: Checking booked trees for vendor:", vendorPhone);
    const Tree = require("./models/Tree");
    
    const allTrees = await Tree.find({ vendorPhone });
    const bookedTrees = await Tree.find({ vendorPhone, status: "booked" });
    
    console.log("📊 Total trees with this vendor phone:", allTrees.length);
    console.log("📊 Booked trees:", bookedTrees.length);
    
    res.json({
      success: true,
      vendorPhone,
      totalTreesWithVendorPhone: allTrees.length,
      bookedTreesCount: bookedTrees.length,
      allTreesWithVendorPhone: allTrees,
      bookedTrees: bookedTrees
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug route to check delivered fruits by customer phone
app.get("/api/debug/delivered-fruits/:customerPhone", async (req, res) => {
  try {
    const { customerPhone } = req.params;
    console.log("🔍 Debug: Checking delivered fruits for customer:", customerPhone);
    const Fruit = require("./models/Fruit");
    
    const allFruits = await Fruit.find({ customerPhone });
    const deliveredFruits = await Fruit.find({ customerPhone, delivered: true });
    
    console.log("📊 Total fruits with this customer phone:", allFruits.length);
    console.log("📊 Delivered fruits:", deliveredFruits.length);
    
    res.json({
      success: true,
      customerPhone,
      totalFruitsWithCustomerPhone: allFruits.length,
      deliveredFruitsCount: deliveredFruits.length,
      allFruitsWithCustomerPhone: allFruits,
      deliveredFruits: deliveredFruits
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Main routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/trees", require("./routes/treeRoutes")); 
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/bids", require("./routes/bidRoutes"));
app.use("/api/fruits", require("./routes/fruitRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Test: http://localhost:${PORT}/api/test`);
  console.log(`📍 Debug: http://localhost:${PORT}/api/debug/all-trees`);
});
