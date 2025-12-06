const mongoose = require("mongoose");

const fruitOrderSchema = new mongoose.Schema(
  {
    fruitId: { type: mongoose.Schema.Types.ObjectId, ref: "Fruit", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId },
    fruitName: String,
    vendor: String,
    vendorPhone: String,

    // Customer
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: String,

    // Order
    quantity: { type: Number, required: true },
    pricePerKg: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    // Payment / status
    paymentMethod: { type: String, enum: ["COD","UPI","Card"], default: "COD" },
    upiId: String,
    txnRef: String,
    status: { type: String, enum: ["pending","approved","rejected","delivered","canceled"], default: "approved" },

    // Delivery
    deliveryAddress: String,
    location: String,
    bookedAt: { type: Date, default: Date.now },
    expectedDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    canceledAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FruitOrder", fruitOrderSchema);
