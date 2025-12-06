# Alternative Phone Number Feature

## Overview

Added **optional alternative phone number** field to all booking and posting forms across the application. This allows users to provide a backup contact number for better communication.

---

## ✅ What Was Added

### 1. **New Validation Function** (`src/utils/validation.js`)

```javascript
export const validatePhoneOptional = (phone) => {
  if (!phone || phone.trim() === '') return null; // Optional field
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) return "Alternative phone must be exactly 10 digits";
  return null;
};
```

**Features:**
- ✅ Optional field (no error if empty)
- ✅ Validates 10-digit format if provided
- ✅ Returns specific error message for invalid format

---

## 📝 Forms Updated

### 1. **Vendor Page** - Submit Bid Form

#### State Added:
```javascript
const [vendorDetails, setVendorDetails] = useState({ 
  name: "",
  phone: "", 
  alternativePhone: "",  // ✅ NEW
  email: "",
  address: "", 
  location: "",
  proposedPrice: "",
  message: ""
});
```

#### Validation:
```javascript
const errors = {
  name: validateRequired(vendorDetails.name, "Name"),
  phone: validatePhone(vendorDetails.phone),
  alternativePhone: validatePhoneOptional(vendorDetails.alternativePhone), // ✅ NEW
  proposedPrice: validateNumber(vendorDetails.proposedPrice, "Proposed price", 1),
  location: validateRequired(vendorDetails.location, "Location")
};
```

#### UI Field:
```javascript
<input
  type="tel"
  placeholder="Alternative Phone (10 digits) - Optional"
  value={vendorDetails.alternativePhone}
  onChange={(e) => setVendorDetails({ 
    ...vendorDetails, 
    alternativePhone: e.target.value.replace(/\D/g, '').slice(0, 10) 
  })}
  maxLength="10"
/>
```

