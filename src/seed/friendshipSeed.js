import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../db/index.js";
import { User } from "../models/user.model.js";
import { Friendship } from "../models/friendship.model.js";
import { FRIENDSHIP_STATUS, USER_TYPES } from "../constants/index.js";

dotenv.config({ path: "./.env" });

const seedFriendships = async () => {
  try {
    console.log("🌱 Seeding Friendship Data...");
    await connectDB();

    // ১. আগের সব টেস্ট ডাটা ক্লিয়ার করি (অপশনাল, চাইলে কমেন্ট করতে পারেন)
    // সাবধান: এতে সব ইউজার ডিলিট হয়ে যাবে!
    console.log("🧹 Clearing old Users & Friendships...");
    await User.deleteMany({ email: { $regex: "@test.com" } });
    await Friendship.deleteMany({});

    // ২. মেইন ইউজার তৈরি (যাকে দিয়ে আপনি লগইন করবেন)
    const mainUser = await User.create({
      fullName: "Frontend Tester",
      email: "hero@test.com",
      userName: "hero_user",
      password: "pass123", // পাসওয়ার্ড মনে রাখুন
      userType: USER_TYPES.STUDENT,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      bio: "I am the main user for testing friendship features.",
    });

    console.log(`✅ Main User Created: ${mainUser.email} (pass123)`);

    // ৩. অন্যান্য ইউজার তৈরি
    const usersData = [
      { name: "Best Friend", user: "friend1", avatar: "Jack" },
      { name: "Incoming Request", user: "requester1", avatar: "Jane" },
      { name: "Outgoing Request", user: "recipient1", avatar: "Mike" },
      { name: "Blocked Guy", user: "blocked1", avatar: "Rocky" },
      { name: "Stranger User", user: "stranger1", avatar: "Luna" },
    ];

    const createdUsers = [];

    for (const u of usersData) {
      const user = await User.create({
        fullName: u.name,
        email: `${u.user}@test.com`,
        userName: u.user,
        password: "pass123",
        userType: USER_TYPES.STUDENT,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`,
      });
      createdUsers.push(user);
    }

    console.log(`✅ ${createdUsers.length} Dummy Users Created.`);

    // ৪. রিলেশন তৈরি করা (Scenarios)

    // A. Friend (উভয় পক্ষের connectionsCount বাড়বে কারণ হুক ট্রিগার হবে)
    // Main User <-> Best Friend
    await Friendship.create({
      requester: mainUser._id,
      recipient: createdUsers[0]._id, // Best Friend
      status: FRIENDSHIP_STATUS.ACCEPTED,
    });
    console.log(`🔹 Relation: Friend (hero <-> ${createdUsers[0].userName})`);

    // B. Incoming Request (কেউ আমাকে পাঠিয়েছে)
    // Incoming Request User -> Main User
    await Friendship.create({
      requester: createdUsers[1]._id, // Incoming User
      recipient: mainUser._id, // ME
      status: FRIENDSHIP_STATUS.PENDING,
    });
    console.log(
      `🔹 Relation: Incoming Request (${createdUsers[1].userName} -> hero)`
    );

    // C. Outgoing Request (আমি কাউকে পাঠিয়েছি)
    // Main User -> Outgoing Request User
    await Friendship.create({
      requester: mainUser._id, // ME
      recipient: createdUsers[2]._id, // Recipient User
      status: FRIENDSHIP_STATUS.PENDING,
    });
    console.log(
      `🔹 Relation: Sent Request (hero -> ${createdUsers[2].userName})`
    );

    // D. Blocked (আমি কাউকে ব্লক করেছি)
    // Main User -[BLOCKED]-> Blocked Guy
    await Friendship.create({
      requester: mainUser._id,
      recipient: createdUsers[3]._id,
      status: FRIENDSHIP_STATUS.BLOCKED,
      blockedBy: mainUser._id, // আমি ব্লক দিয়েছি
    });
    console.log(`🔹 Relation: Blocked (hero -x- ${createdUsers[3].userName})`);

    // E. Stranger (কোনো এন্ট্রি নেই)
    // stranger1 এর সাথে কোনো ডাটাবেস এন্ট্রি থাকবে না।
    console.log(`🔹 Relation: None (hero ... ${createdUsers[4].userName})`);

    console.log("\n🎉 Friendship Seeding Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedFriendships();
