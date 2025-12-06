# Validation Quick Reference Guide

## 🎯 Quick Start

### Import Validation Functions
```javascript
import { 
  validateEmail, 
  validatePhone, 
  validatePassword,
  validateRequired,
  validateNumber,
  showValidationErrors 
} from "../utils/validation";
```

### Basic Usage Pattern
```javascript
const handleSubmit = async () => {
  // 1. Create errors object
  const errors = {
    email: validateEmail(email),
    phone: validatePhone(phone),
    name: validateRequired(name, "Name")
  };

  // 2. Check for errors
  if (showValidationErrors(errors)) return;

  // 3. Submit if valid
  try {
    await axios.post("/api/endpoint", data);
    alert("✅ Success!");
  } catch (err) {
    alert("❌ " + err.message);
  }
};
```

---

## 📋 Validation Functions Reference

### `validateEmail(email)`
**Purpose:** Validate email format  
**Returns:** Error message or `null`  
**Example:**
```javascript
const emailError = validateEmail("user@example.com");
// Returns: null (valid)

const emailError = validateEmail("invalid-email");
// Returns: "Please enter a valid email address"
```

---

### `validatePhone(phone)`
**Purpose:** Validate 10-digit phone number  
**Returns:** Error message or `null`  
**Example:**
```javascript
const phoneError = validatePhone("1234567890");
// Returns: null (valid)

const phoneError = validatePhone("123");
// Returns: "Phone number must be exactly 10 digits"
```

---

### `validatePassword(password)`
**Purpose:** Validate password (min 6 chars)  
**Returns:** Error message or `null`  
**Example:**
```javascript
const pwdError = validatePassword("mypassword");
// Returns: null (valid)

const pwdError = validatePassword("123");
// Returns: "Password must be at least 6 characters long"
```

---

### `validateRequired(value, fieldName)`
**Purpose:** Check if field is not empty  
**Returns:** Error message or `null`  
**Example:**
```javascript
const nameError = validateRequired(name, "Full name");
// If empty: "Full name is required"
// If filled: null
```

---

### `validateNumber(value, fieldName, min = 0)`
**Purpose:** Validate numeric fields with minimum value  
**Returns:** Error message or `null`  
**Example:**
```javascript
const priceError = validateNumber(price, "Price", 1);
// If "abc": "Price must be a valid number"
// If "0": "Price must be at least 1"
// If "100": null (valid)
```

---

### `showValidationErrors(errors)`
**Purpose:** Display all validation errors in alert  
**Returns:** `true` if errors exist, `false` otherwise  
**Example:**
```javascript
const errors = {
  email: validateEmail(email),
  phone: validatePhone(phone)
};

if (showValidationErrors(errors)) {
  return; // Stop execution if errors
}
// Continue if no errors
```

---

## 🔥 Common Validation Patterns

### Pattern 1: Registration Form
```javascript
const errors = {
  name: validateRequired(name, "Name"),
  email: validateEmail(email),
  phone: validatePhone(phone),
  password: validatePassword(password),
  confirmPassword: password !== confirmPassword ? "Passwords do not match" : null
};

if (showValidationErrors(errors)) return;
```

### Pattern 2: Login Form
```javascript
const errors = {
  email: validateEmail(email),
  password: validatePassword(password)
};

if (showValidationErrors(errors)) return;
```

### Pattern 3: Product/Item Form
```javascript
const errors = {
  name: validateRequired(name, "Product name"),
  price: validateNumber(price, "Price", 1),
  quantity: validateNumber(quantity, "Quantity", 1),
  description: validateRequired(description, "Description")
};

if (showValidationErrors(errors)) return;
```

### Pattern 4: Booking/Order Form
```javascript
const errors = {
  customerName: validateRequired(customerName, "Customer name"),
  phone: validatePhone(phone),
  address: validateRequired(address, "Address"),
  quantity: validateNumber(quantity, "Quantity", 1)
};

if (showValidationErrors(errors)) return;
```

---

## 🎨 Enhanced Input Fields

### Phone Input with Auto-Format
```javascript
<input
  type="tel"
  placeholder="Phone number (10 digits) *"
  value={phone}
  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
  maxLength="10"
  required
/>
```

### Number Input with Validation
```javascript
<input
  type="number"
  placeholder="Price (₹) *"
  value={price}
  onChange={(e) => setPrice(e.target.value)}
  min="1"
  required
/>
```

### Password with Confirm
```javascript
<input
  type="password"
  placeholder="Password (min 6 characters) *"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
/>

<input
  type="password"
  placeholder="Confirm password *"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  required
/>
```

---

## ⚡ Pro Tips

