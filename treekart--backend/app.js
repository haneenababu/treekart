const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/authRoutes");
const treeRoutes = require("./routes/treeRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/trees", treeRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

module.exports = app;
