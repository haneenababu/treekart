const Fruit = require("../models/Fruit");
const FruitOrder = require("../models/FruitOrder");
const Payment = require("../models/Payment");

// 🍎 Vendor posts a fruit
exports.postFruit = async (req, res) => {
  try {
    const { name, vendor, vendorPhone, price, quantity, image, description } = req.body;

    if (!name || !vendor || !vendorPhone || !price || !quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Generate code in format: FT-0001-VDR (FT = 2-letter fruit tag, VDR = 3-letter vendor tag)
    const vendorTag = String((req.body.vendorName || vendor || '')).replace(/[^a-zA-Z]/g,'').slice(0,3).toUpperCase() || 'VDR';
    const fruitTag = String(name || '').replace(/[^a-zA-Z]/g,'').slice(0,2).toUpperCase() || 'FR';
    let seq = 1;
    try {
      // find latest code for this vendor & fruitTag to continue sequence (e.g., MA-0007-VDR)
      const latest = await Fruit.findOne({ vendorPhone, fruitCode: { $regex: `^${fruitTag}-\\d{4}-${vendorTag}$` } })
        .sort({ fruitCode: -1 })
        .lean();
      if (latest && latest.fruitCode) {
        const m = new RegExp(`^${fruitTag}-(\\d{4})-${vendorTag}$`).exec(latest.fruitCode);
        if (m) {
          seq = Math.max(seq, parseInt(m[1], 10) + 1);
        }
      }
    } catch (e) {
      // ignore and start from 1
    }
    let fruitCode = `${fruitTag}-${String(seq).padStart(4,'0')}-${vendorTag}`;
    // ensure uniqueness in rare race
    while (await Fruit.exists({ fruitCode })) {
      seq += 1;
      fruitCode = `${fruitTag}-${String(seq).padStart(4,'0')}-${vendorTag}`;
    }

    let newFruit;
    let saved = false;
    for (let i = 0; i < 5 && !saved; i++) {
      try {
        newFruit = new Fruit({
          name,
          vendor,
          vendorPhone,
          price,
          quantity,
          image,
          description,
          fruitCode,
          status: "available"
        });
        await newFruit.save();
        saved = true;
      } catch (err) {
        // If duplicate fruitCode (E11000), advance sequence and try again
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.fruitCode) {
          seq += 1;
          fruitCode = `${fruitTag}-${String(seq).padStart(4,'0')}-${vendorTag}`;
          continue;
        }
        throw err;
      }
    }

    console.log("✅ Fruit posted:", name, "code:", fruitCode);
    res.status(201).json({ message: "Fruit posted successfully", fruit: newFruit });
  } catch (error) {
    console.error("Error posting fruit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Cancel a specific booking within 24 hours of booking time
exports.cancelBooking = async (req, res) => {
  try {
    const { fruitId, bookingId } = req.params;
    const fruit = await Fruit.findById(fruitId);
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }
    const booking = fruit.bookings.id(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.delivered) {
      return res.status(400).json({ message: "Cannot cancel a delivered order" });
    }
    if (booking.canceled) {
      return res.status(400).json({ message: "Order already canceled" });
    }

    const bookedAt = booking.bookedAt ? new Date(booking.bookedAt).getTime() : null;
    if (!bookedAt) {
      return res.status(400).json({ message: "Missing booking time" });
    }
    const now = Date.now();
    const diffMs = now - bookedAt;
    const within24h = diffMs <= 24 * 60 * 60 * 1000; // 24 hours
    if (!within24h) {
      return res.status(400).json({ message: "Cancellation window expired. Orders can be canceled within 24 hours only." });
    }

    // Mark canceled and restore stock
    booking.canceled = true;
    booking.canceledAt = new Date();
    booking.status = 'rejected'; // for consistency with existing flows
    fruit.quantity = Number(fruit.quantity) + Number(booking.quantity || 0);
    if (fruit.status === 'sold' && fruit.quantity > 0) {
      fruit.status = 'available';
    }

    await fruit.save();

    // Update FruitOrder to canceled (create if it didn't exist before)
    try {
      await FruitOrder.findOneAndUpdate(
        { fruitId: fruit._id, bookingId: booking._id },
        {
          $set: {
            status: 'canceled',
            canceledAt: new Date()
          },
          $setOnInsert: {
            fruitName: fruit.name,
            vendor: fruit.vendor,
            vendorPhone: fruit.vendorPhone,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            customerEmail: booking.customerEmail || '',
            quantity: booking.quantity,
            pricePerKg: fruit.price,
            totalAmount: (booking.quantity || 0) * (fruit.price || 0),
            paymentMethod: booking.paymentMethod || 'COD',
            upiId: booking.upiId || '',
            txnRef: booking.txnRef || '',
            deliveryAddress: booking.deliveryAddress || '',
            location: booking.location || '',
            bookedAt: booking.bookedAt || new Date(),
            expectedDeliveryAt: booking.expectedDeliveryAt || null
          }
        },
        { upsert: true, new: true }
      );
    } catch (orderErr) {
      console.warn("⚠️ FruitOrder cancel upsert failed:", orderErr?.message || orderErr);
    }

    return res.status(200).json({ message: "Booking canceled successfully", fruit });
  } catch (error) {
    console.error("Error canceling booking:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get a single fruit by ID
exports.getFruitById = async (req, res) => {
  try {
    const { fruitId } = req.params;
    const fruit = await Fruit.findById(fruitId);
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }
    return res.status(200).json(fruit);
  } catch (error) {
    console.error("Error fetching fruit by id:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get all available fruits
exports.getAvailableFruits = async (req, res) => {
  try {
    const fruits = await Fruit.find({ status: "available" }).sort({ createdAt: -1 });
    res.status(200).json(fruits);
  } catch (error) {
    console.error("Error fetching fruits:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get fruits by vendor
exports.getVendorFruits = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    const fruits = await Fruit.find({ vendorPhone }).sort({ createdAt: -1 });
    res.status(200).json(fruits);
  } catch (error) {
    console.error("Error fetching vendor fruits:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Customer buys a fruit
exports.buyFruit = async (req, res) => {
  try {
    const { fruitId } = req.params;
    const { customerName, customerPhone, customerEmail, alternativePhone, deliveryAddress, location, quantityToBuy, paymentMethod, upiId, txnRef } = req.body;

    console.log("🔵 Received booking data:", {
      customerName,
      customerPhone,
      customerEmail,
      alternativePhone,
      deliveryAddress,
      location,
      quantityToBuy
    });

    const fruit = await Fruit.findById(fruitId);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    if (fruit.status === "sold") {
      return res.status(400).json({ message: "Fruit already sold" });
    }

    if (fruit.quantity < quantityToBuy) {
      return res.status(400).json({ message: "Not enough quantity available" });
    }

    // Update fruit quantity
    fruit.quantity -= quantityToBuy;
    
    // Add booking to the bookings array with pending status and all customer details
    const bookingData = {
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      alternativePhone: alternativePhone || "",
      deliveryAddress: deliveryAddress || "",
      location: location || "",
      quantity: quantityToBuy,
      paymentMethod: paymentMethod || 'COD',
      upiId: upiId || '',
      txnRef: txnRef || '',
      status: 'approved',
      delivered: false,
      bookedAt: new Date(),
      expectedDeliveryAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    };
    
    console.log("📦 Saving booking data:", bookingData);
    fruit.bookings.push(bookingData);
    
    // Also update legacy fields for backward compatibility (use latest customer)
    fruit.soldTo = customerName;
    fruit.customerPhone = customerPhone;
    fruit.customerEmail = customerEmail;
    
    if (fruit.quantity === 0) {
      fruit.status = "sold";
    }

    await fruit.save();

    // The last pushed booking now has an _id
    const latestBooking = fruit.bookings[fruit.bookings.length - 1];

    // Create a FruitOrder record (non-blocking failure)
    try {
      const totalAmount = (quantityToBuy || 0) * (fruit.price || 0);
      await FruitOrder.create({
        fruitId: fruit._id,
        bookingId: latestBooking?._id,
        fruitName: fruit.name,
        vendor: fruit.vendor,
        vendorPhone: fruit.vendorPhone,
        customerName,
        customerPhone,
        customerEmail,
        quantity: quantityToBuy,
        pricePerKg: fruit.price,
        totalAmount,
        paymentMethod: bookingData.paymentMethod,
        upiId: bookingData.upiId,
        txnRef: bookingData.txnRef,
        status: bookingData.status,
        deliveryAddress: bookingData.deliveryAddress,
        location: bookingData.location,
        bookedAt: bookingData.bookedAt,
        expectedDeliveryAt: bookingData.expectedDeliveryAt,
      });
    } catch (orderErr) {
      console.warn("⚠️ FruitOrder creation failed:", orderErr?.message || orderErr);
    }

    // Create a Payment record (non-blocking failure)
    try {
      const method = (bookingData.paymentMethod || 'COD').toUpperCase();
      const status = method === 'COD' ? 'Pending' : 'Paid';
      await Payment.create({
        type: 'fruit',
        fruitId: fruit._id,
        amount: (quantityToBuy || 0) * (fruit.price || 0),
        status,
        paymentMethod: method,
        transactionId: bookingData.txnRef || undefined,
        upiId: bookingData.upiId || undefined,
        customerName,
        customerPhone,
        vendorPhone: fruit.vendorPhone,
        vendorEmail: fruit.vendor || undefined,
      });
    } catch (payErr) {
      console.warn("⚠️ Payment creation (fruit) failed:", payErr?.message || payErr);
    }

    console.log("✅ Fruit purchased:", fruit.name, "by", customerName, "- Quantity:", quantityToBuy);
    console.log("📊 Total bookings for this fruit:", fruit.bookings.length);
    console.log("📊 Latest booking saved:", fruit.bookings[fruit.bookings.length - 1]);
    res.status(200).json({ message: "Fruit purchased successfully", fruit });
  } catch (error) {
    console.error("Error buying fruit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Mark fruit as delivered (legacy - marks all as delivered)
exports.markDelivered = async (req, res) => {
  try {
    const { fruitId } = req.params;
    
    const fruit = await Fruit.findById(fruitId);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    fruit.delivered = true;
    fruit.deliveredAt = new Date();
    
    // Also mark all bookings as delivered
    fruit.bookings.forEach(booking => {
      booking.delivered = true;
      booking.deliveredAt = new Date();
    });
    
    await fruit.save();
    
    console.log("✅ Fruit marked as delivered:", fruit.name);
    res.status(200).json({ message: "Fruit marked as delivered", fruit });
  } catch (error) {
    console.error("Error marking fruit as delivered:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Mark specific booking as delivered
exports.markBookingDelivered = async (req, res) => {
  try {
    const { fruitId, bookingId } = req.params;
    
    const fruit = await Fruit.findById(fruitId);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    const booking = fruit.bookings.id(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.delivered = true;
    booking.deliveredAt = new Date();
    
    await fruit.save();
    
    console.log("✅ Booking marked as delivered:", booking.customerName, "for", fruit.name);
    res.status(200).json({ message: "Booking marked as delivered", fruit });
  } catch (error) {
    console.error("Error marking booking as delivered:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get vendor's pending bookings (need approval)
exports.getVendorPendingBookings = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    // Find all fruits by this vendor that have pending bookings
    const fruits = await Fruit.find({
      vendorPhone,
      bookings: { $elemMatch: { status: 'pending' } }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${fruits.length} fruits with pending bookings for vendor:`, vendorPhone);
    res.status(200).json(fruits);
  } catch (error) {
    console.error("Error fetching vendor pending bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get vendor's approved bookings (ready for delivery)
exports.getVendorApprovedBookings = async (req, res) => {
  try {
    const { vendorPhone } = req.params;
    // Find all fruits by this vendor that have approved bookings
    // Be tolerant of missing 'delivered' field on some bookings
    const fruits = await Fruit.find({
      vendorPhone,
      $or: [
        { bookings: { $elemMatch: { status: 'approved', delivered: false } } },
        { bookings: { $elemMatch: { status: 'approved', delivered: { $exists: false } } } }
      ]
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${fruits.length} fruits with approved bookings for vendor:`, vendorPhone);
    res.status(200).json(fruits);
  } catch (error) {
    console.error("Error fetching vendor approved bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Approve a booking
exports.approveBooking = async (req, res) => {
  try {
    const { fruitId, bookingId } = req.params;
    const fruit = await Fruit.findById(fruitId);
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }
    const booking = fruit.bookings.id(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    booking.status = 'approved';
    await fruit.save();
    console.log("✅ Booking approved:", booking.customerName, "for", fruit.name);
    res.status(200).json({ message: "Booking approved", fruit });
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Reject a booking
exports.rejectBooking = async (req, res) => {
  try {
    const { fruitId, bookingId } = req.params;
    
    const fruit = await Fruit.findById(fruitId);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    const booking = fruit.bookings.id(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Return quantity back to fruit
    fruit.quantity += booking.quantity;
    
    // Mark booking as rejected
    booking.status = 'rejected';
    
    await fruit.save();
    
    console.log("❌ Booking rejected:", booking.customerName, "for", fruit.name);
    res.status(200).json({ message: "Booking rejected", fruit });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get all customer bookings (pending, approved, delivered)
exports.getCustomerBookings = async (req, res) => {
  try {
    const { customerPhone } = req.params;
    
    // Find all fruits that have bookings for this customer
    const fruits = await Fruit.find({
      'bookings.customerPhone': customerPhone
    }).sort({ createdAt: -1 });
    
    // Extract only the customer's bookings from each fruit
    const customerBookings = [];
    fruits.forEach(fruit => {
      const customerBookingsInFruit = fruit.bookings.filter(b => b.customerPhone === customerPhone);
      customerBookingsInFruit.forEach(booking => {
        const expected = booking.expectedDeliveryAt
          ? booking.expectedDeliveryAt
          : (booking.bookedAt ? new Date(new Date(booking.bookedAt).getTime() + 5 * 24 * 60 * 60 * 1000) : null);
        customerBookings.push({
          _id: booking._id,
          fruitId: fruit._id,
          fruitName: fruit.name,
          fruitImage: fruit.image,
          fruitPrice: fruit.price,
          vendor: fruit.vendor,
          vendorPhone: fruit.vendorPhone,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail,
          quantity: booking.quantity,
          totalPrice: booking.quantity * fruit.price,
          status: booking.status || 'pending',
          delivered: booking.delivered,
          deliveredAt: booking.deliveredAt,
          bookedAt: booking.bookedAt,
          expectedDeliveryAt: expected,
          canceled: !!booking.canceled,
          canceledAt: booking.canceledAt || null
        });
      });
    });
    
    console.log(`✅ Found ${customerBookings.length} bookings for customer:`, customerPhone);
    res.status(200).json(customerBookings);
  } catch (error) {
    console.error("Error fetching customer bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Get delivered fruits for a customer (legacy)
exports.getCustomerDeliveredFruits = async (req, res) => {
  try {
    const { customerPhone } = req.params;
    const fruits = await Fruit.find({ 
      customerPhone, 
      delivered: true 
    }).sort({ deliveredAt: -1 });
    
    console.log(`✅ Found ${fruits.length} delivered fruits for customer:`, customerPhone);
    res.status(200).json(fruits);
  } catch (error) {
    console.error("Error fetching customer delivered fruits:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Increase fruit quantity
exports.increaseFruitQuantity = async (req, res) => {
  try {
    const { fruitId } = req.params;
    const { quantityToAdd } = req.body;

    if (!quantityToAdd || quantityToAdd <= 0) {
      return res.status(400).json({ message: "Please provide a valid quantity to add" });
    }

    const fruit = await Fruit.findById(fruitId);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    // Increase the quantity
    fruit.quantity = Number(fruit.quantity) + Number(quantityToAdd);
    
    // If fruit was sold out, make it available again
    if (fruit.status === 'sold') {
      fruit.status = 'available';
    }

    await fruit.save();

    console.log(`✅ Increased quantity for ${fruit.name}: +${quantityToAdd} kg (Total: ${fruit.quantity} kg)`);
    res.status(200).json({ 
      message: `Successfully added ${quantityToAdd} kg to ${fruit.name}`,
      fruit: fruit
    });
  } catch (error) {
    console.error("Error increasing fruit quantity:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🍎 Delete a fruit
exports.deleteFruit = async (req, res) => {
  try {
    const fruit = await Fruit.findByIdAndDelete(req.params.id);
    
    if (!fruit) {
      return res.status(404).json({ message: "Fruit not found" });
    }

    res.status(200).json({ message: "Fruit deleted successfully" });
  } catch (error) {
    console.error("Error deleting fruit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
