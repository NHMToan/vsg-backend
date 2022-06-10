import { FileUpload, GraphQLUpload } from "graphql-upload";
import { ArgsType, Field, ID, InputType, ObjectType } from "type-graphql";
import { Conversation } from "../../entities/Conversation";
import { Message } from "../../entities/Message";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

export interface NewMessagePayload {
  conversationId: string;
  createdAt: string;
  content: string;
  senderId: string;
  contentType: string;
  id: string;
}
export interface NewConversationPayload {
  members: any;
  type: string;
  id: string;
}
@ArgsType()
export class NewConversationArgs {
  @Field((_type) => ID)
  id: string;
}

@ArgsType()
export class NewMessagesArgs {
  @Field((_type) => ID)
  conversationId: string;
}

@InputType()
export class MessageInput implements Partial<Message> {
  @Field((_type) => ID)
  conversationId: string;

  @Field({ nullable: true })
  content?: string;

  @Field((_) => GraphQLUpload, { nullable: true })
  image?: FileUpload;
}

@InputType()
export class ConversationInput {
  @Field((_) => [String])
  members: string[];

  @Field()
  content?: string;
}

@ObjectType()
export class Conversations {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field()
  error?: boolean;

  @Field((_type) => [Conversation])
  results!: Conversation[];
}

@ObjectType()
export class Messages {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field({ nullable: true })
  error?: boolean;

  @Field((_type) => [Message])
  results!: Message[];
}

@ObjectType({ implements: IMutationResponse })
export class ConversationMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  conversation?: Conversation;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
