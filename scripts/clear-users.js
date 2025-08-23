// scripts/clear-users.js
const { db } = require('../config/db');

// هذا السطر يحذف الطلاب فقط
const sql = "DELETE FROM Users WHERE role = 'student';";

db.run(sql, [], function(err) {
    if (err) {
        return console.error("❌ خطأ أثناء الحذف:", err.message);
    }
    console.log(`✅ تم حذف ${this.changes} طالب بنجاح.`);
    db.close();
});