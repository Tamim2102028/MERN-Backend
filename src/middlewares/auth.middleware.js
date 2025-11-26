import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request. Token not found.");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // ✅ সঠিক এবং নিরাপদ কুয়েরি
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token. User does not exist.");
    }

    // পাসওয়ার্ড পরিবর্তনের নিরাপত্তা চেক
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );
      if (changedTimestamp > decodedToken.iat) {
        throw new ApiError(
          401,
          "User recently changed password. Please log in again."
        );
      }
    }

    // এখন req.user এ পাসওয়ার্ড বা রিফ্রেশ টোকেন থাকবে না
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Invalid or expired access token.");
  }
});

export { verifyJWT };
