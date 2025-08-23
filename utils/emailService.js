// puls-academy-backend/utils/emailService.js

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendPaymentPendingEmail = async (userEmail, courseTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Puls Academy <noreply@pulsacademy.com>',
            to: userEmail,
            subject: 'دفعة قيد المراجعة - Puls Academy',
            html: `
                <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
                    <h2>مرحباً بك في Puls Academy</h2>
                    <p>تم استلام دفعتك لكورس: <strong>${courseTitle}</strong></p>
                    <p>الدفعة قيد المراجعة وسيتم إشعارك بالنتيجة خلال 24 ساعة.</p>
                    <p>شكراً لك!</p>
                    <hr>
                    <p><small>هذه رسالة آلية، يرجى عدم الرد عليها.</small></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending payment pending email:', error);
    }
};

const sendPaymentApprovedEmail = async (userEmail, courseTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Puls Academy <noreply@pulsacademy.com>',
            to: userEmail,
            subject: 'تم فتح الكورس - Puls Academy',
            html: `
                <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
                    <h2>أخبار سارة!</h2>
                    <p>تم اعتماد دفعتك وفتح الكورس: <strong>${courseTitle}</strong></p>
                    <p>يمكنك الآن الدخول إلى لوحة التحكم ومشاهدة جميع الدروس.</p>
                    <p>نتمنى لك رحلة تعليمية ممتعة!</p>
                    <hr>
                    <p><small>هذه رسالة آلية، يرجى عدم الرد عليها.</small></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending payment approved email:', error);
    }
};

const sendPaymentRejectedEmail = async (userEmail, courseTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Puls Academy <noreply@pulsacademy.com>',
            to: userEmail,
            subject: 'تم رفض الدفع - Puls Academy',
            html: `
                <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
                    <h2>عذراً</h2>
                    <p>تم رفض دفعتك لكورس: <strong>${courseTitle}</strong></p>
                    <p>يرجى التحقق من بيانات الدفع والمحاولة مرة أخرى.</p>
                    <p>إذا كان لديك أي استفسار، يرجى التواصل معنا.</p>
                    <hr>
                    <p><small>هذه رسالة آلية، يرجى عدم الرد عليها.</small></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending payment rejected email:', error);
    }
};

const sendWelcomeEmail = async (userEmail, userName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Puls Academy <noreply@pulsacademy.com>',
            to: userEmail,
            subject: 'مرحباً بك في Puls Academy',
            html: `
                <div style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
                    <h2>مرحباً ${userName}!</h2>
                    <p>شكراً لتسجيلك في منصة Puls Academy التعليمية.</p>
                    <p>نحن متخصصون في تقديم كورسات عالية الجودة لطلاب الصيدلة وطب الأسنان.</p>
                    <p>استكشف كورساتنا وابدأ رحلتك التعليمية اليوم!</p>
                    <hr>
                    <p><small>هذه رسالة آلية، يرجى عدم الرد عليها.</small></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

module.exports = {
    sendPaymentPendingEmail,
    sendPaymentApprovedEmail,
    sendPaymentRejectedEmail,
    sendWelcomeEmail
};