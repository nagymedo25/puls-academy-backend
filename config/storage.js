// puls-academy-backend/config/storage.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer-storage-cloudinary
// This tells multer to upload files directly to your Cloudinary account
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'puls-academy-receipts', // Folder name in Cloudinary
    allowed_formats: ['jpeg', 'jpg', 'png'], // Allowed image formats
  },
});

// Create the multer upload middleware
const uploadMiddleware = multer({ storage: storage });

// Create a function to delete a file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    if (!publicId) {
        console.warn('No publicId provided for deletion.');
        return;
    }
    // Use the uploader's destroy method
    await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

module.exports = {
  uploadMiddleware,
  deleteFile,
};