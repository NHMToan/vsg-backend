import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Between, LessThan, MoreThan } from "typeorm";
import { Club } from "../entities/Club";
import { ClubEvent } from "../entities/ClubEvent";
import { ClubMember } from "../entities/ClubMember";
import { Vote } from "../entities/Vote";
import { checkAuth } from "../middleware/checkAuth";
import {
  CreateEventInput,
  EventMutationResponse,
  Events,
  UpdateEventInput,
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

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async updateEvent(
    @Arg("id", (_type) => ID) id: string,
    @Arg("updateEventInput")
    {
      slot,
      title,
      description,
      start,
      end,
      time,
      color,
      address,
      addressLink,
      maxVote,
    }: UpdateEventInput,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    const existingEvent = await ClubEvent.findOne(id);

    if (!existingEvent)
      return {
        code: 400,
        success: false,
        message: "Event not found",
      };
    const foundMem = await ClubMember.findOne({
      where: {
        clubId: existingEvent.clubId,
        profileId: user.profileId,
      },
    });

    if (!foundMem || foundMem.role === 1) {
      return { code: 401, success: false, message: "Unauthorised" };
    }
    const foundVotes = await Vote.find({
      where: {
        event: existingEvent,
        status: 1,
      },
    });

    const voteCount = foundVotes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
    if (slot < voteCount) {
      return {
        code: 400,
        success: false,
        message: "Slots can not lower than the current confirmed slots",
      };
    }

    existingEvent.title = title;
    existingEvent.description = description;
    existingEvent.start = start;
    existingEvent.end = end;
    existingEvent.time = time;
    existingEvent.color = color;
    existingEvent.address = address;
    existingEvent.addressLink = addressLink;
    existingEvent.maxVote = maxVote;
    existingEvent.slot = slot;

    await existingEvent.save();

    return {
      code: 200,
      success: true,
      message: "Event updated successfully",
      event: existingEvent,
    };
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
          time: Between(dateAfter, dateBefore),
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
  async changeEventStatus(
    @Arg("id", (_type) => ID) id: string,
    @Arg("status", (_type) => Int) status: number,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    const existingEvent = await ClubEvent.findOne(id);

    if (!existingEvent)
      return {
        code: 400,
        success: false,
        message: "Event not found",
      };
    const foundClubMem = await ClubMember.findOne({
      where: {
        clubId: existingEvent.clubId,
        profileId: user.profileId,
      },
    });
    if (!foundClubMem || foundClubMem.role === 1)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
      };

    existingEvent.status = status;
    await existingEvent.save();
    return {
      code: 200,
      success: true,
      message: "Event status has changed successfully",
      event: existingEvent,
    };
  }

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteEvent(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<EventMutationResponse> {
    const existingEvent = await ClubEvent.findOne(id);

    if (!existingEvent)
      return {
        code: 400,
        success: false,
        message: "Event not found",
      };
    const foundClubMem = await ClubMember.findOne({
      where: {
        clubId: existingEvent.clubId,
        profileId: user.profileId,
      },
    });
    if (!foundClubMem || foundClubMem.role === 1)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
      };

    await Vote.delete({
      event: {
        id,
      },
    });

    await ClubEvent.delete(id);

    return { code: 200, success: true, message: "Event deleted successfully" };
  }
}
