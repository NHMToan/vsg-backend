import { Field, ObjectType } from "type-graphql";
import { EventHistory } from "../entities/EventHistory";

@ObjectType()
export class EventHistoryList {
  @Field()
  totalCount!: number;

  @Field((_type) => [EventHistory])
  results!: EventHistory[];
}
