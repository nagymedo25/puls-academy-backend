// puls-academy-backend/utils/helpers.js
const axios = require("axios");

const generateRandomCode = (length = 6) => {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(price);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.replace(/[<>]/g, "");
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
  return phoneRegex.test(phone);
};

const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + "...";
};

const paginateArray = (array, page = 1, perPage = 10) => {
  const offset = (page - 1) * perPage;
  const paginatedItems = array.slice(offset, offset + perPage);
  return {
    items: paginatedItems,
    total: array.length,
    page: page,
    perPage: perPage,
    totalPages: Math.ceil(array.length / perPage),
  };
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const extractFilenameFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf("/") + 1);
  } catch {
    return null;
  }
};

const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const retryAsync = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};


module.exports = {
  generateRandomCode,
  formatPrice,
  formatDate,
  formatDateTime,
  calculateDaysBetween,
  sanitizeInput,
  validateEmail,
  validatePhone,
  generateSlug,
  truncateText,
  paginateArray,
  deepClone,
  isValidUrl,
  extractFilenameFromUrl,
  getFileExtension,
  formatFileSize,
  retryAsync,
  debounce,
  throttle,
};
