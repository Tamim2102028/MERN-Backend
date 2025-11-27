import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
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
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/friendships", friendshipRouter);
app.use("/api/v1/notifications", notificationRouter);

// ⚠️ সবার শেষে এটা বসাতে হবে
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
