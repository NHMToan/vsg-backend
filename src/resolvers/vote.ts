import {
  Arg,
  Args,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Publisher,
  PubSub,
  Query,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions } from "typeorm";
import { Topic } from "../constants";
import { ClubEvent } from "../entities/ClubEvent";
import { ClubMember } from "../entities/ClubMember";
import { Vote } from "../entities/Vote";
import { checkAuth } from "../middleware/checkAuth";
import {
  CreateVoteInput,
  EventMutationResponse,
  NewVoteArgs,
  NewVotePayload,
  NewVoteSubscriptionData,
  Votes,
} from "../types/Club";
import { Context } from "../types/Context";

@Resolver(Vote)
export class VoteResolver {
  @FieldResolver((_return) => ClubMember)
  async member(@Root() root: Vote) {
    return await ClubMember.findOne(root.memberId);
  }

  @FieldResolver((_return) => ClubEvent)
  async event(@Root() root: Vote) {
    return await ClubEvent.findOne(root.eventId);
  }

  @Query((_return) => Votes, { nullable: true })
  async getVotes(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("status", (_type) => Int!, { nullable: true }) status: number,
    @Arg("eventId", (_type) => ID) eventId: string
  ): Promise<Votes | null> {
    try {
      const event = await ClubEvent.findOne(eventId);
      if (!event)
        return {
          totalCount: 0,
          hasMore: false,
          results: [],
        };

      const totalPostCount = await Vote.count({
        where: {
          event,
          status: status || 1,
        },
      });

      const realLimit = Math.min(100, limit);
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Vote> = {
        order: {
          createdAt: "DESC",
        },
        take: realLimit,
        skip: realOffset,
        where: {
          event,
          status: status || 1,
        },
      };

      const votes = await Vote.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: votes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async voteEvent(
    @Arg("createVoteInput")
    { eventId, status, value }: CreateVoteInput,
    @PubSub(Topic.EventChanged) notifyAboutNewVote: Publisher<NewVotePayload>,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);

      if (!foundEvent)
        return {
          code: 400,
          success: false,
          message: "Event not found",
        };

      const clubMem = await ClubMember.findOne({
        where: {
          profileId: user.profileId,
          clubId: foundEvent.clubId,
        },
      });
      if (!clubMem || clubMem.status !== 2)
        return {
          code: 401,
          success: false,
          message: "You have not permistion to vote!.",
        };

      const foundVote = await Vote.findOne({
        where: {
          event: foundEvent,
          member: clubMem,
        },
      });

      if (foundVote)
        return {
          code: 400,
          success: false,
          message: "You have already voted.",
        };

      if (status === 1) {
        const foundVotes = await Vote.find({
          where: {
            event: foundEvent,
            status: 1,
          },
        });
        const currentVoteCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        if (currentVoteCount + value > foundEvent.slot) {
          return {
            code: 400,
            success: false,
            message: "Slot is full",
          };
        }

        const newVote = Vote.create({
          value,
          status,
          event: foundEvent,
          member: clubMem,
        });

        await newVote.save();

        await notifyAboutNewVote({
          voteCount: currentVoteCount + value,
          status,
          eventId,
        });
        return {
          code: 200,
          success: true,
          message: "Voted",
          event: foundEvent,
        };
      } else {
        const foundVotes = await Vote.find({
          where: {
            event: foundEvent,
            status: 2,
          },
        });
        const currentWaitingCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        const newVote = Vote.create({
          value,
          status,
          event: foundEvent,
          member: clubMem,
        });

        await newVote.save();

        await notifyAboutNewVote({
          waitingCount: currentWaitingCount + value,
          status,
          eventId,
        });
        return {
          code: 200,
          success: true,
          message: "Voted",
          event: foundEvent,
        };
      }
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async unVoteEvent(
    @Arg("eventId", (_type) => ID)
    eventId: string,
    @PubSub(Topic.EventChanged) notifyAboutNewVote: Publisher<NewVotePayload>,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);

      if (!foundEvent)
        return {
          code: 400,
          success: false,
          message: "Event not found",
        };

      const clubMem = await ClubMember.findOne({
        where: {
          profileId: user.profileId,
          clubId: foundEvent.clubId,
        },
      });

      if (!clubMem || clubMem.status !== 2)
        return {
          code: 401,
          success: false,
          message: "You have not permistion to vote!.",
        };

      const foundVote = await Vote.findOne({
        where: {
          event: foundEvent,
          member: clubMem,
        },
      });

      if (!foundVote)
        return {
          code: 400,
          success: false,
          message: "You have not voted yet.",
        };

      await Vote.delete(foundVote.id);

      if (foundVote.status === 1) {
        const foundVotes = await Vote.find({
          where: {
            event: foundEvent,
            status: 1,
          },
        });
        const currentVoteCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        await notifyAboutNewVote({
          voteCount: currentVoteCount,
          eventId,
          status: foundVote.status,
        });
      } else {
        const foundVotes = await Vote.find({
          where: {
            event: foundEvent,
            status: 2,
          },
        });
        const currentVoteCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        await notifyAboutNewVote({
          waitingCount: currentVoteCount,
          eventId,
          status: foundVote.status,
        });
      }

      return {
        code: 200,
        success: true,
        message: "Voted",
        event: foundEvent,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Subscription((_returns) => NewVoteSubscriptionData, {
    topics: Topic.EventChanged,
    filter: ({
      payload,
      args,
    }: ResolverFilterData<NewVotePayload, NewVoteArgs>) => {
      return payload.eventId === args.eventId && payload.status === args.status;
    },
  })
  voteChanged(
    @Root() newVote: NewVotePayload,
    @Args() { eventId, status }: NewVoteArgs
  ): NewVoteSubscriptionData {
    return {
      voteCount: newVote.voteCount,
      waitingCount: newVote.waitingCount,
      eventId,
      status,
    };
  }
}
