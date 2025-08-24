// puls-academy-backend/config/storage.js

const { Storage } = require('megajs');
const { Readable } = require('stream');

// متغير لتخزين الاتصال بـ MEGA لتجنب إعادة تسجيل الدخول مع كل عملية رفع
let megaStorage = null;

// دالة للاتصال بحساب MEGA
async function connectToMega() {
  // إذا كان الاتصال موجودًا بالفعل، قم بإرجاعه
  if (megaStorage && megaStorage.root) {
    return megaStorage;
  }

  console.log('Connecting to MEGA...');
  try {
    const storage = new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    });

    // انتظر حتى يصبح الاتصال جاهزًا
    await new Promise((resolve, reject) => {
      storage.on('ready', () => {
        console.log('Successfully connected to MEGA!');
        megaStorage = storage;
        resolve();
      });

      storage.on('error', (err) => {
        console.error('Failed to connect to MEGA:', err);
        reject(err);
      });
    });

    return megaStorage;
  } catch (error) {
    console.error('Error during MEGA connection setup:', error);
    megaStorage = null; // إعادة تعيين في حالة الفشل
    throw new Error('Failed to initialize MEGA connection.');
  }
}

// دالة لرفع ملف إلى MEGA مع إظهار التقدم
async function uploadFile(file) {
  try {
    const storage = await connectToMega();
    if (!storage) {
        throw new Error('MEGA connection is not available.');
    }

    const { originalname, buffer } = file;

    // تحويل الـ buffer إلى stream
    const fileStream = Readable.from(buffer);

    // إنشاء عملية الرفع
    const uploadStream = storage.upload({
        name: originalname,
        size: buffer.length
    }, fileStream);

    // NEW: Listen for progress events and log them to the console
    uploadStream.on('progress', (progress) => {
        const percentage = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
        // طباعة شريط التقدم في الـ console
        process.stdout.write(`Uploading ${originalname}: ${percentage}% complete\r`);
    });

    // انتظار اكتمال الرفع
    const uploadedFile = await uploadStream.complete;
    
    // طباعة سطر جديد بعد اكتمال الرفع
    process.stdout.write('\n'); 

    // الحصول على رابط عام للملف
    const link = await uploadedFile.link(true); // true to get the key

    console.log(`File uploaded to MEGA: ${originalname}`);

    // إرجاع الرابط ومعرف الملف
    return {
      url: link,
      id: uploadedFile.handle 
    };
  } catch (error) {
    console.error('Error uploading file to MEGA:', error);
    throw new Error('Failed to upload file to MEGA.');
  }
}

// دالة لحذف ملف من MEGA
async function deleteFile(fileId) {
    try {
        const storage = await connectToMega();
        if (!storage) {
            throw new Error('MEGA connection is not available.');
        }

        const fileToDelete = storage.files.get(fileId);

        if (!fileToDelete) {
            console.warn(`File with ID ${fileId} not found in MEGA for deletion.`);
            return true;
        }
        
        await fileToDelete.delete(true);
        console.log(`File deleted from MEGA: ${fileId}`);
        return true;

    } catch (error) {
        console.error('Error deleting file from MEGA:', error);
        throw new Error('Failed to delete file from MEGA.');
    }
}


module.exports = {
  uploadFile,
  deleteFile,
};
