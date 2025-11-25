import mongoose from "mongoose";
import { DB_NAME } from "../constants/index.js";

const connectDB = async () => {
  // --- ধাপ ১: কানেকশনের পরের অবস্থা পর্যবেক্ষণের জন্য ইভেন্ট লিসেনার সেট করা ---
  // এই লিসেনারগুলো একবার সেট করা হলে কানেকশনের পুরো জীবনচক্র (lifecycle) ধরে কাজ করবে।

  mongoose.connection.on("connected", () => {
    // এই বার্তাটি প্রথমবার এবং পুনঃসংযোগ (reconnection) উভয় ক্ষেত্রেই দেখাবে।
    console.log(
      `\n✅ MongoDB connected !! DB Host: ${mongoose.connection.host}`
    );
  });

  mongoose.connection.on("error", (err) => {
    // সফল কানেকশনের *পরে* কোনো সমস্যা হলে এই ইভেন্টটি কাজ করবে।
    // এখানে অ্যাপ্লিকেশন বন্ধ করা উচিত নয়।
    console.error(`❌ MongoDB runtime connection error: ${err}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("❕ MongoDB connection lost. Attempting to reconnect...");
  });

  // --- ধাপ ২: ডেটাবেসের সাথে প্রাথমিক সংযোগ স্থাপনের চেষ্টা ---
  try {
    // এখানে connect() ফাংশনকে await করা হচ্ছে।
    // সফল হলে, উপরের 'connected' ইভেন্টটি স্বয়ংক্রিয়ভাবে কাজ করবে।
    // আপনাকে এখানে আলাদা করে console.log করতে হবে না।
    await mongoose.connect(`${process.env.DB_URL}/${DB_NAME}`); // সাধারণত URL এবং DB নামের মাঝে একটি '/' থাকে।
  } catch (error) {
    // এই catch ব্লকটি শুধুমাত্র *প্রথম* কানেকশন ব্যর্থ হলে কাজ করবে।
    console.error(`\n❌ Initial MongoDB connection FAILED: ${error.message}`);

    // যেহেতু প্রাথমিক কানেকশনই ব্যর্থ, তাই অ্যাপ্লিকেশনটি বন্ধ করে দেওয়াই শ্রেয়।
    process.exit(1);
  }
};

export default connectDB;
