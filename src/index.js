import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    // সার্ভার চালু হওয়ার আগে কোনো এরর হলে ধরার জন্য
    app.on("error", (error) => {
      console.log(`❌ Server Error: ${error}`);
      throw error;
    });

    app.listen(PORT, () => {
      console.log(`⚙️ Server is running at: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`❌ MongoDB Connection Failed! ${err}`);
  });
