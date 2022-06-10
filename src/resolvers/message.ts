import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  Root,
  Subscription,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions } from "typeorm";
import { Topic } from "../constants";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { Profile } from "../entities/Profile";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import { MessageInput, Messages } from "../types/Chat";
import { Context } from "../types/Context";
import { conversationPubsub } from "../utils/pubsub";

@Resolver(Message)
export class MessageResolver {
  @FieldResolver((_return) => Profile)
  async sender(@Root() root: Message) {
    return await Profile.findOne(root.senderId);
  }

  @Query((_return) => Messages, { nullable: true })
  async getMessages(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("conversationId", (_type) => ID) conversationId: string
  ): Promise<Messages | null> {
    try {
      const conversation = await Conversation.findOne(conversationId);
      if (!conversation)
        return {
          totalCount: 0,
          hasMore: false,
          results: [],
          error: true,
        };

      const totalPostCount = await Message.count({
        where: {
          conversation: conversation,
        },
      });

      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Message> = {
        order: {
          createdAt: "DESC",
        },
        take: realLimit,
        skip: realOffset,
        where: {
          conversation,
        },
      };

      const messages = await Message.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: messages.reverse(),
        error: false,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  @Mutation((_returns) => Boolean)
  @UseMiddleware(checkAuth)
  async addNewMessage(
    @Arg("messageInput") input: MessageInput,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() { user }: Context
  ): Promise<boolean> {
    const { conversationId, image, content } = input;
    const conversation = await Conversation.findOne(conversationId, {
      relations: ["members"],
    });
    const sender = await Profile.findOne(user.profileId);
    if (!sender) {
      return false;
    }
    if (!conversation) {
      return false;
    }

    let body;
    let contentType;
    if (image) {
      const uploader = new S3Service();
      try {
        const avatarRes: any = await uploader.uploadFile(image);
        body = avatarRes.Location;
        contentType = "image";
      } catch (error) {
        return false;
      }
    } else {
      body = content;
      contentType = "text";
    }

    const newMessage = Message.create({
      content: body,
      contentType,
      conversation,
      sender,
    });

    await newMessage.save();

    conversation.updatedAt = new Date();
    await conversation.save();

    await conversationPubsub(
      pubSub,
      conversation.members.map((item) => item.id),
      conversation
    );

    await pubSub.publish(`${Topic.NewMessage}:${conversationId}`, newMessage);

    return true;
  }

  @Subscription((_returns) => Message, {
    topics: ({ args }) => `${Topic.NewMessage}:${args.conversationId}`,
  })
  newMessageSent(
    @Root() newMessage: Message,
    @Arg("conversationId", (_type) => ID) _conversationId: string
  ): Message {
    return newMessage;
  }
}
