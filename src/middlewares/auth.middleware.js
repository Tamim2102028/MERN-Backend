import { User } from "../models/user.model.js"; // ✅ Named Import
import { ApiError } from "../utils/ApiError.js"; // ✅ Named Import
import { asyncHandler } from "../utils/asyncHandler.js"; // ✅ Named Import
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // 1. Token খুঁজে বের করা (Cookie অথবা Header থেকে)
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // 2. Token Verify করা
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. User খুঁজে বের করা
    // ⚠️ ফিক্স: আমাদের মডেলে payload হিসেবে '_id' দেওয়া আছে, 'userId' নয়।
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // 4. req.user সেট করা
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export { verifyJWT };
