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
import { Between, LessThan, MoreThan } from "typeorm";
import { Topic } from "../constants";
import { Club } from "../entities/Club";
import { ClubEvent } from "../entities/ClubEvent";
import { ClubMember } from "../entities/ClubMember";
import { Vote } from "../entities/Vote";
import { checkAuth } from "../middleware/checkAuth";
import {
  CreateEventInput,
  CreateVoteInput,
  EventMutationResponse,
  Events,
  NewVoteArgs,
  NewVotePayload,
  NewVoteSubscriptionData,
} from "../types/Club";
import { Context } from "../types/Context";
function addMinutes(numOfMinutes: number, date = new Date()) {
  const dateCopy = new Date(date.getTime());

  dateCopy.setMinutes(dateCopy.getMinutes() + numOfMinutes);

  return dateCopy;
}
@Resolver(ClubEvent)
export class ClubEventResolver {
  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isAdmin(@Root() root: ClubEvent, @Ctx() { user }: Context) {
    const clubMember = await ClubMember.findOne({
      profileId: user.profileId,
      clubId: root.clubId,
    });
    if (clubMember?.role === 2) return true;

    return false;
  }
  @FieldResolver((_return) => ClubMember)
  async createdBy(@Root() root: ClubEvent) {
    return await ClubMember.findOne(root.createdById);
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isVoted(@Root() root: ClubEvent, @Ctx() { user }: Context) {
    const foundClubMember = await ClubMember.findOne({
      profileId: user.profileId,
    });
    const foundVote = await Vote.findOne({
      where: {
        event: root,
        member: foundClubMember,
      },
    });
    if (foundVote) return true;
    return false;
  }

  @FieldResolver((_return) => Vote, { nullable: true })
  @UseMiddleware(checkAuth)
  async vote(@Root() root: ClubEvent, @Ctx() { user }: Context) {
    const foundClubMember = await ClubMember.findOne({
      profileId: user.profileId,
    });
    const foundVote = await Vote.findOne({
      where: {
        event: root,
        member: foundClubMember,
      },
    });
    if (foundVote) return foundVote;
    return null;
  }

  @FieldResolver((_return) => Number)
  async voteCount(@Root() root: ClubEvent) {
    const foundVotes = await Vote.find({
      where: {
        event: root,
        status: 1,
      },
    });

    return foundVotes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
  }

  @FieldResolver((_return) => Number)
  async waitingCount(@Root() root: ClubEvent) {
    const foundVotes = await Vote.find({
      where: {
        event: root,
        status: 2,
      },
    });

    return foundVotes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
  }

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async createEvent(
    @Arg("createEventInput")
    { clubId, isInstant, ...args }: CreateEventInput,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    try {
      const { profileId } = user;
      const club = await Club.findOne(clubId);
      const clubMem = await ClubMember.findOne({
        where: {
          clubId,
          profileId,
        },
      });

      if (!clubMem || clubMem.role !== 2)
        return {
          code: 401,
          success: false,
          message: "Unauthenticated",
        };

      const newEvent = ClubEvent.create({
        ...args,
        show: isInstant ? true : false,
        club,
        createdBy: clubMem,
        status: 1,
      });
      await newEvent.save();

      return {
        code: 200,
        success: true,
        message: "Event created successfully",
        event: newEvent,
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

  @Query((_return) => Events, { nullable: true })
  @UseMiddleware(checkAuth)
  async myEvents(@Ctx() { user }: Context): Promise<Events | null> {
    try {
      const clubMems = await ClubMember.find({
        where: {
          profileId: user.profileId,
          status: 2,
        },
      });

      let foundEvents: ClubEvent[] = [];
      const date = new Date();
      const before15Minutes = addMinutes(15);

      for (let i = 0; i < clubMems.length; i++) {
        console.log(before15Minutes.toISOString(), date.toISOString());

        const clubEvents = await ClubEvent.find({
          where: {
            club: {
              id: clubMems[i].clubId,
            },
            end: MoreThan(date.toISOString()),
            start: LessThan(before15Minutes.toISOString()),
          },
        });
        foundEvents.push(...clubEvents);
      }

      return {
        totalCount: foundEvents.length,
        results: foundEvents,
        hasMore: false,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  @Query((_return) => ClubEvent, { nullable: true })
  @UseMiddleware(checkAuth)
  async getEvent(
    @Arg("id", (_type) => ID) id: string
  ): Promise<ClubEvent | undefined> {
    try {
      const event = await ClubEvent.findOne(id);
      return event;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Query((_return) => Number)
  async getVoteCount(@Arg("id", (_type) => ID) id: string): Promise<Number> {
    const foundVotes = await Vote.find({
      where: {
        event: { id },
        status: 1,
      },
    });

    return foundVotes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
  }

  @Query((_return) => Number)
  async getWaitingVote(@Arg("id", (_type) => ID) id: string): Promise<Number> {
    const foundVotes = await Vote.find({
      where: {
        event: { id },
        status: 2,
      },
    });

    return foundVotes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
  }

  @Query((_return) => Events, { nullable: true })
  @UseMiddleware(checkAuth)
  async getEvents(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("dateBefore", (_type) => String!, { nullable: true })
    dateBefore: string,
    @Arg("dateAfter", (_type) => String!, { nullable: true }) dateAfter: string,
    @Arg("clubId", (_type) => String!) clubId: string
  ): Promise<Events | null> {
    try {
      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const club = await Club.findOne(clubId);

      const totalEvents = await ClubEvent.find({
        where: {
          club,
          start: Between(dateAfter, dateBefore),
        },
      });

      const foundEvents = await ClubEvent.find({
        where: {
          club,
          start: Between(dateAfter, dateBefore),
        },
        skip: realOffset,
        take: realLimit,
      });

      const totalPostCount = totalEvents.length;

      let hasMore = realLimit + realOffset < totalPostCount;

      return {
        totalCount: totalPostCount,
        hasMore,
        results: foundEvents,
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
