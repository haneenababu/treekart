# Quick Test Guide - Fruit Booking Orders

## 🧪 Step-by-Step Test

### Step 1: Post a Fruit (As Vendor)
1. Open browser: `http://localhost:3000`
2. Login/Register as **Vendor**
3. Go to **"Post Fruits"** tab
4. Post a fruit:
   - Name: "Mangoes"
   - Price: 100
   - Quantity: 50
5. Note your vendor phone number (shown at top of page)

### Step 2: Book the Fruit (As Customer)
1. Open **incognito/private window**: `http://localhost:3000`
2. Login/Register as **Customer**
3. Go to **Customer page**
4. Find "Mangoes" in available fruits
5. Click **"Buy Now"**
6. Fill details:
   - Name: "John Doe"
   - Phone: "9876543210"
   - Quantity: 10 kg
7. Complete the order
8. Check "My Orders" tab - should show as "Pending Delivery"

### Step 3: Check Vendor Page
1. Go back to **vendor window**
2. Click **"Pending Orders"** tab
3. **Expected**: Should see John Doe's order for 10 kg Mangoes

### Step 4: Debug if Not Showing
1. In "Pending Orders" tab, click **"🔍 Debug Orders"** button
2. Check the alert message:
   - Total fruits posted
   - Total bookings
   - Pending bookings count
3. Open browser console (F12)
4. Look for logs:
   - `🔍 All vendor fruits:`
   - `🔍 Pending endpoint response:`
5. Check if bookings array exists and has status: 'pending'

### Step 5: Approve Order
1. In "Pending Orders" tab
2. Click **"✅ Approve Order"** for John's order
3. Order should disappear from "Pending Orders"
4. Go to **"Approved Orders"** tab
5. **Expected**: John's order should appear here

### Step 6: Mark as Delivered
1. In "Approved Orders" tab
2. Click **"📦 Mark as Delivered"** for John's order
3. Order should disappear from "Approved Orders"
4. Go to **"Delivered Fruits"** tab
5. **Expected**: John's order should appear with delivery timestamp

---

## 🔍 Troubleshooting

### Issue: No orders showing in "Pending Orders"

**Check 1: Backend Running?**
```powershell
curl http://localhost:5000/api/test
```
Should return: `{"message":"Server is working!"}`

**Check 2: Vendor Phone Matches?**
- Check vendor phone at top of vendor page
- Make sure fruit was posted by THIS vendor
- Use debug button to verify

**Check 3: Booking Created?**
- Open browser console when customer books
- Should see: `✅ Fruit purchased: Mangoes by John Doe`
- Backend should log: `📊 Total bookings for this fruit: 1`

**Check 4: Database Query**
- Click "🔍 Debug Orders" button
- Check if "Total bookings" > 0
- Check if "Pending bookings" > 0
- If bookings exist but pending = 0, check booking status field

**Check 5: API Endpoint**
Test manually:
```
GET http://localhost:5000/api/fruits/vendor/YOUR_PHONE/pending
```
Should return fruits with pending bookings

---

## 🐛 Common Issues

### 1. "No pending orders" but customer booked
**Cause**: Vendor phone mismatch
**Fix**: Make sure you're logged in as the same vendor who posted the fruit

### 2. Bookings array is empty
**Cause**: Old booking before code update
**Fix**: Make a new booking after backend restart

### 3. Booking exists but status is undefined
**Cause**: Booking created before status field added
**Fix**: Backend now explicitly sets status: 'pending'

### 4. 404 Error on /pending endpoint
**Cause**: Backend not restarted
**Fix**: Restart backend server

---

## 📊 Expected Console Logs

### When Customer Books:
```
✅ Fruit purchased: Mangoes by John Doe - Quantity: 10
📊 Total bookings for this fruit: 1
```

### When Vendor Fetches Pending:
```
🔵 Fetching pending bookings for vendor phone: 1234567890
📦 Pending bookings response: [...]
📦 Number of fruits with pending bookings: 1
Fruit: Mangoes, Pending bookings: 1 [...]
```

### When Vendor Approves:
```
✅ Booking approved: John Doe for Mangoes
```

---

## ✅ Success Criteria

- [ ] Customer can book fruit
- [ ] Order appears in customer's "My Orders"
- [ ] Order appears in vendor's "Pending Orders"
- [ ] Vendor can approve order
- [ ] Approved order appears in "Approved Orders"
- [ ] Vendor can mark as delivered
- [ ] Delivered order appears in "Delivered Fruits"
- [ ] All customer details visible
- [ ] Timestamps are correct

---

## 🔄 Reset Test Data

If you need to start fresh:
1. Delete all fruits from vendor page
2. Post new fruit
3. Make new booking
4. Test workflow again
