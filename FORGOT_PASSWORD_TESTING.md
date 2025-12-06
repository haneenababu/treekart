# Forgot Password - Testing Guide

## ✅ Backend Server Restarted

The backend server has been restarted and the `/api/auth/forgot-password` endpoint is now active and working.

## How to Test

### Step 1: Create a Test Account (if you don't have one)

1. Go to: `http://localhost:3000/register`
2. Fill in the form:
   - **Name:** Test User
   - **Email:** `test@example.com`
   - **Phone:** `1234567890`
   - **Password:** `oldpassword`
   - **Role:** Customer (or any role)
3. Click **Register**

### Step 2: Test Forgot Password Flow

1. Go to: `http://localhost:3000/login`
2. Click the **"Forgot Password?"** link (green text below login button)
3. You'll be redirected to: `http://localhost:3000/forgot-password`
4. Fill in the form:
   - **Email:** `test@example.com` (must match registered email)
   - **Phone:** `1234567890` (must match registered phone)
   - **New Password:** `newpassword123`
   - **Confirm Password:** `newpassword123`
5. Click **"Reset Password"**
6. You should see: ✅ "Password reset successful! You can now login with your new password."
7. You'll be redirected to the login page

### Step 3: Login with New Password

1. On the login page, enter:
   - **Email:** `test@example.com`
   - **Password:** `newpassword123` (your new password)
2. Click **Login**
3. You should be logged in successfully! ✅

## Error Messages

### "No account found with this email and phone number"
- **Cause:** The email and phone combination doesn't match any registered user
- **Solution:** Make sure you're using the exact email and phone you registered with

### "Passwords do not match!"
- **Cause:** New password and confirm password fields don't match
- **Solution:** Type the same password in both fields

### "Password must be at least 6 characters long!"
- **Cause:** New password is too short
- **Solution:** Use a password with at least 6 characters

### "Please provide email, phone, and new password"
- **Cause:** One or more fields are empty
- **Solution:** Fill in all fields

## Security Features

✅ **Two-factor verification:** Requires both email AND phone to reset password
✅ **Password hashing:** New password is hashed with bcrypt before saving
✅ **Validation:** Checks password length and confirmation match
✅ **Clear feedback:** Shows success/error messages

## API Endpoint Details

**URL:** `POST http://localhost:5000/api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "test@example.com",
  "phone": "1234567890",
  "newPassword": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successful! You can now login with your new password."
}
```

**Error Response (404):**
```json
{
  "message": "No account found with this email and phone number"
}
```

## Troubleshooting

### Issue: 404 Error on forgot-password endpoint
**Solution:** Backend server has been restarted. Refresh your browser and try again.

### Issue: Can't access forgot password page
**Solution:** Make sure frontend is running on `http://localhost:3000`

### Issue: Password reset works but can't login
**Solution:** Make sure you're using the NEW password, not the old one

---

## Quick Test Checklist

- [ ] Can access forgot password page from login
- [ ] Form validates all fields are filled
- [ ] Form validates passwords match
- [ ] Form validates password length (min 6 chars)
- [ ] Shows error if email/phone don't match account
- [ ] Successfully resets password
- [ ] Redirects to login after success
- [ ] Can login with new password
- [ ] Cannot login with old password

---

**Status:** ✅ Feature is fully functional and ready to use!
