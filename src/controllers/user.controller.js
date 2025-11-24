import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFile, deleteFile } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Auto-Chat Logic এর জন্য
import { Conversation } from "../models/conversation.model.js";
import { ChatMembership } from "../models/chatMembership.model.js";
import { CHAT_TYPES } from "../constants/index.js";

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

// --- Utility: Auto Group Join Logic (For Academic Update) ---
const addUserToAutoGroups = async (
  user,
  institutionId,
  deptId,
  session,
  section
) => {
  try {
    // 1. Batch Group Check
    let batchGroup = await Conversation.findOne({
      "targetCriteria.institution": institutionId,
      "targetCriteria.department": deptId,
      "targetCriteria.session": session,
      type: CHAT_TYPES.BATCH_DEPT_CHAT,
    });

    if (!batchGroup) {
      batchGroup = await Conversation.create({
        type: CHAT_TYPES.BATCH_DEPT_CHAT,
        groupName: `Official Batch ${session}`,
        targetCriteria: {
          institution: institutionId,
          department: deptId,
          session: session,
        },
      });
    }

    await ChatMembership.findOneAndUpdate(
      { conversation: batchGroup._id, user: user._id },
      { role: "MEMBER" },
      { upsert: true, new: true }
    );

    // 2. Section Group Check (If section exists)
    if (section) {
      let sectionGroup = await Conversation.findOne({
        "targetCriteria.institution": institutionId,
        "targetCriteria.department": deptId,
        "targetCriteria.session": session,
        "targetCriteria.section": section,
        type: CHAT_TYPES.SECTION_CHAT,
      });

      if (!sectionGroup) {
        sectionGroup = await Conversation.create({
          type: CHAT_TYPES.SECTION_CHAT,
          groupName: `Section ${section} (${session})`,
          targetCriteria: {
            institution: institutionId,
            department: deptId,
            session: session,
            section: section,
          },
        });
      }

      await ChatMembership.findOneAndUpdate(
        { conversation: sectionGroup._id, user: user._id },
        { role: "MEMBER" },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error("Auto-Join Failed:", error);
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
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    if (avatar?.public_id) await deleteFile(avatar.public_id);
    if (coverImage?.public_id) await deleteFile(coverImage.public_id);
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Auto Login after Register
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
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
    secure: true,
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
    secure: true,
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

    const options = { httpOnly: true, secure: true };

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
// এই ফাংশনটিই মূলত "Auto Chat Group" এর ট্রিগার পয়েন্ট
const updateAcademicProfile = asyncHandler(async (req, res) => {
  const { institution, department, session, section, studentId } = req.body;

  if (!institution || !department || !session) {
    throw new ApiError(400, "Institution, Department and Session are required");
  }

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
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  // ✅ ট্রিগার: অটো গ্রুপে অ্যাড করা
  await addUserToAutoGroups(user, institution, department, session, section);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Academic profile updated and joined groups successfully"
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

  // ✅ পুরানো ইমেজ ডিলিট করা (যদি থাকে)
  // req.user.avatar যদি ক্লাউডিনারির URL হয়, তাহলে সেখান থেকে public_id বের করার লজিক বা
  // আলাদা ফিল্ডে public_id সেভ করে রাখলে ভালো হতো। আপাতত সিম্পল রাখছি।
  // Future Optimization: User মডেলে 'avatarPublicId' ফিল্ড রাখা।

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, avatar.url, "Avatar updated successfully"));
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
};
