import { Publisher } from "type-graphql";
import { EventHistory } from "../entities/EventHistory";
import { Vote } from "../entities/Vote";
import { NewVotePayload } from "../types/Club";
import { createNotification } from "./notification";

export const updateConfirmedVote = async (
  currentAvailableSlots: number,
  waitingVotes: Vote[],
  pubsub: any = null,
  event: any = null
) => {
  let availableSlots = currentAvailableSlots;

  for (const vote of waitingVotes) {
    if (!availableSlots || availableSlots <= 0) break;

    if (vote.value <= availableSlots) {
      vote.status = 1;
      await vote.save();

      createNotification(pubsub, [vote.member.profileId], {
        messageKey: "confirm_waiting_slot",
        actionObject: event?.title,
        amount: vote.value,
      });

      availableSlots -= vote.value;
    } else {
      const confirmedVoteValue = availableSlots;
      vote.value -= confirmedVoteValue;
      await vote.save();

      const newConfirmedVote = Vote.create({
        event: vote.event,
        value: confirmedVoteValue,
        status: 1,
        member: vote.member,
      });

      await newConfirmedVote.save();

      createNotification(pubsub, [vote.member.profileId], {
        messageKey: "confirm_waiting_slot",
        actionObject: event?.title,
        amount: confirmedVoteValue,
      });

      availableSlots = 0;
    }
  }
};

export const reduceSlots = async (
  currentConfirmedVote: Vote[],
  reduceValue: number
) => {
  let slots = reduceValue;

  if (currentConfirmedVote.length === 1) {
    if (currentConfirmedVote[0].value === slots) {
      await Vote.delete(currentConfirmedVote[0].id);
      return;
    }
    currentConfirmedVote[0].value -= reduceValue;
    await currentConfirmedVote[0].save();
    return;
  }

  for (let i = 0; i < currentConfirmedVote.length; i++) {
    if (!slots || slots < 0) return;

    if (currentConfirmedVote[i].value > slots) {
      currentConfirmedVote[i].value -= slots;
      await currentConfirmedVote[i].save();
      return;
    } else {
      slots -= currentConfirmedVote[i].value;
      await Vote.delete(currentConfirmedVote[i].id);
    }
  }
};

export const sendEventCountPubsub = async (
  eventId: string,
  status: number,
  pubsub: Publisher<NewVotePayload>
) => {
  if (status === 1) {
    const votes = await Vote.find({
      where: {
        event: { id: eventId },
        status: 1,
      },
      relations: ["event"],
    });
    const newVoteCount = votes.reduce((previousValue, currentValue) => {
      return previousValue + currentValue.value;
    }, 0);
    //Send vote cound to sub
    await pubsub({
      voteCount: newVoteCount,
      eventId,
      status: 1,
    });
  }

  if (status === 2) {
    const newWaitingVotes = await Vote.find({
      where: {
        event: { id: eventId },
        status: 2,
      },
      relations: ["event"],
    });
    const newWaitingVoteCount = newWaitingVotes.reduce(
      (previousValue, currentValue) => {
        return previousValue + currentValue.value;
      },
      0
    );
    //Send vote cound to sub
    await pubsub({
      waitingCount: newWaitingVoteCount,
      eventId,
      status: 2,
    });
  }
};

export const createEventActivity = ({
  eventId,
  memberId,
  objectId,
  type,
  value,
}: {
  eventId: string;
  memberId: string;
  objectId: string;
  type: string;
  value?: number;
}) => {
  const newConfirmedVote = EventHistory.create({
    eventId,
    memberId,
    objectId,
    type,
    value,
  });

  newConfirmedVote.save();
};
