const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// Register (for creating new users)
router.post("/register", async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!email || !password || !role || !phone) {
    return res.status(400).json({ message: "Please fill all fields" });
  }

  try {
    const normalizedPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    // Prevent registration of admin accounts (only one default admin allowed)
    if (role === "admin") {
      return res.status(403).json({ 
        message: "Admin accounts cannot be created through registration. Only one default admin exists." 
      });
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) return res.status(400).json({ message: "User already exists" });

    const existingByPhoneAndRole = await User.findOne({ phone: normalizedPhone, role });
    if (existingByPhoneAndRole) {
      return res.status(400).json({ 
        message: `Phone number already exists for this role (${role}).`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role, 
      phone: normalizedPhone 
    });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully", phone });
  } catch (error) {
    console.error("Register error:", error);
    // Handle Mongo duplicate key error (just in case)
    if (error.code === 11000) {
      if ((error.keyPattern && error.keyPattern.phone && error.keyPattern.role) || (error.keyValue && error.keyValue.phone && error.keyValue.role)) {
        return res.status(400).json({ message: "Phone number already exists for this role." });
      }
      if (error.keyPattern?.email || (error.keyValue && error.keyValue.email)) {
        return res.status(400).json({ message: "User already exists" });
      }
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please fill all fields" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(user.phone)
    return res.json({
      message: "Login successful",
      token,
      user: { 
        name: user.name,
        email: user.email, 
        role: user.role, 
        phone: user.phone
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password - Reset password using email and phone verification
router.post("/forgot-password", async (req, res) => {
  const { email, phone, newPassword } = req.body;

  if (!email || !phone || !newPassword) {
    return res.status(400).json({ message: "Please provide email, phone, and new password" });
  }

  try {
    const normalizedPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    // Find user by email and normalized phone (both must match for security)
    const user = await User.findOne({ email, phone: normalizedPhone });
    
    if (!user) {
      return res.status(404).json({ message: "No account found with this email and phone number" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset successful for user: ${email}`);
    res.status(200).json({ message: "Password reset successful! You can now login with your new password." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
