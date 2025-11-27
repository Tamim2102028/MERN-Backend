export const POST_TYPES = {
  GENERAL: "GENERAL",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  POLL: "POLL",
  QUESTION: "QUESTION",
  // RESOURCE: "RESOURCE", // 🔒 Future
};

export const ATTACHMENT_TYPES = {
  IMAGE: "IMAGE",
  // VIDEO: "VIDEO", // 🔒 Future
  // PDF: "PDF",     // 🔒 Future
  // DOC: "DOC",     // 🔒 Future
  // LINK: "LINK",   // 🔒 Future
};

export const POST_TARGET_MODELS = {
  GROUP: "Group",
  ROOM: "Room",
  PAGE: "Page", // Future
  USER: "User",
  INSTITUTION: "Institution",
  DEPARTMENT: "Department",
};

export const POST_VISIBILITY = {
  PUBLIC: "PUBLIC",
  CONNECTIONS: "CONNECTIONS", // Friends / Followers / Members
  ONLY_ME: "ONLY_ME",
};
