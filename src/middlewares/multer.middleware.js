import multer from "multer";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

// --- কনফিগারেশন কনস্ট্যান্টস (এক জায়গায় সব লিমিট) ---
export const UPLOAD_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5 MB
  VIDEO: 100 * 1024 * 1024, // 100 MB (শুরুর জন্য, পরে চাঙ্কিং লাগবে)
  DOC: 50 * 1024 * 1024, // 50 MB (বই বা স্লাইড)
};

export const ALLOWED_TYPES = {
  IMAGE: /jpeg|jpg|png|webp|gif/,
  VIDEO: /mp4|mkv|webm/,
  DOC: /pdf|doc|docx|ppt|pptx/,
};

// --- স্টোরেজ কনফিগারেশন (Common) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${uniqueSuffix}-${cleanName}`);
  },
});

/**
 * ডায়নামিক আপলোডার ফাংশন
 * @param {RegExp} allowedTypes - কোন ধরনের ফাইল এলাউড (e.g. ALLOWED_TYPES.IMAGE)
 * @param {Number} maxSize - ম্যাক্স সাইজ বাইটে (e.g. UPLOAD_LIMITS.IMAGE)
 */
const createUploader = (allowedTypes, maxSize) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (req, file, cb) => {
      // ১. এক্সটেনশন চেক
      const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      // ২. মাইম টাইপ চেক
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      } else {
        return cb(
          new ApiError(
            400,
            `Invalid file type! Allowed types matching: ${allowedTypes}`
          ),
          false
        );
      }
    },
  });
};

// --- ব্যবহার করার জন্য আলাদা আলাদা আপলোডার এক্সপোর্ট করা ---

// ১. শুধু ইমেজের জন্য (Profile, Cover, Post Image)
export const uploadImage = createUploader(
  ALLOWED_TYPES.IMAGE,
  UPLOAD_LIMITS.IMAGE
);

// ২. ভিডিওর জন্য (Reels, Course Video)
export const uploadVideo = createUploader(
  ALLOWED_TYPES.VIDEO,
  UPLOAD_LIMITS.VIDEO
);

// ৩. ডকুমেন্টের জন্য (Teacher Notes, Books)
export const uploadDoc = createUploader(ALLOWED_TYPES.DOC, UPLOAD_LIMITS.DOC);

// ৪. মিক্সড (যদি কখনো লাগে, যেমন পোস্টে ইমেজ+ভিডিও একসাথে)
// এটার লজিক একটু আলাদা হতে পারে, তবে আপাতত ইমেজ লিমিটেই রাখলাম বা কাস্টম বানাতে পারেন
export const uploadMixed = createUploader(
  /jpeg|jpg|png|webp|mp4|pdf/,
  50 * 1024 * 1024 // 50 MB Max
);
