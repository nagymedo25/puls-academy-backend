// puls-academy-backend/middlewares/validationMiddleware.js

const { validatePasswordStrength } = require("../config/auth");
const { validatePhone, validateEmail } = require("../utils/helpers"); // استيراد دالة التحقق من الهاتف

const validateRegistration = (req, res, next) => {
  try {
    const { name, email, phone, password, college, gender } = req.body;

    if (!name || !(email || phone) || !password || !college || !gender) {
      return res.status(400).json({ error: "الاسم، كلمة المرور، الكلية، النوع، بالإضافة إلى البريد الإلكتروني أو رقم الهاتف هي حقول مطلوبة" });
    }
    
    if (typeof name !== "string" || name.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }

    if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: "رقم الهاتف غير صالح، يجب أن يكون رقمًا مصريًا صحيحًا." });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const validColleges = ["pharmacy", "dentistry"];
    if (!validColleges.includes(college)) {
      return res.status(400).json({ error: "الكلية غير صالحة" });
    }

    const validGenders = ["male", "female"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: "النوع غير صالح" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "خطأ في التحقق من البيانات" });
  }
};

const validateLogin = (req, res, next) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res
        .status(400)
        .json({ error: "البريد الإلكتروني/رقم الهاتف وكلمة المرور مطلوبان" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "خطأ في التحقق من البيانات" });
  }
};

// ... باقي الدوال تبقى كما هي ...
const validateCourseCreation = (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      college_type,
      price,
      preview_url,
      thumbnail_url,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !college_type ||
      price === undefined || price === '' ||
      !preview_url ||
      !thumbnail_url
    ) {
      return res
        .status(400)
        .json({ error: "جميع الحقول مطلوبة لإنشاء الكورس" });
    }

    if (typeof title !== "string" || title.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "عنوان الكورس يجب أن يكون 3 أحرف على الأقل" });
    }

    if (typeof description !== "string" || description.trim().length < 10) {
      return res
        .status(400)
        .json({ error: "وصف الكورس يجب أن يكون 10 أحرف على الأقل" });
    }

    const validCategories = ["pharmacy", "dentistry"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "قسم الكورس غير صالح" });
    }

    const validCollegeTypes = ["male", "female"];
    if (!validCollegeTypes.includes(college_type)) {
      return res.status(400).json({ error: "نوع الكلية غير صالح" });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "السعر يجب أن يكون رقماً موجباً" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "خطأ في التحقق من بيانات الكورس" });
  }
};

const validatePaymentCreation = (req, res, next) => {
  try {
    const { course_id, amount, method } = req.body;

    if (!course_id || !amount || !method) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    if (typeof course_id !== "number" || course_id <= 0) {
      return res.status(400).json({ error: "معرف الكورس غير صالح" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون رقماً موجباً" });
    }

    const validMethods = ["vodafone_cash", "instapay"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: "طريقة الدفع غير صالحة" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "خطأ في التحقق من البيانات" });
  }
};

const validateProfileUpdate = (req, res, next) => {
  try {
    const { name, email, phone, college, gender } = req.body;

    if (name && (typeof name !== "string" || name.trim().length < 3)) {
      return res
        .status(400)
        .json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" });
    }

    if (email && !validateEmail(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }

    if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: "رقم الهاتف غير صالح" });
    }

    if (college) {
      const validColleges = ["pharmacy", "dentistry"];
      if (!validColleges.includes(college)) {
        return res.status(400).json({ error: "الكلية غير صالحة" });
      }
    }

    if (gender) {
      const validGenders = ["male", "female"];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ error: "النوع غير صالح" });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "خطأ في التحقق من البيانات" });
  }
};


module.exports = {
  validateRegistration,
  validateLogin,
  validateCourseCreation,
  validatePaymentCreation,
  validateProfileUpdate,
};