#### Backend Payload:
```javascript
await axios.post(`http://localhost:5000/api/bids/submit`, {
  treeId: selectedTree._id,
  vendorName: vendorDetails.name,
  vendorPhone: vendorDetails.phone,
  vendorAlternativePhone: vendorDetails.alternativePhone, // ✅ NEW
  vendorEmail: vendorDetails.email,
  vendorAddress: vendorDetails.address,
  vendorLocation: vendorDetails.location,
  proposedPrice: Number(vendorDetails.proposedPrice),
  message: vendorDetails.message
});
```

---

### 2. **Customer Page** - Book Fruit Form

#### State Added:
```javascript
const [customerName, setCustomerName] = useState("");
const [phone, setPhone] = useState("");
const [alternativePhone, setAlternativePhone] = useState("");  // ✅ NEW
const [address, setAddress] = useState("");
const [location, setLocation] = useState("");
```

#### Validation:
```javascript
const errors = {
  customerName: validateRequired(customerName, "Customer name"),
  phone: validatePhone(phone),
  alternativePhone: validatePhoneOptional(alternativePhone), // ✅ NEW
  address: validateRequired(address, "Delivery address"),
  location: validateRequired(location, "Location"),
  quantity: validateNumber(quantity, "Quantity", 1)
};
```

#### UI Field:
```javascript
<input
  type="tel"
  placeholder="Alternative Phone (10 digits) - Optional"
  value={alternativePhone}
  onChange={(e) => setAlternativePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
  maxLength="10"
/>
```

#### Form Reset:
```javascript
const handleBook = (fruit) => {
  setSelectedFruit(fruit);
  setConfirmStep(false);
  const user = JSON.parse(localStorage.getItem("user"));
  setCustomerName(user?.name || "");
  setPhone(user?.phone || "");
  setAlternativePhone("");  // ✅ NEW - Reset to empty
  setAddress("");
  setLocation("");
  setQuantity(1);
  setPayment("COD");
};
```

---

### 3. **Farmer Page** - Post Tree Form

#### State Added:
```javascript
const [treeData, setTreeData] = useState({
  name: "",
  description: "",
  expectedRent: "",
  leaseDuration: "",
  image: null,
  farmerName: "",
  farmerPhone: "",
  farmerAlternativePhone: "",  // ✅ NEW
  farmerEmail: "",
  location: ""
});
```

#### Validation:
```javascript
const errors = {
  name: validateRequired(treeData.name, "Tree name"),
  description: validateRequired(treeData.description, "Description"),
  expectedRent: validateNumber(treeData.expectedRent, "Expected rent", 1),
  leaseDuration: validateNumber(treeData.leaseDuration, "Lease duration", 1),
  farmerName: validateRequired(treeData.farmerName, "Farmer name"),
  farmerPhone: validatePhone(treeData.farmerPhone),
  farmerAlternativePhone: validatePhoneOptional(treeData.farmerAlternativePhone), // ✅ NEW
  location: validateRequired(treeData.location, "Location")
};
```

#### UI Field:
```javascript
<input
  name="farmerAlternativePhone"
  type="tel"
  placeholder="Alternative Phone (10 digits) - Optional"
  value={treeData.farmerAlternativePhone}
  onChange={(e) => setTreeData({ 
    ...treeData, 
    farmerAlternativePhone: e.target.value.replace(/\D/g, '').slice(0, 10) 
  })}
  maxLength="10"
/>
```

---

## 🎯 Features

### Input Behavior:
- ✅ **Auto-formats:** Only accepts digits (0-9)
- ✅ **Max length:** Limited to 10 digits
- ✅ **Optional:** Can be left empty
- ✅ **Validation:** If provided, must be exactly 10 digits
- ✅ **Clear placeholder:** "Alternative Phone (10 digits) - Optional"

### Validation Rules:
| Condition | Result |
|-----------|--------|
| Empty field | ✅ Valid (optional) |
| 10 digits | ✅ Valid |
| Less than 10 digits | ❌ "Alternative phone must be exactly 10 digits" |
| More than 10 digits | ❌ Auto-truncated to 10 |
| Contains letters | ❌ Auto-removed (only digits allowed) |

---

## 📊 Summary of Changes

| Page | Form | Field Added | Validation | Auto-Format |
|------|------|-------------|------------|-------------|
| **Vendor** | Submit Bid | `alternativePhone` | Optional, 10 digits | ✅ Yes |
| **Customer** | Book Fruit | `alternativePhone` | Optional, 10 digits | ✅ Yes |
| **Farmer** | Post Tree | `farmerAlternativePhone` | Optional, 10 digits | ✅ Yes |

---

## 🔧 Technical Details

### Validation Function:
```javascript
export const validatePhoneOptional = (phone) => {
  if (!phone || phone.trim() === '') return null;
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) return "Alternative phone must be exactly 10 digits";
  return null;
};
```

### Auto-Format Pattern:
```javascript
onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
```
- `replace(/\D/g, '')` - Removes all non-digit characters
- `.slice(0, 10)` - Limits to first 10 characters

---

## 🧪 Testing Guide

### Test Case 1: Leave Field Empty
1. Fill all required fields
2. Leave alternative phone empty
3. Submit form
4. **Expected:** ✅ Form submits successfully

### Test Case 2: Enter Valid 10-Digit Number
1. Enter alternative phone: "9876543210"
2. Submit form
3. **Expected:** ✅ Form submits successfully

### Test Case 3: Enter Less Than 10 Digits
1. Enter alternative phone: "12345"
2. Submit form
3. **Expected:** ❌ "Alternative phone must be exactly 10 digits"

### Test Case 4: Try to Enter Letters
1. Type: "abc123"
2. **Expected:** Only "123" appears (letters auto-removed)

### Test Case 5: Try to Enter More Than 10 Digits
1. Type: "12345678901234"
2. **Expected:** Only "1234567890" appears (truncated to 10)

---

## 💡 Use Cases

### Why Alternative Phone?

1. **Backup Contact:** If primary phone is unreachable
2. **Business Hours:** Different numbers for different times
3. **Multiple Contacts:** Office vs mobile number
4. **Family Member:** Spouse or family contact
5. **Emergency:** Backup for urgent situations

### Example Scenarios:

**Vendor Bidding:**
- Primary: Personal mobile
- Alternative: Office landline

**Customer Booking:**
- Primary: Personal number
- Alternative: Home number or family member

**Farmer Posting:**
- Primary: Mobile number
- Alternative: Farm office number

---

## 📱 User Experience

### Before:
- ❌ Only one phone number allowed
- ❌ No backup contact option
- ❌ Difficult to reach if primary number unavailable

### After:
- ✅ Two phone numbers supported
- ✅ Optional backup contact
- ✅ Better communication reliability
- ✅ More flexible contact options
- ✅ Clear indication that field is optional

---

## 🎨 UI/UX Improvements

### Input Field Design:
```
┌─────────────────────────────────────────────┐
│ Phone (10 digits) *                         │
│ 1234567890                                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Alternative Phone (10 digits) - Optional    │
│ 9876543210                                  │
└─────────────────────────────────────────────┘
```

### Key Features:
- ✅ Clear labeling with "(10 digits)"
- ✅ "Optional" clearly indicated
- ✅ Consistent styling with other fields
- ✅ Auto-format prevents invalid input
- ✅ Max length prevents over-typing

---

## 🔄 Backend Integration

### Note:
The backend APIs already accept these fields. If your backend models don't have these fields yet, you may need to update:

1. **Bid Model** - Add `vendorAlternativePhone`
2. **Tree Model** - Add `farmerAlternativePhone`
3. **Fruit/Booking Model** - Add `customerAlternativePhone`

### Example Backend Update (if needed):
```javascript
// In Bid schema
const bidSchema = new mongoose.Schema({
  vendorName: String,
  vendorPhone: String,
  vendorAlternativePhone: String,  // ✅ Add this
  // ... other fields
});

// In Tree schema
const treeSchema = new mongoose.Schema({
  farmerName: String,
  farmerPhone: String,
  farmerAlternativePhone: String,  // ✅ Add this
  // ... other fields
});
```

---

## ✅ Feature Complete!

Alternative phone number field has been successfully added to:
- ✅ Vendor bid submission form
- ✅ Customer fruit booking form
- ✅ Farmer tree posting form

**Benefits:**
- Better communication reliability
- Backup contact option
- Optional field (no forced requirement)
- Proper validation
- Auto-formatting for better UX

---

## 📞 Quick Reference

| Page | Field Name | Required | Format | Validation Function |
|------|------------|----------|--------|---------------------|
| Vendor | `alternativePhone` | No | 10 digits | `validatePhoneOptional` |
| Customer | `alternativePhone` | No | 10 digits | `validatePhoneOptional` |
| Farmer | `farmerAlternativePhone` | No | 10 digits | `validatePhoneOptional` |

---

**Implementation Complete!** 🎉

Users can now provide alternative phone numbers for better communication across all booking and posting forms.
