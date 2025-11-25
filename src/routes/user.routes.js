import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails, // সাধারণ তথ্য (Bio, Social Links) আপডেট
  updateAcademicProfile, // একাডেমিক তথ্য (Auto Chat Trigger) আপডেট
  updateUserAvatar,
  updateUserCoverImage, // (যদি কন্ট্রোলার বানিয়ে থাকেন, না বানালে কমেন্ট করে রাখবেন)
} from "../controllers/user.controllers.js";

// Middlewares
import { uploadImage } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

// Validators
import {
  userRegisterSchema,
  userOnboardingSchema,
} from "../validators/auth.validator.js";

const router = Router();

// ==================================================
// 🔓 PUBLIC ROUTES (No Login Required)
// ==================================================

// Registration Route (With File Upload & Validation)
router.post(
  "/register",
  uploadImage.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validate(userRegisterSchema),
  registerUser
);

// Login Route
router.post("/login", loginUser);

// ==================================================
// 🔒 SECURED ROUTES (Login Required)
// ==================================================

// --- Authentication Management ---
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT, changeCurrentPassword);
router.get("/current-user", verifyJWT, getCurrentUser);

// --- Profile Updates (Separated for Performance) ---

// 1. General Info Update (Name, Bio, Social Links, Skills)
// এটাতে কোনো ভারী লজিক নেই, তাই সিম্পল আপডেট
router.patch("/update-general", verifyJWT, updateAccountDetails);

// 2. Academic Info Update (Dept, Session, Institution)
// ⚠️ CRITICAL: এটা কল করলে ব্যাকএন্ডে Auto-Chat Group লজিক রান হবে
router.patch(
  "/update-academic",
  verifyJWT,
  validate(userOnboardingSchema), // ডাটা ঠিক আছে কিনা চেক করবে
  updateAcademicProfile
);

// --- File Updates ---

// Avatar Change
router.patch(
  "/avatar",
  verifyJWT,
  uploadImage.single("avatar"),
  updateUserAvatar
);

// Cover Image Change (Optional: যদি কন্ট্রোলার রেডি থাকে)
router.patch(
  "/cover-image",
  verifyJWT,
  uploadImage.single("coverImage"),
  updateUserCoverImage
);

export default router;
