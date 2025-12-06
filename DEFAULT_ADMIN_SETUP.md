# Default Admin Account Setup

## Overview

The TreeKart system now has **ONE default admin account** that is created automatically. No additional admin accounts can be created through registration.

---

## Default Admin Credentials

### Login Details:
```
📧 Email:    admin@treekart.com
🔑 Password: admin123
👤 Name:     TreeKart Admin
📱 Phone:    9999999999
```

⚠️ **IMPORTANT:** Change the password after first login!

---

## How to Create Default Admin

### Method 1: Run the Script (Recommended)

```bash
cd treekart--backend
npm run create-admin
```

**Output:**
```
✅ Connected to MongoDB
✅ Default Admin Account Created Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:     admin@treekart.com
🔑 Password:  admin123
👤 Name:      TreeKart Admin
📱 Phone:     9999999999
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Change the password after first login!
🔒 Only ONE admin account is allowed in the system.
```

### Method 2: Manual Script Execution

```bash
cd treekart--backend
node scripts/createDefaultAdmin.js
```

---

## Security Features

### 1. **Only One Admin Allowed**
- ✅ System enforces single admin account
- ✅ Script checks if admin exists before creating
- ✅ Won't create duplicate admin accounts

### 2. **Registration Blocked for Admin Role**
- ❌ Admin option removed from registration form
- ❌ Backend rejects admin registration attempts
- ✅ Error message: "Admin accounts cannot be created through registration"

### 3. **Protected Admin Creation**
- ✅ Only created via secure backend script
- ✅ Requires database access
- ✅ Cannot be created through public API

---

## Implementation Details

### 1. **Backend Script** (`scripts/createDefaultAdmin.js`)

**Features:**
- Connects to MongoDB
- Checks if admin already exists
- Creates admin only if none exists
- Hashes password with bcrypt
- Displays credentials after creation

**Code:**
```javascript
const createDefaultAdmin = async () => {
  // Check if admin exists
  const existingAdmin = await User.findOne({ role: "admin" });
  
  if (existingAdmin) {
    console.log("⚠️ Admin account already exists");
    return;
  }

  // Create default admin
  const admin = new User({
    name: "TreeKart Admin",
    email: "admin@treekart.com",
    phone: "9999999999",
    password: hashedPassword,
    role: "admin"
  });

  await admin.save();
};
```

---

### 2. **Registration Route Protection** (`routes/authRoutes.js`)

**Added Check:**
```javascript
// Prevent registration of admin accounts
if (role === "admin") {
  return res.status(403).json({ 
    message: "Admin accounts cannot be created through registration. Only one default admin exists." 
  });
}
```

**Response:**
- **Status:** 403 Forbidden
- **Message:** "Admin accounts cannot be created through registration. Only one default admin exists."

---

### 3. **Frontend Registration Form** (`RegisterPage.jsx`)

**Removed Admin Option:**
```javascript
// Before
<select>
  <option value="customer">Customer</option>
  <option value="farmer">Farmer</option>
  <option value="vendor">Vendor</option>
  <option value="admin">Admin</option>  ❌ Removed
</select>

// After
<select>
  <option value="customer">Customer</option>
  <option value="farmer">Farmer</option>
  <option value="vendor">Vendor</option>
</select>
```

---

### 4. **Package.json Script** (`package.json`)

**Added Command:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "create-admin": "node scripts/createDefaultAdmin.js",  // ✅ New
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## Usage Guide

### First Time Setup:

1. **Install Dependencies:**
   ```bash
   cd treekart--backend
   npm install
   ```

2. **Configure Environment:**
   - Ensure `.env` file has `MONGO_URI` and `JWT_SECRET`

3. **Create Default Admin:**
   ```bash
   npm run create-admin
   ```

4. **Start Backend:**
   ```bash
   npm run dev
   ```

5. **Login as Admin:**
   - Go to `http://localhost:3000/login`
   - Email: `admin@treekart.com`
   - Password: `admin123`

6. **Change Password (Recommended):**
   - Use "Forgot Password" feature
   - Or update directly in database

---

## Testing

### Test 1: Create Default Admin
```bash
npm run create-admin
```
**Expected:** Admin created successfully

### Test 2: Try Creating Again
```bash
npm run create-admin
```
**Expected:** Message "Admin account already exists"

### Test 3: Try Registering as Admin (Frontend)
1. Go to registration page
2. **Expected:** No "Admin" option in role dropdown

### Test 4: Try Registering as Admin (API)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "test@admin.com",
    "phone": "1234567890",
    "password": "test123",
    "role": "admin"
  }'
```
**Expected:** 403 error with message about admin accounts

### Test 5: Login as Admin
1. Email: `admin@treekart.com`
2. Password: `admin123`
3. **Expected:** Successful login, redirected to `/admin`

---

## Troubleshooting

### Issue: "Admin account already exists"
**Solution:** Admin is already created. Use existing credentials to login.

### Issue: Script fails to connect to MongoDB
**Solution:** 
- Check `.env` file has correct `MONGO_URI`
- Ensure MongoDB is running
- Verify network connection

### Issue: Can't login with default credentials
**Solution:**
- Verify admin was created: Check MongoDB users collection
- Ensure email is exactly: `admin@treekart.com`
- Password is case-sensitive: `admin123`

### Issue: Want to reset admin password
**Solution:**
1. Use "Forgot Password" feature with email + phone
2. Or delete admin from database and run script again
3. Or update password directly in MongoDB

---

## Security Best Practices

### ✅ **DO:**
- Change default password immediately after first login
- Use strong password (min 8 characters, mixed case, numbers, symbols)
- Keep admin credentials secure
- Don't share admin access
- Use "Forgot Password" to change password securely

### ❌ **DON'T:**
- Share default credentials
- Use default password in production
- Create multiple admin accounts
- Give admin access to regular users
- Store credentials in code or public places

---

## Admin Dashboard Access

### Login Flow:
```
1. Go to http://localhost:3000/login
2. Enter: admin@treekart.com
3. Enter: admin123
4. Click Login
5. Redirected to: http://localhost:3000/admin
```

### Admin Dashboard Features:
- 👤 **Users:** View all registered users by role
- 🌳 **Trees:** View all trees posted by farmers
- 🍎 **Fruits:** View all fruits posted by vendors

---

## Files Created/Modified

### Created:
1. **`treekart--backend/scripts/createDefaultAdmin.js`**
   - Script to create default admin account
   - Checks for existing admin
   - Displays credentials after creation

### Modified:
1. **`treekart--backend/routes/authRoutes.js`**
   - Added admin role check in registration
   - Blocks admin account creation via API

2. **`treekart--frontend/src/pages/RegisterPage.jsx`**
   - Removed "Admin" option from role dropdown

3. **`treekart--backend/package.json`**
   - Added `create-admin` script command

---

## Quick Reference

| Item | Value |
|------|-------|
| **Email** | admin@treekart.com |
| **Password** | admin123 |
| **Name** | TreeKart Admin |
| **Phone** | 9999999999 |
| **Role** | admin |
| **Script Command** | `npm run create-admin` |
| **Script Path** | `scripts/createDefaultAdmin.js` |
| **Login URL** | http://localhost:3000/login |
| **Dashboard URL** | http://localhost:3000/admin |

---

## Summary

✅ **One Admin:** Only one admin account allowed
✅ **Default Credentials:** Predefined email and password
✅ **Easy Setup:** Single command to create admin
✅ **Secure:** Cannot create admin through registration
✅ **Protected:** Admin role blocked in frontend and backend

---

**Setup Complete!** Run `npm run create-admin` to create the default admin account and login with the provided credentials. 🎉
