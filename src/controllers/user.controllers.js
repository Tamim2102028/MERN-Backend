import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFile } from "../utils/fileUpload.js";

// Models
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js"; // ✅ Auto-follow এর জন্য
import { Friendship } from "../models/friendship.model.js"; // ✅ Profile Relation চেক করার জন্য

// Services
import { findAcademicInfoByEmail } from "../services/academic.service.js"; // ✅ Domain Matching এর জন্য

// Constants
import {
  USER_TYPES,
  FOLLOW_TARGET_MODELS,
  FRIENDSHIP_STATUS,
  PROFILE_RELATION_STATUS,
} from "../constants/index.js";

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
    console.error("JWT Generation Error:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

// ==========================================
// 🚀 1. REGISTER USER (AUTO-INSTITUTION LINKING LOGIC ADDED)
// ==========================================
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, userName, userType } = req.body;

  const existedUser = await User.findOne({ $or: [{ email }, { userName }] });
  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  if ([USER_TYPES.ADMIN, USER_TYPES.OWNER].includes(userType)) {
    throw new ApiError(403, "Restricted user type.");
  }

  // ✅ ১. ডোমেইন থেকে ভার্সিটি ও ডিপার্টমেন্ট বের করা
  const { institution, department } = await findAcademicInfoByEmail(email);

  // ফাইল আপলোড হ্যান্ডলিং
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let avatarUrl = "";
  let coverImageUrl = "";

  if (avatarLocalPath) {
    const avatar = await uploadFile(avatarLocalPath);
    if (avatar) avatarUrl = avatar.url;
  }
  if (coverImageLocalPath) {
    const cover = await uploadFile(coverImageLocalPath);
    if (cover) coverImageUrl = cover.url;
  }

  // ইউজার অবজেক্ট তৈরি
  const userPayload = {
    fullName,
    email,
    password,
    userName,
    userType,
    isStudentEmail: false,
    academicInfo: {},
  };

  if (avatarUrl) userPayload.avatar = avatarUrl;
  if (coverImageUrl) userPayload.coverImage = coverImageUrl;

  // ✅ ২. অটো-লিংকিং লজিক
  if (institution) {
    userPayload.isStudentEmail = true;
    userPayload.institution = institution._id;
    userPayload.institutionType = institution.type;
  }

  if (department) {
    userPayload.academicInfo.department = department._id;
  }

  const user = await User.create(userPayload);

  // ✅ Populated user data (institution ও department এর নাম সহ)
  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("institution", "name logo type")
    .populate("academicInfo.department", "name code");

  // ✅ ৩. অটো-ফলো লজিক (রেজিস্ট্রেশনের সময়)
  const followPromises = [];

  if (institution) {
    followPromises.push(
      Follow.create({
        follower: user._id,
        followingId: institution._id,
        followingModel: FOLLOW_TARGET_MODELS.INSTITUTION,
      })
    );
  }

  if (department) {
    followPromises.push(
      Follow.create({
        follower: user._id,
        followingId: department._id,
        followingModel: FOLLOW_TARGET_MODELS.DEPARTMENT,
      })
    );
  }

  if (followPromises.length > 0) {
    try {
      await Promise.all(followPromises);
    } catch (err) {
      console.error("Auto-follow error:", err.message);
    }
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: createdUser, accessToken, refreshToken },
        "User registered successfully"
      )
    );
});

// ==========================================
// 🚀 2. LOGIN USER
// ==========================================
const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body; // ⚠️ UPDATED from nickName

  if (!email && !userName) {
    // ⚠️ UPDATED
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { userName }], // ⚠️ UPDATED
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

  // ✅ Populated user data (institution ও department এর নাম সহ)
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("institution", "name logo type")
    .populate("academicInfo.department", "name code");

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

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } = // Renamed to avoid confusion
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
// 🚀 5. CHANGE PASSWORD (পূর্বের সরল লজিকে ফিরিয়ে আনা হলো)
// ==========================================
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // ১. ডাটাবেস থেকে ইউজারকে খুঁজে বের করা
  const user = await User.findById(req.user._id);

  // ২. পুরনো পাসওয়ার্ড সঠিক কিনা তা যাচাই করা
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // ৩. নতুন পাসওয়ার্ড সেট করা
  user.password = newPassword;

  // ৪. পুরনো টোকেন বাতিল করার জন্য passwordChangedAt সময় সেট করা (নিরাপত্তার জন্য এটি থাকবে)
  user.passwordChangedAt = Date.now();

  // ৫. ইউজারের ডকুমেন্ট সেভ করা
  await user.save({ validateBeforeSave: false });

  // ৬. একটি সাধারণ সফল বার্তা পাঠানো। কোনো নতুন টোকেন ইস্যু করা হবে না।
  // ইউজারকে নতুন পাসওয়ার্ড দিয়ে আবার লগইন করতে হবে।
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});

