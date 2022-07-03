import { NewVotePayload } from "../types/Club";
import { Publisher } from "type-graphql";
import { Vote } from "../entities/Vote";

export const updateConfirmedVote = async (
  currentAvailableSlots: number,
  waitingVotes: Vote[]
) => {
  let avaSlots = currentAvailableSlots;
  for (let i = 0; i < waitingVotes.length; i++) {
    if (!avaSlots) break;

    if (waitingVotes[i].value <= avaSlots) {
      waitingVotes[i].status = 1;
      await waitingVotes[i].save();
    }
    if (waitingVotes[i].value > avaSlots) {
      waitingVotes[i].value = waitingVotes[i].value - avaSlots;
      await waitingVotes[i].save();

      const newConfirmedVote = Vote.create({
        event: waitingVotes[i].event,
        value: waitingVotes[i].value,
        status: 1,
        member: waitingVotes[i].member,
      });
      await newConfirmedVote.save();
    }
    avaSlots -= waitingVotes[i].value;
  }
};

export const reduceSlots = async (
  currentConfirmedVote: Vote[],
  reduceValue: number
) => {
  let slots = reduceValue;
  if (currentConfirmedVote.length === 1) {
    console.log("ZOOOO dayyyy", slots);
    if (currentConfirmedVote[0].value === slots) {
      await Vote.delete(currentConfirmedVote[0].id);
      return;
    }
    currentConfirmedVote[0].value = slots;
    await currentConfirmedVote[0].save();
    return;
  }

  for (let i = 0; i < currentConfirmedVote.length; i++) {
    if (!slots || slots < 0) return;

    if (currentConfirmedVote[i].value > slots) {
      currentConfirmedVote[i].value = slots;
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
