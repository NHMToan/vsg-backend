import { Arg, ID, Int, Query, Resolver, UseMiddleware } from "type-graphql";
import { FindManyOptions } from "typeorm";
import { checkAuth } from "../middleware/checkAuth";

import { EventHistory } from "../entities/EventHistory";
import { EventHistoryList } from "../types/EventHistory";

@Resolver(EventHistory)
export class EventHistoryResolver {
  @Query((_return) => EventHistoryList, { nullable: true })
  @UseMiddleware(checkAuth)
  async getEventHistory(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("eventId", (_type) => ID!) eventId: string
  ): Promise<EventHistoryList | null> {
    try {
      const realLimit = limit || 50;
      const realOffset = offset || 0;
      const totalCount = await EventHistory.count({ where: { eventId } });

      const findOptions: FindManyOptions<EventHistory> = {
        order: {
          createdAt: "DESC",
        },
        where: {
          eventId,
        },
        take: realLimit,
        skip: realOffset,
        relations: ["event", "object", "member"],
      };
      const activities = await EventHistory.find(findOptions);

      return {
        totalCount: totalCount,
        results: activities,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
