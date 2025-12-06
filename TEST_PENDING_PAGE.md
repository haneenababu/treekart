# Test Pending Page - Step by Step

## 🔄 Servers Restarted
Both backend and frontend have been restarted with all the latest changes.

---

## ✅ Test Customer Pending Page

### Step 1: Login as Vendor
1. Open browser: `http://localhost:3000`
2. Login as **Vendor**
3. Go to **"Post Fruits"** tab
4. Post a fruit:
   - Name: "Test Mangoes"
   - Price: 100
   - Quantity: 50
5. Click "Post Fruit"
6. Note your vendor phone number (shown at top)

### Step 2: Login as Customer
1. Open **incognito/private window**: `http://localhost:3000`
2. Login/Register as **Customer**
3. Make sure you're logged in (check if name shows at top)
4. Note your customer phone number

### Step 3: Book a Fruit
1. Stay on Customer page
2. You should see "Test Mangoes" in available fruits
3. Click **"Buy Now"**
4. Fill in the form:
   - Name: Your name (should auto-fill)
   - Phone: Your phone (should auto-fill)
   - Address: "123 Test Street"
   - Location: "Test City"
   - Quantity: 10 kg
5. Click **"Confirm Booking"**
6. Click **"Pay & Place Order"**
7. You should see: "✅ Order placed successfully"

### Step 4: Check Pending Tab
1. **Immediately after booking**, click on **"⏳ Pending Approval"** tab
2. **Expected**: You should see your order with:
   - Fruit name: "Test Mangoes"
   - Quantity: 10 kg
   - Status: "⏳ PENDING VENDOR APPROVAL"
   - Orange border
3. Badge should show: "⏳ Pending Approval (1)"

### Step 5: Verify in Browser Console
1. Press **F12** to open browser console
2. Look for these logs:
   ```
   🔵 Fetching bookings for customer: [your phone]
   ✅ Customer bookings: [array with your booking]
   ```
3. If you see errors, note them down

---

## 🐛 If Pending Page is Empty

### Check 1: Backend Running?
```powershell
curl http://localhost:5000/api/test
```
Should return: `{"message":"Server is working!"}`

### Check 2: Customer Phone Set?
- Check if customer phone is displayed at top of customer page
- If not, you may not be logged in properly

### Check 3: Booking Created?
Open browser console (F12) and run:
```javascript
// Check if booking was created
fetch('http://localhost:5000/api/fruits/customer/YOUR_PHONE_HERE/bookings')
  .then(r => r.json())
  .then(data => console.log('Bookings:', data))
```
Replace `YOUR_PHONE_HERE` with your actual phone number.

### Check 4: API Endpoint Working?
Test the endpoint manually:
```
GET http://localhost:5000/api/fruits/customer/1234567890/bookings
```
(Replace with your phone number)

Should return an array of bookings.

---

## 🔍 Debug Steps

### 1. Check Browser Console
After booking a fruit, check console for:
- ✅ `Fruit purchased: ...`
- ✅ `🔵 Fetching bookings for customer: ...`
- ✅ `✅ Customer bookings: [...]`

### 2. Check Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. After booking, look for:
   - `PUT /api/fruits/.../buy` - Should return 200 OK
   - `GET /api/fruits/customer/.../bookings` - Should return 200 OK with data

### 3. Manual API Test
Open a new browser tab and go to:
```
http://localhost:5000/api/fruits/customer/YOUR_PHONE/bookings
```
Should show JSON array with your bookings.

---

## ✅ Expected Behavior

### After Booking:
1. Alert: "✅ Order placed successfully"
2. Booking form closes
3. Returns to Available Fruits tab
4. `fetchMyBookings()` is called automatically

### In Pending Approval Tab:
1. Shows all bookings with `status: 'pending'` or no status
2. Orange colored cards
3. Shows customer details
4. Badge count updates

### After Vendor Approves:
1. Order disappears from "Pending Approval"
2. Appears in "✅ Approved Orders" tab
3. Blue colored cards
4. Badge count updates

---

## 🚨 Common Issues

### Issue 1: "No pending orders"
**Cause**: `fetchMyBookings()` not called or customerPhone not set
**Fix**: Check if customerPhone is set (should show at top of page)

### Issue 2: Bookings array is empty
**Cause**: Backend not creating bookings properly
**Fix**: Check backend console for errors when booking

### Issue 3: 404 Error on /bookings endpoint
**Cause**: Backend not restarted with new routes
**Fix**: Backend has been restarted - should work now

### Issue 4: Customer phone not set
**Cause**: Not logged in properly
**Fix**: 
1. Logout
2. Register/Login again
3. Make sure phone number is entered during registration

---

## 📝 Quick Verification

Run this in browser console on Customer page:
```javascript
// Check if customer phone is set
console.log('Customer Phone:', localStorage.getItem('user'));

// Check if fetchMyBookings function exists
console.log('Bookings state:', myBookings);

// Manually fetch bookings
const user = JSON.parse(localStorage.getItem('user'));
if (user && user.phone) {
  fetch(`http://localhost:5000/api/fruits/customer/${user.phone}/bookings`)
    .then(r => r.json())
    .then(data => {
      console.log('Manual fetch result:', data);
      console.log('Number of bookings:', data.length);
    });
}
```

---

## ✅ Success Criteria

- [ ] Customer can book a fruit
- [ ] Order appears in "⏳ Pending Approval" tab immediately
- [ ] Badge shows count: "(1)"
- [ ] Order details are correct
- [ ] No console errors
- [ ] API calls return 200 OK

If all checks pass, the pending page is working! 🎉
