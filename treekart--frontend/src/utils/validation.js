// Validation utility functions

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return "Email is required";
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return null;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone) return "Phone number is required";
  if (!phoneRegex.test(phone)) return "Phone number must be exactly 10 digits";
  return null;
};

export const validatePhoneOptional = (phone) => {
  if (!phone || phone.trim() === '') return null; // Optional field
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) return "Alternative phone must be exactly 10 digits";
  return null;
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters long";
  return null;
};

export const validateName = (name) => {
  if (!name) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters long";
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateNumber = (value, fieldName, min = 0) => {
  if (!value && value !== 0) return `${fieldName} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a valid number`;
  if (num < min) return `${fieldName} must be at least ${min}`;
  return null;
};

export const validatePrice = (price) => {
  return validateNumber(price, "Price", 1);
};

export const validateQuantity = (quantity) => {
  return validateNumber(quantity, "Quantity", 1);
};

export const showValidationErrors = (errors) => {
  const errorMessages = Object.values(errors).filter(err => err !== null);
  if (errorMessages.length > 0) {
    alert("⚠️ Please fix the following errors:\n\n" + errorMessages.join("\n"));
    return true;
  }
  return false;
};
