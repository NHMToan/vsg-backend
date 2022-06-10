import { PubSubEngine } from "type-graphql";
import { Topic } from "../constants";
import { Conversation } from "../entities/Conversation";

export const conversationPubsub = async (
  pubSub: PubSubEngine,
  members: string[],
  conversation: Conversation
) => {
  for (let uid of members) {
    await pubSub.publish(`${Topic.ConversationChanged}:${uid}`, conversation);
  }
};
