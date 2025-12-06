# Vendor - Increase Fruit Quantity Feature

## Overview

Vendors can now **increase the quantity** of their posted fruits directly from the Vendor dashboard. This allows them to add more stock when available without creating a new fruit listing.

---

## Feature Details

### What It Does:
- ✅ Allows vendors to add more quantity to existing fruits
- ✅ Updates the total quantity in real-time
- ✅ Automatically makes sold-out fruits available again
- ✅ Validates input to prevent invalid quantities
- ✅ Provides instant feedback on success/failure

---

## User Interface

### Location:
**Vendor Dashboard → Post Fruits Tab → My Posted Fruits**

### UI Components:

Each fruit card now includes an "Add More Stock" section:

```
┌─────────────────────────────────────────────┐
│ Mango                                       │
│ Price: ₹100/kg                              │
│ Quantity: 50 kg                             │
│ Status: ✅ Available                        │
│ Posted: 10/10/2025                          │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📦 Add More Stock:                      │ │
│ │ ┌──────────────────┐  ┌──────────────┐ │ │
│ │ │ Quantity (kg)    │  │  ➕ Add      │ │ │
│ │ └──────────────────┘  └──────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Styling:
- **Background:** Light blue (`#f0f8ff`)
- **Input:** White with border
- **Button:** Green (`#4caf50`) with white text
- **Icon:** 📦 for stock, ➕ for add button

---

## How to Use

### Step 1: Navigate to Your Fruits
1. Login as Vendor
2. Go to "Post Fruits" tab
3. Scroll down to "My Posted Fruits"

### Step 2: Add Quantity
1. Find the fruit you want to restock
2. In the "Add More Stock" section, enter quantity (in kg)
3. Click "➕ Add" button

### Step 3: Confirmation
- Success message: "✅ Successfully added X kg to fruit quantity!"
- The fruit card refreshes with updated quantity
- Input field clears automatically

---

## Example Usage

### Scenario 1: Add Stock to Available Fruit

**Before:**
```
Mango
Quantity: 50 kg
Status: ✅ Available
```

**Action:** Add 30 kg

**After:**
```
Mango
Quantity: 80 kg
Status: ✅ Available
```

**Message:** "✅ Successfully added 30 kg to fruit quantity!"

---

### Scenario 2: Restock Sold Out Fruit

**Before:**
```
Apple
Quantity: 0 kg
Status: ❌ Sold
```

**Action:** Add 40 kg

**After:**
```
Apple
Quantity: 40 kg
Status: ✅ Available
```

**Message:** "✅ Successfully added 40 kg to fruit quantity!"

**Note:** Status automatically changes from "Sold" to "Available"

---

## Validation

### Input Validation:
- ❌ Empty field → "⚠️ Please enter a valid quantity to add"
- ❌ Zero or negative → "⚠️ Please enter a valid quantity to add"
- ✅ Positive number → Proceeds with update

### Backend Validation:
- Checks if fruit exists
- Validates quantity is positive
- Ensures proper number conversion

---

## Technical Implementation

### Frontend (`Vendor.jsx`)

#### 1. State Management:
```javascript
const [quantityToAdd, setQuantityToAdd] = useState({});
```
- Stores quantity input for each fruit
- Key: fruitId, Value: quantity to add

