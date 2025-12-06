const mongoose = require("mongoose");

const treeOrderSchema = new mongoose.Schema(
  {
    treeId: { type: mongoose.Schema.Types.ObjectId, ref: "Tree", required: true },
    treeName: String,

    // Parties
    farmerName: String,
    farmerPhone: String,
    vendorName: String,
    vendorPhone: String,
    vendorEmail: String,
    vendorLocation: String,
    vendorAddress: String,

    // Commercials
    acceptedPrice: { type: Number, required: true },

    // Payment
    paymentStatus: { type: String, enum: ["pending","paid"], default: "paid" },
    paymentMethod: { type: String, enum: ["UPI","COD","OTHER"], default: "UPI" },
    transactionId: String,
    upiId: String,
    paidAt: { type: Date },

    // Status
    status: { type: String, enum: ["pending","booked","sold"], default: "booked" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TreeOrder", treeOrderSchema);
