# Complete Fruit Booking Workflow Guide

## Overview
This document explains the complete workflow from vendor posting fruits to customer receiving delivery.

## Workflow Steps

```
1. VENDOR POSTS FRUIT
   ↓
2. CUSTOMER SEES & BOOKS FRUIT
   ↓
3. BOOKING APPEARS IN CUSTOMER "PENDING APPROVAL" TAB
   ↓
4. BOOKING APPEARS IN VENDOR "PENDING ORDERS" TAB
   ↓
5. VENDOR APPROVES BOOKING
   ↓
6. BOOKING MOVES TO CUSTOMER "APPROVED ORDERS" TAB
   ↓
7. BOOKING MOVES TO VENDOR "APPROVED ORDERS" TAB
   ↓
8. VENDOR MARKS AS DELIVERED
   ↓
9. BOOKING MOVES TO CUSTOMER "DELIVERED" TAB
   ↓
10. BOOKING MOVES TO VENDOR "DELIVERED FRUITS" TAB
```

---

## Step-by-Step Testing Guide

### STEP 1: Vendor Posts Fruit

**As Vendor:**
1. Login as vendor (phone: e.g., "9876543210")
2. Go to **"Post Fruits"** tab
3. Fill in fruit details:
   - Name: "Mango"
   - Price: 100 (per kg)
   - Quantity: 50 (kg)
4. Click **"Post Fruit"**
5. ✅ Success message appears
6. Fruit is now available for customers

**Backend:** `POST /api/fruits`
- Creates fruit with `status: "available"`
- Sets `vendorPhone` from request
- Initializes empty `bookings` array

---

### STEP 2: Customer Sees & Books Fruit

**As Customer:**
1. Login as customer (phone: e.g., "1234567890")
2. Go to **"🍎 Available Fruits"** tab
3. See the "Mango" fruit posted by vendor
4. Click **"Buy Now"**
5. Form is **pre-filled** with your name and phone ✅
6. Fill in:
   - Address: "123 Main St"
   - Location: "Mumbai"
   - Quantity: 5 (kg)
7. Click **"Confirm Details"**
8. Select payment method (COD/UPI/Card)
9. Click **"Pay & Place Order"**
10. ✅ Success message: "Order placed successfully for 5 kg of Mango!"

**Backend:** `PUT /api/fruits/:fruitId/buy`
- Reduces fruit quantity by 5 kg (50 → 45 kg)
- Adds booking to `bookings` array:
  ```javascript
  {
    customerName: "Customer Name",
    customerPhone: "1234567890",  // ✅ Correct phone
    quantity: 5,
    status: "pending",
    delivered: false,
    bookedAt: Date.now()
  }
  ```

---

### STEP 3: Customer Checks Pending Tab

**As Customer:**
1. Click **"⏳ Pending Approval"** tab
2. ✅ See your Mango order:
   - Orange border
   - "PENDING VENDOR APPROVAL" badge
   - Shows: Mango × 5 kg – ₹500
   - Vendor details
   - "Waiting for vendor approval..." message
3. Click **"🔄 Refresh Orders"** to update

**Frontend:** `Customer.jsx` line 390-441
- Fetches: `GET /api/fruits/customer/1234567890/bookings`
- Filters: `!b.status || b.status === 'pending'`
- Displays bookings with pending status

**Backend:** `GET /api/fruits/customer/:customerPhone/bookings`
- Finds all fruits with bookings for this customer phone
- Returns array of booking objects with fruit details

---

### STEP 4: Vendor Sees Pending Order

**As Vendor:**
1. Go to **"Pending Orders"** tab
2. ✅ See the Mango order:
   - Orange border
   - "⏳ PENDING APPROVAL" badge
   - Shows customer details:
     - Customer: "Customer Name"
     - Phone: "1234567890"
     - Quantity: 5 kg
     - Total Price: ₹500
   - Two buttons: "✅ Approve Order" and "❌ Reject Order"
3. Click **"🔄 Refresh Pending Orders"** to update

**Frontend:** `Vendor.jsx` line 777-940
- Fetches: `GET /api/fruits/vendor/9876543210/pending`
- Filters bookings: `!b.status || b.status === 'pending'`

