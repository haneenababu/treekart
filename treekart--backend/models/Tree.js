const mongoose = require("mongoose");

const treeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    expectedRent: { type: Number, required: true },
    treeCount: { type: Number, default: 0 },
    rateValue: { type: Number, default: 0 },
    leaseDuration: { 
      type: Number, 
      required: true,
      comment: "Duration in months"
    },
    image: String,
    farmerName: String,
    farmerPhone: { type: String, required: true },
    farmerEmail: String,
    location: String,
    status: {
      type: String,
      enum: ["available", "pending", "booked", "sold"],
      default: "available"
    },
    acceptedBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null
    },
    paymentStatus: { type: String, enum: ["pending", "paid", null], default: null },
    paymentDueAt: { type: Date },
    paidAt: { type: Date },
    paymentMethod: { type: String, enum: ["UPI", "COD", null], default: null },
    upiId: { type: String },
    paymentTransactionId: { type: String },
    paidAmount: { type: Number },
    bookedBy: String,
    vendorPhone: String,
    vendorEmail: String,
    vendorLocation: String,
    vendorAddress: String,
    acceptedPrice: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tree", treeSchema);
