const mongoose = require("mongoose");

const fruitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vendor: { type: String, required: true }, // Vendor name or email
  vendorName: { type: String }, // Actual vendor name
  vendorPhone: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
  description: { type: String },
  fruitCode: { type: String, index: true, unique: true, sparse: true },
  status: { 
    type: String, 
    enum: ["available", "sold"], 
    default: "available" 
  },
  // Legacy fields for backward compatibility
  soldTo: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  delivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  // New field to track multiple bookings
  bookings: [{
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    alternativePhone: { type: String },
    deliveryAddress: { type: String },
    location: { type: String },
    quantity: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['COD','UPI','Card'], default: 'COD' },
    upiId: { type: String },
    txnRef: { type: String },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    bookedAt: { type: Date, default: Date.now },
    expectedDeliveryAt: { type: Date },
    canceled: { type: Boolean, default: false },
    canceledAt: { type: Date }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Fruit", fruitSchema);