**Backend:** `GET /api/fruits/vendor/:vendorPhone/pending`
- Finds fruits by vendor with pending bookings
- Uses MongoDB query: `{ vendorPhone, 'bookings': { $elemMatch: { status: 'pending' } } }`

---

### STEP 5: Vendor Approves Order

**As Vendor:**
1. In **"Pending Orders"** tab
2. Click **"✅ Approve Order"** button
3. ✅ Alert: "Booking approved!"
4. Order disappears from Pending Orders
5. Order appears in **"Approved Orders"** tab

**Backend:** `PUT /api/fruits/:fruitId/booking/:bookingId/approve`
- Finds the specific booking in the fruit's bookings array
- Updates: `booking.status = 'approved'`
- Saves fruit document

---

### STEP 6: Customer Sees Approved Order

**As Customer:**
1. Click **"✅ Approved Orders"** tab
2. ✅ See your Mango order:
   - Blue border
   - "✅ APPROVED - READY FOR DELIVERY" badge
   - Shows: Mango × 5 kg – ₹500
   - "Approved! Waiting for delivery..." message
3. Order is NO LONGER in "Pending Approval" tab

**Frontend:** `Customer.jsx` line 444-495
- Fetches same bookings endpoint
- Filters: `b.status === 'approved' && !b.delivered`

---

### STEP 7: Vendor Sees Approved Order

**As Vendor:**
1. Go to **"Approved Orders"** tab
2. ✅ See the Mango order:
   - Blue border
   - "✅ APPROVED - READY FOR DELIVERY" badge
   - Customer details
   - Button: **"📦 Mark as Delivered"**

**Frontend:** `Vendor.jsx` line 943-1054
- Fetches: `GET /api/fruits/vendor/9876543210/approved`
- Filters bookings: `b.status === 'approved' && !b.delivered`

**Backend:** `GET /api/fruits/vendor/:vendorPhone/approved`
- Finds fruits by vendor with approved, undelivered bookings
- Uses MongoDB query: `{ vendorPhone, 'bookings': { $elemMatch: { status: 'approved', delivered: false } } }`

---

### STEP 8: Vendor Marks as Delivered

**As Vendor:**
1. In **"Approved Orders"** tab
2. Click **"📦 Mark as Delivered"** button
3. ✅ Alert: "Marked as delivered!"
4. Order disappears from Approved Orders
5. Order appears in **"Delivered Fruits"** tab

**Backend:** `PUT /api/fruits/:fruitId/booking/:bookingId/deliver`
- Finds the specific booking
- Updates:
  ```javascript
  booking.delivered = true
  booking.deliveredAt = new Date()
  ```
- Saves fruit document

---

### STEP 9: Customer Sees Delivered Order

**As Customer:**
1. Click **"📦 Delivered"** tab
2. ✅ See your Mango order:
   - Green border
   - "✅ DELIVERED" badge
   - Shows: Mango × 5 kg – ₹500
   - Ordered On: timestamp
   - Delivered On: timestamp
   - "Delivered Successfully!" message
3. Order is NO LONGER in "Approved Orders" tab

**Frontend:** `Customer.jsx` line 498-541
- Fetches same bookings endpoint
- Filters: `b.delivered === true`

---

### STEP 10: Vendor Sees Delivered Order

**As Vendor:**
1. Go to **"Delivered Fruits"** tab
2. ✅ See the Mango order:
   - Green border
   - "✅ DELIVERED" badge
   - Customer details
   - Delivered timestamp

**Frontend:** `Vendor.jsx` line 1057-1130
- Fetches all vendor fruits
- Filters fruits with delivered bookings

---

## Key Fixes Applied

### 1. Customer Form Pre-fill (CRITICAL FIX)
**Problem:** Form was clearing phone number, causing bookings with empty/wrong phone.

**Solution:** `Customer.jsx` line 121-132
```javascript
const handleBook = (fruit) => {
  const user = JSON.parse(localStorage.getItem("user"));
  setCustomerName(user?.name || "");
  setPhone(user?.phone || "");  // ✅ Pre-fill with actual phone
  // ... rest of form
};
```

### 2. Enhanced Error Handling
- Added `loadingBookings` state
- Added `bookingsError` state
- Show loading spinners during API calls
- Display error messages if API fails

