const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    treeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tree",
      required: true
    },
    vendorName: { type: String, required: true },
    vendorPhone: { type: String, required: true },
    vendorEmail: String,
    vendorAddress: String,
    vendorLocation: String,
    proposedPrice: { type: Number, required: true },
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bid", bidSchema);
