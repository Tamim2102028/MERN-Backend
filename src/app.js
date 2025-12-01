import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // frontend url
    credentials: true, // ✅ কুকি (Cookie) আদান-প্রদান করতে দিবে
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ সব ধরনের রিকোয়েস্ট এলাউ করা হলো
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ হেডার এলাউ করা হলো
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Import and use routes
import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";
import commentRouter from "./routes/comment.routes.js";
import friendshipRouter from "./routes/friendship.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import groupRouter from "./routes/group.routes.js";
import roomRouter from "./routes/room.routes.js";
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/friendships", friendshipRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/rooms", roomRouter);

// ⚠️ সবার শেষে এটা বসাতে হবে
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
