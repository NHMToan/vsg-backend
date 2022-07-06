import { Vote } from "../entities/Vote";
import { Query, Resolver } from "type-graphql";

@Resolver()
export class GreetingResolver {
  @Query((_return) => Number)
  async hello(): Promise<Number> {
    const foundVotes = await Vote.find({
      where: {
        status: 1,
      },
    });
    const foundWaitingVotes = await Vote.find({
      where: {
        status: 2,
      },
    });
    return (
      foundVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0) +
      foundWaitingVotes.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.value;
      }, 0)
    );
  }
}
