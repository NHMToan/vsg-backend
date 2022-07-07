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
  ResolverFilterData,
  Root,
  Subscription,
  UseMiddleware,
} from "type-graphql";
import { getRepository } from "typeorm";
import { Topic } from "../constants";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { Profile } from "../entities/Profile";
import { checkAuth } from "../middleware/checkAuth";
import {
  ConversationInput,
  ConversationMutationResponse,
  Conversations,
  NewConversationArgs,
  NewConversationPayload,
} from "../types/Chat";
import { Context } from "../types/Context";
import { conversationPubsub } from "../utils/pubsub";

@Resolver(Conversation)
export class ConversationResolver {
  @FieldResolver((_) => [Message])
  async messages(@Root() con: Conversation) {
    const res = await Message.find({
      where: { conversation: con },
      order: {
        createdAt: -1,
      },
      take: 5,
      transaction: true,
    });
    return res.reverse();
  }

  @Query((_return) => Conversation, { nullable: true })
  @UseMiddleware(checkAuth)
  async getConversation(
    @Arg("id", (_type) => ID) id: number
  ): Promise<Conversation | undefined> {
    try {
      const con = await Conversation.findOne(id, {
        relations: ["members", "messages"],
      });
      return con;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Mutation((_returns) => ConversationMutationResponse)
  @UseMiddleware(checkAuth)
  async addNewConversation(
    @Arg("converInput") input: ConversationInput,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() { user }: Context
  ): Promise<ConversationMutationResponse> {
    const myProfile = await Profile.findOne(user.profileId);

    const { members, content } = input;

    const newMessage = Message.create({
      content: content,
      contentType: "text",
      sender: myProfile,
    });
    if (!members || members.length === 0) {
      return {
        code: 400,
        success: false,
        message: "User empty",
      };
    }
    if (members.length === 1) {
      if (members[0] === user.profileId) {
        return {
          code: 400,
          success: false,
          message: "Wrong user",
        };
      }
      const memProfile = await Profile.findOne(members[0]);
      const conversations = await getRepository(Conversation)
        .createQueryBuilder("conversation")
        .leftJoin("conversation.members", "mem")
        .leftJoinAndSelect("conversation.members", "member")
        .where("conversation.type = :type", { type: "one" })
        .andWhere("mem.id = :id", {
          id: user.profileId,
        })
        .getMany();

      const conversation = conversations.find((con) =>
        con.members.map((mem) => mem.id).includes(members[0])
      );

      if (conversation) {
        const newMessage = Message.create({
          content: content,
          contentType: "text",
          sender: myProfile,
        });
        newMessage.conversation = conversation;
        await newMessage.save();

        conversation.updatedAt = new Date();
        await conversation.save();

        await conversationPubsub(
          pubSub,
          [user.profileId, members[0]],
          conversation
        );

        return {
          code: 200,
          success: true,
          message: "Conversation found",
          conversation,
        };
      } else {
        const newConver = Conversation.create({
          members: [myProfile, memProfile],
          type: "one",
        });
        await newConver.save();
        newMessage.conversation = newConver;

        await newMessage.save();

        await conversationPubsub(
          pubSub,
          [user.profileId, ...members],
          newConver
        );
        return {
          code: 200,
          success: true,
          message: "Conversation created successfully",
          conversation: newConver,
        };
      }
    } else {
      const profiles = await Profile.findByIds(members);

      const newConver = Conversation.create({
        members: [myProfile, ...profiles],
        type: "group",
      });
      await newConver.save();

      newMessage.conversation = newConver;
      await newMessage.save();

      await conversationPubsub(pubSub, [user.profileId, ...members], newConver);
      return {
        code: 200,
        success: true,
        message: "Conversation created successfully",
        conversation: newConver,
      };
    }
  }

  @Query((_return) => Conversations, { nullable: true })
  @UseMiddleware(checkAuth)
  async getConversations(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Ctx() { user }: Context
  ): Promise<Conversations | null> {
    try {
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const conversations = await getRepository(Conversation)
        .createQueryBuilder("conversation")
        .leftJoin("conversation.members", "mem")
        .leftJoinAndSelect("conversation.members", "member")
        .where("mem.id = :id", { id: user.profileId })
        .orderBy("conversation.updatedAt", "DESC")
        .getMany();

      const totalCount = await getRepository(Conversation)
        .createQueryBuilder("conversation")
        .leftJoinAndSelect("conversation.members", "member")
        .where("member.id = :id", { id: user.profileId })
        .getCount();

      let hasMore = realLimit + realOffset < totalCount;
      return {
        totalCount: totalCount,
        hasMore,
        results: conversations,
        error: false,
      };
    } catch (error) {
      console.log("ERROR:", error);
      return {
        totalCount: 0,
        hasMore: false,
        results: [],
        error: true,
      };
    }
  }

  @Subscription((_returns) => Conversation, {
    topics: Topic.NewConversation,
    filter: ({
      payload,
      args,
    }: ResolverFilterData<NewConversationPayload, NewConversationArgs>) => {
      return payload.id === args.id;
    },
  })
  newConversation(@Root() newConver: Conversation): Conversation {
    return newConver;
  }

  @Subscription((_returns) => Conversation, {
    topics: ({ args }) => `${Topic.ConversationChanged}:${args.profileId}`,
  })
  conversationChanged(
    @Root() conversation: Conversation,
    @Arg("profileId", (_type) => ID) _profileId: string
  ): Conversation {
    return conversation;
  }
}
