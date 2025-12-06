const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { 
    type: String, 
    required: true, 
    set: (v) => String(v || "").replace(/\D/g, "").slice(-10) // keep last 10 digits
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["farmer", "vendor", "customer", "admin"], required: true }
});

// Ensure unique per role+phone (same phone can be used for different roles)
userSchema.index({ role: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);