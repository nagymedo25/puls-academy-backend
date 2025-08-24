// puls-academy-backend/config/storage.js

const { Storage } = require('megajs');
const { Readable } = require('stream');

let megaStorage = null;

async function connectToMega() {
  if (megaStorage && megaStorage.root) {
    return megaStorage;
  }

  console.log('Connecting to MEGA...');
  try {
    const storage = new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
    });

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
    megaStorage = null;
    throw new Error('Failed to initialize MEGA connection.');
  }
}

// --- NEW, MORE ROBUST UPLOAD FUNCTION ---
// This function wraps the entire stream-based upload process in a Promise
// to ensure it always resolves or rejects correctly, preventing hangs.
async function uploadFile(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const storage = await connectToMega();
      if (!storage) {
        return reject(new Error('MEGA connection is not available.'));
      }

      const { originalname, buffer } = file;
      const fileStream = Readable.from(buffer);

      const uploadStream = storage.upload({
        name: originalname,
        size: buffer.length,
      }, fileStream);

      // Listen for progress events
      uploadStream.on('progress', (progress) => {
        const percentage = Math.round((progress.bytesLoaded / progress.bytesTotal) * 100);
        process.stdout.write(`Uploading ${originalname}: ${percentage}% complete\r`);
      });

      // Listen for the 'error' event on the stream
      uploadStream.on('error', (err) => {
        console.error(`\nError during MEGA upload for ${originalname}:`, err);
        return reject(new Error('Failed to upload file to MEGA.'));
      });

      // Listen for the 'complete' event, which signifies success
      uploadStream.on('complete', async (uploadedFile) => {
        try {
          process.stdout.write('\n');
          console.log(`File uploaded to MEGA: ${originalname}`);
          
          const link = await uploadedFile.link(true);
          
          // Resolve the promise with the final result
          resolve({
            url: link,
            id: uploadedFile.handle,
          });
        } catch (linkError) {
           console.error(`\nError getting link for ${originalname}:`, linkError);
           reject(new Error('File uploaded but failed to get link.'));
        }
      });

    } catch (error) {
      console.error('\nError in uploadFile function wrapper:', error);
      reject(error);
    }
  });
}


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
