import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFile, deleteFile } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// ✅ Service Import (New)
import { verifyStudentDomain } from "../services/academic.service.js";

// --- Utility: Token Generator ---
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

// ==========================================
// 🚀 1. REGISTER USER
// ==========================================
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, nickName, userType } = req.body;

  const existedUser = await User.findOne({
    $or: [{ email }, { nickName }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or nickname already exists");
  }

  // File handling
  let avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let avatar, coverImage;

  try {
    if (avatarLocalPath) avatar = await uploadFile(avatarLocalPath);
    if (coverImageLocalPath) coverImage = await uploadFile(coverImageLocalPath);
  } catch (error) {
    throw new ApiError(500, "Error uploading image files");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    nickName: nickName || "",
    userType,
    // ✅ Schema যদি Object হয় তাহলে এখানে { url: ..., public_id: ... } দিতে হবে
    // আপাতত তোমার বর্তমান কোড অনুযায়ী স্ট্রিং রাখলাম
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    // ক্লিনআপ (যদি ডাটাবেস ফেইল করে)
    // Cloudinary Delete Logic (ফিউচারে public_id সহ করা উচিত)
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Auto Login
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // ✅ Production Fix
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: createdUser, accessToken, refreshToken },
        "User registered Successfully"
      )
    );
});

// ==========================================
// 🚀 2. LOGIN USER
// ==========================================
const loginUser = asyncHandler(async (req, res) => {
  const { email, nickName, password } = req.body;

  if (!email && !nickName) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { nickName }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged In Successfully"
      )
    );
});

// ==========================================
// 🚀 3. LOGOUT USER
// ==========================================
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// ==========================================
// 🚀 4. REFRESH TOKEN
// ==========================================
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user || incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// ==========================================
// 🚀 5. CHANGE PASSWORD
// ==========================================
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ==========================================
// 🚀 6. GET CURRENT USER (Me)
// ==========================================
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// ==========================================
// 🚀 7. UPDATE ACADEMIC PROFILE (ONBOARDING)
// ==========================================
const updateAcademicProfile = asyncHandler(async (req, res) => {
  const { institution, department, session, section, studentId } = req.body;

  // 1. Basic Validation
  if (!institution || !department || !session) {
    throw new ApiError(400, "Institution, Department and Session are required");
  }

  // 2. ✅ Service Call: Check Domain Verification
  // লজিক এখন 'academic.service.js' ফাইলে আছে
  const verificationStatus = verifyStudentDomain(req.user.email, institution);

  // 3. Update User
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        institution,
        academicInfo: {
          department,
          session,
          section,
          studentId,
        },
        // যদি ভেরিফাইড হয়, স্ট্যাটাস আপডেট হবে। না হলে যা আছে তাই (বা UNVERIFIED)
        verificationStatus: verificationStatus,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  // ❌ Auto-Chat Group Logic Removed for Complexity Reduction
  // Future Plan: Add this back using a Background Job or separate Service call

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        `Academic profile updated. Status: ${verificationStatus}`
      )
    );
});

// ==========================================
// 🚀 8. UPDATE AVATAR
// ==========================================
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadFile(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Error uploading avatar");
  }

  // TODO: Delete old image logic using public_id (When Schema Updated)

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, avatar.url, "Avatar updated successfully"));
});

// ==========================================
// 🚀 9. UPDATE CoverImage
// ==========================================
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadFile(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Error uploading cover image");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, coverImage.url, "Cover image updated successfully")
    );
});

// ==========================================
// 🚀 10. UPDATE GENERAL ACCOUNT DETAILS
// ==========================================
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, nickName, bio, socialLinks, skills, interests } = req.body;

  if (!fullName && !nickName && !bio && !socialLinks && !skills && !interests) {
    throw new ApiError(400, "At least one field is required to update");
  }

  if (nickName) {
    const existingUser = await User.findOne({ nickName });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(409, "Nickname already taken");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        nickName,
        bio,
        socialLinks,
        skills,
        interests,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAcademicProfile,
  updateUserAvatar,
  updateUserCoverImage,
  updateAccountDetails,
};