### Tip 1: Custom Error Messages
```javascript
const errors = {
  email: validateEmail(email),
  customField: !customField ? "Custom error message here" : null
};
```

### Tip 2: Conditional Validation
```javascript
const errors = {
  email: validateEmail(email),
  // Only validate if checkbox is checked
  agreeTerms: isChecked ? null : "You must agree to terms"
};
```

### Tip 3: Nested Validation
```javascript
const errors = {
  email: validateEmail(email),
  password: validatePassword(password),
  confirmPassword: !confirmPassword ? "Confirm password is required" :
                   password !== confirmPassword ? "Passwords do not match" : null
};
```

### Tip 4: Array Validation
```javascript
const errors = {
  items: items.length === 0 ? "At least one item is required" : null
};
```

---

## 🐛 Common Mistakes to Avoid

### ❌ Wrong: Checking individual errors
```javascript
if (validateEmail(email)) {
  alert(validateEmail(email));
  return;
}
if (validatePhone(phone)) {
  alert(validatePhone(phone));
  return;
}
// Too many alerts!
```

### ✅ Right: Use showValidationErrors
```javascript
const errors = {
  email: validateEmail(email),
  phone: validatePhone(phone)
};

if (showValidationErrors(errors)) return;
// Shows all errors at once
```

---

### ❌ Wrong: Not returning after validation
```javascript
const errors = { email: validateEmail(email) };
showValidationErrors(errors);
// Continues to submit even with errors!
await axios.post("/api/endpoint", data);
```

### ✅ Right: Return if errors exist
```javascript
const errors = { email: validateEmail(email) };
if (showValidationErrors(errors)) return;
// Only submits if no errors
await axios.post("/api/endpoint", data);
```

---

### ❌ Wrong: Hardcoded field names
```javascript
if (!name) alert("Name is required");
if (!email) alert("Email is required");
// Not using validation utilities
```

### ✅ Right: Use validation functions
```javascript
const errors = {
  name: validateRequired(name, "Name"),
  email: validateEmail(email)
};
if (showValidationErrors(errors)) return;
```

---

## 📱 Testing Checklist

- [ ] Test empty form submission
- [ ] Test invalid email format
- [ ] Test invalid phone (too short, too long, letters)
- [ ] Test short password (< 6 chars)
- [ ] Test password mismatch
- [ ] Test negative numbers
- [ ] Test zero values where min is 1
- [ ] Test non-numeric input in number fields
- [ ] Test whitespace-only input
- [ ] Test successful submission with valid data

---

## 🎓 Examples by Page

### Register Page
```javascript
const errors = {
  name: validateRequired(name, "Name"),
  email: validateEmail(email),
  phone: validatePhone(phone),
  password: validatePassword(password),
  confirmPassword: password !== confirmPassword ? "Passwords do not match" : null
};
```

### Farmer - Post Tree
```javascript
const errors = {
  name: validateRequired(treeData.name, "Tree name"),
  description: validateRequired(treeData.description, "Description"),
  expectedRent: validateNumber(treeData.expectedRent, "Expected rent", 1),
  leaseDuration: validateNumber(treeData.leaseDuration, "Lease duration", 1),
  farmerPhone: validatePhone(treeData.farmerPhone)
};
```

### Vendor - Post Fruit
```javascript
const errors = {
  name: validateRequired(fruitForm.name, "Fruit name"),
  price: validateNumber(fruitForm.price, "Price", 1),
  quantity: validateNumber(fruitForm.quantity, "Quantity", 1)
};
```

### Customer - Book Fruit
```javascript
const errors = {
  customerName: validateRequired(customerName, "Customer name"),
  phone: validatePhone(phone),
  address: validateRequired(address, "Delivery address"),
  quantity: validateNumber(quantity, "Quantity", 1)
};
```

---

## 🔗 Related Files

- **Validation Utility:** `src/utils/validation.js`
- **Register Page:** `src/pages/RegisterPage.jsx`
- **Login Page:** `src/pages/Login.jsx`
- **Forgot Password:** `src/pages/ForgotPassword.jsx`
- **Farmer Page:** `src/pages/Farmer.jsx`
- **Vendor Page:** `src/pages/Vendor.jsx`
- **Customer Page:** `src/pages/Customer.jsx`

---

## 📞 Need Help?

If validation isn't working:
1. Check import statement is correct
2. Verify validation.js file exists in src/utils/
3. Ensure you're using `showValidationErrors(errors)`
4. Check browser console for errors
5. Verify all required fields have validation

---

**Quick Reference Complete!** 🎉

Use this guide as a cheat sheet when adding validation to new forms.
