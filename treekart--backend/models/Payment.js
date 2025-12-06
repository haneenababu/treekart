const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Type of payment source
    type: { type: String, enum: ["tree", "fruit"], required: true },

    // References to source docs
    treeId: { type: mongoose.Schema.Types.ObjectId, ref: "Tree" },
    fruitId: { type: mongoose.Schema.Types.ObjectId, ref: "Fruit" },

    // Parties information (optional, for reporting)
    customerName: { type: String },
    customerPhone: { type: String },
    vendorPhone: { type: String },
    vendorEmail: { type: String },
    farmerName: { type: String },
    farmerPhone: { type: String },

    // Payment details
    amount: { type: Number, required: true },
    status: { type: String, enum: ["Paid", "Pending"], default: "Paid" },
    paymentMethod: { type: String, enum: ["UPI", "COD", "CARD", "OTHER"], default: "UPI" },
    transactionId: { type: String },
    upiId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
