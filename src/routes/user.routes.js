import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAcademicProfile,
  updateUserAvatar,
} from "../controllers/user.controller.js";

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
// 🔓 PUBLIC ROUTES
// ==================================================

// Register Route
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
// 🔒 SECURED ROUTES (JWT Token Needed)
// ==================================================

// Logout & Token
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);

// Profile Management
router.post("/change-password", verifyJWT, changeCurrentPassword);
router.get("/current-user", verifyJWT, getCurrentUser);

// Academic Onboarding (Auto-Chat Trigger)
router.patch(
  "/update-academic",
  verifyJWT,
  validate(userOnboardingSchema),
  updateAcademicProfile
);

// File Updates
router.patch(
  "/avatar",
  verifyJWT,
  uploadImage.single("avatar"),
  updateUserAvatar
);

export default router;