// ==========================================
// 🚀 6. GET CURRENT USER (Me)
// ==========================================
const getCurrentUser = asyncHandler(async (req, res) => {
  // ✅ Populated user data (institution ও department এর নাম সহ)
  // req.user এ populate নেই, তাই fresh query করতে হচ্ছে
  const user = await User.findById(req.user._id)
    .select("-password -refreshToken")
    .populate("institution", "name logo type")
    .populate("academicInfo.department", "name code");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

// ==========================================
// 🚀 7. UPDATE ACADEMIC PROFILE (ONBOARDING)
// ==========================================
const updateAcademicProfile = asyncHandler(async (req, res) => {
  const {
    institution,
    department,
    session,
    section,
    studentId,
    teacherId,
    rank,
    officeHours,
  } = req.body;

  // ✅ ১. ইমিউটেবিলিটি চেক (ভেরিফাইড হলে চেঞ্জ করা যাবে না)
  if (req.user.isStudentEmail) {
    if (institution || department) {
      throw new ApiError(
        403,
        "Verified accounts cannot change Institution or Department."
      );
    }
  }

  let updateData = {};

  // অন্যান্য একাডেমিক তথ্য আপডেট
  if (session) updateData["academicInfo.session"] = session;
  if (section) updateData["academicInfo.section"] = section;
  if (studentId) updateData["academicInfo.studentId"] = studentId;

  if (teacherId) updateData["academicInfo.teacherId"] = teacherId;
  if (rank) updateData["academicInfo.rank"] = rank;
  if (officeHours) updateData["academicInfo.officeHours"] = officeHours;

  // ✅ ২. যদি ভেরিফাইড না হয়, তবেই ভার্সিটি আপডেট হবে
  if (!req.user.isStudentEmail) {
    if (institution) updateData.institution = institution;
    if (department) updateData["academicInfo.department"] = department;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true }
  ).select("-password -refreshToken");

  // ✅ ৩. অটো-ফলো লজিক (ম্যানুয়াল আপডেটের ক্ষেত্রে)
  if (!req.user.isStudentEmail && (institution || department)) {
    const followUpdates = [];

    if (institution) {
      followUpdates.push(
        Follow.findOneAndUpdate(
          {
            follower: req.user._id,
            followingId: institution,
            followingModel: FOLLOW_TARGET_MODELS.INSTITUTION,
          },
          { $setOnInsert: { createdAt: new Date() } },
          { upsert: true, new: true }
        )
      );
    }

    if (department) {
      followUpdates.push(
        Follow.findOneAndUpdate(
          {
            follower: req.user._id,
            followingId: department,
            followingModel: FOLLOW_TARGET_MODELS.DEPARTMENT,
          },
          { $setOnInsert: { createdAt: new Date() } },
          { upsert: true, new: true }
        )
      );
    }

    if (followUpdates.length > 0) {
      try {
        await Promise.all(followUpdates);
      } catch (err) {
        console.error("Auto-follow update error:", err.message);
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Academic profile updated"));
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

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, { url: avatar.url }, "Avatar updated successfully")
    );
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
      new ApiResponse(
        200,
        { url: coverImage.url },
        "Cover image updated successfully"
      )
    );
});

// ==========================================
// 🚀 10. UPDATE GENERAL ACCOUNT DETAILS
// ==========================================
const updateAccountDetails = asyncHandler(async (req, res) => {
  // ✅ NEW: Prevent username change
  // ফাংশনের শুরুতেই আমরা চেক করছি ইউজার `userName` পাঠিয়েছে কিনা।
  // যদি পাঠিয়ে থাকে, তাহলে আমরা একটি এরর দিয়ে দেব।
  if (req.body.userName) {
    throw new ApiError(400, "Username cannot be changed.");
  }

  const { phoneNumber } = req.body;

  // 1. Check if at least one field is present
  if (Object.keys(req.body).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  // 2. Uniqueness Check for other fields (like phone number)
  if (phoneNumber) {
    const existingPhoneUser = await User.findOne({ phoneNumber });
    if (
      existingPhoneUser &&
      existingPhoneUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(409, "Phone number already used by another account");
    }
  }

  // 3. Update User
  // যেহেতু আমরা আগেই userName চেক করে নিয়েছি, তাই এখন req.body ব্যবহার করা নিরাপদ।
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: req.body },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// ==========================================
// 🚀 11. GET USER PROFILE (With Friendship Status)
// ==========================================
/**
 * এই API দিয়ে নিজের এবং অন্যের প্রোফাইল দেখা যায়।
 * - নিজের প্রোফাইল হলে: friendshipStatus = "SELF"
 * - অন্যের প্রোফাইল হলে: friendshipStatus = "FRIENDS" | "NONE" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "BLOCKED"
 *
 * Institution ও Department populate করা হয়েছে কারণ:
 * - Profile page এ institution ও department এর নাম দেখাতে হয়
 * - Registration/Login response এ শুধু ID থাকে, নাম লাগে না
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user._id;

  // ১. ইউজার খোঁজা (Institution ও Department এর নাম সহ)
  const user = await User.findOne({ userName: username })
    .select("-password -refreshToken")
    .populate("institution", "name logo type") // Institution এর নাম, লোগো, টাইপ
    .populate("academicInfo.department", "name code"); // Department এর নাম ও কোড

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ২. নিজের প্রোফাইল হলে
  if (user._id.toString() === viewerId.toString()) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...user.toObject(),
          friendshipStatus: PROFILE_RELATION_STATUS.SELF,
        },
        "My profile fetched"
      )
    );
  }

  // ৩. ফ্রেন্ডশিপ স্ট্যাটাস চেক
  const relationship = await Friendship.findOne({
    $or: [
      { requester: viewerId, recipient: user._id },
      { requester: user._id, recipient: viewerId },
    ],
  });

  let friendshipStatus = PROFILE_RELATION_STATUS.NONE; // ডিফল্ট
  let friendshipId = null; // Accept/Reject/Cancel এর জন্য দরকার

  if (relationship) {
    friendshipId = relationship._id; // Friendship document ID
    // A. ব্লকিং চেক
    if (relationship.status === FRIENDSHIP_STATUS.BLOCKED) {
      // সে আমাকে ব্লক করলে -> User Not Found
      if (relationship.blockedBy.toString() === user._id.toString()) {
        throw new ApiError(404, "User not found");
      }
      // আমি ব্লক করলে -> BLOCKED স্ট্যাটাস
      if (relationship.blockedBy.toString() === viewerId.toString()) {
        friendshipStatus = PROFILE_RELATION_STATUS.BLOCKED;
      }
    }
    // B. ফ্রেন্ড হলে
    else if (relationship.status === FRIENDSHIP_STATUS.ACCEPTED) {
      friendshipStatus = PROFILE_RELATION_STATUS.FRIENDS;
    }
    // C. পেন্ডিং থাকলে
    else if (relationship.status === FRIENDSHIP_STATUS.PENDING) {
      if (relationship.requester.toString() === viewerId.toString()) {
        friendshipStatus = PROFILE_RELATION_STATUS.REQUEST_SENT; // আমি পাঠিয়েছি
      } else {
        friendshipStatus = PROFILE_RELATION_STATUS.REQUEST_RECEIVED; // সে পাঠিয়েছে
      }
    }
  }

  // ৪. রেসপন্স (friendshipId সহ - Accept/Reject/Cancel এ লাগবে)
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...user.toObject(), friendshipStatus, friendshipId },
        "User profile fetched successfully"
      )
    );
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
  getUserProfile,
};
