// scripts/reset-database.js

const dotenv = require('dotenv');
const { db, initializeDatabase } = require('../config/db'); // <-- 1. استيراد initializeDatabase

dotenv.config();

/**
 * هذا السكربت سيقوم بحذف جميع الجداول وإعادة بنائها من الصفر.
 * استخدمه بحذر شديد.
 */
const resetDatabase = async () => {
  const client = await db.connect();
  console.log('⚠️  تحذير: أنت على وشك حذف جميع الجداول وإعادة بنائها.');
  console.log('⏳  بدء عملية إعادة البناء الكاملة...');

  try {
    // ✨ --- START: الكود الجديد لحذف جميع الجداول --- ✨
    console.log('🗑️  جارٍ حذف جميع الجداول الحالية...');
    await client.query(`
        DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
    `);
    console.log('✅  تم حذف جميع الجداول بنجاح.');
    // ✨ --- END: الكود الجديد --- ✨

    // إعادة بناء الجداول وإنشاء حساب الأدمن
    console.log('🏗️  جارٍ إعادة بناء الجداول وإنشاء حساب الأدمن...');
    await initializeDatabase(); // <-- 2. استدعاء الدالة التي تبني كل شيء
    
    console.log('🎉  اكتملت عملية إعادة بناء قاعدة البيانات بنجاح!');

  } catch (error) {
    console.error('❌  فشلت عملية إعادة البناء.');
    console.error(error);
  } finally {
    client.release();
    db.end();
  }
};

// تنفيذ الدالة
resetDatabase();