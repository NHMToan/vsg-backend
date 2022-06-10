export const __prod__ = process.env.NODE_ENV === "production";
export const CLUB_CREATE_KEY = process.env.CLUB_CREATE_KEY;
export const FORGET_PASSWORD_PREFIX = "forget-password:";
export enum Topic {
  NewMessage = "NEW_MESSAGE",
  NewConversation = "NEW_CONVERSATION",
  ConversationChanged = "CONVERSATION_CHANGED",
}
