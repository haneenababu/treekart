const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/user");

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    
    if (existingAdmin) {
      console.log("⚠️ Admin account already exists:");
      console.log("   Email:", existingAdmin.email);
      console.log("   Name:", existingAdmin.name || "Not set");
      console.log("\n✅ No changes made.");
      process.exit(0);
    }

    // Create default admin account
    const defaultAdmin = {
      name: "TreeKart Admin",
      email: "admin@treekart.com",
      phone: "9999999999",
      password: "admin123",
      role: "admin"
    };

    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
    
    const admin = new User({
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      phone: defaultAdmin.phone,
      password: hashedPassword,
      role: defaultAdmin.role
    });

    await admin.save();

    console.log("\n✅ Default Admin Account Created Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    ", defaultAdmin.email);
    console.log("🔑 Password: ", defaultAdmin.password);
    console.log("👤 Name:     ", defaultAdmin.name);
    console.log("📱 Phone:    ", defaultAdmin.phone);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    console.log("🔒 Only ONE admin account is allowed in the system.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createDefaultAdmin();
