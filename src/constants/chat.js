export const CHAT_TYPES = {
  DUAL: "DUAL", // 1 on 1 Chat (Personal)
  GROUP: "GROUP", // Friends/Custom Group (Manual)

  // ✅ Specific Auto-Groups (Hierarchy Based)
  BATCH_DEPT_CHAT: "BATCH_DEPT_CHAT", // Level 1: Dept + Session (e.g. CSE 24)
  SECTION_CHAT: "SECTION_CHAT", // Level 2: + Section (e.g. CSE 24-A)
  SUB_SECTION_CHAT: "SUB_SECTION_CHAT", // Level 3: + SubSection (e.g. CSE 24-A1)

  PAGE_SUPPORT: "PAGE_SUPPORT",
};

export const MESSAGE_SENDER_TYPE = {
  USER: "USER",
  PAGE: "PAGE",
};
