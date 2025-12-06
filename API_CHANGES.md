# API Changes - Fruit Booking System

## New Endpoints

### 1. Get Vendor's Booked Fruits
**Endpoint:** `GET /api/fruits/vendor/:vendorPhone/booked`

**Description:** Fetches all fruits with bookings for a specific vendor

**Response:**
```json
[
  {
    "_id": "fruit_id",
    "name": "Mangoes",
    "vendor": "Vendor Name",
    "vendorPhone": "1234567890",
    "price": 100,
    "quantity": 20,
    "status": "available",
    "bookings": [
      {
        "_id": "booking_id_1",
        "customerName": "John Doe",
        "customerPhone": "9876543210",
        "customerEmail": "john@example.com",
        "quantity": 10,
        "delivered": false,
        "bookedAt": "2025-10-10T02:00:00.000Z"
      },
      {
        "_id": "booking_id_2",
        "customerName": "Jane Smith",
        "customerPhone": "9876543211",
        "customerEmail": "jane@example.com",
        "quantity": 15,
        "delivered": true,
        "deliveredAt": "2025-10-10T03:00:00.000Z",
        "bookedAt": "2025-10-10T02:30:00.000Z"
      }
    ]
  }
]
```

### 2. Mark Specific Booking as Delivered
**Endpoint:** `PUT /api/fruits/:fruitId/booking/:bookingId/deliver`

**Description:** Marks a specific booking as delivered (not the entire fruit)

**Response:**
```json
{
  "message": "Booking marked as delivered",
  "fruit": { /* updated fruit object */ }
}
```

---

## Modified Endpoints

### Buy Fruit (Enhanced)
**Endpoint:** `PUT /api/fruits/:fruitId/buy`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerEmail": "john@example.com",
  "quantityToBuy": 10
}
```

**Changes:**
- Now adds booking to `bookings` array instead of overwriting
- Still updates legacy fields (`soldTo`, `customerPhone`, `customerEmail`) for backward compatibility
- Logs total bookings count

**Response:**
```json
{
  "message": "Fruit purchased successfully",
  "fruit": { /* updated fruit object with new booking */ }
}
```

### Mark Fruit as Delivered (Enhanced)
**Endpoint:** `PUT /api/fruits/:fruitId/deliver`

**Changes:**
- Now marks ALL bookings in the `bookings` array as delivered
- Sets `delivered: true` and `deliveredAt` for each booking
- Also updates legacy `delivered` field

---

## Database Schema Changes

### Fruit Model - New Fields

```javascript
{
  // ... existing fields ...
  
  // New bookings array
  bookings: [
    {
      customerName: String (required),
      customerPhone: String (required),
      customerEmail: String,
      quantity: Number (required),
      delivered: Boolean (default: false),
      deliveredAt: Date,
      bookedAt: Date (default: Date.now)
    }
  ],
  
  // Legacy fields (kept for backward compatibility)
  soldTo: String,
  customerPhone: String,
  customerEmail: String,
  delivered: Boolean,
  deliveredAt: Date
}
```

---

## Migration Notes

### Backward Compatibility
- Old fruits (created before this update) will continue to work
- Legacy fields are still populated for compatibility
- New bookings are added to the `bookings` array
- Old fruits will only show the last customer until new bookings are made

### No Manual Migration Required
- Existing data remains intact
- New bookings automatically use the new structure
- Old endpoints continue to work as before

---

## Frontend Integration

### Fetching Booked Fruits
```javascript
// Old way (still works but shows only last customer)
const res = await axios.get(`/api/fruits/vendor/${vendorPhone}`);

// New way (shows all bookings)
const res = await axios.get(`/api/fruits/vendor/${vendorPhone}/booked`);
```

### Marking Booking as Delivered
```javascript
// Mark specific booking
await axios.put(`/api/fruits/${fruitId}/booking/${bookingId}/deliver`);

// Mark all bookings for a fruit
await axios.put(`/api/fruits/${fruitId}/deliver`);
```

### Displaying Bookings
```javascript
fruit.bookings.forEach(booking => {
  console.log(`Customer: ${booking.customerName}`);
  console.log(`Quantity: ${booking.quantity} kg`);
  console.log(`Delivered: ${booking.delivered ? 'Yes' : 'No'}`);
});
```

---

## Console Logs

### When Customer Buys Fruit:
```
✅ Fruit purchased: Mangoes by John Doe - Quantity: 10
📊 Total bookings for this fruit: 3
```

### When Vendor Fetches Booked Fruits:
```
✅ Found 5 fruits with bookings for vendor: 1234567890
```

### When Booking Marked as Delivered:
```
✅ Booking marked as delivered: John Doe for Mangoes
```
