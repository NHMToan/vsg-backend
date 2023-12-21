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
  EventVoteMutationResponse,
  NewVoteArgs,
  NewVotePayload,
  NewVoteSubscriptionData,
  VotCount,
  Votes,
} from "../types/Club";
import { Context } from "../types/Context";
import { NewNotiPayload } from "../types/Notification";
import {
  createDeleteEventVote,
  createEventActivity,
  reduceSlots,
  sendEventCountPubsub,
  updateConfirmedVote,
} from "../utils/event";
import { createNotification } from "../utils/notification";

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

  @Query((_return) => VotCount, { nullable: true })
  @UseMiddleware(checkAuth)
  async getVoteStats(
    @Arg("eventId", (_type) => ID) eventId: string,
    @Ctx() { user }: Context
  ): Promise<VotCount | null> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);
      if (!foundEvent) return null;

      const clubMem = await ClubMember.findOne({
        where: {
          clubId: foundEvent.clubId,
          profileId: user.profileId,
        },
      });

      if (!clubMem || clubMem.status !== 2) return null;

      const confirmedOptions: FindManyOptions<Vote> = {
        where: {
          event: foundEvent,
          member: clubMem,
          status: 1,
        },
      };
      const confirmedVotes = await Vote.find(confirmedOptions);

      const confirmed = confirmedVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0);

      const waitingOptions: FindManyOptions<Vote> = {
        where: {
          event: foundEvent,
          member: clubMem,
          status: 2,
        },
      };
      const waitingVotes = await Vote.find(waitingOptions);
      const waiting = waitingVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0);
      return {
        confirmed,
        waiting,
        total: confirmed + waiting,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  @Query((_return) => Votes, { nullable: true })
  @UseMiddleware(checkAuth)
  async getMyVotes(
    @Arg("eventId", (_type) => ID) eventId: string,
    @Ctx() { user }: Context
  ): Promise<Votes | null> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);
      if (!foundEvent)
        return {
          totalCount: 0,
          hasMore: false,
          results: [],
        };

      const clubMem = await ClubMember.findOne({
        where: {
          clubId: foundEvent.clubId,
          profileId: user.profileId,
        },
      });

      if (!clubMem || clubMem.status !== 2)
        return {
          totalCount: 0,
          hasMore: false,
          results: [],
        };

      const findOptions: FindManyOptions<Vote> = {
        order: {
          createdAt: "DESC",
        },
        where: {
          event: foundEvent,
          member: clubMem,
        },
      };
      const votes = await Vote.find(findOptions);

      return {
        totalCount: votes.length,
        hasMore: false,
        results: votes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Votes, { nullable: true })
  @UseMiddleware(checkAuth)
  async getMemberVotes(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("memberId", (_type) => String!) memberId: string
  ): Promise<Votes | null> {
    try {
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Vote> = {
        order: {
          createdAt: "DESC",
        },
        relations: ["member"],
        take: realLimit,
        skip: realOffset,
        where: {
          memberId,
          status: 1,
        },
      };

      const votes = await Vote.find(findOptions);

      return {
        totalCount: votes.length,
        hasMore: false,
        results: votes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Votes, { nullable: true })
  @UseMiddleware(checkAuth)
  async getMyHistoryVotes(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Ctx() { user }: Context
  ): Promise<Votes | null> {
    try {
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Vote> = {
        order: {
          createdAt: "DESC",
        },
        relations: ["member"],
        take: realLimit,
        skip: realOffset,
        where: {
          member: { profileId: user.profileId },
          status: 1,
        },
      };

      const votes = await Vote.find(findOptions);

      return {
        totalCount: votes.length,
        hasMore: false,
        results: votes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
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

      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Vote> = {
        order: {
          createdAt: "ASC",
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
    { eventId, status, value, type }: CreateVoteInput,
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
      const now = new Date();
      if (now > new Date(foundEvent.end)) {
        return {
          code: 401,
          success: false,
          message: "Event voting is closed.",
        };
      }
      if (now < new Date(foundEvent.start)) {
        return {
          code: 401,
          success: false,
          message: "Event voting has yet started.",
        };
      }
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

      const foundVotes = await Vote.find({
        where: {
          event: foundEvent,
          member: clubMem,
        },
      });
      const voteCount = foundVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0);

      if (voteCount + value > foundEvent.maxVote)
        return {
          code: 400,
          success: false,
          message: "You have reached your permit votes.",
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
          type,
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

  @Mutation((_return) => EventVoteMutationResponse)
  @UseMiddleware(checkAuth)
  async voteChangePaid(
    @Arg("voteId", (_type) => ID)
    voteId: string,
    @Arg("payStatus", (_type) => String)
    payStatus: string,
    @Ctx() { user }: Context
  ): Promise<EventVoteMutationResponse> {
    try {
      const foundVote = await Vote.findOne({
        where: { id: voteId },
        relations: ["event", "member", "member.profile"],
      });
      if (!foundVote)
        return {
          code: 400,
          success: false,
          message: "Vote not found.",
        };

      foundVote.paid = payStatus;

      await foundVote.save();

      const type = !payStatus ? "remove_tag" : payStatus;

      const clubMem = await ClubMember.findOne({
        where: {
          profileId: user.profileId,
          clubId: foundVote.event.clubId,
        },
      });

      if (clubMem)
        createEventActivity({
          type,
          eventId: foundVote.eventId,
          object: foundVote,
          memberId: clubMem.id,
        });

      return {
        code: 200,
        success: true,
        message: "Pay status is changed!",
        vote: foundVote,
      };
    } catch (error) {
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }
  @Mutation((_return) => EventVoteMutationResponse)
  @UseMiddleware(checkAuth)
  async noteVote(
    @Arg("voteId", (_type) => ID)
    voteId: string,
    @Arg("note", (_type) => String)
    note: string,
    @Ctx() { user }: Context
  ): Promise<EventVoteMutationResponse> {
    try {
      const foundVote = await Vote.findOne({
        where: { id: voteId },
        relations: ["event", "member", "member.profile"],
      });
      if (!foundVote)
        return {
          code: 400,
          success: false,
          message: "Vote not found.",
        };

      foundVote.note = note;

      await foundVote.save();

      const type = "add_note";

      const clubMem = await ClubMember.findOne({
        where: {
          profileId: user.profileId,
          clubId: foundVote.event.clubId,
        },
      });
      if (clubMem)
        createEventActivity({
          type,
          eventId: foundVote.eventId,
          object: foundVote,
          memberId: clubMem.id,
        });

      return {
        code: 200,
        success: true,
        message: "Note is changed!",
        vote: foundVote,
      };
    } catch (error) {
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
    @Arg("voteId", (_type) => ID)
    voteId: string,
    @Arg("eventId", (_type) => ID)
    eventId: string,
    @Arg("eventSlot", (_type) => Int)
    eventSlot: number,
    @Arg("isSelf", (_type) => Boolean, { nullable: true })
    isSelf: boolean,
    @Ctx() { user }: Context,
    @PubSub(Topic.EventChanged) notifyAboutNewVote: Publisher<NewVotePayload>,
    @PubSub(Topic.NewNotification) newNoti: Publisher<NewNotiPayload>
  ): Promise<EventMutationResponse> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);

      if (!foundEvent)
        return {
          code: 400,
          success: false,
          message: "Event not found",
        };
      if (isSelf) {
        const now = new Date();
        if (now > new Date(foundEvent.end)) {
          return {
            code: 401,
            success: false,
            message: "Event voting is closed.",
          };
        }
      }

      const foundVote = await Vote.findOne({
        where: { id: voteId },
        relations: ["event"],
      });

      if (!foundVote)
        return {
          code: 400,
          success: false,
          message: "Vote not found.",
        };

      if (foundVote.status === 1) {
        await Vote.delete(voteId);

        if (isSelf) {
          const admins = await ClubMember.find({
            where: {
              clubId: foundEvent.clubId,
              role: 2,
            },
          });

          const clubMem = await ClubMember.findOne({
            where: {
              profileId: user.profileId,
              clubId: foundEvent.clubId,
            },
            relations: ["profile"],
          });
          if (clubMem) {
            await createNotification(
              newNoti,
              admins.map((ad) => ad.profileId),
              {
                messageKey: "remove_confirm_vote",
                actorAvatar: clubMem.profile.avatar,
                actionObject: foundEvent.title,
                actorName: clubMem.profile.displayName,
                amount: foundVote.value,
              }
            );
            createDeleteEventVote({
              eventId: eventId,
              memberId: clubMem.id,
              value: foundVote.value,
            });
          }
        }

        const foundWaitingVotes = await Vote.find({
          order: {
            createdAt: "ASC",
          },
          where: {
            event: { id: eventId },
            status: 2,
          },
          relations: ["event", "member"],
        });
        const currentWaitingVoteCount = foundWaitingVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );
        if (!currentWaitingVoteCount || currentWaitingVoteCount === 0) {
          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);
          return {
            code: 200,
            success: true,
            message: "Vote deleted.",
          };
        }

        //Update confirmed slots
        const foundVotes = await Vote.find({
          where: {
            event: { id: eventId },
            status: 1,
          },
          relations: ["event"],
        });
        const currentVoteCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        const currentAvailableSlots = eventSlot - currentVoteCount;
        if (!currentAvailableSlots || currentAvailableSlots <= 0) {
          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

          return {
            code: 200,
            success: true,
            message: "Vote deleted.",
          };
        }
        
        await updateConfirmedVote(
          currentAvailableSlots,
          foundWaitingVotes,
          newNoti,
          foundEvent
        );

        await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);
      } else {
        await Vote.delete(foundVote.id);
        await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

        return {
          code: 200,
          success: true,
          message: "Vote deleted.",
        };
      }

      return {
        code: 200,
        success: true,
        message: "Unvoted",
      };
    } catch (error) {
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_return) => EventMutationResponse)
  @UseMiddleware(checkAuth)
  async changeEventVote(
    @Arg("voteId", (_type) => ID)
    voteId: string,
    @Arg("eventId", (_type) => ID)
    eventId: string,
    @Arg("eventSlot", (_type) => Int)
    eventSlot: number,
    @Arg("newValue", (_type) => Int)
    newValue: number,
    @Ctx() { user }: Context,
    @PubSub(Topic.EventChanged) notifyAboutNewVote: Publisher<NewVotePayload>,
    @PubSub(Topic.NewNotification) newNoti: Publisher<NewNotiPayload>
  ): Promise<EventMutationResponse> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);

      if (!foundEvent)
        return {
          code: 400,
          success: false,
          message: "Event not found",
        };

      const foundVote = await Vote.findOne({
        where: { id: voteId },
        relations: ["event"],
      });

      if (!foundVote)
        return {
          code: 400,
          success: false,
          message: "Vote not found.",
        };
      if (foundVote.value <= newValue) {
        return {
          code: 400,
          success: false,
          message: "Can only change to lower slot.",
        };
      }

      if (foundVote.status === 1) {
        const clubMem = await ClubMember.findOne({
          where: {
            profileId: user.profileId,
            clubId: foundEvent.clubId,
          },
          relations: ["profile"],
        });
        if (clubMem)
          createDeleteEventVote({
            eventId: eventId,
            memberId: clubMem.id,
            value: foundVote.value - newValue,
          });

        foundVote.value = newValue;
        await foundVote.save();

        const foundWaitingVotes = await Vote.find({
          order: {
            createdAt: "ASC",
          },
          where: {
            event: { id: eventId },
            status: 2,
          },
          relations: ["event", "member"],
        });
        const currentWaitingVoteCount = foundWaitingVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        if (!currentWaitingVoteCount || currentWaitingVoteCount === 0) {
          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

          return {
            code: 200,
            success: true,
            message: "Vote is changed.",
          };
        }

        //Update confirmed slots
        const foundVotes = await Vote.find({
          where: {
            event: { id: eventId },
            status: 1,
          },
          relations: ["event"],
        });
        const currentVoteCount = foundVotes.reduce(
          (previousValue, currentValue) => {
            return previousValue + currentValue.value;
          },
          0
        );

        const currentAvailableSlots = eventSlot - currentVoteCount;
        if (!currentAvailableSlots || currentAvailableSlots <= 0) {
          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

          return {
            code: 200,
            success: true,
            message: "Vote is changed.",
          };
        }

        await updateConfirmedVote(
          currentAvailableSlots,
          foundWaitingVotes,
          newNoti,
          foundEvent
        );

        await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);
      } else {
        foundVote.value = newValue;
        await foundVote.save();

        await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

        return {
          code: 200,
          success: true,
          message: "Vote is changed.",
        };
      }

      return {
        code: 200,
        success: true,
        message: "Vote is changed",
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
  async changeSlots(
    @Arg("status", (_type) => Int)
    status: number,
    @Arg("eventId", (_type) => ID)
    eventId: string,
    @Arg("eventSlot", (_type) => Int)
    eventSlot: number,
    @Arg("newValue", (_type) => Int)
    newValue: number,
    @Ctx() { user }: Context,
    @PubSub(Topic.EventChanged) notifyAboutNewVote: Publisher<NewVotePayload>,
    @PubSub(Topic.NewNotification) newNoti: Publisher<NewNotiPayload>
  ): Promise<EventMutationResponse> {
    try {
      const foundEvent = await ClubEvent.findOne(eventId);

      if (!foundEvent)
        return {
          code: 400,
          success: false,
          message: "Event not found",
        };

      const now = new Date();
      if (now > new Date(foundEvent.end)) {
        return {
          code: 401,
          success: false,
          message: "Event voting is closed.",
        };
      }
      if (now < new Date(foundEvent.start)) {
        return {
          code: 401,
          success: false,
          message: "Event voting has yet started.",
        };
      }

      const clubMem = await ClubMember.findOne({
        where: {
          profileId: user.profileId,
          clubId: foundEvent.clubId,
        },
        relations: ["profile"],
      });
      if (!clubMem || clubMem.status !== 2)
        return {
          code: 401,
          success: false,
          message: "You have not permistion to vote!.",
        };
      const foundCurrenttVotes = await Vote.find({
        where: {
          event: foundEvent,
          member: clubMem,
          status,
        },
      });

      const currentValue = foundCurrenttVotes.reduce(
        (previousValue, currentValue) => {
          return previousValue + currentValue.value;
        },
        0
      );
      const isUp = newValue - currentValue > 0 ? true : false;
      const rangeValue = Math.abs(newValue - currentValue);

      const foundVotes = await Vote.find({
        where: {
          event: foundEvent,
          member: clubMem,
        },
      });
      const voteCount = foundVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0);

      if (isUp && rangeValue + voteCount > foundEvent.maxVote)
        return {
          code: 400,
          success: false,
          message: "You have reached your permit votes.",
        };

      if (status === 1) {
        /// Up
        if (isUp) {
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

          if (
            currentVoteCount > foundEvent.slot ||
            currentVoteCount + rangeValue > foundEvent.slot
          ) {
            return {
              code: 400,
              success: false,
              message: "Slot is full",
            };
          }

          const newVote = Vote.create({
            status: 1,
            member: clubMem,
            event: foundEvent,
            value: rangeValue,
          });
          await newVote.save();

          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

          return {
            code: 200,
            success: true,
            message: `Slot is changed`,
          };
        } else {
          //*******/ Down
          // Reduce confirmed slots
          if (newValue === 0) {
            await Vote.delete({
              event: foundEvent,
              member: clubMem,
              status: 1,
            });
          } else {
            const myCurrentConfirmedVotes = await Vote.find({
              order: {
                createdAt: "DESC",
              },
              where: {
                event: foundEvent,
                member: clubMem,
                status: 1,
              },
            });

            await reduceSlots(myCurrentConfirmedVotes, rangeValue);
          }

          const admins = await ClubMember.find({
            where: {
              clubId: foundEvent.clubId,
              role: 2,
            },
          });

          //Send Notes to Admins
          createNotification(
            newNoti,
            admins
              .filter((ad) => ad.profileId !== user.profileId)
              .map((ad) => ad.profileId),
            {
              messageKey: "remove_confirm_vote",
              actorAvatar: clubMem.profile.avatar,
              actionObject: foundEvent.title,
              actorName: clubMem.profile.displayName,
              amount: rangeValue,
            }
          );
          // Update confirmed slot from waiting list
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
          const currentAvailableSlots = eventSlot - currentVoteCount;

          if (!currentAvailableSlots || currentAvailableSlots <= 0) {
            await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);

            return {
              code: 200,
              success: true,
              message: "Vote is changed.",
            };
          }
          const foundWaitingVotes = await Vote.find({
            order: {
              createdAt: "ASC",
            },
            where: {
              event: { id: eventId },
              status: 2,
            },
            relations: ["event", "member"],
          });

          await updateConfirmedVote(
            currentAvailableSlots,
            foundWaitingVotes,
            newNoti,
            foundEvent
          );

          await sendEventCountPubsub(eventId, 1, notifyAboutNewVote);
        }

        return {
          code: 200,
          success: true,
          message: `Slot is changed`,
        };
      } else {
        if (isUp) {
          const newVote = Vote.create({
            status: 2,
            member: clubMem,
            event: foundEvent,
            value: rangeValue,
          });
          await newVote.save();

          return {
            code: 200,
            success: true,
            message: `Slot is changed`,
          };
        } else {
          //*******/ Down

          if (newValue === 0) {
            await Vote.delete({
              event: foundEvent,
              member: clubMem,
              status: 2,
            });
          } else {
            // Reduce confirmed slots
            const myCurrentWaitingVotes = await Vote.find({
              order: {
                createdAt: "DESC",
              },
              where: {
                event: foundEvent,
                member: clubMem,
                status: 2,
              },
            });
            await reduceSlots(myCurrentWaitingVotes, rangeValue);
          }

          return {
            code: 200,
            success: true,
            message: `Slot is changed`,
          };
        }
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