### 3. Detailed Console Logging
```javascript
console.log("📊 Total bookings:", res.data.length);
console.log("📊 Pending:", res.data.filter(b => !b.status || b.status === 'pending').length);
console.log("📊 Approved:", res.data.filter(b => b.status === 'approved' && !b.delivered).length);
console.log("📊 Delivered:", res.data.filter(b => b.delivered).length);
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fruits` | POST | Vendor posts fruit |
| `/api/fruits/available` | GET | Customer sees available fruits |
| `/api/fruits/:id/buy` | PUT | Customer books fruit |
| `/api/fruits/customer/:phone/bookings` | GET | Get all customer bookings |
| `/api/fruits/vendor/:phone/pending` | GET | Get vendor's pending bookings |
| `/api/fruits/vendor/:phone/approved` | GET | Get vendor's approved bookings |
| `/api/fruits/:fruitId/booking/:bookingId/approve` | PUT | Vendor approves booking |
| `/api/fruits/:fruitId/booking/:bookingId/reject` | PUT | Vendor rejects booking |
| `/api/fruits/:fruitId/booking/:bookingId/deliver` | PUT | Vendor marks as delivered |

---

## Database Schema

### Fruit Model
```javascript
{
  name: String,
  vendor: String,
  vendorPhone: String,  // ✅ Critical for filtering
  price: Number,
  quantity: Number,
  status: "available" | "sold",
  bookings: [{
    customerName: String,
    customerPhone: String,  // ✅ Critical for filtering
    customerEmail: String,
    quantity: Number,
    status: "pending" | "approved" | "rejected",
    delivered: Boolean,
    deliveredAt: Date,
    bookedAt: Date
  }]
}
```

---

## Troubleshooting

### Issue: No bookings appear in tabs
**Check:**
1. Is backend running on port 5000?
2. Is customer logged in with valid phone?
3. Open browser console - check for API errors
4. Check console logs for booking counts
5. Verify phone number matches between booking and login

### Issue: Bookings don't move between tabs
**Solution:**
1. Click "🔄 Refresh" button in each tab
2. Verify vendor actually approved/delivered
3. Check vendor dashboard to confirm action
4. Clear browser cache and reload

### Issue: Old bookings with wrong phone
**Solution:**
- Create new bookings (form now pre-fills correctly)
- Old bookings may have empty phone numbers
- Consider clearing database for fresh start

---

## Testing Checklist

- [ ] Vendor can post fruit
- [ ] Customer can see posted fruit
- [ ] Customer form pre-fills name and phone
- [ ] Customer can book fruit
- [ ] Booking appears in customer "Pending" tab
- [ ] Booking appears in vendor "Pending Orders" tab
- [ ] Vendor can approve booking
- [ ] Approved booking appears in customer "Approved" tab
- [ ] Approved booking appears in vendor "Approved Orders" tab
- [ ] Vendor can mark as delivered
- [ ] Delivered booking appears in customer "Delivered" tab
- [ ] Delivered booking appears in vendor "Delivered Fruits" tab
- [ ] Tab counts update correctly
- [ ] Refresh buttons work
- [ ] Console logs show correct data

---

## Success Criteria

✅ **Complete workflow works end-to-end**
✅ **Bookings move through all stages correctly**
✅ **Both customer and vendor see correct data**
✅ **Phone numbers are captured correctly**
✅ **No bookings get "lost" between tabs**
✅ **Status updates reflect immediately after refresh**

---

## Files Modified

1. **`treekart--frontend/src/pages/Customer.jsx`**
   - Fixed `handleBook()` to pre-fill user info
   - Enhanced error handling and loading states
   - Added detailed console logging

2. **`treekart--backend/controllers/fruitController.js`**
   - Already has all required endpoints
   - Properly handles booking status transitions

3. **`treekart--backend/models/Fruit.js`**
   - Supports bookings array with status field
   - Tracks delivered status per booking

---

## Next Steps

1. **Start both servers:**
   ```bash
   # Backend
   cd treekart--backend
   npm run dev

   # Frontend
   cd treekart--frontend
   npm start
   ```

2. **Test the complete workflow** using the steps above

3. **Check browser console** for detailed logs at each step

4. **Report any issues** with specific error messages from console
