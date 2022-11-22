import { ArgsType, Field, ID, ObjectType } from "type-graphql";
import { UserNotification } from "../entities/UserNotification";

export type NotiMessageKey =
  | "remove_vote"
  | "confirm_vote"
  | "apply_club"
  | "accept_club"
  | "accept_join_club"
  | "remove_confirm_vote"
  | "confirm_waiting_slot";

@ObjectType()
export class Notifications {
  @Field()
  totalCount!: number;

  @Field((_type) => [UserNotification])
  results!: UserNotification[];
}

export interface NewNotiPayload {
  profileId: string;
  notification: UserNotification;
}

@ObjectType()
export class NewNotiSubscriptionData {
  @Field()
  profileId!: string;

  @Field((_type) => UserNotification)
  notification!: UserNotification;
}

@ArgsType()
export class NewNotiArgs {
  @Field((_type) => ID)
  profileId: string;
}