#### 2. Handler Function:
```javascript
const handleIncreaseQuantity = async (fruitId) => {
  const addQuantity = quantityToAdd[fruitId];
  
  if (!addQuantity || addQuantity <= 0) {
    alert("⚠️ Please enter a valid quantity to add");
    return;
  }

  try {
    await axios.patch(`http://localhost:5000/api/fruits/${fruitId}/increase-quantity`, {
      quantityToAdd: Number(addQuantity)
    });

    alert(`✅ Successfully added ${addQuantity} kg to fruit quantity!`);
    setQuantityToAdd(prev => ({ ...prev, [fruitId]: "" }));
    fetchVendorFruits();
  } catch (err) {
    alert("❌ " + (err.response?.data?.message || "Failed to increase quantity!"));
  }
};
```

#### 3. UI Component:
```javascript
<div style={{marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '5px'}}>
  <p style={{margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.9rem'}}>
    📦 Add More Stock:
  </p>
  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
    <input
      type="number"
      placeholder="Quantity (kg)"
      min="1"
      value={quantityToAdd[f._id] || ""}
      onChange={(e) => setQuantityToAdd(prev => ({ ...prev, [f._id]: e.target.value }))}
    />
    <button onClick={() => handleIncreaseQuantity(f._id)}>
      ➕ Add
    </button>
  </div>
</div>
```

---

### Backend

#### 1. Route (`fruitRoutes.js`):
```javascript
router.patch("/:fruitId/increase-quantity", fruitController.increaseFruitQuantity);
```

#### 2. Controller (`fruitController.js`):
```javascript
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
```

---

## API Endpoint

### PATCH `/api/fruits/:fruitId/increase-quantity`

**Request:**
```json
{
  "quantityToAdd": 30
}
```

**Response (Success):**
```json
{
  "message": "Successfully added 30 kg to Mango",
  "fruit": {
    "_id": "...",
    "name": "Mango",
    "quantity": 80,
    "status": "available",
    ...
  }
}
```

**Response (Error):**
```json
{
  "message": "Please provide a valid quantity to add"
}
```

---

## Features

### ✅ **Real-time Update**
- Quantity updates immediately in UI
- No page refresh needed
- Instant feedback

### ✅ **Auto-Availability**
- Sold-out fruits become available when restocked
- Status changes from "Sold" to "Available"
- Customers can see and buy again

### ✅ **Input Validation**
- Frontend validates before sending
- Backend validates before updating
- Clear error messages

### ✅ **User-Friendly**
- Simple input field
- Clear button action
- Success/error alerts

### ✅ **Per-Fruit Management**
- Each fruit has its own input
- Independent quantity updates
- No interference between fruits

---

## Benefits

### For Vendors:
- ✅ Easy restocking without creating new listings
- ✅ Maintain single listing per fruit type
- ✅ Quick quantity updates
- ✅ No duplicate fruit entries

### For Customers:
- ✅ Consistent fruit listings
- ✅ See updated quantities
- ✅ Can buy when restocked

### For System:
- ✅ Cleaner database (no duplicates)
- ✅ Better inventory management
- ✅ Accurate stock tracking

---

## Files Modified

### Frontend:
1. **`treekart--frontend/src/pages/Vendor.jsx`**
   - Added `quantityToAdd` state
   - Added `handleIncreaseQuantity` function
   - Added UI component in fruit cards

### Backend:
1. **`treekart--backend/routes/fruitRoutes.js`**
   - Added PATCH route for increasing quantity

2. **`treekart--backend/controllers/fruitController.js`**
   - Added `increaseFruitQuantity` controller function

---

## Testing

### Test Case 1: Add Valid Quantity
1. Enter "50" in quantity field
2. Click "➕ Add"
3. **Expected:** Success message, quantity increases by 50

### Test Case 2: Empty Input
1. Leave quantity field empty
2. Click "➕ Add"
3. **Expected:** Error message "Please enter a valid quantity"

### Test Case 3: Zero Quantity
1. Enter "0" in quantity field
2. Click "➕ Add"
3. **Expected:** Error message "Please enter a valid quantity"

### Test Case 4: Negative Quantity
1. Enter "-10" in quantity field
2. Click "➕ Add"
3. **Expected:** Error message "Please enter a valid quantity"

### Test Case 5: Restock Sold Fruit
1. Find fruit with status "❌ Sold"
2. Add quantity (e.g., "30")
3. **Expected:** Quantity increases, status changes to "✅ Available"

### Test Case 6: Multiple Fruits
1. Add quantity to first fruit
2. Add quantity to second fruit
3. **Expected:** Both update independently

---

## Error Handling

### Frontend Errors:
- Empty/invalid input → Alert message
- Network error → Alert with error message
- Backend error → Display backend error message

### Backend Errors:
- Fruit not found → 404 error
- Invalid quantity → 400 error
- Database error → 500 error

---

## Future Enhancements

### Possible Improvements:
1. **Decrease Quantity:** Allow reducing quantity
2. **Bulk Update:** Update multiple fruits at once
3. **History Log:** Track quantity changes over time
4. **Notifications:** Alert customers when restocked
5. **Auto-Restock:** Set minimum threshold for alerts

---

## Summary

✅ **Added:** Increase quantity feature for vendor fruits
✅ **Location:** Vendor Dashboard → My Posted Fruits
✅ **UI:** Input field + Add button per fruit
✅ **Backend:** New API endpoint for quantity updates
✅ **Validation:** Frontend and backend validation
✅ **Auto-Status:** Sold fruits become available when restocked

---

**Feature Complete!** Vendors can now easily increase fruit quantities without creating new listings. 🎉
