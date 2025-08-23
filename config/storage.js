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

// دالة لرفع ملف إلى MEGA
async function uploadFile(file) {
  try {
    const storage = await connectToMega();
    if (!storage) {
        throw new Error('MEGA connection is not available.');
    }

    const { originalname, buffer } = file;

    // تحويل الـ buffer إلى stream
    const fileStream = Readable.from(buffer);

    // رفع الملف إلى المجلد الرئيسي في حسابك
    const uploadedFile = await storage.upload({
        name: originalname,
        size: buffer.length
    }, fileStream).complete;

    // الحصول على رابط عام للملف
    const link = await uploadedFile.link(true); // true to get the key

    console.log(`File uploaded to MEGA: ${originalname}`);

    // إرجاع الرابط ومعرف الملف
    return {
      url: link,
      // سنستخدم الرابط كمعرف فريد للملف في هذه الحالة
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

        // البحث عن الملف باستخدام المعرف (handle)
        const fileToDelete = storage.files.get(fileId);

        if (!fileToDelete) {
            console.warn(`File with ID ${fileId} not found in MEGA for deletion.`);
            return true; // اعتباره محذوفًا إذا لم يكن موجودًا
        }
        
        // حذف الملف
        await fileToDelete.delete(true); // true for permanent deletion
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