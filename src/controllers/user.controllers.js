import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFile } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// ✅ Imports for Logic
import { USER_TYPES } from "../constants/index.js";
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

  // 🔥 MANUAL CHECK (Double Security)
  if ([USER_TYPES.ADMIN, USER_TYPES.OWNER].includes(userType)) {
    throw new ApiError(403, "Nice try! Owner/Admin creation is restricted.");
  }

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
    avatar: avatar?.url || "", // Future TODO: Save as Object {url, public_id}
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
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
  const {
    institution,
    department,
    // Student specific
    session,
    section,
    studentId,
    // Teacher specific
    teacherId,
    rank,
    officeHours,
  } = req.body;

  // 1. Basic Validation
  if (!institution || !department) {
    throw new ApiError(400, "Institution and Department are required");
  }

  // 2. Service Call: Check Domain Verification
  const verificationStatus = await verifyStudentDomain(
    req.user.email,
    institution
  );

  // 3. Logic Split based on User Type (To prevent Data Pollution)
  let academicInfoPayload = {
    department, // Common for both
  };

  const currentUserType = req.user.userType;

  if (currentUserType === USER_TYPES.STUDENT) {
    // 🎓 STUDENT LOGIC
    if (!session) {
      throw new ApiError(400, "Session is required for Students");
    }
    academicInfoPayload.session = session;
    academicInfoPayload.section = section;
    academicInfoPayload.studentId = studentId;
  } else if (currentUserType === USER_TYPES.TEACHER) {
    // 👨‍🏫 TEACHER LOGIC (No Session)
    academicInfoPayload.teacherId = teacherId;
    academicInfoPayload.rank = rank;
    academicInfoPayload.officeHours = officeHours;
  }

  // 4. Update User
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        institution,
        academicInfo: academicInfoPayload,
        // Status update logic
        ...(verificationStatus === "VERIFIED" && {
          verificationStatus: "VERIFIED",
        }),
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        `Academic profile updated as ${currentUserType}. Status: ${verificationStatus}`
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
  const {
    fullName,
    nickName,
    bio,
    socialLinks,
    skills,
    interests,
    // New Fields
    phoneNumber,
    gender,
    religion,
  } = req.body;

  // 1. Check if at least one field is present
  if (
    !fullName &&
    !nickName &&
    !bio &&
    !socialLinks &&
    !skills &&
    !interests &&
    !phoneNumber &&
    !gender &&
    !religion
  ) {
    throw new ApiError(400, "At least one field is required to update");
  }

  // 2. Nickname Check
  if (nickName) {
    const existingUser = await User.findOne({ nickName });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(409, "Nickname already taken");
    }
  }

  // 3. Update User
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
        phoneNumber,
        gender,
        religion,
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
