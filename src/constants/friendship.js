export const FRIENDSHIP_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  BLOCKED: "BLOCKED",
};

export const PROFILE_RELATION_STATUS = {
  SELF: "SELF", // নিজের প্রোফাইল (Edit Profile)
  FRIENDS: "FRIENDS", // বন্ধু (Message / Unfriend)
  REQUEST_SENT: "REQUEST_SENT", // আমি পাঠিয়েছি (Cancel Request)
  REQUEST_RECEIVED: "REQUEST_RECEIVED", // সে পাঠিয়েছে (Accept/Reject)
  BLOCKED: "BLOCKED", // আমি ব্লক করেছি (Unblock)
  NONE: "NONE", // কোনো সম্পর্ক নেই (Add Friend)
};

export const CONNECTION_VISIBILITY = {
  PUBLIC: "PUBLIC",
  CONNECTIONS: "CONNECTIONS",
  ONLY_ME: "ONLY_ME",
};

export const FRIEND_REQUEST_POLICY = {
  EVERYONE: "EVERYONE",
  NOBODY: "NOBODY",
};
